/* Seeds ~45 days of realistic order history (customers, shippers, orders, payments, deliveries,
   reviews, support tickets) so dashboards and reports have meaningful data.
   Safe to re-run: skips when HIS- orders already exist (pass --force to add another batch). */
import 'dotenv/config';
import mysql from 'mysql2/promise';

const force = process.argv.includes('--force');
const DAYS = 45;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261013);
const pick = list => list[Math.floor(rnd() * list.length)];
const between = (min, max) => min + Math.floor(rnd() * (max - min + 1));
const weighted = pairs => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [value, weight] of pairs) { r -= weight; if (r <= 0) return value; }
  return pairs[0][0];
};
const fmt = d => {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const addMin = (d, m) => new Date(d.getTime() + m * 60000);

const connection = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4', timezone: '+07:00', decimalNumbers: true
});
const q = async (sql, params = []) => (await connection.execute(sql, params))[0];

const [{ n }] = await q("SELECT COUNT(*) AS n FROM orders WHERE order_code LIKE 'HIS-%'");
if (Number(n) > 0 && !force) {
  console.log(`Đã có ${n} đơn lịch sử (HIS-). Bỏ qua. Dùng --force để thêm lô mới.`);
  await connection.end();
  process.exit(0);
}

const batch = Date.now().toString(36).slice(-4).toUpperCase();
const [{ password_hash: passwordHash }] = await q("SELECT password_hash FROM users WHERE username = 'minh.anh' LIMIT 1");

/* ---------- customers ---------- */
const NAMES = ['Trần Hoàng Nam', 'Lê Thị Thu Hà', 'Phạm Quốc Huy', 'Nguyễn Ngọc Anh', 'Võ Minh Khôi', 'Đặng Thu Trang', 'Bùi Anh Tuấn', 'Hoàng Mai Linh',
  'Đỗ Gia Bảo', 'Ngô Phương Thảo', 'Dương Quang Vinh', 'Lý Hồng Nhung', 'Huỳnh Đức Thịnh', 'Phan Khánh Vy', 'Vũ Thanh Sơn', 'Trịnh Bảo Châu',
  'Mai Xuân Bách', 'Tạ Diệu Linh', 'Lương Gia Hân', 'Châu Minh Triết', 'Nguyễn Thùy Dương', 'Lê Hoài Nam', 'Cao Thị Yến', 'Đinh Công Danh'];
const DISTRICTS = [['Quận 1', 10.7769, 106.7009], ['Quận 3', 10.7843, 106.6844], ['Quận 5', 10.7540, 106.6634], ['Bình Thạnh', 10.8106, 106.7091],
  ['Phú Nhuận', 10.7992, 106.6803], ['Quận 10', 10.7727, 106.6679], ['Tân Bình', 10.8014, 106.6527], ['Gò Vấp', 10.8386, 106.6652]];
const STREETS = ['Nguyễn Trãi', 'Lê Lợi', 'Hai Bà Trưng', 'Cách Mạng Tháng Tám', 'Điện Biên Phủ', 'Võ Văn Tần', 'Pasteur', 'Nam Kỳ Khởi Nghĩa', 'Trần Hưng Đạo', 'Lý Thường Kiệt'];
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');

