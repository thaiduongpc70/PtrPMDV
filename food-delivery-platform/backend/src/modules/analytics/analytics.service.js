import { query } from '../../shared/database/mysql.js';
import { HttpError } from '../../shared/http/http-error.js';

/* Thống kê trực tiếp từ DB. Mọi báo cáo nhận khoảng ngày [from, to] (mặc định 30 ngày gần nhất) và phạm vi
   (toàn hệ thống / một quán / một tài xế / một khách). Mỗi báo cáo trả về số liệu cho biểu đồ và `dataset`
   ({title, columns, rows, summary}) để xuất Excel/PDF/CSV đúng bằng số liệu đang xem. */

const col = (key, label, type = 'text') => ({ key, label, type });
const num = value => Number(value ?? 0);
const isDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''));
const DAY_MS = 86400000;
const iso = date => date.toISOString().slice(0, 10);

/** Khoảng ngày + kỳ liền trước cùng độ dài (để so sánh tăng/giảm). */
export function readRange(queryParams) {
  const today = new Date();
  const to = isDate(queryParams.to) ? new Date(`${queryParams.to}T00:00:00Z`) : new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  let from = isDate(queryParams.from) ? new Date(`${queryParams.from}T00:00:00Z`) : new Date(to.getTime() - 29 * DAY_MS);
  if (from > to) throw new HttpError(400, 'Ngày bắt đầu phải trước ngày kết thúc');
  if ((to - from) / DAY_MS > 366) throw new HttpError(400, 'Khoảng thời gian tối đa 366 ngày');
  const days = Math.round((to - from) / DAY_MS) + 1;
  const group = ['day', 'week', 'month'].includes(queryParams.group) ? queryParams.group : days > 120 ? 'month' : days > 45 ? 'week' : 'day';
  const prevTo = new Date(from.getTime() - DAY_MS);
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * DAY_MS);
  return { from: iso(from), to: iso(to), prevFrom: iso(prevFrom), prevTo: iso(prevTo), days, group };
}

const bucket = (group, column) => (group === 'month' ? `DATE_FORMAT(${column}, '%Y-%m-01')` : group === 'week' ? `DATE_SUB(DATE(${column}), INTERVAL WEEKDAY(${column}) DAY)` : `DATE(${column})`);
/** Khoá kỳ dạng YYYY-MM-DD (DB trả về Date theo giờ địa phương hoặc chuỗi). */
const periodKey = value => (value instanceof Date ? iso(new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()))) : String(value).slice(0, 10));
const bucketLabel = (group, value) => {
  const text = periodKey(value);
  const [y, m, d] = text.split('-');
  return group === 'month' ? `${m}/${y}` : `${d}/${m}`;
};

/** Điều kiện lọc đơn theo phạm vi và khoảng ngày (alias bảng orders = o). */
function orderFilter(scope, from, to) {
  const parts = ['o.deleted_at IS NULL', 'o.created_at >= ?', 'o.created_at < DATE_ADD(?, INTERVAL 1 DAY)'];
  const params = [from, to];
  if (scope.restaurantId) { parts.push('o.restaurant_id = ?'); params.push(scope.restaurantId); }
  if (scope.customerId) { parts.push('o.customer_id = ?'); params.push(scope.customerId); }
  if (scope.shipperId) { parts.push('o.shipper_id = ?'); params.push(scope.shipperId); }
  return { where: parts.join(' AND '), params };
}

const DELIVERED = "o.order_status = 'DELIVERED'";

async function totals(scope, from, to) {
  const f = orderFilter(scope, from, to);
  const [row] = await query(
    `SELECT COUNT(*) AS orders, SUM(o.order_status = 'DELIVERED') AS delivered, SUM(o.order_status = 'CANCELLED') AS cancelled, SUM(o.order_status = 'FAILED') AS failed,
            COALESCE(SUM(CASE WHEN ${DELIVERED} THEN o.subtotal END), 0) AS gmv,
            COALESCE(SUM(CASE WHEN ${DELIVERED} THEN o.total_amount END), 0) AS collected,
            COALESCE(SUM(CASE WHEN ${DELIVERED} THEN o.delivery_fee END), 0) AS delivery_fees,
            COALESCE(SUM(CASE WHEN ${DELIVERED} THEN o.discount_amount END), 0) AS discounts,
            COUNT(DISTINCT o.customer_id) AS active_customers
     FROM orders o WHERE ${f.where}`, f.params
  );
  const [commission] = await query(
    `SELECT COALESCE(SUM(rc.commission_amount), 0) AS commission FROM restaurant_commissions rc INNER JOIN orders o ON o.id = rc.order_id WHERE ${f.where}`, f.params
  );
  const promo = await query(
    `SELECT (p.restaurant_id IS NULL) AS platform, COALESCE(SUM(pu.discount_amount), 0) AS amount
     FROM promotion_usage pu INNER JOIN promotions p ON p.id = pu.promotion_id INNER JOIN orders o ON o.id = pu.order_id
     WHERE ${DELIVERED} AND ${f.where} GROUP BY (p.restaurant_id IS NULL)`, f.params
  );
  const [fresh] = await query(
    `SELECT COUNT(*) AS n FROM (SELECT o.customer_id, MIN(o.created_at) AS first_order FROM orders o WHERE o.deleted_at IS NULL
       ${scope.restaurantId ? 'AND o.restaurant_id = ?' : ''} GROUP BY o.customer_id) x WHERE x.first_order >= ? AND x.first_order < DATE_ADD(?, INTERVAL 1 DAY)`,
    [...(scope.restaurantId ? [scope.restaurantId] : []), from, to]
  );
  const platformPromo = num(promo.find(item => Number(item.platform) === 1)?.amount);
  const shopPromo = num(promo.find(item => Number(item.platform) === 0)?.amount);
  const orders = num(row.orders);
  const delivered = num(row.delivered);
  return {
    orders, delivered, cancelled: num(row.cancelled), failed: num(row.failed), gmv: num(row.gmv), collected: num(row.collected),
    deliveryFees: num(row.delivery_fees), discounts: num(row.discounts), activeCustomers: num(row.active_customers), newCustomers: num(fresh?.n),
    commission: num(commission?.commission), platformPromo, shopPromo,
    netRevenue: num(commission?.commission) - platformPromo,
    avgOrderValue: delivered ? num(row.gmv) / delivered : 0,
    cancelRate: orders ? (num(row.cancelled) + num(row.failed)) / orders * 100 : 0,
    restaurantNet: num(row.gmv) - num(commission?.commission) - shopPromo
  };
}

