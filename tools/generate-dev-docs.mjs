/* Sinh tài liệu kỹ thuật tự động cho lần làm việc sau:
     docs/dev/db-schema.md   — bảng, cột, khoá ngoại, chỉ mục, trigger, đếm bản ghi (từ information_schema của DB đang chạy)
     docs/dev/api-routes.md  — toàn bộ route Express: method, đường dẫn, vai trò/quyền (quét trực tiếp stack của app)
   Chạy:  node tools/generate-dev-docs.mjs   (cần DB đang chạy; chạy lại sau mỗi lần đổi schema hoặc route) */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(root, 'food-delivery-platform', 'backend');
process.chdir(backend);
const { default: mysql } = await import(pathToFileURL(resolve(backend, 'node_modules/mysql2/promise.js')).href);
await import(pathToFileURL(resolve(backend, 'node_modules/dotenv/config.js')).href);
const out = resolve(root, 'docs', 'dev');
await mkdir(out, { recursive: true });

/* ============ 1. Schema ============ */
const db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4' });
const q = async (sql, params = []) => (await db.query(sql, params))[0];
const schema = process.env.DB_NAME;

const tables = await q('SELECT TABLE_NAME AS name, TABLE_ROWS AS approx_rows, TABLE_COMMENT AS comment FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = \'BASE TABLE\' ORDER BY TABLE_NAME', [schema]);
const columns = await q('SELECT TABLE_NAME t, COLUMN_NAME c, COLUMN_TYPE type, IS_NULLABLE nullable, COLUMN_DEFAULT def, COLUMN_KEY k, EXTRA extra, COLUMN_COMMENT comment FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, ORDINAL_POSITION', [schema]);
const fks = await q('SELECT k.TABLE_NAME t, k.COLUMN_NAME c, k.REFERENCED_TABLE_NAME rt, k.REFERENCED_COLUMN_NAME rc, r.DELETE_RULE del FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_NAME = k.CONSTRAINT_NAME AND r.CONSTRAINT_SCHEMA = k.TABLE_SCHEMA WHERE k.TABLE_SCHEMA = ? AND k.REFERENCED_TABLE_NAME IS NOT NULL ORDER BY k.TABLE_NAME, k.COLUMN_NAME', [schema]);
const indexes = await q('SELECT TABLE_NAME t, INDEX_NAME i, NON_UNIQUE nu, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) cols FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND INDEX_NAME <> \'PRIMARY\' GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE ORDER BY TABLE_NAME, INDEX_NAME', [schema]);
const triggers = await q('SELECT TRIGGER_NAME n, EVENT_MANIPULATION e, ACTION_TIMING tm, EVENT_OBJECT_TABLE t, ACTION_STATEMENT stmt FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ? ORDER BY EVENT_OBJECT_TABLE, TRIGGER_NAME', [schema]);
const checks = await q('SELECT tc.TABLE_NAME t, tc.CONSTRAINT_NAME n, cc.CHECK_CLAUSE clause FROM information_schema.TABLE_CONSTRAINTS tc JOIN information_schema.CHECK_CONSTRAINTS cc ON cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME AND cc.CONSTRAINT_SCHEMA = tc.TABLE_SCHEMA WHERE tc.TABLE_SCHEMA = ? AND tc.CONSTRAINT_TYPE = \'CHECK\' ORDER BY tc.TABLE_NAME', [schema]);
const counts = {};
for (const table of tables) counts[table.name] = Number((await q(`SELECT COUNT(*) AS n FROM \`${table.name}\``))[0].n);

