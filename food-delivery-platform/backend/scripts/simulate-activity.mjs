/* Mô phỏng hoạt động thật của nền tảng bằng cách gọi chính các API của hệ thống:
   khách đăng ký -> thêm giỏ -> đặt hàng -> thanh toán -> quán xác nhận/chế biến -> giao cho tài xế -> GPS -> giao xong -> đánh giá.
   Mỗi món được đặt và đánh giá cho tới khi đủ 20-50 lượt (số sao phân bố từ 1 đến 5).
   Người dùng là nhân vật hư cấu; mọi bản ghi do API/trigger của hệ thống tạo ra, không chèn SQL trực tiếp.

   Chạy (server đang chạy, nên nới giới hạn request): RATE_LIMIT_MAX=10000 npm start
     node scripts/simulate-activity.mjs [--max-orders 8000] [--concurrency 8] [--accounts-only] [--min 20 --max 50] */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { api, ApiError, tokenFor, pool, DEFAULT_PASSWORD } from './lib/api-client.mjs';
import {
  SURNAMES, MALE_MIDDLE, FEMALE_MIDDLE, MALE_GIVEN, FEMALE_GIVEN, DISTRICTS, STREETS, BUILDINGS,
  DISH_COMMENTS, RESTAURANT_COMMENTS, SHIPPER_COMMENTS, CANCEL_REASONS, REJECT_REASONS, TICKET_SUBJECTS, CHAT_LINES
} from './data/vietnamese-people.mjs';

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? Number(argv[index + 1]) : fallback;
};
const MAX_ORDERS = flag('max-orders', 9000);
const CONCURRENCY = flag('concurrency', 8);
const QUOTA_MIN = flag('min', 20);
const QUOTA_MAX = flag('max', 50);
const NEW_CUSTOMERS = flag('customers', 90);
const NEW_SHIPPERS = flag('shippers', 10);
const ACCOUNTS_ONLY = argv.includes('--accounts-only');
const EXTRA_ORDERS = flag('extra-orders', 0); // thêm đơn bất kể hạn mức đánh giá (vd. để dùng mã khuyến mãi)
const PROMO_RATE = flag('promo-rate', 0.14);
const IGNORE_HOURS = argv.includes('--ignore-hours'); // thời điểm đặt đơn sẽ được dàn lại vào giờ mở cửa (spread-timeline), nên không cần quán đang mở lúc chạy

/* ---------- ngẫu nhiên có seed để chạy lại cho kết quả ổn định ---------- */
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
const rnd = mulberry32(Number(process.env.SIM_SEED || 20261013));
const pick = list => list[Math.floor(rnd() * list.length)];
const between = (min, max) => min + Math.floor(rnd() * (max - min + 1));
const gauss = () => {
  const u = Math.max(rnd(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
};
const weightedPick = (items, weightOf) => {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  let r = rnd() * total;
  for (const item of items) {
    r -= weightOf(item);
    if (r <= 0) return item;
  }
  return items[items.length - 1];
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const slug = text => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');

const db = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4'
});
const sql = async (text, params = []) => (await db.query(text, params))[0];

const ADMIN = { username: 'thaiduongpc7' };
const adminToken = () => tokenFor(ADMIN.username);

/* ================= 1. Tài khoản khách hàng ================= */
async function ensureCustomers() {
  const have = await sql("SELECT COUNT(*) AS n FROM users u WHERE u.role_id = 4 AND u.status = 'ACTIVE'");
  const need = Math.max(0, NEW_CUSTOMERS - Math.max(0, Number(have[0].n) - 26));
  const existingNames = new Set((await sql('SELECT full_name FROM customer_profiles')).map(row => row.full_name));
  const usedPhones = new Set((await sql('SELECT phone FROM users WHERE phone IS NOT NULL')).map(row => row.phone));
  let created = 0;
  for (let i = 0; i < need; i += 1) {
    const female = rnd() < 0.52;
    let fullName;
    do {
      fullName = `${pick(SURNAMES)} ${pick(female ? FEMALE_MIDDLE : MALE_MIDDLE)} ${pick(female ? FEMALE_GIVEN : MALE_GIVEN)}`;
    } while (existingNames.has(fullName));
    existingNames.add(fullName);
    let phone;
    do { phone = `${pick(['090', '091', '093', '094', '097', '098', '032', '033', '035', '070', '076', '078', '081', '083'])}${between(1000000, 9999999)}`; } while (usedPhones.has(phone));
    usedPhones.add(phone);
    const username = `kh.${slug(fullName)}`;
    try {
      const registered = await api('POST', '/api/auth/register/customer', {
        body: { username, email: `${username}@example.vn`, phone, password: DEFAULT_PASSWORD, fullName, gender: female ? 'FEMALE' : 'MALE' }
      });
      const [district, lat, lng] = pick(DISTRICTS);
      await api('POST', '/api/customer/addresses', {
        token: registered.accessToken,
        body: {
          label: pick(['Nhà riêng', 'Nhà riêng', 'Văn phòng', 'Căn hộ']), receiverName: fullName, receiverPhone: phone,
          addressLine: `${between(1, 320)} ${pick(STREETS)}${rnd() < 0.3 ? `, ${pick(BUILDINGS)}` : ''}`, ward: `Phường ${between(1, 14)}`,
          district, city: 'TP.HCM', latitude: Number((lat + (rnd() - 0.5) * 0.014).toFixed(7)), longitude: Number((lng + (rnd() - 0.5) * 0.014).toFixed(7)), isDefault: true
        }
      });
      created += 1;
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 409)) throw error;
    }
  }
  console.log(`Khách hàng: đăng ký mới ${created}`);
}