const customers = [];
for (const [index, name] of NAMES.entries()) {
  const username = `kh.${slug(name)}`;
  const existing = await q('SELECT cp.id AS profile_id FROM users u INNER JOIN customer_profiles cp ON cp.user_id = u.id WHERE u.username = ?', [username]);
  let profileId;
  if (existing[0]) profileId = Number(existing[0].profile_id);
  else {
    const created = await q('INSERT INTO users (role_id, username, email, phone, password_hash, status, last_login_at, created_at) VALUES (4, ?, ?, ?, ?, ?, ?, ?)',
      [username, `${username}@example.vn`, `09${String(10000000 + index * 137).padStart(8, '0')}`.slice(0, 10), passwordHash, index === 21 ? 'LOCKED' : 'ACTIVE',
        fmt(addMin(new Date(), -between(10, 4000))), fmt(addMin(new Date(), -between(60 * 24 * 20, 60 * 24 * 60)))]);
    const userId = Number(created.insertId);
    const profile = await q('INSERT INTO customer_profiles (user_id, full_name, gender) VALUES (?, ?, ?)', [userId, name, index % 2 ? 'FEMALE' : 'MALE']);
    profileId = Number(profile.insertId);
    const [district, lat, lng] = pick(DISTRICTS);
    await q('INSERT INTO customer_addresses (customer_id, label, receiver_name, receiver_phone, address_line, ward, district, city, latitude, longitude, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)',
      [profileId, 'Nhà riêng', name, `09${String(10000000 + index * 137).padStart(8, '0')}`.slice(0, 10), `${between(10, 300)} ${pick(STREETS)}`, `Phường ${between(1, 14)}`, district, 'TP.HCM',
        (lat + (rnd() - 0.5) * 0.012).toFixed(7), (lng + (rnd() - 0.5) * 0.012).toFixed(7)]);
  }
  customers.push(profileId);
}
const customerRows = await q(`SELECT cp.id, cp.full_name, u.phone, ca.id AS address_id, ca.address_line, ca.ward, ca.district, ca.city, ca.latitude, ca.longitude
  FROM customer_profiles cp INNER JOIN users u ON u.id = cp.user_id
  INNER JOIN customer_addresses ca ON ca.customer_id = cp.id AND ca.deleted_at IS NULL
  WHERE cp.id IN (${customers.map(() => '?').join(',')}) AND u.status = 'ACTIVE' AND ca.is_default = TRUE`, customers);

/* ---------- shippers ---------- */
const SHIPPER_NAMES = [['Nguyễn Văn Hậu', 'MOTORBIKE', '59X1-224.18'], ['Lê Minh Tâm', 'MOTORBIKE', '59P2-908.34'], ['Phạm Đình Phúc', 'MOTORBIKE', '59H3-117.52'],
  ['Võ Thành Đạt', 'BICYCLE', null], ['Hồ Tuấn Kiệt', 'MOTORBIKE', '59G1-645.09'], ['Trương Quốc Việt', 'CAR', '51A-338.76']];
const shipperIds = [];
for (const [index, [name, vehicle, plate]] of SHIPPER_NAMES.entries()) {
  const username = `ship.${slug(name)}`;
  const existing = await q('SELECT sp.id FROM users u INNER JOIN shipper_profiles sp ON sp.user_id = u.id WHERE u.username = ?', [username]);
  if (existing[0]) { shipperIds.push(Number(existing[0].id)); continue; }
  const created = await q('INSERT INTO users (role_id, username, email, phone, password_hash, status) VALUES (3, ?, ?, ?, ?, ?)',
    [username, `${username}@shipper.vn`, `08${String(30000000 + index * 211).padStart(8, '0')}`.slice(0, 10), passwordHash, 'ACTIVE']);
  const [district, lat, lng] = pick(DISTRICTS);
  const profile = await q('INSERT INTO shipper_profiles (user_id, full_name, identity_number, vehicle_type, vehicle_plate, driving_license, availability_status, current_latitude, current_longitude, last_location_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
    [created.insertId, name, `07920${String(1000000 + index * 7919).slice(0, 7)}`, vehicle, plate, `B1-${100000 + index * 311}`, index === 5 ? 'OFFLINE' : index === 3 ? 'SUSPENDED' : 'AVAILABLE',
      (lat + (rnd() - 0.5) * 0.01).toFixed(7), (lng + (rnd() - 0.5) * 0.01).toFixed(7)]);
  shipperIds.push(Number(profile.insertId));
  for (const [type, label] of [['IDENTITY_CARD', 'CCCD'], ['DRIVING_LICENSE', 'GPLX'], ['VEHICLE_REGISTRATION', 'CAVET']]) {
    await q('INSERT INTO shipper_documents (shipper_id, document_type, document_number, verified, verified_at) VALUES (?, ?, ?, ?, ?)',
      [profile.insertId, type, `${label}-${between(100000, 999999)}`, index < 4 || type !== 'VEHICLE_REGISTRATION', index < 4 ? fmt(new Date()) : null]);
  }
}
const [existingShipper] = await q("SELECT id FROM shipper_profiles WHERE availability_status IN ('AVAILABLE','BUSY') ORDER BY id LIMIT 1");
const activeShippers = [...new Set([...shipperIds.filter((_, i) => i !== 3 && i !== 5), ...(existingShipper ? [Number(existingShipper.id)] : [])])];

