import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('../src/modules/management/management.routes.js', import.meta.url), 'utf8');
const section = start => { const i = routes.indexOf(start); assert.ok(i >= 0, start); const next = routes.indexOf('\nadminManageRoutes.', i + 10); return routes.slice(i, next < 0 ? undefined : next); };

test('danh sách admin shippers/promotions/refunds/settlements PHÂN TRANG thật và trả totalItems đếm COUNT(*) riêng (không lấy độ dài trang)', () => {
  for (const [start, countFrom] of [["adminManageRoutes.get('/settlements',", 'FROM restaurant_settlements s'], ["adminManageRoutes.get('/shippers',", 'FROM shipper_profiles sp'], ["adminManageRoutes.get('/promotions',", 'FROM promotions p'], ["adminManageRoutes.get('/refunds',", 'FROM refunds f']]) {
    const body = section(start);
    assert.ok(body.includes('COUNT(*) AS total'), `${start} thiếu COUNT(*)`);
    assert.ok(body.includes(countFrom), `${start} thiếu ${countFrom}`);
    assert.ok(body.includes('LIMIT ? OFFSET ?'), `${start} chưa phân trang thật`);
    assert.ok(body.includes('pagedMeta(page, pageSize, Number('), `${start} thiếu pagedMeta`);
    assert.ok(body.includes('paging(req)'), `${start} chưa dùng readPagination chung`);
    assert.ok(!/LIMIT (200|300)\b/.test(body), `${start} còn LIMIT cứng`);
    assert.ok(!body.includes('totalItems: rows.length'), `${start} không được dùng rows.length`);
  }
});
test('shippers: điều kiện tìm kiếm của COUNT trùng với truy vấn danh sách (cùng where.join)', () => {
  const body = section("adminManageRoutes.get('/shippers',");
  assert.equal((body.match(/where\.join\(' AND '\)/g) ?? []).length, 2);
});
test('docs/openapi.json chứa /api/notifications/read-all cho cả PATCH và POST (chặn lỗi sinh thiếu)', () => {
  const doc = JSON.parse(readFileSync(new URL('../../../docs/openapi.json', import.meta.url), 'utf8'));
  const entry = doc.paths['/api/notifications/read-all'];
  assert.ok(entry?.patch, 'thiếu PATCH read-all');
  assert.ok(entry?.post, 'thiếu POST read-all');
  assert.ok(doc.paths['/api/notifications/{notificationId}/read']?.patch);
  assert.ok(doc.paths['/api/deliveries/reviews']?.get && doc.paths['/api/admin/dashboard/data-quality']?.get);
});
test('tools/generate-dev-docs.mjs gọi generate-openapi TRƯỚC process.exit (lỗi cũ: lệnh nằm sau exit nên không bao giờ chạy)', () => {
  const source = readFileSync(new URL('../../../tools/generate-dev-docs.mjs', import.meta.url), 'utf8');
  const call = source.indexOf('generate-openapi.mjs');
  const exit = source.lastIndexOf('process.exit(0)');
  assert.ok(call > 0 && exit > call, 'generate-openapi phải được gọi trước process.exit(0)');
});
