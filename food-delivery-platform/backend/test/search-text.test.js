import assert from 'node:assert/strict';
import test from 'node:test';
import {
  allTokensSql, escapeLike, hasDiacritics, matchesAll, normalizeText, parseSearchQuery,
  rankByRelevance, relevanceScore, stripDiacritics, tokenMatches
} from '../src/modules/catalog/search-text.js';

test('chuẩn hoá: NFC, chữ thường, bỏ dấu kể cả đ', () => {
  assert.equal(normalizeText('  PHỞ   Bò '), 'phở bò');
  assert.equal(normalizeText('Phở'.normalize('NFD')), 'phở'.normalize('NFC'));
  assert.equal(stripDiacritics('Đồ Chay Bếp Đỏ'), 'do chay bep do');
  assert.equal(hasDiacritics('pho'), false);
  assert.equal(hasDiacritics('phở'), true);
});

test('tách từ: bỏ ký tự lạ, trùng từ, đánh dấu từ có dấu', () => {
  const parsed = parseSearchQuery('  Trà-sữa, trân châu!! trà ');
  assert.deepEqual(parsed.tokens.map(token => token.text), ['trà', 'sữa', 'trân', 'châu']);
  assert.equal(parsed.tokens.every(token => token.accented), true);
  assert.equal(parseSearchQuery('   '), null);
  assert.equal(parseSearchQuery('!!!'), null);
  assert.equal(parseSearchQuery('pho').accented, false);
});

test('truy vấn có dấu phân biệt phở / phố / phô; không dấu thì khớp cả ba', () => {
  const pho = parseSearchQuery('phở').tokens[0];
  assert.equal(tokenMatches('Phở Bò Tái', pho), true);
  assert.equal(tokenMatches('Phố Cổ Hà Nội', pho), false);
  assert.equal(tokenMatches('Phô mai que', pho), false);
  const phoPlain = parseSearchQuery('pho').tokens[0];
  assert.equal(tokenMatches('Phở Bò Tái', phoPlain), true);
  assert.equal(tokenMatches('Phố Cổ', phoPlain), true);
  assert.equal(tokenMatches('Phô mai que', phoPlain), true);
  const pho2 = parseSearchQuery('phố').tokens[0];
  assert.equal(tokenMatches('Phở Bò Tái', pho2), false);
  assert.equal(tokenMatches('Phố Cổ', pho2), true);
});

test('truy vấn không dấu khớp chữ đ: "bep do" tìm thấy "Bếp Đỏ"', () => {
  assert.equal(matchesAll(['Gà Giòn Bếp Đỏ'], parseSearchQuery('bep do')), true);
  assert.equal(matchesAll(['Gà Giòn Bếp Đỏ'], parseSearchQuery('bếp đỏ')), true);
  assert.equal(matchesAll(['Gà Giòn Bếp Đỏ'], parseSearchQuery('bếp đô')), false);
});

test('mọi từ phải khớp (AND), có thể rải trên nhiều trường', () => {
  const parsed = parseSearchQuery('trà sữa trân châu');
  assert.equal(matchesAll(['Trà Sữa Lá Non', 'Trà sữa trân châu đường đen'], parsed), true);
  assert.equal(matchesAll(['Trà Sữa Lá Non'], parsed), false);
});

test('xếp hạng: tên có dấu chính xác > tên không dấu > danh mục/món > mô tả', () => {
  const parsed = parseSearchQuery('phở');
  const pho = relevanceScore({ name: 'Phở Gánh Ba Mươi Sáu', description: 'Phở truyền thống', related: ['Bún - Phở', 'Phở bò'] }, parsed);
  const dish = relevanceScore({ name: 'Tokbokki Seoul', description: 'Món Hàn', related: ['Món Hàn', 'Phở bò kiểu Hàn'] }, parsed);
  const desc = relevanceScore({ name: 'Tokbokki Seoul', description: 'Có bán phở cuối tuần', related: [] }, parsed);
  assert.ok(pho > dish, 'quán phở phải đứng trước quán chỉ có món phở');
  assert.ok(dish > desc, 'khớp món đứng trước khớp mô tả');
  assert.ok(desc > 0);
});

test('xếp hạng: truy vấn không dấu vẫn ưu tiên tên chứa cụm từ', () => {
  const parsed = parseSearchQuery('pho bo');
  const inName = relevanceScore({ name: 'Phở Bò Phố Cổ', description: '', related: [] }, parsed);
  const inDish = relevanceScore({ name: 'Bếp Việt', description: '', related: ['Phở bò'] }, parsed);
  assert.ok(inName > inDish);
});