/* Nhóm bảng theo miền nghiệp vụ (bảng chưa có trong nhóm nào rơi vào "Khác") */
const DOMAINS = [
  ['Tài khoản, phân quyền, bảo mật', ['users', 'roles', 'permissions', 'role_permissions', 'refresh_tokens', 'password_reset_tokens', 'email_verification_tokens', 'login_history', 'audit_logs', 'security_events', 'partner_applications', 'system_settings']],
  ['Khách hàng, địa chỉ', ['customer_profiles', 'customer_addresses', 'favorite_restaurants', 'favorite_menu_items', 'search_history']],
  ['Nhà hàng, thực đơn, combo', ['restaurant_categories', 'restaurants', 'restaurant_images', 'restaurant_operating_hours', 'menus', 'menu_categories', 'menu_items', 'menu_item_variants', 'topping_groups', 'toppings', 'menu_item_topping_groups', 'menu_item_combo_components', 'delivery_zones']],
  ['Giỏ hàng, đơn hàng', ['carts', 'cart_items', 'cart_item_toppings', 'orders', 'order_items', 'order_item_toppings', 'order_status_history', 'order_cancellations']],
  ['Tài xế, giao hàng', ['shipper_profiles', 'shipper_documents', 'delivery_assignments', 'deliveries', 'delivery_status_history', 'shipper_locations', 'shipper_earnings', 'shipper_withdrawals']],
  ['Thanh toán, tài chính', ['payments', 'payment_transactions', 'cod_transactions', 'refunds', 'invoices', 'wallets', 'wallet_transactions', 'restaurant_commissions', 'restaurant_settlements']],
  ['Khuyến mãi, điểm thưởng', ['promotions', 'promotion_usage', 'loyalty_rewards', 'loyalty_transactions', 'banners']],
  ['Đánh giá, hỗ trợ, giao tiếp', ['restaurant_reviews', 'shipper_reviews', 'menu_item_reviews', 'support_tickets', 'support_messages', 'chat_sessions', 'chat_messages', 'notifications', 'notification_preferences']],
  ['Job nền, nhập/xuất', ['export_jobs', 'import_jobs', 'background_jobs']]
];
const placed = new Set(DOMAINS.flatMap(([, list]) => list));
const rest = tables.map(t => t.name).filter(name => !placed.has(name));
if (rest.length) DOMAINS.push(['Khác', rest]);

