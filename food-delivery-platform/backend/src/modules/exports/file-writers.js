import { resolve } from 'node:path';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

/* Sinh file thật (không phụ thuộc trình duyệt) từ dataset {title, columns:[{key,label,type}], rows, summary?}:
   - Excel (.xlsx): tiêu đề, KPI tóm tắt, bảng có định dạng tiền/ngày/số, bộ lọc, cố định dòng tiêu đề, dòng tổng bằng công thức SUBTOTAL;
   - PDF (A4): tiêu đề thương hiệu, KPI tóm tắt, bảng nhiều trang có lặp dòng tiêu đề, dòng tổng, số trang; font DejaVu hỗ trợ tiếng Việt. */

const BRAND = 'FoodGo';
const BRAND_COLOR = 'FFEE4D2D';
const SOFT_COLOR = 'FFFFF1EC';
const FONT_REGULAR = resolve(process.cwd(), 'node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf');
const FONT_BOLD = resolve(process.cwd(), 'node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf');
const nf = new Intl.NumberFormat('vi-VN');
const pad = number => String(number).padStart(2, '0');

const isNumeric = type => type === 'money' || type === 'number' || type === 'percent';

/* Mã trạng thái trong DB -> nhãn tiếng Việt cho file xuất (theo tên cột) */
const STATUS_LABELS = {
  PENDING: 'Chờ xử lý', CONFIRMED: 'Đã xác nhận', PREPARING: 'Đang chuẩn bị', READY_FOR_PICKUP: 'Sẵn sàng giao', SHIPPER_ASSIGNED: 'Đã gán tài xế',
  PICKED_UP: 'Đã lấy hàng', DELIVERING: 'Đang giao', DELIVERED: 'Đã giao', CANCELLED: 'Đã huỷ', FAILED: 'Thất bại', PAID: 'Đã thanh toán',
  REFUNDED: 'Đã hoàn tiền', PROCESSING: 'Đang xử lý', COMPLETED: 'Hoàn tất', REJECTED: 'Từ chối', APPROVED: 'Đã duyệt', ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngừng', SUSPENDED: 'Tạm khoá', EXPIRED: 'Hết hạn', SETTLED: 'Đã chi trả', COLLECTED: 'Đã thu', AVAILABLE: 'Sẵn sàng', BUSY: 'Đang bận',
  OFFLINE: 'Ngoại tuyến', OPEN: 'Đang mở', RESOLVED: 'Đã xử lý', CLOSED: 'Đã đóng', ASSIGNED: 'Đã gán', ACCEPTED: 'Đã nhận'
};
const METHOD_LABELS = { COD: 'Tiền mặt (COD)', BANK_TRANSFER: 'Chuyển khoản', MOMO: 'MoMo', VNPAY: 'VNPay', ZALOPAY: 'ZaloPay', CARD: 'Thẻ', WALLET: 'Ví FoodGo' };
const TYPE_LABELS = { PERCENT: 'Giảm %', FIXED_AMOUNT: 'Giảm tiền', FREE_DELIVERY: 'Miễn phí giao' };

/** Dịch các cột mã (status/paymentMethod/...) sang tiếng Việt trước khi ghi file; dữ liệu JSON của web không bị đổi. */
export function localizeDataset(dataset) {
  const labelOf = key => (/method/i.test(key) ? METHOD_LABELS : /^(discountType|type)$/.test(key) ? TYPE_LABELS : /status/i.test(key) ? STATUS_LABELS : null);
  const maps = dataset.columns.map(column => (column.type === 'text' || !column.type ? labelOf(column.key) : null));
  if (!maps.some(Boolean)) return dataset;
  return {
    ...dataset,
    rows: dataset.rows.map(row => {
      const next = { ...row };
      dataset.columns.forEach((column, index) => { if (maps[index] && next[column.key] in maps[index]) next[column.key] = maps[index][next[column.key]]; });
      return next;
    })
  };
}

