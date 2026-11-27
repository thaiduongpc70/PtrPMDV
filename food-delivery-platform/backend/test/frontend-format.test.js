import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

/* Hàm định dạng số/tiền của giao diện khách được trích từ frontend/src/app.js để kiểm tra (không cần trình duyệt). */
const source = readFileSync(new URL('../../frontend/src/app.js', import.meta.url), 'utf8');
const start = source.indexOf('function formatNumber(value)');
const block = source.slice(start, source.indexOf('\n  }', source.indexOf('function formatMoney(value)')) + 4);
const { formatNumber, formatMoney } = new Function('money', `${block}; return { formatNumber, formatMoney };`)(new Intl.NumberFormat('vi-VN'));

test('số kiểu Việt Nam có dấu chấm ngăn cách; tiền luôn kết thúc bằng "đ"', () => {
  assert.equal(formatNumber(1134), '1.134');
  assert.equal(formatNumber(41624), '41.624');
  assert.equal(formatMoney(49000), '49.000đ');
  assert.equal(formatMoney('105000.00'), '105.000đ');
  assert.equal(formatMoney(undefined), '0đ');
});

test('giao diện khách không còn chữ "VND" hay chip "All"', () => {
  assert.ok(!/ VND`/.test(source));
  assert.ok(!/>All<\/button>/.test(source));
  assert.ok(source.includes('>Tất cả</button>'));
});

test('frontend không còn số hotline/điện thoại ghi cứng (lấy từ API storefront)', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const dir = new URL('../../frontend/src/', import.meta.url);
  for (const file of readdirSync(dir).filter(name => name.endsWith('.js'))) {
    const text = readFileSync(new URL(file, dir), 'utf8');
    assert.ok(!/\b1900[ .]?\d{3,4}\b/.test(text), `${file} còn số hotline cứng`);
  }
});