const esc = text => String(text ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
let md = `# Database schema\n\n> Sinh tự động bởi \`tools/generate-dev-docs.mjs\` lúc ${new Date().toISOString()} từ DB \`${schema}\`. **Đừng sửa tay** — chạy lại script sau khi đổi schema.\n\n`;
md += `- ${tables.length} bảng, ${triggers.length} trigger, ${fks.length} khoá ngoại. Nguồn sự thật của schema: \`food_delivery_db.sql\` (gốc) + \`food-delivery-platform/backend/database/migrations/*.sql\` (áp theo thứ tự tên file).\n`;
md += `- Kiểu tiền: \`DECIMAL(15,2)\` (VND). Thời gian: \`DATETIME\` naive theo giờ địa phương (UTC+7), mysql2 trả \`Date\`. Xoá mềm bằng cột \`deleted_at\`.\n`;
md += `- Số bản ghi hiện tại ở cột "Dòng" (đếm thật, không phải ước lượng).\n\n## Mục lục theo miền\n\n`;
for (const [title, list] of DOMAINS) md += `- **${title}**: ${list.filter(n => counts[n] !== undefined).map(n => `[${n}](#${n})`).join(', ')}\n`;
md += '\n';
const byTable = (rows, key = 't') => rows.reduce((map, row) => { (map[row[key]] ??= []).push(row); return map; }, {});
const colsBy = byTable(columns); const fkBy = byTable(fks); const idxBy = byTable(indexes); const trgBy = byTable(triggers); const chkBy = byTable(checks);
for (const [title, list] of DOMAINS) {
  md += `## ${title}\n\n`;
  for (const name of list.filter(n => counts[n] !== undefined)) {
    md += `### ${name}\n\n*${counts[name].toLocaleString('en-US')} dòng*\n\n| Cột | Kiểu | Null | Mặc định | Ghi chú |\n|---|---|---|---|---|\n`;
    for (const c of colsBy[name] ?? []) {
      const notes = [c.k === 'PRI' ? 'PK' : c.k === 'UNI' ? 'UNIQUE' : '', c.extra, ...(fkBy[name] ?? []).filter(f => f.c === c.c).map(f => `FK → ${f.rt}.${f.rc} (${f.del})`)].filter(Boolean).join('; ');
      md += `| ${c.c} | ${esc(c.type)} | ${c.nullable === 'YES' ? '✓' : ''} | ${esc(c.def)} | ${esc(notes)} |\n`;
    }
    if (idxBy[name]?.length) md += `\nChỉ mục: ${idxBy[name].map(i => `\`${i.i}\`(${i.cols})${Number(i.nu) ? '' : ' UNIQUE'}`).join(', ')}\n`;
    if (chkBy[name]?.length) md += `\nCHECK: ${chkBy[name].map(c => `\`${c.clause}\``).join('; ')}\n`;
    if (trgBy[name]?.length) md += `\nTrigger: ${trgBy[name].map(t => `\`${t.n}\` (${t.tm} ${t.e})`).join(', ')}\n`;
    md += '\n';
  }
}
md += `## Trigger (nội dung đầy đủ)\n\nTrigger giữ số liệu thống kê/điểm thưởng/lịch sử nhất quán — **không cập nhật các cột này bằng tay hoặc trong code ứng dụng**, trừ khi cố ý.\n\n`;
for (const t of triggers) md += `### ${t.n}\n\n\`${t.tm} ${t.e} ON ${t.t}\`\n\n\`\`\`sql\n${t.stmt.trim()}\n\`\`\`\n\n`;
await writeFile(resolve(out, 'db-schema.md'), md);
await db.end();

/* ============ 2. Route ============ */
const { createApp } = await import(pathToFileURL(resolve(backend, 'src/app.js')).href);
const app = createApp();
function pathOf(layer) {
  if (layer.route) return layer.route.path;
  const source = layer.regexp.source;
  if (source === '^\\/?(?=\\/|$)') return '';
  return source.replace('^\\/', '/').replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/').replace(/^\^/, '');
}
const routes = [];
function walk(stack, prefix) {
  for (const layer of stack) {
    if (layer.route) {
      for (const method of Object.keys(layer.route.methods)) routes.push({ method: method.toUpperCase(), path: `${prefix}${layer.route.path === '/' ? '' : layer.route.path}` || '/', handlers: layer.route.stack.map(h => h.name || 'handler') });
    } else if (layer.name === 'router' && layer.handle?.stack) {
      walk(layer.handle.stack, `${prefix}${pathOf(layer)}`);
    }
  }
}
walk(app._router.stack, '');
const api = routes.filter(r => r.path.startsWith('/api') || r.path.startsWith('/health'));
const group = path => (path.split('/')[2] ?? 'root') + (path.split('/')[3] && !path.split('/')[3].startsWith(':') && ['admin', 'restaurant', 'customer', 'analytics', 'shippers'].includes(path.split('/')[2]) ? `/${path.split('/')[3]}` : '');
const grouped = api.reduce((map, r) => { (map[group(r.path)] ??= []).push(r); return map; }, {});
let rmd = `# API routes\n\n> Sinh tự động bởi \`tools/generate-dev-docs.mjs\` lúc ${new Date().toISOString()} bằng cách quét stack Express của \`createApp()\`. **Đừng sửa tay.** Mô tả chi tiết tham số/response nằm ở \`docs/openapi.json\` (Swagger tại \`/api/docs\`).\n\n`;
rmd += `Tổng cộng **${api.length} route**. Xác thực: header \`Authorization: Bearer <accessToken>\` (JWT), lấy từ \`POST /api/auth/login\`. Phân quyền: middleware \`requireRole\`/\`requirePermission\` khai báo trong file \`*.routes.js\` của từng module — xem bảng module ↔ prefix trong \`docs/dev/architecture.md\`.\n\n`;
for (const [key, list] of Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))) {
  rmd += `## /api/${key}\n\n| Method | Đường dẫn |\n|---|---|\n`;
  for (const r of list.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))) rmd += `| ${r.method} | \`${r.path}\` |\n`;
  rmd += '\n';
}
await writeFile(resolve(out, 'api-routes.md'), rmd);
console.log(`db-schema.md: ${tables.length} bảng, ${triggers.length} trigger | api-routes.md: ${api.length} route`);
// Làm mới luôn docs/openapi.json từ route thật (tools/generate-openapi.mjs)
const { execFileSync } = await import('node:child_process');
console.log(execFileSync(process.execPath, [resolve(dirname(fileURLToPath(import.meta.url)), 'generate-openapi.mjs')], { encoding: 'utf8' }).trim());

process.exit(0);