async function series(scope, from, to, group) {
  const f = orderFilter(scope, from, to);
  const key = bucket(group, 'o.created_at');
  const rows = await query(
    `SELECT ${key} AS period, COUNT(*) AS orders, SUM(o.order_status = 'DELIVERED') AS delivered, SUM(o.order_status IN ('CANCELLED', 'FAILED')) AS lost,
            COALESCE(SUM(CASE WHEN ${DELIVERED} THEN o.subtotal END), 0) AS gmv, COALESCE(SUM(CASE WHEN ${DELIVERED} THEN o.delivery_fee END), 0) AS delivery_fees,
            COALESCE(SUM(CASE WHEN ${DELIVERED} THEN o.discount_amount END), 0) AS discounts, COUNT(DISTINCT o.customer_id) AS customers
     FROM orders o WHERE ${f.where} GROUP BY ${key} ORDER BY period`, f.params
  );
  const commissions = await query(
    `SELECT ${key} AS period, SUM(rc.commission_amount) AS commission FROM restaurant_commissions rc INNER JOIN orders o ON o.id = rc.order_id WHERE ${f.where} GROUP BY ${key}`, f.params
  );
  const byPeriod = new Map(commissions.map(item => [periodKey(item.period), num(item.commission)]));
  return rows.map(item => ({
    period: periodKey(item.period), label: bucketLabel(group, item.period), orders: num(item.orders), delivered: num(item.delivered), lost: num(item.lost), gmv: num(item.gmv),
    deliveryFees: num(item.delivery_fees), discounts: num(item.discounts), customers: num(item.customers), commission: byPeriod.get(periodKey(item.period)) ?? 0
  }));
}

const pct = (current, previous) => (previous ? Math.round((current - previous) / previous * 1000) / 10 : null);

/* ====================== Báo cáo ====================== */
export async function overviewReport(scope, queryParams, { isAdmin }) {
  const range = readRange(queryParams);
  const [now, before, timeline] = await Promise.all([totals(scope, range.from, range.to), totals(scope, range.prevFrom, range.prevTo), series(scope, range.from, range.to, range.group)]);
  const f = orderFilter(scope, range.from, range.to);
  const [byPayment, byStatus, heat] = await Promise.all([
    query(`SELECT o.payment_method AS method, COUNT(*) AS orders, COALESCE(SUM(CASE WHEN ${DELIVERED} THEN o.total_amount END), 0) AS amount FROM orders o WHERE ${f.where} GROUP BY o.payment_method ORDER BY orders DESC`, f.params),
    query(`SELECT o.order_status AS status, COUNT(*) AS orders FROM orders o WHERE ${f.where} GROUP BY o.order_status ORDER BY orders DESC`, f.params),
    query(`SELECT WEEKDAY(o.created_at) AS weekday, HOUR(o.created_at) AS hour, COUNT(*) AS orders FROM orders o WHERE ${f.where} GROUP BY weekday, hour`, f.params)
  ]);
  const deltas = Object.fromEntries(['orders', 'gmv', 'collected', 'avgOrderValue', 'commission', 'netRevenue', 'activeCustomers', 'newCustomers', 'discounts', 'restaurantNet'].map(key => [key, pct(now[key], before[key])]));
  const columns = [col('label', 'Kỳ'), col('orders', 'Đơn', 'number'), col('delivered', 'Đã giao', 'number'), col('lost', 'Huỷ/thất bại', 'number'), col('gmv', 'Doanh thu món', 'money'),
    col('deliveryFees', 'Phí giao', 'money'), col('discounts', 'Giảm giá', 'money'), ...(isAdmin ? [col('commission', 'Hoa hồng nền tảng', 'money')] : []), col('customers', 'Khách đặt', 'number')];
  return {
    range, kpis: now, previous: before, deltas, series: timeline, byPayment: byPayment.map(r => ({ method: r.method, orders: num(r.orders), amount: num(r.amount) })),
    byStatus: byStatus.map(r => ({ status: r.status, orders: num(r.orders) })), heat: heat.map(r => ({ weekday: num(r.weekday), hour: num(r.hour), orders: num(r.orders) })),
    dataset: {
      title: `Doanh thu theo ${range.group === 'day' ? 'ngày' : range.group === 'week' ? 'tuần' : 'tháng'} (${range.from} → ${range.to})`,
      columns, rows: timeline,
      summary: [{ label: 'Doanh thu món (đơn đã giao)', value: now.gmv, type: 'money' }, { label: 'Số đơn', value: now.orders, type: 'number' }, { label: 'Giá trị TB/đơn', value: now.avgOrderValue, type: 'money' },
        { label: isAdmin ? 'Hoa hồng nền tảng' : 'Hoa hồng đã trả', value: now.commission, type: 'money' }, { label: 'Tỷ lệ huỷ/thất bại', value: now.cancelRate, type: 'percent' }]
    }
  };
}

