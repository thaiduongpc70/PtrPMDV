/* Làm đánh giá thực tế hơn (đợt 2 / T7). Mô phỏng cũ sinh ~79% đơn có đánh giá, một khách đánh giá cùng quán hàng chục lần,
   nửa số bình luận rỗng và câu lặp rất nhiều. Script này:
   (1) GỠ MỀM (deleted_at) bớt đánh giá quán do mô phỏng: tối đa 1 đánh giá/đơn (đã có ràng buộc UNIQUE), tối đa 2/khách/quán,
       phủ 12–28% số đơn DELIVERED mỗi quán, ưu tiên giữ đánh giá đã có phản hồi của quán, KHÔNG đụng tài khoản thật (username không bắt đầu bằng "kh.");
   (2) chọn lọc theo "chất lượng quán": ≥3 quán điểm TB ≥ 4,5 và ≥3 quán < 3,5 (4 quán cao nhất / thấp nhất hiện có được đẩy lên/xuống),
       điểm TB do trigger tính lại (KHÔNG sửa tay restaurants.rating);
   (3) gỡ mềm đánh giá món thuộc các đơn không còn đánh giá quán (đơn vẫn nguyên, không xoá đơn);
   (4) --comments: viết lại bình luận đánh giá quán + món bằng bộ câu đa dạng (data/review-phrases.mjs), rỗng ≤ ~10%, một câu ≤ 3 lần toàn hệ thống.
   Gỡ MỀM vì trigger đánh giá xử lý INSERT/UPDATE (tính lại AVG/COUNT với deleted_at IS NULL) nhưng KHÔNG có trigger DELETE.
   Dùng:  node scripts/trim-simulated-reviews.mjs --dry-run   |   node scripts/trim-simulated-reviews.mjs [--comments] */
import { connect } from './lib/db.mjs';
import { createRegistry, makeUniqueComment } from './data/review-phrases.mjs';
import { dishProfile } from './data/review-comments.mjs';

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');
const COMMENTS = args.has('--comments');
const COMMENTS_ONLY = args.has('--comments-only');
const MAX_PER_CUSTOMER = 2;
const REAL_ACCOUNT = username => !/^kh\./.test(username);