test('"phố" không đưa quán phở (chỉ phở) lên đầu', () => {
  const parsed = parseSearchQuery('phố');
  const shops = [
    { name: 'Phở Gánh Ba Mươi Sáu', description: 'Phở bò', related: ['Phở bò', 'Phở gà'] },
    { name: 'Burger Phố Nướng', description: 'Burger', related: ['Burger bò'] }
  ];
  const matching = shops.filter(shop => matchesAll([shop.name, shop.description, ...shop.related], parsed));
  assert.deepEqual(matching.map(shop => shop.name), ['Burger Phố Nướng']);
});

test('rankByRelevance giữ nguyên thứ tự gốc khi bằng điểm', () => {
  const items = [{ n: 'a', s: 1 }, { n: 'b', s: 5 }, { n: 'c', s: 1 }, { n: 'd', s: 5 }];
  assert.deepEqual(rankByRelevance(items, item => item.s).map(item => item.n), ['b', 'd', 'a', 'c']);
});

test('SQL: từ có dấu dùng collation phân biệt dấu, từ không dấu bỏ qua dấu; ký tự đại diện LIKE được thoát', () => {
  assert.equal(escapeLike('50%_off\\'), '50\\%\\_off\\\\');
  const { sql, params } = allTokensSql(['r.name', 'r.description'], parseSearchQuery('phở bo'));
  assert.match(sql, /utf8mb4_0900_as_ci LIKE \?/);
  assert.match(sql, /LOWER\(COALESCE\(r\.name/);
  assert.equal((sql.match(/ AND /g) ?? []).length >= 1, true);
  assert.deepEqual(params, ['%phở%', '%phở%', '%bo%', '%bo%']);
});

import { matchItem, matchRestaurant, preferredForms, scoreRestaurant, selectAndRank, withPreferredForms, wordsOf } from '../src/modules/catalog/search-text.js';

test('không dấu chỉ khớp từ trọn vẹn: "com" không khớp "combo"', () => {
  const parsed = parseSearchQuery('com tam');
  assert.equal(matchRestaurant({ name: 'Trà Sữa Lá Non', description: '', category: 'Trà sữa', dishes: ['Combo 2 ly', 'Tấm lòng vàng'] }, parsed), null);
  assert.equal(matchRestaurant({ name: 'Cơm Tấm Sườn Mộc', description: '', category: 'Cơm', dishes: [] }, parsed), 'strong');
  assert.deepEqual(wordsOf('Phở-bò (tái)!'), ['phở', 'bò', 'tái']);
});

test('từ rải ở các món khác nhau không tính: "bún bò" cần cùng một món (hoặc tên/danh mục)', () => {
  const parsed = parseSearchQuery('bún bò');
  const chay = { name: 'Bếp Chay Sen Vàng', description: 'Đồ chay', category: 'Đồ chay', dishes: ['Bún chay', 'Bò kho chay'] };
  const real = { name: 'Bún Bò Cố Đô', description: '', category: 'Bún - Phở', dishes: ['Bún bò Huế'] };
  assert.equal(matchRestaurant(chay, parsed), null);
  assert.equal(matchRestaurant(real, parsed), 'strong');
  assert.equal(matchRestaurant({ ...chay, dishes: ['Bún bò chay'] }, parsed), 'weak'); // chỉ 1 món khớp: không phải kết quả chính
  assert.equal(matchRestaurant({ ...chay, dishes: ['Bún bò chay', 'Bún bò Huế chay', 'Bún bò xào chay'] }, parsed), 'strong');
});

test('mô tả chỉ bổ sung khi ít kết quả chính', () => {
  const parsed = parseSearchQuery('kem');
  const strong = n => Array.from({ length: n }, (_, i) => ({ name: `Kem ${i}`, description: '', category: '', dishes: [] }));
  const weak = { name: 'Tiệm X', description: 'Có bán kem', category: '', dishes: [] };
  const few = selectAndRank([weak, ...strong(2)], parsed, { match: matchRestaurant, score: scoreRestaurant });
  assert.equal(few.length, 3);
  assert.equal(few.at(-1).name, 'Tiệm X');
  const many = selectAndRank([weak, ...strong(6)], parsed, { match: matchRestaurant, score: scoreRestaurant });
  assert.equal(many.length, 6);
  assert.ok(!many.includes(weak));
});

test('trọng số: tên quán > tên món > danh mục > mô tả', () => {
  const parsed = parseSearchQuery('bánh');
  const byName = scoreRestaurant({ name: 'Tiệm Bánh Ngọt', description: '', category: '', dishes: [] }, parsed);
  const byDish = scoreRestaurant({ name: 'Mì Ý', description: '', category: '', dishes: ['Bánh kem'] }, parsed);
  const byCategory = scoreRestaurant({ name: 'Mì Ý', description: '', category: 'Bánh & Kem', dishes: [] }, parsed);
  const byDescription = scoreRestaurant({ name: 'Mì Ý', description: 'Có bánh', category: '', dishes: [] }, parsed);
  assert.ok(byName > byDish && byDish < byName);
  assert.ok(byDish < byName);
  assert.ok(byCategory > byDescription);
  assert.ok(byDescription > 0);
});

test('dạng có dấu chủ đạo từ tên danh mục: pho -> phở, quán có phở xếp trên quán chỉ có "Phố"', () => {
  const parsed = parseSearchQuery('pho');
  const forms = preferredForms(parsed, ['Bún - Phở', 'Cơm', 'Đồ uống']);
  assert.equal(forms.get('pho'), 'phở');
  const scoring = withPreferredForms(parsed, forms);
  const phoShop = { name: 'Bún Riêu', description: '', category: 'Bún - Phở', dishes: ['Phở cuốn', 'Phở bò'] };
  const phoStreet = { name: 'Burger Phố Nướng', description: '', category: 'Burger', dishes: ['Burger bò phô mai'] };
  assert.equal(matchRestaurant(phoStreet, parsed), 'strong');
  assert.ok(scoreRestaurant(phoShop, scoring) > scoreRestaurant(phoStreet, scoring));
});

test('món: khớp tên/quán/nhóm là chính, mô tả là phụ', () => {
  const parsed = parseSearchQuery('trân châu');
  assert.equal(matchItem({ name: 'Trà sữa trân châu', description: '', restaurant: 'Lá Non', category: '' }, parsed), 'strong');
  assert.equal(matchItem({ name: 'Combo 3 ly', description: 'Gồm trà sữa trân châu', restaurant: 'Lá Non', category: 'Combo' }, parsed), 'weak');
  assert.equal(matchItem({ name: 'Cơm tấm', description: '', restaurant: 'X', category: '' }, parsed), null);
});

import { fieldLabel, M } from '../src/shared/http/messages.js';
import { foldPlain, withExactTokens } from '../src/modules/catalog/search-text.js';

test('so khớp không dấu hai chiều: "my y" tìm được "mì ý" (y ≡ i)', () => {
  assert.equal(foldPlain('Mì Ý'), 'mi i');
  const parsed = parseSearchQuery('my y');
  assert.equal(matchRestaurant({ name: 'Mì Ý Sốt Nhà Làm', description: '', category: 'Mì Ý', dishes: [] }, parsed), 'strong');
  assert.equal(matchItem({ name: 'Mỳ Ý hải sản', description: '', restaurant: 'X', category: '' }, parsed), 'strong');
  assert.equal(matchItem({ name: 'Cơm chiên', description: '', restaurant: 'X', category: '' }, parsed), null);
});

test('"bia" khớp "Bia lon Tiger" nhưng không khớp "Bò bía" khi dữ liệu có chữ không dấu "bia"', () => {
  const rows = [
    { name: 'Bia lon Tiger', description: '', restaurant: 'Lẩu Nướng', category: '' },
    { name: 'Bò bía', description: '', restaurant: 'Quán Vặt', category: '' }
  ];
  const picked = selectAndRank(rows, parseSearchQuery('bia'), { match: matchItem, score: () => 0, textsOf: row => [row.name, row.restaurant, row.category, row.description] });
  assert.deepEqual(picked.map(row => row.name), ['Bia lon Tiger']);
  const only = selectAndRank([rows[1]], parseSearchQuery('bia'), { match: matchItem, score: () => 0, textsOf: row => [row.name] });
  assert.equal(only.length, 1);
  assert.equal(withExactTokens(parseSearchQuery('phở'), [['Phở bò']]).tokens[0].exact, undefined);
});

test('thông báo hệ thống tiếng Việt và nhãn trường được dịch', () => {
  assert.equal(M.routeNotFound, 'Không tìm thấy đường dẫn yêu cầu');
  assert.equal(M.tokenInvalid, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  assert.equal(M.internalError, 'Hệ thống gặp lỗi, vui lòng thử lại sau');
  assert.equal(fieldLabel('Quantity'), 'Số lượng');
  assert.equal(M.fieldRequired('Receiver name'), 'Tên người nhận là bắt buộc');
  assert.equal(M.fieldBetween('Sort order', 1, 9), 'Thứ tự hiển thị phải nằm trong khoảng 1 đến 9');
  assert.equal(fieldLabel('Trường lạ'), 'Trường lạ');
});

test('bộ lọc chay: ngưỡng mặc định 50% số món (cấu hình qua env)', async () => {
  const { env } = await import('../src/shared/config/env.js');
  assert.equal(env.catalog.vegetarianMinShare, 0.5);
});
