import { mkdir, writeFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { localizeDataset, toPdf, toXlsx } from '../exports/file-writers.js';
import { join } from 'node:path';
import { query } from '../../shared/database/mysql.js';
import { HttpError } from '../../shared/http/http-error.js';
import { logger } from '../../shared/observability/logger.js';
import { M } from '../../shared/http/messages.js';

const storageRoot = join(process.cwd(), '..', '..', 'storage');
const exportRoot = join(storageRoot, 'exports');

export async function importData({ userId, jobType = 'MENU_ITEMS', fileName = 'import.csv', content, format = null, encoding = null }) {
  if (!content || typeof content !== 'string') throw new HttpError(400, M.importContentRequired);
  const normalizedFormat = inferImportFormat(fileName, format);
  const rows = normalizedFormat === 'XLSX' ? await parseXlsx(Buffer.from(content, encoding === 'base64' ? 'base64' : 'utf8'))
    : normalizedFormat === 'CSV' ? parseCsv(content) : parseSpreadsheetXml(content);
  const result = await query(
    `INSERT INTO import_jobs (user_id, job_type, file_url, total_rows, status)
     VALUES (?, ?, ?, ?, 'PROCESSING')`,
    [userId, jobType, `inline://${fileName}`, rows.length]
  );
  const jobId = Number(result.insertId);
  const errors = [];
  let successRows = 0;

  for (let index = 0; index < rows.length; index += 1) {
    try {
      if (jobType === 'MENU_ITEMS') await importMenuItem(rows[index], userId);
      else if (jobType === 'RESTAURANTS') await importRestaurant(rows[index], userId);
      else throw new Error(`Loại nhập dữ liệu không được hỗ trợ: ${jobType}`);
      successRows += 1;
    } catch (error) {
      errors.push({ row: index + 2, message: error.message, values: rows[index] });
    }
  }

  const failedRows = errors.length;
  await query(
    `UPDATE import_jobs
     SET success_rows = ?, failed_rows = ?, status = ?, error_log = ?, completed_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [successRows, failedRows, failedRows === rows.length && rows.length > 0 ? 'FAILED' : 'COMPLETED', JSON.stringify(errors), jobId]
  );
  return getImportJob(jobId, userId);
}

export async function importCsv(input) {
  return importData({ ...input, format: 'CSV' });
}

export async function createExport({ userId, exportType = 'ORDERS', format = 'CSV', filters = {} }) {
  const normalizedFormat = String(format).toUpperCase();
  if (!['CSV', 'EXCEL', 'PDF'].includes(normalizedFormat)) throw new HttpError(400, M.formatCsvExcelPdf);
  // Chặn loại dữ liệu sai trước khi tạo job (trước đây tạo job FAILED rồi trả 201)
  if (!Object.hasOwn(EXPORT_TITLES, String(exportType).toUpperCase())) throw new HttpError(400, M.exportTypeUnsupported);
  const result = await query(
    `INSERT INTO export_jobs (user_id, export_type, format, status)
     VALUES (?, ?, ?, 'PROCESSING')`,
    [userId, String(exportType).toUpperCase(), normalizedFormat]
  );
  const jobId = Number(result.insertId);
  try {
    const rows = await exportRows(String(exportType).toUpperCase(), filters);
    await mkdir(exportRoot, { recursive: true });
    const stamp = new Date().toISOString().replaceAll(/[-:.TZ]/g, '').slice(0, 14);
    const extension = normalizedFormat === 'CSV' ? 'csv' : normalizedFormat === 'EXCEL' ? 'xlsx' : 'pdf';
    const fileName = `${String(exportType).toLowerCase()}-${jobId}-${stamp}.${extension}`;
    const filePath = join(exportRoot, fileName);
    // Excel (.xlsx) và PDF là file thật do máy chủ sinh ra; CSV có BOM để Excel đọc đúng tiếng Việt
    const dataset = localizeDataset(rowsToDataset(String(exportType).toUpperCase(), rows));
    const output = normalizedFormat === 'CSV'
      ? `\uFEFF${rowsToCsv(rows)}`
      : normalizedFormat === 'EXCEL'
        ? await toXlsx(dataset, { user: 'Tác vụ nền' })
        : await toPdf(dataset, { user: 'Tác vụ nền' });
    await writeFile(filePath, output, normalizedFormat === 'CSV' ? 'utf8' : undefined);
    await query(
      `UPDATE export_jobs SET status = 'COMPLETED', file_url = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [`/exports/${fileName}`, jobId]
    );
  } catch (error) {
    await query(
      `UPDATE export_jobs SET status = 'FAILED', completed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [jobId]
    );
    logger.error('export.job.failed', { jobId, error: error.message });
  }
  return getExportJob(jobId, userId);
}

export async function enqueueJob(jobType, payload = {}, scheduledAt = null) {
  const result = await query(
    `INSERT INTO background_jobs (job_type, payload, scheduled_at, status)
     VALUES (?, ?, ?, 'PENDING')`,
    [jobType, JSON.stringify(payload), scheduledAt]
  );
  return getBackgroundJob(Number(result.insertId));
}

export async function runBackgroundJobs(limit = 10) {
  const jobs = await query(
    `SELECT * FROM background_jobs
     WHERE status = 'PENDING' AND (scheduled_at IS NULL OR scheduled_at <= CURRENT_TIMESTAMP)
     ORDER BY created_at, id
     LIMIT ?`,
    [limit]
  );
  const completed = [];
  for (const job of jobs) {
    try {
      await query(`UPDATE background_jobs SET status = 'PROCESSING', attempts = attempts + 1, started_at = CURRENT_TIMESTAMP WHERE id = ?`, [job.id]);
      const payload = parseJson(job.payload) ?? {};
      if (job.job_type === 'CLEANUP_TOKENS') {
        await query('DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP OR used_at IS NOT NULL');
        await query('DELETE FROM email_verification_tokens WHERE expires_at < CURRENT_TIMESTAMP OR verified_at IS NOT NULL');
      } else if (job.job_type === 'EXPORT') {
        await createExport({ userId: payload.userId, exportType: payload.exportType, format: payload.format, filters: payload.filters });
      }
      await query(`UPDATE background_jobs SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP WHERE id = ?`, [job.id]);
      completed.push(Number(job.id));
    } catch (error) {
      await query(`UPDATE background_jobs SET status = IF(attempts >= 3, 'FAILED', 'PENDING'), error_message = ? WHERE id = ?`, [error.message, job.id]);
    }
  }
  return completed;
}

export async function getImportJob(id, userId = null) {
  const rows = await query(
    `SELECT * FROM import_jobs WHERE id = ? ${userId ? 'AND user_id = ?' : ''} LIMIT 1`,
    userId ? [id, userId] : [id]
  );
  if (!rows[0]) throw new HttpError(404, M.importJobNotFound);
  return mapImportJob(rows[0]);
}

export async function listImportJobs(userId = null) {
  const rows = await query(
    `SELECT * FROM import_jobs ${userId ? 'WHERE user_id = ?' : ''} ORDER BY created_at DESC, id DESC LIMIT 100`,
    userId ? [userId] : []
  );
  return rows.map(mapImportJob);
}

export async function getExportJob(id, userId = null) {
  const rows = await query(
    `SELECT * FROM export_jobs WHERE id = ? ${userId ? 'AND user_id = ?' : ''} LIMIT 1`,
    userId ? [id, userId] : [id]
  );
  if (!rows[0]) throw new HttpError(404, M.exportJobNotFound);
  return mapExportJob(rows[0]);
}

export async function listExportJobs(userId = null) {
  const rows = await query(
    `SELECT * FROM export_jobs ${userId ? 'WHERE user_id = ?' : ''} ORDER BY created_at DESC, id DESC LIMIT 100`,
    userId ? [userId] : []
  );
  return rows.map(mapExportJob);
}

export async function listBackgroundJobs() {
  const rows = await query('SELECT * FROM background_jobs ORDER BY created_at DESC, id DESC LIMIT 100');
  return rows.map(mapBackgroundJob);
}

async function getBackgroundJob(id) {
  const rows = await query('SELECT * FROM background_jobs WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) throw new HttpError(404, M.jobNotFound);
  return mapBackgroundJob(rows[0]);
}

export function parseCsv(content) {
  const lines = String(content).replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) throw new HttpError(400, M.csvNoRows);
  const headers = parseCsvLine(lines[0]).map(value => value.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

/** Đọc file .xlsx thật (sheet đầu tiên, dòng 1 là tiêu đề cột). */
export async function parseXlsx(buffer) {
  const workbook = new ExcelJS.Workbook();
  try { await workbook.xlsx.load(buffer); } catch { throw new HttpError(400, 'File .xlsx không đọc được'); }
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) throw new HttpError(400, M.excelNoRows);
  const cellText = cell => {
    const value = cell?.value;
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return String(value.text ?? value.result ?? (value.richText ? value.richText.map(part => part.text).join('') : '')).trim();
    return String(value).trim();
  };
  const headers = sheet.getRow(1).values.slice(1).map(value => cellText({ value }).toLowerCase());
  if (!headers.some(Boolean)) throw new HttpError(400, M.excelHeaderEmpty);
  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row, number) => {
    if (number === 1) return;
    const values = headers.map((_, index) => cellText(row.getCell(index + 1)));
    if (values.some(value => value !== '')) rows.push(Object.fromEntries(headers.map((header, index) => [header, values[index]])));
  });
  return rows;
}

export function parseSpreadsheetXml(content) {
  const xml = String(content).replace(/^\uFEFF/, '');
  if (!/<Workbook[\s>]/i.test(xml) && !/<ss:Workbook[\s>]/i.test(xml)) {
    throw new HttpError(400, M.excelUnsupported);
  }
  const rowMatches = [...xml.matchAll(/<Row\b[^>]*>([\s\S]*?)<\/Row>/gi)];
  if (rowMatches.length < 2) throw new HttpError(400, M.excelNoRows);
  const table = rowMatches.map(match => {
    const cellMatches = [...match[1].matchAll(/<Cell\b[^>]*>([\s\S]*?)<\/Cell>/gi)];
    return cellMatches.map(cell => {
      const dataMatch = cell[1].match(/<Data\b[^>]*>([\s\S]*?)<\/Data>/i);
      return decodeXml(dataMatch?.[1] ?? '');
    });
  });
  const headers = table[0].map(value => value.trim().toLowerCase()).filter(Boolean);
  if (!headers.length) throw new HttpError(400, M.excelHeaderEmpty);
  return table.slice(1)
    .filter(values => values.some(value => String(value).trim() !== ''))
    .map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

function inferImportFormat(fileName, format) {
  const requested = String(format || '').trim().toUpperCase();
  if (requested) {
    if (requested === 'CSV') return 'CSV';
    if (requested === 'XLSX') return 'XLSX';
    if (requested === 'EXCEL' || requested === 'XLS' || requested === 'XML') return 'EXCEL';
    throw new HttpError(400, M.formatCsvExcel);
  }
  const lower = String(fileName || '').toLowerCase();
  if (lower.endsWith('.xls') || lower.endsWith('.xml')) return 'EXCEL';
  if (lower.endsWith('.xlsx')) return 'XLSX';
  return 'CSV';
}

function parseCsvLine(line) {
  const values = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else value += char;
  }
  values.push(value.trim());
  return values;
}

async function importMenuItem(row, userId) {
  const restaurantId = positiveId(row.restaurant_id, 'restaurant_id');
  const restaurantRows = await query('SELECT id FROM restaurants WHERE id = ? AND owner_user_id = ? AND deleted_at IS NULL LIMIT 1', [restaurantId, userId]);
  if (!restaurantRows[0]) throw new Error('Nhà hàng không thuộc tài khoản hiện tại');
  const menuRows = await query('SELECT id FROM menus WHERE restaurant_id = ? AND deleted_at IS NULL ORDER BY id LIMIT 1', [restaurantId]);
  let menuId = menuRows[0]?.id;
  if (!menuId) {
    const result = await query(`INSERT INTO menus (restaurant_id, name, description, status) VALUES (?, 'Imported menu', 'Imported by job', 'ACTIVE')`, [restaurantId]);
    menuId = result.insertId;
  }
  const categoryRows = await query('SELECT id FROM menu_categories WHERE restaurant_id = ? AND menu_id = ? AND status = \'ACTIVE\' ORDER BY id LIMIT 1', [restaurantId, menuId]);
  let categoryId = categoryRows[0]?.id;
  if (!categoryId) {
    const result = await query(`INSERT INTO menu_categories (restaurant_id, menu_id, name, description, status) VALUES (?, ?, 'Imported', 'Imported by job', 'ACTIVE')`, [restaurantId, menuId]);
    categoryId = result.insertId;
  }
  const name = required(row.name, 'name');
  const basePrice = positiveNumber(row.base_price, 'base_price');
  const discountPrice = row.discount_price === undefined || row.discount_price === null || row.discount_price === ''
    ? null
    : positiveNumber(row.discount_price, 'discount_price');
  if (discountPrice !== null && discountPrice > basePrice) throw new Error('discount_price không được lớn hơn base_price');
  await query(
    `INSERT INTO menu_items (restaurant_id, category_id, name, description, base_price, discount_price, preparation_time, is_available)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [restaurantId, categoryId, name, row.description || null, basePrice, discountPrice, positiveNumber(row.preparation_time || 20, 'preparation_time'), row.is_available === '' || row.is_available === '1' || row.is_available?.toLowerCase() === 'true']
  );
}

async function importRestaurant(row, userId) {
  const name = required(row.name, 'name');
  const existing = await query('SELECT id FROM restaurants WHERE owner_user_id = ? AND name = ? AND deleted_at IS NULL LIMIT 1', [userId, name]);
  if (existing[0]) throw new Error('Đã có nhà hàng trùng tên');
  await query(
    `INSERT INTO restaurants (owner_user_id, name, description, phone, address, district, city, opening_time, closing_time, minimum_order, average_prepare_time, commission_rate, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, '07:00:00', '22:00:00', ?, ?, 15, 'PENDING')`,
    [userId, name, row.description || null, row.phone || null, required(row.address, 'address'), row.district || null, row.city || 'Hưng Yên', positiveNumber(row.minimum_order || 0, 'minimum_order'), positiveNumber(row.average_prepare_time || 20, 'average_prepare_time')]
  );
}

async function exportRows(exportType, filters) {
  const dateClause = filters.from && filters.to ? 'WHERE DATE(o.created_at) BETWEEN ? AND ?' : '';
  const params = filters.from && filters.to ? [filters.from, filters.to] : [];
  if (exportType === 'REVENUE' || exportType === 'ORDERS') {
    return query(
      `SELECT o.order_code, o.order_status, o.payment_status, o.payment_method, o.subtotal, o.discount_amount, o.delivery_fee, o.total_amount, o.created_at, r.name AS restaurant_name
       FROM orders o INNER JOIN restaurants r ON r.id = o.restaurant_id ${dateClause} ORDER BY o.created_at DESC LIMIT 5000`,
      params
    );
  }
  if (exportType === 'SHIPPER') {
    return query(`SELECT sp.full_name, sp.availability_status, sp.total_deliveries, sp.total_earnings, sp.rating, u.email FROM shipper_profiles sp INNER JOIN users u ON u.id = sp.user_id ORDER BY sp.total_earnings DESC`);
  }
  if (exportType === 'SETTLEMENT') {
    return query(`SELECT rs.period_start, rs.period_end, r.name AS restaurant_name, rs.gross_sales, rs.commission_amount, rs.refund_amount, rs.net_amount, rs.status FROM restaurant_settlements rs INNER JOIN restaurants r ON r.id = rs.restaurant_id ORDER BY rs.created_at DESC LIMIT 5000`);
  }
  throw new HttpError(400, M.exportTypeUnsupported);
}

function rowsToCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [headers, ...rows.map(row => headers.map(header => row[header]))]
    .map(values => values.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\r\n');
}

const EXPORT_LABELS = {
  order_code: 'Mã đơn', order_status: 'Trạng thái đơn', payment_status: 'Trạng thái thanh toán', payment_method: 'Phương thức thanh toán', subtotal: 'Tiền món', discount_amount: 'Giảm giá',
  delivery_fee: 'Phí giao', total_amount: 'Tổng cộng', created_at: 'Thời gian', restaurant_name: 'Nhà hàng', full_name: 'Họ tên', availability_status: 'Trạng thái', total_deliveries: 'Số chuyến',
  total_earnings: 'Tổng thu nhập', rating: 'Đánh giá', email: 'Email', period_start: 'Từ ngày', period_end: 'Đến ngày', gross_sales: 'Doanh thu món', commission_amount: 'Hoa hồng',
  refund_amount: 'Hoàn tiền', net_amount: 'Thực nhận', status: 'Trạng thái'
};
const EXPORT_TITLES = { ORDERS: 'Danh sách đơn hàng', REVENUE: 'Doanh thu theo đơn', SHIPPER: 'Danh sách tài xế', SETTLEMENT: 'Đối soát nhà hàng' };

function rowsToDataset(exportType, rows) {
  const keys = rows.length ? Object.keys(rows[0]) : [];
  const typeOf = key => (/(amount|total_|fee|subtotal|sales|earnings)/.test(key) ? 'money' : /_at$/.test(key) ? 'datetime' : /^period_/.test(key) ? 'date' : /(deliveries|rating)/.test(key) ? 'number' : 'text');
  const columns = keys.map(key => ({ key: camel(key), label: EXPORT_LABELS[key] ?? key, type: typeOf(key) }));
  return { title: EXPORT_TITLES[exportType] ?? `Xuất ${exportType}`, columns, rows: rows.map(row => Object.fromEntries(keys.map(key => [camel(key), typeOf(key) === 'money' || typeOf(key) === 'number' ? Number(row[key]) : row[key]]))) };
}

function camel(value) { return value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()); }