export async function restaurantsReport(_scope, queryParams) {
  const range = readRange(queryParams);
  const f = orderFilter({}, range.from, range.to);
  const rows = await query(
    `SELECT r.id, r.name, r.district, c.name AS category, r.rating, COUNT(*) AS orders, SUM(o.order_status = 'DELIVERED') AS delivered,
            SUM(o.order_status IN ('CANCELLED', 'FAILED')) AS lost,
            COALESCE(SUM(CASE WHEN ${DELIVERED} THEN o.subtotal END), 0) AS gmv, COALESCE(SUM(CASE WHEN ${DELIVERED} THEN o.discount_amount END), 0) AS discounts,
            COALESCE(SUM(rc.commission_amount), 0) AS commission,
            SUM(CASE WHEN ${DELIVERED} AND EXISTS (SELECT 1 FROM promotion_usage pu WHERE pu.order_id = o.id) THEN 1 ELSE 0 END) AS voucher_orders
     FROM orders o INNER JOIN restaurants r ON r.id = o.restaurant_id LEFT JOIN restaurant_categories c ON c.id = r.category_id LEFT JOIN restaurant_commissions rc ON rc.order_id = o.id
     WHERE ${f.where} GROUP BY r.id, r.name, r.district, c.name, r.rating ORDER BY gmv DESC`, f.params
  );
  const items = rows.map(r => ({
    id: num(r.id), name: r.name, district: r.district, category: r.category, rating: num(r.rating), orders: num(r.orders), delivered: num(r.delivered), lost: num(r.lost),
    cancelRate: num(r.orders) ? num(r.lost) / num(r.orders) * 100 : 0, gmv: num(r.gmv), avgOrderValue: num(r.delivered) ? num(r.gmv) / num(r.delivered) : 0,
    discounts: num(r.discounts), commission: num(r.commission), voucherShare: num(r.delivered) ? num(r.voucher_orders) / num(r.delivered) * 100 : 0
  }));
  const total = items.reduce((sum, item) => sum + item.gmv, 0);
  return {
    range, items: items.map(item => ({ ...item, share: total ? item.gmv / total * 100 : 0 })),
    dataset: {
      title: `Hiệu quả kinh doanh theo nhà hàng (${range.from} → ${range.to})`,
      columns: [col('name', 'Nhà hàng'), col('category', 'Danh mục'), col('district', 'Quận'), col('orders', 'Đơn', 'number'), col('delivered', 'Đã giao', 'number'), col('cancelRate', 'Tỷ lệ huỷ', 'percent'),
        col('gmv', 'Doanh thu món', 'money'), col('share', 'Tỷ trọng', 'percent'), col('avgOrderValue', 'TB/đơn', 'money'), col('discounts', 'Giảm giá', 'money'), col('commission', 'Hoa hồng', 'money'),
        col('voucherShare', 'Đơn dùng voucher', 'percent'), col('rating', 'Đánh giá', 'number')],
      rows: items.map(item => ({ ...item, share: total ? item.gmv / total * 100 : 0 })),
      summary: [{ label: 'Tổng doanh thu món', value: total, type: 'money' }, { label: 'Số nhà hàng có đơn', value: items.length, type: 'number' }]
    }
  };
}