/* ---------- restaurants & menu ---------- */
const restaurants = await q("SELECT id, name, address, latitude, longitude, commission_rate FROM restaurants WHERE status = 'ACTIVE' AND deleted_at IS NULL");
const menuByRestaurant = new Map();
for (const r of restaurants) {
  const items = await q('SELECT id, name, COALESCE(discount_price, base_price) AS price FROM menu_items WHERE restaurant_id = ? AND is_available = TRUE AND deleted_at IS NULL LIMIT 40', [r.id]);
  menuByRestaurant.set(r.id, items);
}
const hot = restaurants.map((r, i) => [r, i < 5 ? 5 : i < 12 ? 3 : 1]);

const NOTES = [null, null, null, 'Ít cay giúp mình', 'Gọi trước khi giao', 'Không hành', 'Giao giờ nghỉ trưa', 'Thêm đũa, muỗng', 'Để ở bảo vệ', null, null];
const GOOD = ['Món ngon, giao nhanh, đóng gói cẩn thận.', 'Đồ ăn còn nóng, vị rất ổn, sẽ đặt lại.', 'Phần ăn đầy đặn, giá hợp lý.', 'Tài xế thân thiện, đúng giờ.', 'Quán làm kỹ, rau tươi.', 'Rất hài lòng!'];
const OK = ['Tạm ổn, hơi nhiều dầu.', 'Giao hơi lâu nhưng món ngon.', 'Món ổn, phần hơi ít.'];
const BAD = ['Giao chậm, món nguội.', 'Thiếu một món so với đơn.', 'Đóng gói chưa kỹ, bị đổ nước.'];
const REPLIES = ['Cảm ơn bạn đã ủng hộ quán, hẹn gặp lại!', 'Quán xin lỗi vì trải nghiệm chưa tốt và sẽ cải thiện.', 'Cảm ơn góp ý của bạn ạ!'];
const METHODS = [['COD', 45], ['MOMO', 20], ['VNPAY', 12], ['ZALOPAY', 8], ['BANK_TRANSFER', 8], ['CARD', 4], ['WALLET', 3]];

let created = 0;
let reviewsCount = 0;
const now = new Date();
let seq = 0;