/* ================= 2. Tài xế: đăng ký công khai -> admin duyệt ================= */
async function ensureShippers() {
  const have = Number((await sql("SELECT COUNT(*) AS n FROM shipper_profiles sp INNER JOIN users u ON u.id = sp.user_id WHERE u.status = 'ACTIVE'"))[0].n);
  const need = Math.max(0, NEW_SHIPPERS + 6 - have + 1 - 1);
  const names = new Set((await sql('SELECT full_name FROM shipper_profiles')).map(row => row.full_name));
  const usedPhones = new Set((await sql('SELECT phone FROM users WHERE phone IS NOT NULL')).map(row => row.phone));
  let created = 0;
  let commitmentVersion = null;
  const token = await adminToken();
  for (let i = 0; i < need; i += 1) {
    let fullName;
    do { fullName = `${pick(SURNAMES)} ${pick(MALE_MIDDLE)} ${pick(MALE_GIVEN)}`; } while (names.has(fullName));
    names.add(fullName);
    let phone;
    do { phone = `08${between(30000000, 99999999)}`; } while (usedPhones.has(phone));
    usedPhones.add(phone);
    const username = `ship.${slug(fullName)}`;
    const plate = `89${pick(['X1', 'X2', 'X3', 'Y1', 'P1', 'H1'])}-${between(100, 999)}.${between(10, 99)}`;
    commitmentVersion ??= (await api('GET', '/api/partners/commitments/shipper')).version;
    const application = await api('POST', '/api/partners/register/shipper', {
      body: {
        username, email: `${username}@example.vn`, phone, password: DEFAULT_PASSWORD, fullName,
        identityNumber: `07${between(1000000000, 9999999999)}`.slice(0, 12), vehicleType: 'MOTORBIKE', vehiclePlate: plate,
        drivingLicense: `B1-${between(10000000, 99999999)}`, city: 'Hưng Yên', note: 'Có kinh nghiệm giao hàng, rành đường nội thành.',
        commitment: { kind: 'shipper', version: commitmentVersion, accepted: true, readToEnd: true }
      }
    });
    await api('POST', `/api/admin/partners/applications/${application.applicationId}/approve`, { token, body: { note: 'Hồ sơ hợp lệ, đã đối chiếu giấy tờ.' } });
    created += 1;
  }
  console.log(`Tài xế: đăng ký và duyệt mới ${created}`);
}