const PDF_MAX_ROWS = 2000;

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Chuỗi hiển thị (PDF/CSV) theo giờ địa phương của máy chủ (cùng múi giờ với DB). */
export function displayValue(value, type) {
  if (value === null || value === undefined || value === '') return '';
  if (type === 'money') return nf.format(Math.round(Number(value) || 0));
  if (type === 'number') return nf.format(Number(value) || 0);
  if (type === 'percent') return `${(Number(value) || 0).toFixed(1)}%`;
  if (type === 'date' || type === 'datetime') {
    const date = toDate(value);
    if (!date) return String(value);
    const day = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
    return type === 'date' ? day : `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  return String(value);
}

function generatedLine(meta) {
  const now = new Date();
  const stamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return `Xuất lúc ${stamp}${meta.user ? ` · Người xuất: ${meta.user}` : ''}${meta.filters ? ` · ${meta.filters}` : ''}`;
}

/* ---------------- Excel ---------------- */
export async function toXlsx(dataset, meta = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = BRAND;
  workbook.created = new Date();
  const sheetName = String(dataset.title || 'Báo cáo').replace(/[\\/*?:[\]]/g, ' ').slice(0, 31);
  const sheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 0 }] });
  const columns = dataset.columns;
  const lastCol = Math.max(columns.length, 4);

  sheet.mergeCells(1, 1, 1, lastCol);
  sheet.getCell(1, 1).value = `${BRAND} · ${dataset.title}`;
  sheet.getCell(1, 1).font = { name: 'Arial', size: 15, bold: true, color: { argb: BRAND_COLOR } };
  sheet.mergeCells(2, 1, 2, lastCol);
  sheet.getCell(2, 1).value = generatedLine(meta);
  sheet.getCell(2, 1).font = { name: 'Arial', size: 10, color: { argb: 'FF6B7280' } };

  let row = 3;
  if (dataset.summary?.length) {
    row += 1;
    dataset.summary.forEach((item, index) => {
      const labelCell = sheet.getCell(row, 1 + index * 2);
      const valueCell = sheet.getCell(row + 1, 1 + index * 2);
      labelCell.value = item.label;
      labelCell.font = { name: 'Arial', size: 9, color: { argb: 'FF6B7280' } };
      valueCell.value = isNumeric(item.type) ? Number(item.value) || 0 : displayValue(item.value, item.type);
      valueCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: BRAND_COLOR } };
      if (item.type === 'money') valueCell.numFmt = '#,##0" đ"';
      else if (item.type === 'number') valueCell.numFmt = '#,##0.##';
      valueCell.alignment = { horizontal: 'left' };
    });
    row += 3;
  } else {
    row += 1;
  }

  const headerRow = row;
  columns.forEach((column, index) => {
    const cell = sheet.getCell(headerRow, index + 1);
    cell.value = column.label;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFB4321A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT_COLOR } };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    cell.alignment = { vertical: 'middle', horizontal: isNumeric(column.type) ? 'right' : 'left', wrapText: true };
  });
  sheet.getRow(headerRow).height = 24;

  const widths = columns.map(column => Math.max(10, String(column.label).length + 2));
  dataset.rows.forEach((item, rowIndex) => {
    const excelRow = sheet.getRow(headerRow + 1 + rowIndex);
    columns.forEach((column, index) => {
      const cell = excelRow.getCell(index + 1);
      const value = item[column.key];
      cell.font = { name: 'Arial', size: 10 };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } } };
      if (value === null || value === undefined || value === '') { cell.value = null; return; }
      if (column.type === 'money') { cell.value = Number(value) || 0; cell.numFmt = '#,##0'; cell.alignment = { horizontal: 'right' }; }
      else if (column.type === 'number') { cell.value = Number(value) || 0; cell.numFmt = '#,##0.##'; cell.alignment = { horizontal: 'right' }; }
      else if (column.type === 'percent') { cell.value = (Number(value) || 0) / 100; cell.numFmt = '0.0%'; cell.alignment = { horizontal: 'right' }; }
      else if (column.type === 'date' || column.type === 'datetime') {
        const date = toDate(value);
        if (date) {
          // ExcelJS ghi theo UTC; dùng thành phần giờ địa phương để Excel hiển thị đúng giờ trong DB
          cell.value = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
          cell.numFmt = column.type === 'date' ? 'dd/mm/yyyy' : 'dd/mm/yyyy hh:mm';
        } else cell.value = String(value);
      } else cell.value = /^[=+\-@]/.test(String(value)) ? `'${value}` : String(value);
      widths[index] = Math.max(widths[index], Math.min(48, displayValue(value, column.type).length + 2));
    });
  });

  const lastDataRow = headerRow + dataset.rows.length;
  const moneyColumns = columns.map((column, index) => ({ column, index })).filter(({ column }) => column.type === 'money');
  if (dataset.rows.length && moneyColumns.length) {
    const totalRow = sheet.getRow(lastDataRow + 1);
    totalRow.getCell(1).value = `Tổng cộng (${nf.format(dataset.rows.length)} dòng)`;
    totalRow.getCell(1).font = { name: 'Arial', size: 10, bold: true };
    moneyColumns.forEach(({ index }) => {
      const letter = sheet.getColumn(index + 1).letter;
      const total = dataset.rows.reduce((sum, item) => sum + (Number(item[columns[index].key]) || 0), 0);
      const cell = totalRow.getCell(index + 1);
      cell.value = { formula: `SUBTOTAL(109,${letter}${headerRow + 1}:${letter}${lastDataRow})`, result: total };
      cell.numFmt = '#,##0';
      cell.font = { name: 'Arial', size: 10, bold: true };
    });
    totalRow.eachCell({ includeEmpty: true }, cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT_COLOR } }; });
  }

  widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  sheet.views = [{ state: 'frozen', ySplit: headerRow, xSplit: 0 }];
  if (dataset.rows.length) sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: lastDataRow, column: columns.length } };
  sheet.pageSetup = { orientation: columns.length > 7 ? 'landscape' : 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  sheet.headerFooter.oddFooter = `&L${BRAND}&CTrang &P / &N&R&D`;
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/* ---------------- PDF ---------------- */
export function toPdf(source, meta = {}) {
  return new Promise((resolvePdf, reject) => {
    const truncated = source.rows.length > PDF_MAX_ROWS;
    const dataset = truncated ? { ...source, rows: source.rows.slice(0, PDF_MAX_ROWS) } : source;
    const columns = dataset.columns;
    const fontSize = columns.length > 9 ? 7 : 8;
    const landscape = columns.length > 6;
    const doc = new PDFDocument({ size: 'A4', layout: landscape ? 'landscape' : 'portrait', margin: 32, bufferPages: true, info: { Title: dataset.title, Author: BRAND } });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolvePdf(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.registerFont('Regular', FONT_REGULAR);
    doc.registerFont('Bold', FONT_BOLD);

    const pageWidth = doc.page.width - 64;
    const bottom = () => doc.page.height - 48;

    // Độ rộng cột theo nội dung (có giới hạn), co lại cho vừa trang
    doc.font('Regular').fontSize(fontSize);
    const natural = columns.map(column => {
      const longest = dataset.rows.slice(0, 200).reduce((max, item) => Math.max(max, doc.widthOfString(displayValue(item[column.key], column.type))), doc.widthOfString(String(column.label)));
      return Math.min(Math.max(longest + 10, 36), column.type === 'text' ? 170 : 95);
    });
    const scale = pageWidth / natural.reduce((sum, width) => sum + width, 0);
    const widths = natural.map(width => width * scale);

    const drawHead = () => {
      doc.rect(32, 32, pageWidth, 4).fill(BRAND_COLOR.slice(2).replace(/^/, '#'));
      doc.fillColor('#ee4d2d').font('Bold').fontSize(16).text(BRAND, 32, 44, { continued: false });
      doc.fillColor('#1f2937').font('Bold').fontSize(13).text(dataset.title, 32, 64, { width: pageWidth * 0.6 });
      doc.fillColor('#6b7280').font('Regular').fontSize(8).text(generatedLine(meta), 32 + pageWidth * 0.55, 46, { width: pageWidth * 0.45, align: 'right' });
      return 90;
    };

    const drawTableHeader = y => {
      doc.rect(32, y, pageWidth, 20).fill('#fff1ec');
      let x = 32;
      doc.fillColor('#b4321a').font('Bold').fontSize(fontSize);
      columns.forEach((column, index) => {
        doc.text(String(column.label), x + 4, y + 6, { width: widths[index] - 8, align: isNumeric(column.type) ? 'right' : 'left', lineBreak: false, ellipsis: true });
        x += widths[index];
      });
      return y + 22;
    };

    let y = drawHead();
    if (dataset.summary?.length) {
      const boxWidth = Math.min(150, (pageWidth - 8 * (dataset.summary.length - 1)) / dataset.summary.length);
      dataset.summary.slice(0, Math.floor(pageWidth / (boxWidth + 8))).forEach((item, index) => {
        const x = 32 + index * (boxWidth + 8);
        doc.roundedRect(x, y, boxWidth, 38, 5).fill('#fff7f4');
        doc.fillColor('#6b7280').font('Regular').fontSize(7).text(item.label, x + 7, y + 6, { width: boxWidth - 14, lineBreak: false, ellipsis: true });
        doc.fillColor('#ee4d2d').font('Bold').fontSize(11).text(displayValue(item.value, item.type) + (item.type === 'money' ? ' đ' : ''), x + 7, y + 19, { width: boxWidth - 14, lineBreak: false, ellipsis: true });
      });
      y += 48;
    }
    y = drawTableHeader(y);

    const totals = columns.map(column => (column.type === 'money' ? dataset.rows.reduce((sum, item) => sum + (Number(item[column.key]) || 0), 0) : null));
    const drawRow = (cells, rowY, { bold = false, fill = null } = {}) => {
      doc.font(bold ? 'Bold' : 'Regular').fontSize(fontSize);
      const heights = cells.map((text, index) => doc.heightOfString(text, { width: widths[index] - 8 }));
      const height = Math.max(16, Math.max(...heights) + 8);
      return { height, draw: () => {
        if (fill) doc.rect(32, rowY, pageWidth, height).fill(fill);
        let x = 32;
        doc.fillColor('#1f2937').font(bold ? 'Bold' : 'Regular').fontSize(fontSize);
        cells.forEach((text, index) => {
          doc.text(text, x + 4, rowY + 4, { width: widths[index] - 8, align: isNumeric(columns[index].type) ? 'right' : 'left' });
          x += widths[index];
        });
        doc.moveTo(32, rowY + height).lineTo(32 + pageWidth, rowY + height).lineWidth(0.4).strokeColor('#e5e7eb').stroke();
      } };
    };

    dataset.rows.forEach((item, index) => {
      const cells = columns.map(column => displayValue(item[column.key], column.type));
      const row = drawRow(cells, y, { fill: index % 2 ? '#fafafa' : null });
      if (y + row.height > bottom()) {
        doc.addPage();
        y = drawTableHeader(drawHead());
      }
      const placed = drawRow(cells, y, { fill: index % 2 ? '#fafafa' : null });
      placed.draw();
      y += placed.height;
    });
    if (!dataset.rows.length) { doc.fillColor('#6b7280').font('Regular').fontSize(10).text('Không có dữ liệu.', 36, y + 6); }
    else if (totals.some(total => total !== null)) {
      const cells = columns.map((column, index) => (index === 0 ? `Tổng cộng (${nf.format(dataset.rows.length)} dòng)` : totals[index] !== null ? nf.format(Math.round(totals[index])) : ''));
      const row = drawRow(cells, y, { bold: true, fill: '#fff1ec' });
      if (y + row.height > bottom()) { doc.addPage(); y = drawHead(); }
      drawRow(cells, y, { bold: true, fill: '#fff1ec' }).draw();
    }

    if (truncated) {
      doc.fillColor('#b4321a').font('Regular').fontSize(8).text(`Chỉ hiển thị ${nf.format(PDF_MAX_ROWS)} / ${nf.format(source.rows.length)} dòng đầu. Dùng file Excel hoặc CSV để lấy đầy đủ dữ liệu.`, 32, Math.min(y + 14, bottom()), { width: pageWidth });
    }
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
      doc.switchToPage(range.start + i);
      doc.fillColor('#9ca3af').font('Regular').fontSize(8)
        .text(`${BRAND} · Báo cáo tạo tự động từ hệ thống · Trang ${i + 1}/${range.count}`, 32, doc.page.height - 30, { width: pageWidth, align: 'center', lineBreak: false });
    }
    doc.end();
  });
}