for (let dayOffset = DAYS; dayOffset >= 0; dayOffset -= 1) {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset);
  const weekend = [0, 6].includes(day.getDay());
  const growth = 1 + (DAYS - dayOffset) / DAYS * 0.8;
  const count = Math.round((between(5, 9) + (weekend ? 4 : 0)) * growth * (dayOffset === 0 ? 0.35 : 1));
  for (let i = 0; i < count; i += 1) {
    const hour = weighted([[8, 2], [9, 2], [10, 3], [11, 9], [12, 14], [13, 8], [14, 3], [15, 3], [16, 4], [17, 7], [18, 13], [19, 14], [20, 9], [21, 4], [22, 2]]);
    let orderedAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, between(0, 59), between(0, 59));
    if (orderedAt > addMin(now, -40)) orderedAt = addMin(now, -between(45, 300));
    if (orderedAt < new Date(now.getTime() - DAYS * 86400000 - 86400000)) continue;

    const restaurant = weighted(hot.map(([r, w]) => [r, w]));
    const menu = menuByRestaurant.get(restaurant.id);
    if (!menu.length) continue;
    const customer = pick(customerRows);
    const lines = Array.from({ length: between(1, 3) }, () => {
      const item = pick(menu);
      return { item, quantity: weighted([[1, 6], [2, 3], [3, 1]]) };
    });
    const subtotal = lines.reduce((s, l) => s + Number(l.item.price) * l.quantity, 0);
    const discount = rnd() < 0.18 ? Math.min(30000, Math.round(subtotal * 0.1 / 1000) * 1000) : 0;
    const deliveryFee = pick([15000, 18000, 20000, 25000]);
    const total = subtotal - discount + deliveryFee;
    const method = weighted(METHODS);
    const outcome = weighted([['DELIVERED', 90], ['CANCELLED', 10]]);
    const shipperId = outcome === 'DELIVERED' ? pick(activeShippers) : null;
    const confirmedAt = addMin(orderedAt, between(1, 4));
    const preparedAt = addMin(confirmedAt, between(10, 25));
    const pickedUpAt = addMin(preparedAt, between(3, 9));
    const deliveredAt = addMin(pickedUpAt, between(12, 32));
    const cancelledAt = outcome === 'CANCELLED' ? addMin(orderedAt, between(2, 12)) : null;
    const paid = method !== 'COD' && (outcome === 'DELIVERED' || rnd() < 0.5);
    const paymentStatus = outcome === 'DELIVERED' ? 'PAID' : (paid ? 'PAID' : 'PENDING');
    const code = `HIS-${batch}-${String(++seq).padStart(4, '0')}`;

    const order = await q(`INSERT INTO orders (order_code, customer_id, restaurant_id, shipper_id, delivery_address_id, receiver_name, receiver_phone, delivery_address,
        delivery_latitude, delivery_longitude, subtotal, discount_amount, delivery_fee, service_fee, tax_amount, total_amount, payment_method, payment_status, order_status,
        customer_note, ordered_at, confirmed_at, prepared_at, picked_up_at, delivered_at, cancelled_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, customer.id, restaurant.id, shipperId, customer.address_id, customer.full_name, customer.phone,
        `${customer.address_line}, ${customer.ward}, ${customer.district}, ${customer.city}`, customer.latitude, customer.longitude,
        subtotal, discount, deliveryFee, total, method, paymentStatus, outcome, pick(NOTES), fmt(orderedAt),
        fmt(confirmedAt), outcome === 'DELIVERED' ? fmt(preparedAt) : null, outcome === 'DELIVERED' ? fmt(pickedUpAt) : null,
        outcome === 'DELIVERED' ? fmt(deliveredAt) : null, cancelledAt ? fmt(cancelledAt) : null, fmt(orderedAt), fmt(outcome === 'DELIVERED' ? deliveredAt : cancelledAt)]);
    const orderId = Number(order.insertId);
    created += 1;

    for (const l of lines) {
      await q('INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, unit_price, total_price, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [orderId, l.item.id, l.item.name, l.quantity, l.item.price, Number(l.item.price) * l.quantity, fmt(orderedAt)]);
    }

    const history = outcome === 'DELIVERED'
      ? [[null, 'PENDING', orderedAt], ['PENDING', 'CONFIRMED', confirmedAt], ['CONFIRMED', 'PREPARING', addMin(confirmedAt, 1)], ['PREPARING', 'READY_FOR_PICKUP', preparedAt],
        ['READY_FOR_PICKUP', 'SHIPPER_ASSIGNED', addMin(preparedAt, 1)], ['SHIPPER_ASSIGNED', 'PICKED_UP', pickedUpAt], ['PICKED_UP', 'DELIVERING', addMin(pickedUpAt, 1)], ['DELIVERING', 'DELIVERED', deliveredAt]]
      : [[null, 'PENDING', orderedAt], ['PENDING', 'CANCELLED', cancelledAt]];
    for (const [from, to, at] of history) {
      await q('INSERT INTO order_status_history (order_id, old_status, new_status, note, created_at) VALUES (?, ?, ?, ?, ?)', [orderId, from, to, to === 'CANCELLED' ? 'Khách hủy đơn' : null, fmt(at)]);
    }

    const payment = await q('INSERT INTO payments (order_id, payment_code, method, amount, status, transaction_id, gateway, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [orderId, `PAY-${code}`, method, total, paymentStatus, method === 'COD' ? null : `TXN${between(10000000, 99999999)}`, method === 'COD' ? null : 'MOCK_GATEWAY',
        paymentStatus === 'PAID' ? fmt(method === 'COD' ? deliveredAt : addMin(orderedAt, 1)) : null, fmt(orderedAt)]);

    if (outcome === 'DELIVERED') {
      const distance = (2 + rnd() * 6).toFixed(1);
      const delivery = await q(`INSERT INTO deliveries (order_id, shipper_id, pickup_address, delivery_address, pickup_latitude, pickup_longitude, delivery_latitude, delivery_longitude,
          distance_km, delivery_fee, delivery_status, assigned_at, accepted_at, picked_up_at, delivered_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DELIVERED', ?, ?, ?, ?, ?, ?)`,
        [orderId, shipperId, restaurant.address, `${customer.address_line}, ${customer.district}`, restaurant.latitude, restaurant.longitude, customer.latitude, customer.longitude,
          distance, deliveryFee, fmt(addMin(preparedAt, 1)), fmt(addMin(preparedAt, 2)), fmt(pickedUpAt), fmt(deliveredAt), fmt(addMin(preparedAt, 1)), fmt(deliveredAt)]);
      const platformFee = Math.round(deliveryFee * 0.2);
      const tip = rnd() < 0.25 ? pick([5000, 10000]) : 0;
      await q('INSERT INTO shipper_earnings (shipper_id, delivery_id, delivery_fee, tip_amount, platform_fee, net_earning, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [shipperId, delivery.insertId, deliveryFee, tip, platformFee, deliveryFee + tip - platformFee, fmt(deliveredAt)]);
      await q('INSERT IGNORE INTO restaurant_commissions (order_id, restaurant_id, order_amount, commission_rate, commission_amount, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, restaurant.id, subtotal, restaurant.commission_rate, Math.round(subtotal * Number(restaurant.commission_rate) / 100), fmt(deliveredAt)]);
      if (method === 'COD') {
        const settled = dayOffset > 3;
        await q('INSERT INTO cod_transactions (order_id, shipper_id, amount, status, collected_at, settled_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [orderId, shipperId, total, settled ? 'SETTLED' : 'COLLECTED', fmt(deliveredAt), settled ? fmt(addMin(deliveredAt, 60 * 24 * 2)) : null, fmt(deliveredAt)]);
      }
      if (rnd() < 0.42) {
        const rating = weighted([[5, 50], [4, 30], [3, 12], [2, 5], [1, 3]]);
        const comment = rating >= 4 ? pick(GOOD) : rating === 3 ? pick(OK) : pick(BAD);
        const replied = rnd() < 0.35;
        await q('INSERT INTO restaurant_reviews (order_id, customer_id, restaurant_id, rating, comment, restaurant_reply, replied_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [orderId, customer.id, restaurant.id, rating, comment, replied ? pick(REPLIES) : null, replied ? fmt(addMin(deliveredAt, 300)) : null, fmt(addMin(deliveredAt, 90))]);
        reviewsCount += 1;
      }
    } else if (paid) {
      await q("INSERT INTO refunds (order_id, payment_id, amount, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [orderId, payment.insertId, total, 'Khách hủy đơn đã thanh toán', rnd() < 0.5 ? 'PENDING' : 'COMPLETED', fmt(addMin(cancelledAt, 5))]);
    }
  }
}

/* ---------- live orders for today (so boards are not empty) ---------- */
const liveStatuses = ['PENDING', 'PENDING', 'CONFIRMED', 'PREPARING', 'PREPARING', 'READY_FOR_PICKUP'];
const featured = restaurants.find(r => r.name.includes('An Nhiên')) || restaurants[0];
for (const [index, status] of liveStatuses.entries()) {
  const restaurant = index < 4 ? featured : pick(restaurants);
  const menu = menuByRestaurant.get(restaurant.id);
  if (!menu.length) continue;
  const customer = pick(customerRows);
  const item = pick(menu);
  const quantity = between(1, 2);
  const subtotal = Number(item.price) * quantity;
  const orderedAt = addMin(now, -between(2, 25));
  const method = pick(['COD', 'MOMO', 'COD', 'VNPAY']);
  const order = await q(`INSERT INTO orders (order_code, customer_id, restaurant_id, delivery_address_id, receiver_name, receiver_phone, delivery_address, delivery_latitude, delivery_longitude,
      subtotal, delivery_fee, total_amount, payment_method, payment_status, order_status, customer_note, ordered_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 15000, ?, ?, ?, ?, ?, ?, ?)`,
    [`HIS-${batch}-L${index + 1}`, customer.id, restaurant.id, customer.address_id, customer.full_name, customer.phone, `${customer.address_line}, ${customer.district}, ${customer.city}`,
      customer.latitude, customer.longitude, subtotal, subtotal + 15000, method, method === 'COD' ? 'PENDING' : 'PAID', status, pick(NOTES), fmt(orderedAt), fmt(orderedAt)]);
  await q('INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)', [order.insertId, item.id, item.name, quantity, item.price, subtotal]);
  await q('INSERT INTO order_status_history (order_id, old_status, new_status, created_at) VALUES (?, NULL, ?, ?)', [order.insertId, status, fmt(orderedAt)]);
  await q('INSERT INTO payments (order_id, payment_code, method, amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [order.insertId, `PAY-HIS-${batch}-L${index + 1}`, method, subtotal + 15000, method === 'COD' ? 'PENDING' : 'PAID', fmt(orderedAt)]);
  created += 1;
}

/* ---------- support tickets ---------- */
const TICKETS = [['Đơn giao thiếu món', 'ORDER', 'HIGH', 'Mình đặt 3 món nhưng chỉ nhận được 2 món, nhờ shop kiểm tra giúp.'], ['Chưa nhận được hoàn tiền', 'PAYMENT', 'URGENT', 'Mình hủy đơn đã thanh toán MoMo hôm qua nhưng chưa thấy tiền về.'],
  ['Tài xế giao quá lâu', 'DELIVERY', 'MEDIUM', 'Đơn của mình giao trễ gần 40 phút so với dự kiến.'], ['Không đăng nhập được', 'ACCOUNT', 'LOW', 'Mình quên mật khẩu và chưa nhận được email đặt lại.'],
  ['Món không đúng mô tả', 'RESTAURANT', 'MEDIUM', 'Phần ăn nhỏ hơn nhiều so với hình ảnh trên ứng dụng.']];
for (const [index, [subject, category, priority, description]] of TICKETS.entries()) {
  const [user] = await q('SELECT user_id FROM customer_profiles WHERE id = ?', [pick(customerRows).id]);
  await q('INSERT INTO support_tickets (ticket_code, user_id, subject, description, category, priority, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [`SP-${batch}-${index + 1}`, user.user_id, subject, description, category, priority, index < 3 ? 'OPEN' : 'IN_PROGRESS', fmt(addMin(now, -between(30, 60 * 40)))]);
}

/* ---------- recompute aggregates ---------- */
await q(`UPDATE restaurants r SET
  total_orders = (SELECT COUNT(*) FROM orders o WHERE o.restaurant_id = r.id AND o.order_status = 'DELIVERED'),
  total_revenue = (SELECT COALESCE(SUM(o.subtotal), 0) FROM orders o WHERE o.restaurant_id = r.id AND o.order_status = 'DELIVERED')`);
await q(`UPDATE customer_profiles cp SET
  total_orders = (SELECT COUNT(*) FROM orders o WHERE o.customer_id = cp.id AND o.order_status = 'DELIVERED'),
  total_spent = (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE o.customer_id = cp.id AND o.order_status = 'DELIVERED'),
  loyalty_points = FLOOR((SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE o.customer_id = cp.id AND o.order_status = 'DELIVERED') / 10000)`);
await q(`UPDATE shipper_profiles sp SET
  total_deliveries = (SELECT COUNT(*) FROM deliveries d WHERE d.shipper_id = sp.id AND d.delivery_status = 'DELIVERED'),
  total_earnings = (SELECT COALESCE(SUM(net_earning), 0) FROM shipper_earnings se WHERE se.shipper_id = sp.id)
  WHERE sp.id IN (${[...activeShippers, ...shipperIds].map(() => '?').join(',')})`, [...activeShippers, ...shipperIds]);
await q(`UPDATE restaurants r SET
  rating = COALESCE((SELECT ROUND(AVG(rating), 2) FROM restaurant_reviews rv WHERE rv.restaurant_id = r.id AND rv.deleted_at IS NULL), r.rating),
  total_reviews = (SELECT COUNT(*) FROM restaurant_reviews rv WHERE rv.restaurant_id = r.id AND rv.deleted_at IS NULL)`);

console.log(`Đã tạo ${created} đơn, ${reviewsCount} đánh giá, ${customers.length} khách hàng, ${shipperIds.length} tài xế, ${TICKETS.length} ticket.`);
await connection.end();