/* ================= 3. Dữ liệu nền cho mô phỏng ================= */
async function loadWorld() {
  const promotions = await sql("SELECT code, restaurant_id AS restaurantId, minimum_order AS minimumOrder FROM promotions WHERE status = 'ACTIVE' AND (start_at IS NULL OR start_at <= NOW()) AND (end_at IS NULL OR end_at >= NOW())");
  const restaurants = await sql(`SELECT r.id, r.name, r.minimum_order AS minOrder, r.latitude, r.longitude, u.username AS owner
    FROM restaurants r INNER JOIN users u ON u.id = r.owner_user_id WHERE r.status = 'ACTIVE' AND r.deleted_at IS NULL`);
  const listing = await api('GET', '/api/catalog/restaurants?pageSize=50');
  for (const restaurant of restaurants) restaurant.open = listing.items.find(item => item.id === restaurant.id)?.isOpen !== false;
  for (const restaurant of restaurants) {
    const menus = await api('GET', `/api/catalog/restaurants/${restaurant.id}/menu`);
    const items = menus.flatMap(menu => [...(menu.categories ?? []).flatMap(category => category.items ?? []), ...(menu.uncategorizedItems ?? [])]);
    restaurant.dishes = items.filter(item => item.isAvailable).map(item => ({
      id: item.id, name: item.name, price: item.effectivePrice, featured: item.isFeatured, variants: item.variants ?? [],
      groups: (item.toppingGroups ?? []).map(group => ({ min: Number(group.minSelect || 0) || (group.required ? 1 : 0), max: Number(group.maxSelect || (group.toppings ?? []).length), toppings: group.toppings ?? [] })),
      isCombo: Boolean(item.isCombo),
      have: Number(item.totalReviews ?? 0)
    }));
    for (const dish of restaurant.dishes) {
      const u = rnd();
      dish.quota = Math.min(QUOTA_MAX, QUOTA_MIN + Math.floor((QUOTA_MAX - QUOTA_MIN + 1) * Math.pow(u, dish.featured ? 0.6 : 1.25)));
      dish.quality = clamp(4.15 + gauss() * 0.55, 2.4, 4.95);
      dish.popularity = Math.exp(gauss() * 0.5) * (dish.featured ? 1.8 : 1);
    }
    restaurant.bias = gauss() * 0.22;
    restaurant.popularity = Math.exp(gauss() * 0.45);
  }
  const customers = await sql(`SELECT u.username, cp.id AS profileId, cp.full_name AS name FROM users u
    INNER JOIN customer_profiles cp ON cp.user_id = u.id WHERE u.status = 'ACTIVE' AND u.role_id = 4`);
  for (const customer of customers) {
    customer.harsh = gauss() * 0.3;
    customer.weight = Math.exp(gauss() * 0.7);
    customer.reviewRate = clamp(0.8 + gauss() * 0.12, 0.45, 0.97);
    customer.busy = false;
  }
  const shippers = await sql(`SELECT u.username, sp.id AS profileId, sp.full_name AS name FROM users u
    INNER JOIN shipper_profiles sp ON sp.user_id = u.id WHERE u.status = 'ACTIVE' AND sp.deleted_at IS NULL`);
  for (const shipper of shippers) shipper.quality = clamp(4.55 + gauss() * 0.35, 3.3, 4.95);
  for (const restaurant of restaurants) {
    restaurant.promoCodes = promotions.filter(p => p.restaurantId === null || Number(p.restaurantId) === Number(restaurant.id)).map(p => p.code);
  }
  return { restaurants, customers, shippers };
}

async function putShippersOnline(shippers) {
  for (const shipper of shippers) {
    await api('PATCH', '/api/shippers/availability', { token: await tokenFor(shipper.username), body: { availabilityStatus: 'AVAILABLE' } });
  }
}

/* ================= 4. Một đơn hàng, từ giỏ tới đánh giá ================= */
const stats = { delivered: 0, cancelled: 0, rejected: 0, failedDelivery: 0, failedPayment: 0, reviews: 0, errors: 0, orders: 0 };
const PAYMENT_MIX = [['COD', 48], ['MOMO', 20], ['VNPAY', 12], ['ZALOPAY', 8], ['BANK_TRANSFER', 6], ['CARD', 6]];
const freeShippers = [];
const waiters = [];

async function acquireShipper() {
  const shipper = freeShippers.shift();
  if (shipper) return shipper;
  return new Promise(resolve => waiters.push(resolve));
}
function releaseShipper(shipper) {
  const next = waiters.shift();
  if (next) next(shipper);
  else freeShippers.push(shipper);
}

const ITEM_NOTES = ['Không hành', 'Ít cay', 'Không rau mùi', 'Để riêng nước chấm', 'Ít đường', 'Ít đá', 'Nhiều rau'];
const SHIPPER_NOTES = ['Tới cổng gọi trước giúp mình', 'Gửi bảo vệ tòa nhà', 'Hẻm nhỏ, nhà số 3 bên trái', 'Để trước cửa rồi nhắn tin', 'Lên tầng 5, phòng 502'];

