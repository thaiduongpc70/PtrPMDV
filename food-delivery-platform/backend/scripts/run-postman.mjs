/* Runs the Postman collection stored in /postman (git-native YAML format) with newman.
   Usage: node scripts/run-postman.mjs [--folder "99 - Full E2E Flow"] [--base http://localhost:3002] [--export out.json] [--no-history]
   The API must already be running on a COPY of the database (the collection writes data): see docs/user-guide.md.
   Every run is recorded under /postman/runs (history.json, HISTORY.md and one detailed report per run), and the
   converted v2.1 collection is written to /postman/exports so it can be imported into the Postman app. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const newman = require('newman');
const YAML = require('yaml');

const here = path.dirname(fileURLToPath(import.meta.url));
const collectionDir = path.resolve(here, '../../../postman/collections/Food Delivery API - Tested Flow');

const args = process.argv.slice(2);
const option = name => {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1];
};
const folders = args.flatMap((arg, index) => (arg === '--folder' ? [args[index + 1]] : []));
const baseUrl = option('--base') || 'http://localhost:3002';
const postmanDir = path.resolve(collectionDir, '../..');
const saveHistory = !args.includes('--no-history');

const readYaml = file => YAML.parse(fs.readFileSync(file, 'utf8'));

function toScripts(scripts = []) {
  return scripts.map(script => ({
    listen: script.type === 'beforeRequest' ? 'prerequest' : 'test',
    script: { type: 'text/javascript', exec: String(script.code).split('\n') }
  }));
}

function toRequest(file, name) {
  const doc = readYaml(file);
  const headers = Object.entries(doc.headers || {}).map(([key, value]) => ({ key, value: String(value) }));
  const item = {
    name,
    request: {
      method: doc.method || 'GET',
      header: headers,
      url: String(doc.url),
      ...(doc.body ? { body: { mode: 'raw', raw: String(doc.body.content), options: { raw: { language: 'json' } } } } : {})
    },
    event: toScripts(doc.scripts)
  };
  if (doc.auth?.type === 'noauth') item.request.auth = { type: 'noauth' };
  return { order: doc.order ?? 0, item };
}

function toFolder(dir, name) {
  const meta = fs.existsSync(path.join(dir, '.resources/definition.yaml')) ? readYaml(path.join(dir, '.resources/definition.yaml')) : {};
  const children = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.resources') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) children.push(toFolder(full, entry.name));
    else if (entry.name.endsWith('.request.yaml')) children.push(toRequest(full, entry.name.replace(/\.request\.yaml$/, '')));
  }
  children.sort((a, b) => a.order - b.order || a.item.name.localeCompare(b.item.name));
  return { order: meta.order ?? 0, item: { name, item: children.map(child => child.item) } };
}

const root = readYaml(path.join(collectionDir, '.resources/definition.yaml'));
const top = toFolder(collectionDir, 'Food Delivery API');
const selected = top.item.item.filter(folder => !folders.length || folders.includes(folder.name));
if (!selected.length) {
  console.error(`Không tìm thấy folder: ${folders.join(', ')}\nCó: ${top.item.item.map(f => f.name).join(' | ')}`);
  process.exit(2);
}

const collection = {
  info: { _postman_id: '6f1c2b0e-4d3a-4f7e-9a51-fd0e11e7c001', name: 'Food Delivery API - Tested Flow', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
  item: selected,
  event: toScripts(root.scripts),
  variable: Object.entries(root.variables || {}).map(([key, value]) => ({ key, value: key === 'baseUrl' ? baseUrl : String(value) })),
  auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }] }
};

const pad = n => String(n).padStart(2, '0');
const stamp = date => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

function recordHistory(summary, startedAt) {
  const executions = summary.run.executions.map(execution => {
    const assertions = execution.assertions || [];
    return {
      folder: execution.item.parent?.()?.name || '',
      name: execution.item.name,
      method: execution.request?.method,
      url: execution.request?.url?.toString?.(),
      status: execution.response?.code ?? null,
      timeMs: execution.response?.responseTime ?? null,
      assertions: assertions.map(a => ({ name: a.assertion, passed: !a.error, error: a.error?.message })),
      error: execution.requestError?.message
    };
  });
  const stats = summary.run.stats;
  const record = {
    id: stamp(startedAt),
    startedAt: startedAt.toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    scope: folders.length ? folders.join(' + ') : 'Toàn bộ collection',
    baseUrl,
    requests: stats.requests.total,
    assertions: stats.assertions.total,
    failedAssertions: stats.assertions.failed,
    requestErrors: summary.run.failures.length - stats.assertions.failed,
    result: summary.run.failures.length ? 'FAILED' : 'PASSED'
  };

  const runsDir = path.join(postmanDir, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  fs.writeFileSync(path.join(runsDir, `${record.id}.json`), JSON.stringify({ ...record, failures: summary.run.failures.map(f => ({ source: f.source?.name, message: f.error?.message })), executions }, null, 2));

  const historyFile = path.join(runsDir, 'history.json');
  let history = [];
  try { history = JSON.parse(fs.readFileSync(historyFile, 'utf8')); } catch { /* first run */ }
  history = [record, ...history.filter(item => item.id !== record.id)].slice(0, 200);
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));

  const rows = history.map(item => `| ${item.result === 'PASSED' ? '✅' : '❌'} | ${new Date(item.startedAt).toLocaleString('vi-VN')} | ${item.scope} | ${item.requests} | ${item.assertions} | ${item.failedAssertions + item.requestErrors} | ${(item.durationMs / 1000).toFixed(1)}s | runs/${item.id}.json |`);
  fs.writeFileSync(path.join(runsDir, 'HISTORY.md'), [
    '# Lịch sử chạy test Postman', '',
    'Tạo tự động bởi `npm run test:postman` / `npm run test:e2e`. Mới nhất ở trên cùng.', '',
    '| KQ | Thời điểm | Phạm vi | Requests | Assertions | Lỗi | Thời gian | Báo cáo chi tiết |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | --- |', ...rows, ''
  ].join('\n'));
  return record;
}

// Importable into the Postman desktop app (Import → file) so runs there are kept in Postman's own history too.
if (saveHistory && !folders.length) {
  const exportsDir = path.join(postmanDir, 'exports');
  fs.mkdirSync(exportsDir, { recursive: true });
  fs.writeFileSync(path.join(exportsDir, 'Food Delivery API.postman_collection.json'), JSON.stringify(collection, null, 2));
}

const startedAt = new Date();
newman.run({
  collection,
  reporters: ['cli', ...(option('--export') ? ['json'] : [])],
  reporter: option('--export') ? { json: { export: option('--export') } } : {},
  delayRequest: 20,
  timeoutRequest: 20000,
  insecure: true
}, (error, summary) => {
  if (error) { console.error(error); process.exit(2); }
  const failures = summary.run.failures.length;
  console.log(`
Requests: ${summary.run.stats.requests.total} · Assertions: ${summary.run.stats.assertions.total} · Failed: ${summary.run.stats.assertions.failed} · Request errors: ${failures - summary.run.stats.assertions.failed}`);
  if (saveHistory) {
    const record = recordHistory(summary, startedAt);
    console.log(`Đã lưu lịch sử: postman/runs/${record.id}.json  (tổng hợp: postman/runs/HISTORY.md)`);
  }
  process.exit(failures ? 1 : 0);
});