function mulberry32(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash01 = (id, salt) => mulberry32(id * 2654435761 + salt)();
const db = await connect();
const q = async (sql, params) => (await db.query(sql, params))[0];

/** Số lượng theo sao để có điểm TB ≈ target: pmf ∝ stock·exp(λ·sao), n_k ≤ stock_k. Trả { n[1..5], mean, total }. */
function planQuotas(stock, K, target) {
  const evaluate = lambda => {
    const weights = [1, 2, 3, 4, 5].map(k => stock[k] * Math.exp(lambda * k));
    const sum = weights.reduce((a, b) => a + b, 0) || 1;
    const n = {};
    for (const k of [1, 2, 3, 4, 5]) n[k] = Math.min(stock[k], Math.round(K * weights[k - 1] / sum));
    const total = [1, 2, 3, 4, 5].reduce((a, k) => a + n[k], 0);
    const mean = total ? [1, 2, 3, 4, 5].reduce((a, k) => a + k * n[k], 0) / total : 0;
    return { n, total, mean };
  };
  let lo = -6; let hi = 6;
  for (let i = 0; i < 60; i += 1) { const mid = (lo + hi) / 2; if (evaluate(mid).mean < target) lo = mid; else hi = mid; }
  return evaluate((lo + hi) / 2);
}

if (!COMMENTS_ONLY) {
  const restaurants = await q(`SELECT r.id, r.name, r.rating,
      (SELECT COUNT(*) FROM orders o WHERE o.restaurant_id = r.id AND o.order_status = 'DELIVERED') AS delivered
    FROM restaurants r WHERE r.status = 'ACTIVE' AND r.deleted_at IS NULL ORDER BY r.id`);
  const reviews = await q(`SELECT rr.id, rr.order_id, rr.customer_id, rr.restaurant_id, rr.rating, (rr.restaurant_reply IS NOT NULL) AS replied, u.username
    FROM restaurant_reviews rr JOIN customer_profiles cp ON cp.id = rr.customer_id JOIN users u ON u.id = cp.user_id WHERE rr.deleted_at IS NULL`);
  const byRestaurant = new Map();
  for (const review of reviews) { const list = byRestaurant.get(Number(review.restaurant_id)) ?? []; list.push(review); byRestaurant.set(Number(review.restaurant_id), list); }

  // mục tiêu chất lượng: 4 quán đang cao nhất -> 4,55–4,70; 4 quán thấp nhất -> 3,15–3,35; còn lại 3,65–4,35 theo hash
  // chỉ chọn nhóm cao/thấp trong các quán có đủ khách (≥ 100) để chọn lọc đạt mục tiêu mà vẫn phủ ≥ 10% số đơn
  const customerCount = id => new Set((byRestaurant.get(Number(id)) ?? []).map(review => review.customer_id)).size;
  const ranked = restaurants.filter(shop => customerCount(shop.id) >= 100).sort((a, b) => Number(b.rating) - Number(a.rating));
  const high = new Set(ranked.slice(0, 4).map(r => r.id));
  const low = new Set(ranked.slice(-4).map(r => r.id));
  const keep = new Set();
  const plan = [];
  for (const shop of restaurants) {
    const list = byRestaurant.get(Number(shop.id)) ?? [];
    const protectedReviews = list.filter(review => REAL_ACCOUNT(review.username));
    const normal = list.filter(review => !REAL_ACCOUNT(review.username));
    const coverage = 0.12 + 0.16 * hash01(shop.id, 5);
    const K = Math.round(coverage * Number(shop.delivered));
    const target = high.has(shop.id) ? 4.55 + 0.15 * hash01(shop.id, 7) : low.has(shop.id) ? 3.15 + 0.2 * hash01(shop.id, 9) : 3.65 + 0.7 * hash01(shop.id, 11);
    const protectedSum = protectedReviews.reduce((a, review) => a + Number(review.rating), 0);
    // Mỗi khách chỉ được giữ tối đa MAX_PER_CUSTOMER đánh giá/quán: chọn trước, cho từng khách, các đánh giá có số sao GẦN mục tiêu nhất
    // (cùng số sao thì ưu tiên đã có phản hồi), để vẫn đạt điểm TB mong muốn dù cả quán chỉ có vài chục khách.
    const rndPick = mulberry32(shop.id * 31);
    const perCustomerList = new Map();
    for (const review of normal) { const l = perCustomerList.get(review.customer_id) ?? []; l.push(review); perCustomerList.set(review.customer_id, l); }
    const candidates = [];
    for (const l of perCustomerList.values()) {
      // quán 'cao' -> mỗi khách giữ đánh giá cao nhất, quán 'thấp' -> thấp nhất, còn lại chọn ngẫu nhiên (giữ phân bố sao tự nhiên)
      const direction = target >= 4.5 ? -1 : target <= 3.5 ? 1 : 0;
      l.sort((a, b) => (direction ? direction * (a.rating - b.rating) : 0) || Number(b.replied) - Number(a.replied) || rndPick() - 0.5);
      candidates.push(...l.slice(0, MAX_PER_CUSTOMER));
    }
    const stock = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const review of candidates) stock[review.rating] += 1;
    const free = Math.max(0, K - protectedReviews.length);
    // điểm mong muốn của phần chọn thêm sao cho tổng thể (kể cả phần giữ nguyên) ≈ target
    const needMean = free ? Math.min(5, Math.max(1, (target * K - protectedSum) / free)) : target;
    const quotas = planQuotas(stock, free, needMean);
    if (process.env.DEBUG_SHOP == shop.id) console.log("DEBUG", shop.id, { K, free, target, needMean, stock, quotas });
    const rnd = mulberry32(shop.id * 977);
    const perCustomer = new Map();
    for (const review of protectedReviews) { keep.add(review.id); perCustomer.set(review.customer_id, (perCustomer.get(review.customer_id) ?? 0) + 1); }
    let kept = protectedReviews.length; let sum = protectedSum; let replied = protectedReviews.filter(review => review.replied).length;
    for (const star of [1, 2, 3, 4, 5]) {
      const pool = candidates.filter(review => review.rating === star).sort((a, b) => Number(b.replied) - Number(a.replied) || rnd() - 0.5);
      let taken = 0;
      for (const review of pool) {
        if (taken >= quotas.n[star]) break;
        if ((perCustomer.get(review.customer_id) ?? 0) >= MAX_PER_CUSTOMER) continue;
        keep.add(review.id); perCustomer.set(review.customer_id, (perCustomer.get(review.customer_id) ?? 0) + 1);
        taken += 1; kept += 1; sum += star; replied += review.replied ? 1 : 0;
      }
    }
    // đảm bảo phủ tối thiểu 10% (bù thêm đánh giá còn lại của các khách, vẫn tối đa ${MAX_PER_CUSTOMER}/khách/quán)
    const minKeep = Math.ceil(0.10 * Number(shop.delivered)) + 1;
    if (kept < minKeep) {
      for (const review of candidates.sort(() => rnd() - 0.5)) {
        if (kept >= minKeep) break;
        if (keep.has(review.id) || (perCustomer.get(review.customer_id) ?? 0) >= MAX_PER_CUSTOMER) continue;
        keep.add(review.id); perCustomer.set(review.customer_id, (perCustomer.get(review.customer_id) ?? 0) + 1);
        kept += 1; sum += review.rating; replied += review.replied ? 1 : 0;
      }
    }
    plan.push({ id: shop.id, name: shop.name, delivered: Number(shop.delivered), before: list.length, kept, coverage: kept / Number(shop.delivered), mean: sum / kept, target, replied, group: high.has(shop.id) ? 'CAO' : low.has(shop.id) ? 'THẤP' : '' });
  }
  console.table(plan.map(p => ({ quán: p.name.slice(0, 26), đơnGiao: p.delivered, trước: p.before, giữ: p.kept, phủ: `${(p.coverage * 100).toFixed(1)}%`, tbDựKiến: p.mean.toFixed(2), mụcTiêu: p.target.toFixed(2), phảnHồi: p.replied, nhóm: p.group })));
  const totalKeep = keep.size; const totalBefore = reviews.length;
  const cov = plan.map(p => p.coverage);
  const means = plan.map(p => p.mean);
  console.log(`Đánh giá quán: ${totalBefore} -> ${totalKeep} (gỡ mềm ${totalBefore - totalKeep}). Phủ min/max: ${(Math.min(...cov) * 100).toFixed(1)}% / ${(Math.max(...cov) * 100).toFixed(1)}%. TB dự kiến min/max: ${Math.min(...means).toFixed(2)} / ${Math.max(...means).toFixed(2)}; ≥4,5: ${means.filter(m => m >= 4.5).length} quán; <3,5: ${means.filter(m => m < 3.5).length} quán.`);
  const keptOrders = new Set(reviews.filter(review => keep.has(review.id)).map(review => Number(review.order_id)));
  const itemRows = await q('SELECT id, order_id FROM menu_item_reviews WHERE deleted_at IS NULL');
  const realOrders = new Set((await q(`SELECT o.id FROM orders o JOIN customer_profiles cp ON cp.id = o.customer_id JOIN users u ON u.id = cp.user_id WHERE u.username NOT LIKE 'kh.%'`)).map(row => Number(row.id)));
  const removeItemsSafe = itemRows.filter(row => !keptOrders.has(Number(row.order_id)) && !realOrders.has(Number(row.order_id))).map(row => Number(row.id));
  console.log(`Đánh giá món: ${itemRows.length} -> ${itemRows.length - removeItemsSafe.length} (gỡ mềm ${removeItemsSafe.length}, giữ nguyên đánh giá của đơn thuộc tài khoản thật).`);
  // đánh giá tài xế: chỉ giữ của các đơn còn đánh giá quán (hoặc của tài khoản thật) để số đánh giá tài xế khớp mức phủ 10–30%
  const shipRows = await q('SELECT id, order_id FROM shipper_reviews WHERE deleted_at IS NULL');
  const removeShip = shipRows.filter(row => !keptOrders.has(Number(row.order_id)) && !realOrders.has(Number(row.order_id))).map(row => Number(row.id));
  console.log(`Đánh giá tài xế: ${shipRows.length} -> ${shipRows.length - removeShip.length} (gỡ mềm ${removeShip.length}).`);
  if (DRY) { console.log('DRY-RUN: chưa thay đổi gì.'); await db.end(); process.exit(0); }

  const removeReviewIds = reviews.filter(review => !keep.has(review.id)).map(review => Number(review.id));
  const soft = async (table, ids) => {
    for (let start = 0; start < ids.length; start += 500) {
      const chunk = ids.slice(start, start + 500);
      await db.query(`UPDATE ${table} SET deleted_at = CURRENT_TIMESTAMP WHERE id IN (${chunk.map(() => '?').join(',')}) AND deleted_at IS NULL`, chunk);
      if ((start / 500) % 10 === 0) console.log(`  ${table}: ${Math.min(start + 500, ids.length)}/${ids.length}`);
    }
  };
  await soft('restaurant_reviews', removeReviewIds);
  await soft('menu_item_reviews', removeItemsSafe);
  await soft('shipper_reviews', removeShip);
  console.log('Đã gỡ mềm xong; điểm TB/số đánh giá do trigger tính lại.');
}