function pickBasket(restaurant) {
  const wanted = weightedPick([[1, 28], [2, 42], [3, 20], [4, 10]], entry => entry[1])[0];
  const lines = [];
  const used = new Set();
  const tryAdd = () => {
    const dish = weightedPick(restaurant.dishes.filter(d => !used.has(d.id)), d => d.popularity * (Math.max(0, d.quota - d.have) + 0.4));
    used.add(dish.id);
    const quantity = rnd() < 0.78 ? 1 : rnd() < 0.8 ? 2 : 3;
    const variant = dish.variants.length ? pick(dish.variants) : null;
    const toppings = [];
    for (const group of dish.groups) {
      const count = group.min > 0 ? between(group.min, Math.max(group.min, Math.min(group.max, group.min + 1))) : (rnd() < 0.3 ? 1 : 0);
      const pool = [...group.toppings];
      for (let i = 0; i < Math.min(count, group.max, pool.length); i += 1) toppings.push(pool.splice(between(0, pool.length - 1), 1)[0]);
    }
    const note = rnd() < 0.15 ? pick(ITEM_NOTES) : undefined;
    lines.push({ dish, quantity, variant, toppings, note });
  };
  for (let i = 0; i < wanted; i += 1) tryAdd();
  const subtotalOf = () => lines.reduce((sum, line) => sum + (line.dish.price + (line.variant?.priceAdjustment ?? 0) + line.toppings.reduce((s, t) => s + t.price, 0)) * line.quantity, 0);
  while (subtotalOf() < Number(restaurant.minOrder) && lines.length < 6) tryAdd();
  return lines;
}

function drawRating(line, restaurant, customer, shipperQuality) {
  const base = line.dish.quality + restaurant.bias + customer.harsh + (shipperQuality - 4.5) * 0.25;
  const roll = rnd();
  if (roll < 0.05) return pick([1, 1, 2]);
  if (roll < 0.1) return pick([2, 3, 3]);
  return clamp(Math.round(base + gauss() * 0.75), 1, 5);
}

const commentFor = (pool, rating, dishName) => (pool[rating] ? pick(pool[rating]).replace('{dish}', dishName) : null);