export async function itemsReport(scope, queryParams) {
  const range = readRange(queryParams);
  const f = orderFilter(scope, range.from, range.to);
  const rows = await query(
    `SELECT COALESCE(mi.id, 0) AS id, oi.item_name AS name, COALESCE(mi.item_type, 'DISH') AS item_type, COALESCE(mc.name, '') AS category,
            r.name AS restaurant, COUNT(DISTINCT o.id) AS orders, SUM(oi.quantity) AS quantity, SUM(oi.total_price) AS revenue, COALESCE(mi.rating, 0) AS rating, COALESCE(mi.total_reviews, 0) AS reviews
     FROM order_items oi INNER JOIN orders o ON o.id = oi.order_id LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id LEFT JOIN menu_categories mc ON mc.id = mi.category_id
     INNER JOIN restaurants r ON r.id = o.restaurant_id
     WHERE ${DELIVERED} AND ${f.where} GROUP BY mi.id, oi.item_name, mi.item_type, mc.name, r.name, mi.rating, mi.total_reviews ORDER BY revenue DESC LIMIT 500`, f.params
  );
  const items = rows.map(r => ({ id: num(r.id), name: r.name, type: r.item_type === 'COMBO' ? 'Combo' : 'Món', category: r.category, restaurant: r.restaurant, orders: num(r.orders), quantity: num(r.quantity), revenue: num(r.revenue), avgPrice: num(r.quantity) ? num(r.revenue) / num(r.quantity) : 0, rating: num(r.rating), reviews: num(r.reviews) }));
  const total = items.reduce((sum, item) => sum + item.revenue, 0);
  const combo = items.filter(item => item.type === 'Combo');
  const categories = new Map();
  for (const item of items) categories.set(item.category || 'Khác', (categories.get(item.category || 'Khác') ?? 0) + item.revenue);
  const [unsold] = scope.restaurantId ? await query(
    `SELECT COUNT(*) AS n FROM menu_items mi WHERE mi.restaurant_id = ? AND mi.deleted_at IS NULL AND NOT EXISTS
       (SELECT 1 FROM order_items oi INNER JOIN orders o ON o.id = oi.order_id WHERE oi.menu_item_id = mi.id AND ${DELIVERED} AND o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY))`,
    [scope.restaurantId, range.from, range.to]) : [null];
  return {
    range, items: items.map(item => ({ ...item, share: total ? item.revenue / total * 100 : 0 })),
    categories: [...categories.entries()].map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    comboSummary: { units: combo.reduce((s, i) => s + i.quantity, 0), revenue: combo.reduce((s, i) => s + i.revenue, 0), share: total ? combo.reduce((s, i) => s + i.revenue, 0) / total * 100 : 0, count: combo.length },
    unsold: unsold ? num(unsold.n) : null,
    dataset: {
      title: `Món và combo bán chạy (${range.from} → ${range.to})`,
      columns: [col('name', 'Món/Combo'), col('type', 'Loại'), ...(scope.restaurantId ? [] : [col('restaurant', 'Nhà hàng')]), col('category', 'Danh mục'), col('orders', 'Đơn', 'number'), col('quantity', 'Số lượng', 'number'),
        col('revenue', 'Doanh thu', 'money'), col('share', 'Tỷ trọng', 'percent'), col('avgPrice', 'Giá TB', 'money'), col('rating', 'Điểm', 'number'), col('reviews', 'Lượt đánh giá', 'number')],
      rows: items.map(item => ({ ...item, share: total ? item.revenue / total * 100 : 0 })),
      summary: [{ label: 'Doanh thu từ món', value: total, type: 'money' }, { label: 'Doanh thu từ combo', value: combo.reduce((s, i) => s + i.revenue, 0), type: 'money' }, { label: 'Số combo đã bán', value: combo.reduce((s, i) => s + i.quantity, 0), type: 'number' }]
    }
  };
}

export async function regionsReport(_scope, queryParams) {
  const range = readRange(queryParams);
  const f = orderFilter({}, range.from, range.to);
  const rows = await query(
    `SELECT r.city, COALESCE(r.district, 'Khác') AS district, COUNT(DISTINCT r.id) AS restaurants, COUNT(*) AS orders, SUM(o.order_status = 'DELIVERED') AS delivered,
            COALESCE(SUM(CASE WHEN ${DELIVERED} THEN o.subtotal END), 0) AS gmv, AVG(CASE WHEN ${DELIVERED} THEN d.distance_km END) AS avg_km
     FROM orders o INNER JOIN restaurants r ON r.id = o.restaurant_id LEFT JOIN deliveries d ON d.order_id = o.id WHERE ${f.where}
     GROUP BY r.city, r.district ORDER BY gmv DESC`, f.params
  );
  const items = rows.map(r => ({ city: r.city, district: r.district, restaurants: num(r.restaurants), orders: num(r.orders), delivered: num(r.delivered), gmv: num(r.gmv), avgOrderValue: num(r.delivered) ? num(r.gmv) / num(r.delivered) : 0, avgKm: num(r.avg_km) }));
  return {
    range, items,
    dataset: {
      title: `Doanh thu theo khu vực (${range.from} → ${range.to})`,
      columns: [col('city', 'Tỉnh/thành'), col('district', 'Quận/huyện'), col('restaurants', 'Số quán', 'number'), col('orders', 'Đơn', 'number'), col('delivered', 'Đã giao', 'number'), col('gmv', 'Doanh thu món', 'money'), col('avgOrderValue', 'TB/đơn', 'money'), col('avgKm', 'Km giao TB', 'number')],
      rows: items, summary: [{ label: 'Tổng doanh thu món', value: items.reduce((s, i) => s + i.gmv, 0), type: 'money' }, { label: 'Số khu vực', value: items.length, type: 'number' }]
    }
  };
}

