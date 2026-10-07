import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, parseSpreadsheetXml } from '../src/modules/jobs/job.service.js';

test('CSV parser handles quoted commas and escaped quotes', () => {
  const rows = parseCsv('name,description,base_price\n"Pho","Noodle, beef","55000"\n"Tea","He said ""fresh""",25000');
  assert.deepEqual(rows, [
    { name: 'Pho', description: 'Noodle, beef', base_price: '55000' },
    { name: 'Tea', description: 'He said "fresh"', base_price: '25000' }
  ]);
});

test('CSV parser rejects a header without data rows', () => {
  assert.throws(() => parseCsv('name,base_price'), /header and at least one row/);
});

test('SpreadsheetML parser imports Excel-compatible rows', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Import"><Table>
    <Row><Cell><Data ss:Type="String">name</Data></Cell><Cell><Data ss:Type="String">base_price</Data></Cell></Row>
    <Row><Cell><Data ss:Type="String">Bún bò &amp; chả</Data></Cell><Cell><Data ss:Type="Number">65000</Data></Cell></Row>
  </Table></Worksheet>
</Workbook>`;
  assert.deepEqual(parseSpreadsheetXml(xml), [{ name: 'Bún bò & chả', base_price: '65000' }]);
});

test('SpreadsheetML parser rejects unsupported Excel content', () => {
  assert.throws(() => parseSpreadsheetXml('not excel'), /SpreadsheetML/);
});