function decodeXml(value) {
  return String(value ?? '')
    .replaceAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .trim();
}

function required(value, field) {
  if (value === undefined || value === null || String(value).trim() === '') throw new Error(M.fieldRequired2(field));
  return String(value).trim();
}

function positiveNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${field} phải là số không âm`);
  return number;
}

function positiveId(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error(M.fieldPositiveInteger(field));
  return number;
}

function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return null; }
}

function mapImportJob(row) {
  return { id: Number(row.id), userId: Number(row.user_id), jobType: row.job_type, fileUrl: row.file_url, totalRows: Number(row.total_rows), successRows: Number(row.success_rows), failedRows: Number(row.failed_rows), status: row.status, errors: parseJson(row.error_log) ?? [], createdAt: row.created_at, completedAt: row.completed_at };
}

function mapExportJob(row) {
  return { id: Number(row.id), userId: Number(row.user_id), exportType: row.export_type, format: row.format, fileUrl: row.file_url, status: row.status, createdAt: row.created_at, completedAt: row.completed_at };
}

function mapBackgroundJob(row) {
  return { id: Number(row.id), jobType: row.job_type, payload: parseJson(row.payload), status: row.status, attempts: Number(row.attempts), errorMessage: row.error_message, scheduledAt: row.scheduled_at, startedAt: row.started_at, completedAt: row.completed_at, createdAt: row.created_at };
}