export async function promotionsReport(scope, queryParams) {
  const range = readRange(queryParams);
  const f = orderFilter(scope, range.from, range.to);
  const rows = await query(
    `SELECT p.id, p.code, p.name, p.discount_type, p.discount_value, p.minimum_order, p.status, p.usage_limit, p.used_count, p.end_at, p.restaurant_id, p.customer_id, r.name AS restaurant,
            COUNT(pu.id) AS uses, COALESCE(SUM(pu.discount_amount), 0) AS discount, COALESCE(SUM(o.subtotal), 0) AS revenue, COUNT(DISTINCT pu.customer_id) AS customers
     FROM promotion_usage pu INNER JOIN promotions p ON p.id = pu.promotion_id INNER JOIN orders o ON o.id = pu.order_id AND ${DELIVERED} LEFT JOIN restaurants r ON r.id = p.restaurant_id
     WHERE ${f.where} ${scope.restaurantId ? 'AND (p.restaurant_id = ? OR p.restaurant_id IS NULL)' : ''}
     GROUP BY p.id, p.code, p.name, p.discount_type, p.discount_value, p.minimum_order, p.status, p.usage_limit, p.used_count, p.end_at, p.restaurant_id, p.customer_id, r.name ORDER BY discount DESC`,
    [...f.params, ...(scope.restaurantId ? [scope.restaurantId] : [])]
  );
  const items = rows.map(r => ({
    id: num(r.id), code: r.code, name: r.name, scope: r.customer_id ? 'Voucher đổi điểm' : r.restaurant_id ? 'Của quán' : 'Toàn sàn', restaurant: r.restaurant ?? 'Toàn hệ thống', discountType: r.discount_type,
    uses: num(r.uses), customers: num(r.customers), discount: num(r.discount), revenue: num(r.revenue), avgOrderValue: num(r.uses) ? num(r.revenue) / num(r.uses) : 0,
    roi: num(r.discount) ? num(r.revenue) / num(r.discount) : 0, quota: r.usage_limit == null ? 'Không giới hạn' : `${num(r.used_count)}/${num(r.usage_limit)}`, status: r.status, endAt: r.end_at
  }));
  const [shareRow] = await query(`SELECT COUNT(*) AS delivered, SUM(EXISTS (SELECT 1 FROM promotion_usage pu WHERE pu.order_id = o.id)) AS with_voucher FROM orders o WHERE ${DELIVERED} AND ${f.where}`, f.params);
  const byScope = ['Toàn sàn', 'Của quán', 'Voucher đổi điểm'].map(name => ({ name, uses: items.filter(i => i.scope === name).reduce((s, i) => s + i.uses, 0), discount: items.filter(i => i.scope === name).reduce((s, i) => s + i.discount, 0) }));
  let loyalty = null;
  if (!scope.restaurantId) {
    const [flow] = await query(
      `SELECT COALESCE(SUM(CASE WHEN type = 'EARN' THEN points END), 0) AS earned, COALESCE(-SUM(CASE WHEN type = 'REDEEM' THEN points END), 0) AS redeemed, COALESCE(SUM(CASE WHEN type = 'ADJUST' THEN points END), 0) AS adjusted,
              COUNT(DISTINCT CASE WHEN type = 'REDEEM' THEN customer_id END) AS redeemers
       FROM loyalty_transactions WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)`, [range.from, range.to]
    );
    const [balance] = await query('SELECT COALESCE(SUM(loyalty_points), 0) AS outstanding, COUNT(CASE WHEN loyalty_points > 0 THEN 1 END) AS holders FROM customer_profiles');
    const rewards = await query(
      `SELECT lr.id, lr.name, lr.points_cost, lr.status, lr.stock, COUNT(lt.id) AS redeemed
       FROM loyalty_rewards lr LEFT JOIN loyalty_transactions lt ON lt.reward_id = lr.id AND lt.type = 'REDEEM' AND lt.created_at >= ? AND lt.created_at < DATE_ADD(?, INTERVAL 1 DAY) GROUP BY lr.id ORDER BY redeemed DESC`, [range.from, range.to]
    );
    loyalty = { earned: num(flow.earned), redeemed: num(flow.redeemed), adjusted: num(flow.adjusted), redeemers: num(flow.redeemers), outstanding: num(balance.outstanding), holders: num(balance.holders),
      rewards: rewards.map(r => ({ id: num(r.id), name: r.name, pointsCost: num(r.points_cost), status: r.status, stock: r.stock == null ? null : num(r.stock), redeemed: num(r.redeemed) })) };
  }
  const delivered = num(shareRow?.delivered);
  const withVoucher = num(shareRow?.with_voucher);
  return {
    range, items, byScope, loyalty, voucherOrderShare: delivered ? withVoucher / delivered * 100 : 0, voucherOrders: withVoucher, deliveredOrders: delivered,
    dataset: {
      title: `Hiệu quả khuyến mãi (${range.from} → ${range.to})`,
      columns: [col('code', 'Mã'), col('name', 'Chương trình'), col('scope', 'Loại'), col('restaurant', 'Phạm vi'), col('uses', 'Lượt dùng', 'number'), col('customers', 'Số khách', 'number'), col('discount', 'Tiền giảm', 'money'),
        col('revenue', 'Doanh thu đơn', 'money'), col('avgOrderValue', 'TB/đơn', 'money'), col('roi', 'Doanh thu/1đ giảm', 'number'), col('quota', 'Hạn ngạch'), col('status', 'Trạng thái')],
      rows: items,
      summary: [{ label: 'Tổng tiền giảm', value: items.reduce((s, i) => s + i.discount, 0), type: 'money' }, { label: 'Đơn dùng voucher', value: withVoucher, type: 'number' }, { label: 'Tỷ lệ đơn dùng voucher', value: delivered ? withVoucher / delivered * 100 : 0, type: 'percent' }]
    }
  };
}