async function runOrder(world) {
  const customer = weightedPick(world.customers.filter(c => !c.busy), c => c.weight);
  customer.busy = true;
  stats.orders += 1;
  try {
    const restaurant = weightedPick(world.restaurants.filter(r => IGNORE_HOURS || r.open !== false), r => r.popularity * (1 + r.dishes.reduce((sum, d) => sum + Math.max(0, d.quota - d.have), 0) / 50));
    const customerToken = await tokenFor(customer.username);
    const restaurantToken = await tokenFor(restaurant.owner);
    const addresses = await api('GET', '/api/customer/addresses', { token: customerToken });
    const address = addresses.items.find(a => a.isDefault) ?? addresses.items[0];

    const basket = pickBasket(restaurant);
    await api('DELETE', `/api/customer/cart/${restaurant.id}`, { token: customerToken, expect: [200, 204, 404] });
    for (const line of basket) {
      await api('POST', '/api/customer/cart/items', {
        token: customerToken,
        body: { restaurantId: restaurant.id, menuItemId: line.dish.id, variantId: line.variant?.id ?? null, quantity: line.quantity, toppingIds: line.toppings.map(t => t.id), note: line.note }
      });
    }
    const paymentMethod = weightedPick(PAYMENT_MIX, entry => entry[1])[0];
    const checkoutBody = {
      restaurantId: restaurant.id, addressId: address.id, paymentMethod,
      customerNote: rnd() < 0.25 ? pick(['Gói riêng giúp mình', 'Ít cay giúp mình', 'In hoá đơn giúp mình']) : undefined,
      shipperNote: rnd() < 0.3 ? pick(SHIPPER_NOTES) : undefined,
      needUtensils: rnd() < 0.62,
      contactlessDelivery: rnd() < 0.08
    };
    const idempotencyKey = `sim-${Date.now().toString(36)}-${stats.orders}-${between(1000, 9999)}`;
    // Khách xem báo giá và dùng voucher gợi ý tốt nhất với xác suất PROMO_RATE (voucher đổi điểm, freeship, voucher quán...)
    const quote = await api('POST', '/api/customer/orders/quote', { token: customerToken, body: { restaurantId: restaurant.id, addressId: address.id } });
    const promotionCode = quote.bestVoucher && rnd() < PROMO_RATE ? quote.bestVoucher.code : undefined;
    let order;
    try {
      order = await api('POST', '/api/customer/orders/checkout', { token: customerToken, headers: { 'Idempotency-Key': idempotencyKey }, body: { ...checkoutBody, promotionCode } });
    } catch (error) {
      if (!(promotionCode && error instanceof ApiError && error.status === 400)) throw error; // mã không áp dụng được -> đặt không mã
      order = await api('POST', '/api/customer/orders/checkout', { token: customerToken, headers: { 'Idempotency-Key': `${idempotencyKey}-np` }, body: checkoutBody });
    }

    if (paymentMethod !== 'COD') {
      if (rnd() < 0.04) {
        await api('POST', `/api/payments/orders/${order.id}/mock-pay`, { token: customerToken, body: { outcome: 'FAILED' } });
        stats.failedPayment += 1;
      }
      await api('POST', `/api/payments/orders/${order.id}/mock-pay`, { token: customerToken, body: { outcome: 'PAID' } });
    }

    let shipperUsed = null;
    const fate = rnd();
    if (fate < 0.045) {
      await api('POST', `/api/payments/orders/${order.id}/cancel`, { token: customerToken, body: { reason: pick(CANCEL_REASONS) } });
      if (paymentMethod !== 'COD') {
        await api('POST', `/api/payments/orders/${order.id}/refund`, { token: await adminToken(), body: { reason: 'Hoàn tiền đơn khách huỷ' } });
      }
      stats.cancelled += 1;
      return;
    }
    if (fate < 0.07) {
      await api('POST', `/api/restaurant/orders/${order.id}/reject`, { token: restaurantToken, body: { reason: pick(REJECT_REASONS) } });
      if (paymentMethod !== 'COD') {
        await api('POST', `/api/payments/orders/${order.id}/refund`, { token: await adminToken(), body: { reason: 'Hoàn tiền đơn quán từ chối' } });
      }
      stats.rejected += 1;
      return;
    }

    for (const step of ['confirm', 'prepare', 'ready']) {
      await api('POST', `/api/restaurant/orders/${order.id}/${step}`, { token: restaurantToken, body: {} });
    }

    const shipper = await acquireShipper();
    let delivered = false;
    shipperUsed = shipper;
    try {
      const shipperToken = await tokenFor(shipper.username);
      const assignment = await api('POST', '/api/deliveries/assign', {
        token: restaurantToken,
        body: { orderId: order.id, shipperId: shipper.profileId, distanceKm: Number((1.2 + rnd() * 6).toFixed(1)), deliveryFee: order.deliveryFee }
      });
      await api('POST', `/api/shippers/assignments/${assignment.assignmentId}/accept`, { token: shipperToken, body: {} });
      const lat = Number(restaurant.latitude);
      const lng = Number(restaurant.longitude);
      const dLat = Number(address.latitude ?? lat);
      const dLng = Number(address.longitude ?? lng);
      await api('POST', `/api/shippers/deliveries/${assignment.deliveryId}/status`, { token: shipperToken, body: { status: 'PICKED_UP', latitude: lat, longitude: lng } });
      for (const t of [0.35, 0.7]) {
        await api('POST', '/api/shippers/locations', {
          token: shipperToken,
          body: { deliveryId: assignment.deliveryId, latitude: Number((lat + (dLat - lat) * t).toFixed(7)), longitude: Number((lng + (dLng - lng) * t).toFixed(7)), speed: between(18, 38) }
        });
      }
      await api('POST', `/api/shippers/deliveries/${assignment.deliveryId}/status`, { token: shipperToken, body: { status: 'DELIVERING', latitude: lat, longitude: lng } });
      if (rnd() < 0.015) {
        await api('POST', `/api/shippers/deliveries/${assignment.deliveryId}/status`, { token: shipperToken, body: { status: 'FAILED', note: 'Không liên lạc được với người nhận' } });
        stats.failedDelivery += 1;
        return;
      }
      await api('POST', `/api/shippers/deliveries/${assignment.deliveryId}/status`, { token: shipperToken, body: { status: 'DELIVERED', latitude: dLat, longitude: dLng, note: 'Giao thành công' } });
      delivered = true;
    } finally {
      releaseShipper(shipper);
    }
    if (!delivered) return;
    stats.delivered += 1;

    /* đánh giá sau khi nhận hàng */
    const detail = await api('GET', `/api/customer/orders/${order.id}`, { token: customerToken });
    const itemReviews = [];
    const ratings = [];
    for (const line of basket) {
      const orderLine = detail.items.find(item => Number(item.menuItemId) === line.dish.id);
      if (!orderLine) continue;
      if (rnd() > customer.reviewRate) continue;
      const rating = drawRating(line, restaurant, customer, (shipperUsed?.quality ?? 4.5));
      ratings.push(rating);
      itemReviews.push({ orderItemId: orderLine.id, rating, comment: rnd() < 0.62 ? commentFor(DISH_COMMENTS, rating, line.dish.name) : null });
      line.dish.have += 1;
    }
    if (itemReviews.length) {
      await api('POST', `/api/communications/orders/${order.id}/item-reviews`, { token: customerToken, body: { items: itemReviews } });
      stats.reviews += itemReviews.length;
    }
    if (ratings.length && rnd() < 0.85) {
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      const rating = clamp(Math.round(avg + gauss() * 0.4), 1, 5);
      await api('POST', `/api/communications/orders/${order.id}/restaurant-review`, {
        token: customerToken, body: { rating, comment: rnd() < 0.5 ? pick(RESTAURANT_COMMENTS[rating]) : null }
      });
    }
    if (rnd() < 0.7) {
      const rating = clamp(Math.round((shipperUsed?.quality ?? 4.5) + gauss() * 0.7), 1, 5);
      await api('POST', `/api/communications/orders/${order.id}/shipper-review`, {
        token: customerToken, body: { rating, comment: rnd() < 0.45 ? pick(SHIPPER_COMMENTS[rating]) : null }
      });
    }

    /* các hành vi phụ của khách */
    if (rnd() < 0.2) await api('POST', `/api/payments/orders/${order.id}/invoice`, { token: customerToken, body: {} });
    if (rnd() < 0.035) {
      const [subject, description, category] = pick(TICKET_SUBJECTS);
      const ticket = await api('POST', '/api/communications/support/tickets', { token: customerToken, body: { orderId: order.id, subject, description, category } });
      await api('POST', `/api/communications/support/tickets/${ticket.id}/messages`, {
        token: await adminToken(), body: { message: 'Chào bạn, bên mình đã ghi nhận và đang kiểm tra đơn. Sẽ phản hồi trong ít phút.' }
      });
      if (rnd() < 0.7) await api('PATCH', `/api/communications/support/tickets/${ticket.id}`, { token: await adminToken(), body: { status: 'RESOLVED' } });
    }
    if (rnd() < 0.03) {
      const session = await api('POST', '/api/communications/chat/sessions', { token: customerToken, body: { orderId: order.id } });
      await api('POST', `/api/communications/chat/sessions/${session.id}/messages`, { token: customerToken, body: { message: pick(CHAT_LINES.customer) } });
      await api('POST', `/api/communications/chat/sessions/${session.id}/messages`, { token: restaurantToken, body: { message: pick(CHAT_LINES.restaurant) } });
    }
  } catch (error) {
    stats.errors += 1;
    if (stats.errors <= 12) console.log('  lỗi đơn:', String(error.message).slice(0, 260));
  } finally {
    customer.busy = false;
  }
}

