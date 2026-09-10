import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = 'C:/Users/LENOVO/Downloads/Master Plan.xlsx';
const outputDir = 'C:/Users/LENOVO/Desktop/PMDV/outputs/master-plan';

await fs.mkdir(outputDir, { recursive: true });

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const summary = await workbook.inspect({
  kind: 'workbook,sheet,table,region',
  maxChars: 14000,
  tableMaxRows: 60,
  tableMaxCols: 12,
  tableMaxCellChars: 140
});

await fs.writeFile(`${outputDir}/master-plan-inspect.ndjson`, summary.ndjson, 'utf8');
const plan = workbook.worksheets.getItem('Plan');
const infrastructure = workbook.worksheets.getItem('Ha tang Dasuka');
const logs = workbook.worksheets.getItem('Logs');
const details = {
  planValues: plan.getRange('A1:BR39').values,
  planFormulas: plan.getRange('A1:BR39').formulas,
  planStyle: await workbook.inspect({
    kind: 'computedStyle',
    sheetId: 'Plan',
    range: 'A1:J10',
    maxChars: 10000
  }),
  planTables: plan.tables.items.map(table => ({
    name: table.name,
    range: table.getRange?.().address ?? null,
    style: table.style
  })),
  infrastructureValues: infrastructure.getRange('A1:C11').values,
  logsValues: logs.getRange('A1:E20').values
};
await fs.writeFile(
  `${outputDir}/master-plan-details.json`,
  JSON.stringify(details, null, 2),
  'utf8'
);
for (const sheetName of ['Plan', 'Ha tang Dasuka', 'Logs']) {
  const preview = await workbook.render({
    sheetName,
    autoCrop: 'all',
    scale: 1,
    format: 'png'
  });
  await fs.writeFile(
    `${outputDir}/${sheetName.replaceAll(' ', '-').toLowerCase()}.png`,
    new Uint8Array(await preview.arrayBuffer())
  );
}
console.log(summary.ndjson);