export async function customersReport(scope, queryParams) {
  const range = readRange(queryParams);
  const f = orderFilter(scope, range.from, range.to);
  const rows = await query(
    `SELECT cp.id, cp.full_name AS name, u.email, cp.loyalty_points AS points, COUNT(*) AS orders, SUM(o.order_status = 'DELIVERED') AS delivered,
            COALESCE(SUM(CASE WHEN ${DELIVERED} THEN o.subtotal END), 0) AS spent, MAX(o.created_at) AS last_order, MIN(first.first_order) AS first_order
     FROM orders o INNER JOIN customer_profiles cp ON cp.id = o.customer_id INNER JOIN users u ON u.id = cp.user_id
     INNER JOIN (SELECT customer_id, MIN(created_at) AS first_order FROM orders WHERE deleted_at IS NULL ${scope.restaurantId ? 'AND restaurant_id = ?' : ''} GROUP BY customer_id) first ON first.customer_id = o.customer_id
     WHERE ${f.where} GROUP BY cp.id, cp.full_name, u.email, cp.loyalty_points ORDER BY spent DESC LIMIT 300`,
    [...(scope.restaurantId ? [scope.restaurantId] : []), ...f.params]
  );
  const items = rows.map(r => ({ id: num(r.id), name: r.name, email: r.email, points: num(r.points), orders: num(r.orders), delivered: num(r.delivered), spent: num(r.spent), avgOrderValue: num(r.delivered) ? num(r.spent) / num(r.delivered) : 0, lastOrder: r.last_order, firstOrder: r.first_order,
    segment: new Date(r.first_order) >= new Date(`${range.from}T00:00:00`) ? 'Khách mới' : 'Khách quay lại' }));
  const buckets = [['1 đơn', 1, 1], ['2-3 đơn', 2, 3], ['4-6 đơn', 4, 6], ['7+ đơn', 7, 9999]].map(([label, min, max]) => ({ label, customers: items.filter(i => i.orders >= min && i.orders <= max).length }));
  const fresh = items.filter(i => i.segment === 'Khách mới');
  const returning = items.filter(i => i.segment !== 'Khách mới');
  return {
    range, items, buckets,
    segments: [{ name: 'Khách mới', customers: fresh.length, spent: fresh.reduce((s, i) => s + i.spent, 0), orders: fresh.reduce((s, i) => s + i.orders, 0) }, { name: 'Khách quay lại', customers: returning.length, spent: returning.reduce((s, i) => s + i.spent, 0), orders: returning.reduce((s, i) => s + i.orders, 0) }],
    repeatRate: items.length ? returning.length / items.length * 100 : 0,
    dataset: {
      title: `Khách hàng giá trị cao (${range.from} → ${range.to})`,
      columns: [col('name', 'Khách hàng'), col('email', 'Email'), col('segment', 'Nhóm'), col('orders', 'Đơn', 'number'), col('delivered', 'Đã giao', 'number'), col('spent', 'Chi tiêu', 'money'), col('avgOrderValue', 'TB/đơn', 'money'), col('lastOrder', 'Đơn gần nhất', 'datetime'), col('points', 'Điểm thưởng', 'number')],
      rows: items, summary: [{ label: 'Số khách có đơn', value: items.length, type: 'number' }, { label: 'Tỷ lệ khách quay lại', value: items.length ? returning.length / items.length * 100 : 0, type: 'percent' }, { label: 'Tổng chi tiêu', value: items.reduce((s, i) => s + i.spent, 0), type: 'money' }]
    }
  };
}

