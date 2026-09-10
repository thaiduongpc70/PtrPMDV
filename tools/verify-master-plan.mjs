import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = 'C:/Users/LENOVO/Desktop/PMDV/outputs/master-plan/Master Plan.xlsx';
const reportPath = 'C:/Users/LENOVO/Desktop/PMDV/outputs/master-plan/export-verify.ndjson';

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const formulaErrors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 100 },
  summary: 'exported workbook formula error scan'
});

if (/#REF!|#DIV\/0!|#VALUE!|#NAME\?|#N\/A/.test(formulaErrors.ndjson)) {
  throw new Error(`Formula errors found after re-import:\n${formulaErrors.ndjson}`);
}

const workbookSummary = await workbook.inspect({
  kind: 'workbook,sheet,table,region',
  maxChars: 12000,
  tableMaxRows: 6,
  tableMaxCols: 8,
  tableMaxCellChars: 120
});
await fs.writeFile(reportPath, workbookSummary.ndjson, 'utf8');

const summary = workbook.worksheets.getItem('Summary');
const plan = workbook.worksheets.getItem('Plan');
const sqlCoverage = workbook.worksheets.getItem('SQL coverage');
const requirements = workbook.worksheets.getItem('Yeu cau');
const checks = {
  sheetNames: workbook.worksheets.items.map((sheet) => sheet.name),
  summaryProgressFormula: summary.getRange('A5').formulas[0][0],
  planUsedRange: plan.getUsedRange().address,
  sqlCoverageUsedRange: sqlCoverage.getUsedRange().address,
  requirementsUsedRange: requirements.getUsedRange().address,
  formulaErrors: 'none'
};

console.log(JSON.stringify(checks, null, 2));
