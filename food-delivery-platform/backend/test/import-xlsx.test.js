import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { parseXlsx } from '../src/modules/jobs/job.service.js';

async function workbookBuffer(rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Nhập liệu');
  rows.forEach(row => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

test('đọc file .xlsx: tiêu đề viết thường, bỏ dòng trống, giữ tiếng Việt', async () => {
  const buffer = await workbookBuffer([['Name', 'Price', 'Description'], ['Bún chả', 45000, 'Chả nướng'], [], ['Phở bò', 50000, '']]);
  const rows = await parseXlsx(buffer);
  assert.deepEqual(rows, [
    { name: 'Bún chả', price: '45000', description: 'Chả nướng' },
    { name: 'Phở bò', price: '50000', description: '' }
  ]);
});

test('file .xlsx chỉ có tiêu đề bị từ chối', async () => {
  const buffer = await workbookBuffer([['name', 'price']]);
  await assert.rejects(() => parseXlsx(buffer), /header and at least one row/);
});

test('nội dung không phải .xlsx bị từ chối', async () => {
  await assert.rejects(() => parseXlsx(Buffer.from('không phải excel')), /không đọc được/);
});