export async function shippersReport(scope, queryParams) {
  const range = readRange(queryParams);
  const where = ['d.created_at >= ?', 'd.created_at < DATE_ADD(?, INTERVAL 1 DAY)'];
  const params = [range.from, range.to];
  if (scope.shipperId) { where.push('d.shipper_id = ?'); params.push(scope.shipperId); }
  const rows = await query(
    `SELECT sp.id, sp.full_name AS name, sp.vehicle_type, sp.rating, COUNT(*) AS deliveries, SUM(d.delivery_status = 'DELIVERED') AS delivered, SUM(d.delivery_status = 'FAILED') AS failed,
            AVG(CASE WHEN d.delivery_status = 'DELIVERED' THEN TIMESTAMPDIFF(MINUTE, d.picked_up_at, d.delivered_at) END) AS avg_minutes, AVG(CASE WHEN d.delivery_status = 'DELIVERED' THEN d.distance_km END) AS avg_km,
            SUM(CASE WHEN d.delivery_status = 'DELIVERED' AND TIMESTAMPDIFF(MINUTE, o.created_at, d.delivered_at) <= 45 THEN 1 ELSE 0 END) AS on_time,
            COALESCE(SUM(se.net_earning), 0) AS earnings
     FROM deliveries d INNER JOIN shipper_profiles sp ON sp.id = d.shipper_id INNER JOIN orders o ON o.id = d.order_id LEFT JOIN shipper_earnings se ON se.delivery_id = d.id
     WHERE ${where.join(' AND ')} GROUP BY sp.id, sp.full_name, sp.vehicle_type, sp.rating ORDER BY delivered DESC`, params
  );
  const items = rows.map(r => ({ id: num(r.id), name: r.name, vehicle: r.vehicle_type, rating: num(r.rating), deliveries: num(r.deliveries), delivered: num(r.delivered), failed: num(r.failed), successRate: num(r.deliveries) ? num(r.delivered) / num(r.deliveries) * 100 : 0,
    avgMinutes: num(r.avg_minutes), avgKm: num(r.avg_km), onTimeRate: num(r.delivered) ? num(r.on_time) / num(r.delivered) * 100 : 0, earnings: num(r.earnings), avgEarning: num(r.delivered) ? num(r.earnings) / num(r.delivered) : 0 }));
  const timeline = await query(
    `SELECT ${bucket(range.group, 'd.created_at')} AS period, SUM(d.delivery_status = 'DELIVERED') AS delivered, COALESCE(SUM(se.net_earning), 0) AS earnings
     FROM deliveries d LEFT JOIN shipper_earnings se ON se.delivery_id = d.id WHERE ${where.join(' AND ')} GROUP BY period ORDER BY period`, params
  );
  const hourly = await query(`SELECT HOUR(d.created_at) AS hour, COUNT(*) AS deliveries FROM deliveries d WHERE ${where.join(' AND ')} GROUP BY hour ORDER BY hour`, params);
  return {
    range, items, series: timeline.map(r => ({ label: bucketLabel(range.group, r.period), delivered: num(r.delivered), earnings: num(r.earnings) })), hourly: hourly.map(r => ({ hour: num(r.hour), deliveries: num(r.deliveries) })),
    dataset: {
      title: scope.shipperId ? `Thu nhập và hiệu suất giao hàng (${range.from} → ${range.to})` : `Hiệu suất tài xế (${range.from} → ${range.to})`,
      columns: [col('name', 'Tài xế'), col('vehicle', 'Phương tiện'), col('deliveries', 'Chuyến', 'number'), col('delivered', 'Giao thành công', 'number'), col('failed', 'Thất bại', 'number'), col('successRate', 'Tỷ lệ thành công', 'percent'),
        col('avgMinutes', 'Phút giao TB', 'number'), col('onTimeRate', 'Đúng giờ (≤45 phút)', 'percent'), col('avgKm', 'Km TB', 'number'), col('earnings', 'Thu nhập', 'money'), col('avgEarning', 'Thu nhập/chuyến', 'money'), col('rating', 'Đánh giá', 'number')],
      rows: items, summary: [{ label: 'Tổng thu nhập', value: items.reduce((s, i) => s + i.earnings, 0), type: 'money' }, { label: 'Chuyến thành công', value: items.reduce((s, i) => s + i.delivered, 0), type: 'number' }]
    }
  };
}