if (COMMENTS || COMMENTS_ONLY) {
  const registry = createRegistry(3);
  const writeBatch = async (table, rows) => {
    await db.query('CREATE TEMPORARY TABLE tmp_c (id BIGINT PRIMARY KEY, comment TEXT)');
    for (let start = 0; start < rows.length; start += 1500) {
      await db.query('INSERT INTO tmp_c VALUES ?', [rows.slice(start, start + 1500)]);
      await db.query(`UPDATE ${table} r JOIN tmp_c t ON t.id = r.id SET r.comment = t.comment, r.updated_at = r.updated_at`);
      await db.query('TRUNCATE TABLE tmp_c');
    }
    await db.query('DROP TEMPORARY TABLE tmp_c');
  };
  const shops = await q(`SELECT rr.id, rr.rating, rs.name AS shop, (rr.restaurant_reply IS NOT NULL) AS replied FROM restaurant_reviews rr JOIN restaurants rs ON rs.id = rr.restaurant_id
    JOIN customer_profiles cp ON cp.id = rr.customer_id JOIN users u ON u.id = cp.user_id WHERE rr.deleted_at IS NULL AND u.username LIKE 'kh.%' ORDER BY rr.id`);
  const shopRows = shops.map(row => {
    const rnd = mulberry32(Number(row.id) * 3266489917);
    const empty = !row.replied && rnd() < 0.1; // rỗng ~10% (không rỗng nếu đã có phản hồi của quán)
    return [row.id, empty ? null : makeUniqueComment(rnd, { kind: 'shop', stars: row.rating, shopName: row.shop }, registry)];
  });
  await writeBatch('restaurant_reviews', shopRows);
  const items = await q(`SELECT r.id, r.rating, mi.name AS dish, COALESCE(rc.name, '') AS category FROM menu_item_reviews r JOIN menu_items mi ON mi.id = r.menu_item_id
    JOIN restaurants rs ON rs.id = mi.restaurant_id LEFT JOIN restaurant_categories rc ON rc.id = rs.category_id
    JOIN orders o ON o.id = r.order_id JOIN customer_profiles cp ON cp.id = o.customer_id JOIN users u ON u.id = cp.user_id
    WHERE r.deleted_at IS NULL AND u.username LIKE 'kh.%' ORDER BY r.id`);
  const itemRows = items.map(row => {
    const rnd = mulberry32(Number(row.id) * 2246822519);
    if (rnd() < 0.1) return [row.id, null];
    const drink = dishProfile(row.dish, row.category).verb === 'uống';
    return [row.id, makeUniqueComment(rnd, { kind: 'dish', stars: row.rating, dishName: row.dish, drink }, registry)];
  });
  await writeBatch('menu_item_reviews', itemRows);
  const ships = await q(`SELECT sr.id, sr.rating FROM shipper_reviews sr JOIN orders o ON o.id = sr.order_id JOIN customer_profiles cp ON cp.id = o.customer_id JOIN users u ON u.id = cp.user_id
    WHERE sr.deleted_at IS NULL AND u.username LIKE 'kh.%' ORDER BY sr.id`);
  const shipRowsOut = ships.map(row => {
    const rnd = mulberry32(Number(row.id) * 668265263);
    return [row.id, rnd() < 0.12 ? null : makeUniqueComment(rnd, { kind: 'ship', stars: row.rating }, registry)];
  });
  await writeBatch('shipper_reviews', shipRowsOut);
  console.log(`Bình luận: viết lại ${shopRows.length} đánh giá quán + ${itemRows.length} đánh giá món + ${shipRowsOut.length} đánh giá tài xế (${registry.counts.size} câu khác nhau).`);
}
await db.end();
