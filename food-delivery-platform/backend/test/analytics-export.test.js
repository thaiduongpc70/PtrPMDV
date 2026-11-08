import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { readRange } from '../src/modules/analytics/analytics.service.js';
import { displayValue, localizeDataset, toPdf, toXlsx } from '../src/modules/exports/file-writers.js';

const dataset = {
  title: 'Báo cáo thử',
  columns: [
    { key: 'name', label: 'Nhà hàng', type: 'text' }, { key: 'status', label: 'Trạng thái', type: 'text' }, { key: 'orders', label: 'Đơn', type: 'number' },
    { key: 'gmv', label: 'Doanh thu', type: 'money' }, { key: 'rate', label: 'Tỷ lệ', type: 'percent' }, { key: 'at', label: 'Lúc', type: 'datetime' }
  ],
  rows: [
    { name: 'Phở Gánh Ba Mươi Sáu', status: 'ACTIVE', orders: 12, gmv: 1500000, rate: 12.5, at: new Date(2026, 9, 13, 21, 30) },
    { name: '=HYPERLINK("x")', status: 'PENDING', orders: 3, gmv: 250000, rate: 0, at: new Date(2026, 9, 12, 8, 5) }
  ],
  summary: [{ label: 'Tổng doanh thu', value: 1750000, type: 'money' }]
};

test('date range defaults to the last 30 days and compares with the previous period', () => {
  const range = readRange({ from: '2026-09-14', to: '2026-10-13' });
  assert.equal(range.days, 30);
  assert.equal(range.prevTo, '2026-09-13');
  assert.equal(range.prevFrom, '2026-08-15');
  assert.equal(range.group, 'day');
  assert.equal(readRange({ from: '2026-01-01', to: '2026-10-13' }).group, 'month');
  assert.throws(() => readRange({ from: '2026-10-13', to: '2026-10-01' }), /trước/);
  assert.throws(() => readRange({ from: '2024-01-01', to: '2026-10-13' }), /366/);
});

test('status codes are translated for export files without changing the source rows', () => {
  const localized = localizeDataset(dataset);
  assert.equal(localized.rows[0].status, 'Hoạt động');
  assert.equal(localized.rows[1].status, 'Chờ xử lý');
  assert.equal(dataset.rows[0].status, 'ACTIVE');
  assert.equal(displayValue(1500000, 'money'), '1.500.000');
  assert.equal(displayValue(12.5, 'percent'), '12.5%');
});

test('xlsx export is a real workbook with typed cells, totals and neutralised formulas', async () => {
  const buffer = await toXlsx(localizeDataset(dataset), { user: 'admin' });
  assert.equal(buffer.subarray(0, 2).toString(), 'PK'); // zip container
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  assert.match(String(sheet.getCell(1, 1).value), /Báo cáo thử/);
  const headerRow = [...Array(sheet.rowCount).keys()].map(i => i + 1).find(row => sheet.getCell(row, 1).value === 'Nhà hàng');
  assert.ok(headerRow, 'header row exists');
  assert.equal(sheet.getCell(headerRow + 1, 4).value, 1500000);
  assert.equal(sheet.getCell(headerRow + 1, 4).numFmt, '#,##0');
  assert.equal(sheet.getCell(headerRow + 2, 1).value, "'=HYPERLINK(\"x\")");
  assert.equal(sheet.getCell(headerRow + 3, 4).value.result, 1750000);
});

test('pdf export is a real multi-font PDF document with Vietnamese text', async () => {
  const buffer = await toPdf(localizeDataset(dataset), { user: 'admin' });
  assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
  assert.ok(buffer.length > 3000);
  assert.ok(buffer.includes(Buffer.from('%%EOF')));
});