export async function financeReport(scope, queryParams) {
  const range = readRange(queryParams);
  const where = ['s.period_end >= ?', 's.period_start <= ?'];
  const params = [range.from, range.to];
  if (scope.restaurantId) { where.push('s.restaurant_id = ?'); params.push(scope.restaurantId); }
  const settlements = await query(
    `SELECT s.id, r.name AS restaurant, s.period_start, s.period_end, s.gross_sales, s.commission_amount, s.refund_amount, s.adjustment_amount, s.net_amount, s.status, s.settled_at
     FROM restaurant_settlements s INNER JOIN restaurants r ON r.id = s.restaurant_id WHERE ${where.join(' AND ')} ORDER BY s.period_end DESC, r.name LIMIT 500`, params
  );
  const items = settlements.map(r => ({ id: num(r.id), restaurant: r.restaurant, periodStart: r.period_start, periodEnd: r.period_end, gross: num(r.gross_sales), commission: num(r.commission_amount), refunds: num(r.refund_amount), adjustments: num(r.adjustment_amount), net: num(r.net_amount), status: r.status, settledAt: r.settled_at }));
  const [cod] = scope.restaurantId ? [null] : await query(
    `SELECT COALESCE(SUM(CASE WHEN status = 'COLLECTED' THEN amount END), 0) AS holding, COALESCE(SUM(CASE WHEN status = 'SETTLED' THEN amount END), 0) AS settled, COUNT(CASE WHEN status = 'COLLECTED' THEN 1 END) AS pending
     FROM cod_transactions WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)`, [range.from, range.to]
  );
  const refunds = scope.restaurantId ? [] : await query(
    `SELECT status, COUNT(*) AS n, COALESCE(SUM(amount), 0) AS amount FROM refunds WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY) GROUP BY status`, [range.from, range.to]
  );
  const total = key => items.reduce((sum, item) => sum + item[key], 0);
  return {
    range, items, cod: cod ? { holding: num(cod.holding), settled: num(cod.settled), pending: num(cod.pending) } : null, refunds: refunds.map(r => ({ status: r.status, count: num(r.n), amount: num(r.amount) })),
    dataset: {
      title: `Đối soát và quyết toán (${range.from} → ${range.to})`,
      columns: [col('restaurant', 'Nhà hàng'), col('periodStart', 'Từ ngày', 'date'), col('periodEnd', 'Đến ngày', 'date'), col('gross', 'Doanh thu món', 'money'), col('commission', 'Hoa hồng', 'money'), col('refunds', 'Hoàn tiền', 'money'),
        col('adjustments', 'Điều chỉnh', 'money'), col('net', 'Thực nhận', 'money'), col('status', 'Trạng thái'), col('settledAt', 'Chi trả lúc', 'datetime')],
      rows: items, summary: [{ label: 'Doanh thu món', value: total('gross'), type: 'money' }, { label: 'Hoa hồng', value: total('commission'), type: 'money' }, { label: 'Thực nhận', value: total('net'), type: 'money' }]
    }
  };
}

/** Thống kê của riêng khách: chi tiêu theo kỳ, tiền tiết kiệm nhờ voucher, quán hay đặt. */
export async function myOrdersReport(scope, queryParams) {
  const range = readRange({ ...queryParams, group: queryParams.group ?? 'month', from: queryParams.from ?? iso(new Date(Date.now() - 180 * DAY_MS)) });
  const f = orderFilter(scope, range.from, range.to);
  const key = bucket(range.group, 'o.created_at');
  const [timeline, restaurants, totalsRow, points] = await Promise.all([
    query(`SELECT ${key} AS period, COUNT(*) AS orders, COALESCE(SUM(CASE WHEN ${DELIVERED} THEN o.total_amount END), 0) AS spent, COALESCE(SUM(CASE WHEN ${DELIVERED} THEN o.discount_amount END), 0) AS saved FROM orders o WHERE ${f.where} GROUP BY ${key} ORDER BY period`, f.params),
    query(`SELECT r.name, COUNT(*) AS orders, COALESCE(SUM(CASE WHEN ${DELIVERED} THEN o.total_amount END), 0) AS spent FROM orders o INNER JOIN restaurants r ON r.id = o.restaurant_id WHERE ${f.where} GROUP BY r.name ORDER BY spent DESC LIMIT 8`, f.params),
    query(`SELECT COUNT(*) AS orders, SUM(${DELIVERED}) AS delivered, COALESCE(SUM(CASE WHEN ${DELIVERED} THEN o.total_amount END), 0) AS spent, COALESCE(SUM(CASE WHEN ${DELIVERED} THEN o.discount_amount END), 0) AS saved FROM orders o WHERE ${f.where}`, f.params),
    query('SELECT type, COALESCE(SUM(points), 0) AS points FROM loyalty_transactions WHERE customer_id = ? GROUP BY type', [scope.customerId])
  ]);
  const t = totalsRow[0] ?? {};
  const items = timeline.map(r => ({ label: bucketLabel(range.group, r.period), orders: num(r.orders), spent: num(r.spent), saved: num(r.saved) }));
  return {
    range, series: items, restaurants: restaurants.map(r => ({ name: r.name, orders: num(r.orders), spent: num(r.spent) })),
    totals: { orders: num(t.orders), delivered: num(t.delivered), spent: num(t.spent), saved: num(t.saved), avg: num(t.delivered) ? num(t.spent) / num(t.delivered) : 0 },
    points: Object.fromEntries(points.map(r => [r.type, num(r.points)])),
    dataset: {
      title: `Chi tiêu của tôi (${range.from} → ${range.to})`,
      columns: [col('label', 'Kỳ'), col('orders', 'Đơn', 'number'), col('spent', 'Chi tiêu', 'money'), col('saved', 'Tiết kiệm nhờ ưu đãi', 'money')],
      rows: items, summary: [{ label: 'Tổng chi tiêu', value: num(t.spent), type: 'money' }, { label: 'Đã tiết kiệm', value: num(t.saved), type: 'money' }, { label: 'Số đơn đã giao', value: num(t.delivered), type: 'number' }]
    }
  };
}

export const ADMIN_REPORTS = { overview: overviewReport, restaurants: restaurantsReport, items: itemsReport, regions: regionsReport, promotions: promotionsReport, customers: customersReport, shippers: shippersReport, finance: financeReport };
export const RESTAURANT_REPORTS = { overview: overviewReport, items: itemsReport, promotions: promotionsReport, customers: customersReport, finance: financeReport };