const remaining = world => world.restaurants.reduce((sum, r) => sum + r.dishes.filter(d => d.have < d.quota).length, 0);

/* ================= chạy ================= */
await ensureCustomers();
await ensureShippers();
if (ACCOUNTS_ONLY) {
  await db.end();
  process.exit(0);
}

const world = await loadWorld();
await putShippersOnline(world.shippers);
freeShippers.push(...world.shippers);
const totalDishes = world.restaurants.reduce((sum, r) => sum + r.dishes.length, 0);
console.log(`Bắt đầu: ${world.restaurants.length} quán, ${totalDishes} món, ${world.customers.length} khách, ${world.shippers.length} tài xế. Đơn tối đa ${MAX_ORDERS}, song song ${CONCURRENCY}.`);

const started = Date.now();
let launched = 0;
let lastLog = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (launched < MAX_ORDERS && (remaining(world) > 0 || launched < EXTRA_ORDERS)) {
    launched += 1;
    await runOrder(world);
    if (stats.orders - lastLog >= 100) {
      lastLog = stats.orders;
      const minutes = (Date.now() - started) / 60000;
      console.log(`đơn ${stats.orders} | giao ${stats.delivered} | huỷ ${stats.cancelled} | từ chối ${stats.rejected} | giao hỏng ${stats.failedDelivery} | đánh giá món ${stats.reviews} | món chưa đủ ${remaining(world)} | lỗi ${stats.errors} | ${minutes.toFixed(1)} phút`);
    }
  }
}));

console.log('Hoàn tất mô phỏng:', stats, `trong ${((Date.now() - started) / 60000).toFixed(1)} phút. Món chưa đủ đánh giá: ${remaining(world)}`);
await db.end();
