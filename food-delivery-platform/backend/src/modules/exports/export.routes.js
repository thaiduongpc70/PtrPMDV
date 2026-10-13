import { Router } from 'express';
import { query } from '../../shared/database/mysql.js';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { HttpError } from '../../shared/http/http-error.js';
import { requireAuth, requireRole } from '../../shared/middlewares/require-auth.middleware.js';

/* Dataset exports. JSON by default ({title, columns, rows}) so the web client can render CSV / PDF itself;
   `?format=csv` streams a UTF-8 (BOM) CSV attachment that opens correctly in Excel. */

export const adminExportRoutes = Router();
export const restaurantExportRoutes = Router();

adminExportRoutes.use(requireAuth, requireRole('ADMIN'));
restaurantExportRoutes.use(requireAuth, requireRole('RESTAURANT', 'ADMIN'));

const LIMIT = 5000;

const col = (key, label, type = 'text') => ({ key, label, type });

const isDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

function withRange(req, column) {
  const parts = [];
  const params = [];
  if (isDate(req.query.from)) { parts.push(`${column} >= ?`); params.push(`${req.query.from} 00:00:00`); }
  if (isDate(req.query.to)) { parts.push(`${column} <= ?`); params.push(`${req.query.to} 23:59:59`); }
  return { sql: parts.length ? ` AND ${parts.join(' AND ')}` : '', params };
}

const ORDER_COLUMNS = [
  col('orderCode', 'Mã đơn'), col('createdAt', 'Thời gian', 'datetime'), col('restaurant', 'Nhà hàng'), col('receiver', 'Người nhận'),
  col('phone', 'SĐT'), col('status', 'Trạng thái'), col('paymentMethod', 'Thanh toán'), col('paymentStatus', 'TT thanh toán'),
  col('subtotal', 'Tiền hàng', 'money'), col('deliveryFee', 'Phí giao', 'money'), col('discount', 'Giảm giá', 'money'), col('total', 'Tổng cộng', 'money')
];

async function ordersDataset(req, restaurantId = null) {
  const range = withRange(req, 'o.created_at');
  const where = ['o.deleted_at IS NULL'];
  const params = [];
  if (restaurantId) { where.push('o.restaurant_id = ?'); params.push(restaurantId); }
  if (req.query.status) { where.push('o.order_status = ?'); params.push(String(req.query.status)); }
  const rows = await query(
    `SELECT o.order_code, o.created_at, r.name AS restaurant, o.receiver_name, o.receiver_phone, o.order_status, o.payment_method,
            o.payment_status, o.subtotal, o.delivery_fee, o.discount_amount, o.total_amount
     FROM orders o INNER JOIN restaurants r ON r.id = o.restaurant_id
     WHERE ${where.join(' AND ')}${range.sql} ORDER BY o.created_at DESC, o.id DESC LIMIT ${LIMIT}`,
    [...params, ...range.params]
  );
  return {
    title: restaurantId ? 'Danh sách đơn hàng của nhà hàng' : 'Danh sách đơn hàng',
    columns: ORDER_COLUMNS,
    rows: rows.map(x => ({
      orderCode: x.order_code, createdAt: x.created_at, restaurant: x.restaurant, receiver: x.receiver_name, phone: x.receiver_phone,
      status: x.order_status, paymentMethod: x.payment_method, paymentStatus: x.payment_status, subtotal: Number(x.subtotal),
      deliveryFee: Number(x.delivery_fee), discount: Number(x.discount_amount), total: Number(x.total_amount)
    }))
  };
}

const ADMIN_DATASETS = {
  orders: req => ordersDataset(req),

  async restaurants() {
    const rows = await query(
      `SELECT r.id, r.name, u.username AS owner, r.phone, r.address, r.district, r.city, r.status, r.commission_rate, r.rating,
              r.total_orders, r.total_revenue, r.created_at
       FROM restaurants r INNER JOIN users u ON u.id = r.owner_user_id WHERE r.deleted_at IS NULL ORDER BY r.id DESC LIMIT ${LIMIT}`
    );
    return {
      title: 'Danh sách nhà hàng',
      columns: [col('id', 'ID', 'number'), col('name', 'Tên nhà hàng'), col('owner', 'Chủ quán'), col('phone', 'SĐT'), col('address', 'Địa chỉ'), col('district', 'Quận/Huyện'), col('city', 'Thành phố'),
        col('status', 'Trạng thái'), col('commission', 'Hoa hồng %', 'number'), col('rating', 'Đánh giá', 'number'), col('orders', 'Số đơn', 'number'), col('revenue', 'Doanh thu', 'money'), col('createdAt', 'Ngày tạo', 'datetime')],
      rows: rows.map(x => ({ id: Number(x.id), name: x.name, owner: x.owner, phone: x.phone, address: x.address, district: x.district, city: x.city, status: x.status, commission: Number(x.commission_rate), rating: Number(x.rating), orders: Number(x.total_orders), revenue: Number(x.total_revenue), createdAt: x.created_at }))
    };
  },

  async shippers() {
    const rows = await query(
      `SELECT sp.id, sp.full_name, u.email, u.phone, sp.vehicle_type, sp.vehicle_plate, sp.availability_status, sp.rating, sp.total_deliveries, sp.total_earnings, u.status AS user_status
       FROM shipper_profiles sp INNER JOIN users u ON u.id = sp.user_id WHERE sp.deleted_at IS NULL ORDER BY sp.total_deliveries DESC, sp.id DESC LIMIT ${LIMIT}`
    );
    return {
      title: 'Danh sách tài xế',
      columns: [col('id', 'ID', 'number'), col('name', 'Họ tên'), col('email', 'Email'), col('phone', 'SĐT'), col('vehicle', 'Phương tiện'), col('plate', 'Biển số'), col('availability', 'Trạng thái'),
        col('accountStatus', 'Tài khoản'), col('rating', 'Đánh giá', 'number'), col('deliveries', 'Chuyến giao', 'number'), col('earnings', 'Thu nhập', 'money')],
      rows: rows.map(x => ({ id: Number(x.id), name: x.full_name, email: x.email, phone: x.phone, vehicle: x.vehicle_type, plate: x.vehicle_plate, availability: x.availability_status, accountStatus: x.user_status, rating: Number(x.rating), deliveries: Number(x.total_deliveries), earnings: Number(x.total_earnings) }))
    };
  },

  async customers() {
    const rows = await query(
      `SELECT cp.id, cp.full_name, u.email, u.phone, u.status, cp.loyalty_points, cp.total_orders, cp.total_spent, u.created_at
       FROM customer_profiles cp INNER JOIN users u ON u.id = cp.user_id WHERE u.deleted_at IS NULL ORDER BY cp.total_spent DESC, cp.id DESC LIMIT ${LIMIT}`
    );
    return {
      title: 'Danh sách khách hàng',
      columns: [col('id', 'ID', 'number'), col('name', 'Họ tên'), col('email', 'Email'), col('phone', 'SĐT'), col('status', 'Trạng thái'), col('points', 'Điểm', 'number'), col('orders', 'Số đơn', 'number'), col('spent', 'Chi tiêu', 'money'), col('createdAt', 'Ngày đăng ký', 'datetime')],
      rows: rows.map(x => ({ id: Number(x.id), name: x.full_name, email: x.email, phone: x.phone, status: x.status, points: Number(x.loyalty_points), orders: Number(x.total_orders), spent: Number(x.total_spent), createdAt: x.created_at }))
    };
  },

  async users() {
    const rows = await query(
      `SELECT u.id, u.username, u.email, u.phone, r.name AS role_name, u.status, u.last_login_at, u.created_at
       FROM users u INNER JOIN roles r ON r.id = u.role_id WHERE u.deleted_at IS NULL ORDER BY u.id DESC LIMIT ${LIMIT}`
    );
    return {
      title: 'Danh sách tài khoản',
      columns: [col('id', 'ID', 'number'), col('username', 'Tên đăng nhập'), col('email', 'Email'), col('phone', 'SĐT'), col('role', 'Vai trò'), col('status', 'Trạng thái'), col('lastLogin', 'Đăng nhập gần nhất', 'datetime'), col('createdAt', 'Ngày tạo', 'datetime')],
      rows: rows.map(x => ({ id: Number(x.id), username: x.username, email: x.email, phone: x.phone, role: x.role_name, status: x.status, lastLogin: x.last_login_at, createdAt: x.created_at }))
    };
  },

  async payments(req) {
    const range = withRange(req, 'p.created_at');
    const rows = await query(
      `SELECT p.payment_code, o.order_code, p.method, p.gateway, p.amount, p.status, p.paid_at, p.created_at
       FROM payments p INNER JOIN orders o ON o.id = p.order_id WHERE 1 = 1${range.sql} ORDER BY p.created_at DESC, p.id DESC LIMIT ${LIMIT}`,
      range.params
    );
    return {
      title: 'Lịch sử thanh toán',
      columns: [col('code', 'Mã thanh toán'), col('order', 'Mã đơn'), col('method', 'Phương thức'), col('gateway', 'Cổng'), col('amount', 'Số tiền', 'money'), col('status', 'Trạng thái'), col('paidAt', 'Thanh toán lúc', 'datetime'), col('createdAt', 'Tạo lúc', 'datetime')],
      rows: rows.map(x => ({ code: x.payment_code, order: x.order_code, method: x.method, gateway: x.gateway, amount: Number(x.amount), status: x.status, paidAt: x.paid_at, createdAt: x.created_at }))
    };
  },

  async settlements() {
    const rows = await query(
      `SELECT s.id, r.name AS restaurant, s.period_start, s.period_end, s.gross_sales, s.commission_amount, s.refund_amount, s.adjustment_amount, s.net_amount, s.status, s.settled_at
       FROM restaurant_settlements s INNER JOIN restaurants r ON r.id = s.restaurant_id ORDER BY s.created_at DESC, s.id DESC LIMIT ${LIMIT}`
    );
    return {
      title: 'Đối soát nhà hàng',
      columns: [col('id', 'ID', 'number'), col('restaurant', 'Nhà hàng'), col('from', 'Từ ngày', 'date'), col('to', 'Đến ngày', 'date'), col('gross', 'Doanh số', 'money'), col('commission', 'Hoa hồng', 'money'), col('refund', 'Hoàn tiền', 'money'), col('adjustment', 'Điều chỉnh', 'money'), col('net', 'Thực nhận', 'money'), col('status', 'Trạng thái'), col('settledAt', 'Chi trả lúc', 'datetime')],
      rows: rows.map(x => ({ id: Number(x.id), restaurant: x.restaurant, from: x.period_start, to: x.period_end, gross: Number(x.gross_sales), commission: Number(x.commission_amount), refund: Number(x.refund_amount), adjustment: Number(x.adjustment_amount), net: Number(x.net_amount), status: x.status, settledAt: x.settled_at }))
    };
  },

  async revenue(req) {
    const range = withRange(req, 'o.created_at');
    const rows = await query(
      `SELECT DATE(o.created_at) AS day, COUNT(*) AS orders, SUM(o.order_status = 'DELIVERED') AS delivered, SUM(o.order_status = 'CANCELLED') AS cancelled,
              COALESCE(SUM(o.total_amount), 0) AS gmv, COALESCE(SUM(CASE WHEN o.payment_status = 'PAID' THEN o.total_amount END), 0) AS paid
       FROM orders o WHERE o.deleted_at IS NULL${range.sql} GROUP BY DATE(o.created_at) ORDER BY day DESC LIMIT 366`,
      range.params
    );
    return {
      title: 'Doanh thu theo ngày',
      columns: [col('day', 'Ngày', 'date'), col('orders', 'Số đơn', 'number'), col('delivered', 'Đã giao', 'number'), col('cancelled', 'Đã hủy', 'number'), col('gmv', 'GMV', 'money'), col('paid', 'Đã thu', 'money')],
      rows: rows.map(x => ({ day: x.day, orders: Number(x.orders), delivered: Number(x.delivered), cancelled: Number(x.cancelled), gmv: Number(x.gmv), paid: Number(x.paid) }))
    };
  },

  async audit(req) {
    const range = withRange(req, 'a.created_at');
    const rows = await query(
      `SELECT a.created_at, u.username, a.action, a.entity_type, a.entity_id, a.ip_address
       FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE 1 = 1${range.sql} ORDER BY a.created_at DESC, a.id DESC LIMIT ${LIMIT}`,
      range.params
    );
    return {
      title: 'Nhật ký bảo mật',
      columns: [col('time', 'Thời gian', 'datetime'), col('user', 'Người dùng'), col('action', 'Hành động'), col('entity', 'Đối tượng'), col('entityId', 'Mã đối tượng'), col('ip', 'IP')],
      rows: rows.map(x => ({ time: x.created_at, user: x.username, action: x.action, entity: x.entity_type, entityId: x.entity_id, ip: x.ip_address }))
    };
  },

  async applications() {
    const rows = await query(
      `SELECT a.id, a.application_type, a.applicant_name, u.email, u.phone, a.status, a.review_note, a.created_at, a.reviewed_at
       FROM partner_applications a INNER JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC, a.id DESC LIMIT ${LIMIT}`
    );
    return {
      title: 'Hồ sơ đăng ký đối tác',
      columns: [col('id', 'ID', 'number'), col('type', 'Loại'), col('name', 'Tên'), col('email', 'Email'), col('phone', 'SĐT'), col('status', 'Trạng thái'), col('note', 'Ghi chú duyệt'), col('createdAt', 'Gửi lúc', 'datetime'), col('reviewedAt', 'Duyệt lúc', 'datetime')],
      rows: rows.map(x => ({ id: Number(x.id), type: x.application_type, name: x.applicant_name, email: x.email, phone: x.phone, status: x.status, note: x.review_note, createdAt: x.created_at, reviewedAt: x.reviewed_at }))
    };
  }
};

const RESTAURANT_DATASETS = {
  orders: (req, restaurantId) => ordersDataset(req, restaurantId),

  async menu(_req, restaurantId) {
    const rows = await query(
      `SELECT mi.id, mi.name, mc.name AS category, mi.base_price, mi.discount_price, mi.is_available, mi.sold_count, mi.preparation_time
       FROM menu_items mi LEFT JOIN menu_categories mc ON mc.id = mi.category_id
       WHERE mi.restaurant_id = ? AND mi.deleted_at IS NULL ORDER BY mi.sold_count DESC, mi.id DESC LIMIT ${LIMIT}`,
      [restaurantId]
    );
    return {
      title: 'Thực đơn nhà hàng',
      columns: [col('id', 'ID', 'number'), col('name', 'Tên món'), col('category', 'Danh mục'), col('price', 'Giá gốc', 'money'), col('discount', 'Giá KM', 'money'), col('available', 'Đang bán'), col('sold', 'Đã bán', 'number'), col('prep', 'Chuẩn bị (phút)', 'number')],
      rows: rows.map(x => ({ id: Number(x.id), name: x.name, category: x.category, price: Number(x.base_price), discount: x.discount_price === null ? null : Number(x.discount_price), available: x.is_available ? 'Có' : 'Không', sold: Number(x.sold_count), prep: Number(x.preparation_time) }))
    };
  },

  async revenue(req, restaurantId) {
    const range = withRange(req, 'o.created_at');
    const rows = await query(
      `SELECT DATE(o.created_at) AS day, COUNT(*) AS orders, SUM(o.order_status = 'DELIVERED') AS delivered, SUM(o.order_status = 'CANCELLED') AS cancelled,
              COALESCE(SUM(CASE WHEN o.order_status = 'DELIVERED' THEN o.total_amount END), 0) AS revenue
       FROM orders o WHERE o.restaurant_id = ? AND o.deleted_at IS NULL${range.sql} GROUP BY DATE(o.created_at) ORDER BY day DESC LIMIT 366`,
      [restaurantId, ...range.params]
    );
    return {
      title: 'Doanh thu theo ngày',
      columns: [col('day', 'Ngày', 'date'), col('orders', 'Số đơn', 'number'), col('delivered', 'Đã giao', 'number'), col('cancelled', 'Đã hủy', 'number'), col('revenue', 'Doanh thu', 'money')],
      rows: rows.map(x => ({ day: x.day, orders: Number(x.orders), delivered: Number(x.delivered), cancelled: Number(x.cancelled), revenue: Number(x.revenue) }))
    };
  },

  async settlements(_req, restaurantId) {
    const rows = await query(
      'SELECT * FROM restaurant_settlements WHERE restaurant_id = ? ORDER BY created_at DESC, id DESC LIMIT 500',
      [restaurantId]
    );
    return {
      title: 'Đối soát',
      columns: [col('id', 'ID', 'number'), col('from', 'Từ ngày', 'date'), col('to', 'Đến ngày', 'date'), col('gross', 'Doanh số', 'money'), col('commission', 'Hoa hồng', 'money'), col('refund', 'Hoàn tiền', 'money'), col('net', 'Thực nhận', 'money'), col('status', 'Trạng thái')],
      rows: rows.map(x => ({ id: Number(x.id), from: x.period_start, to: x.period_end, gross: Number(x.gross_sales), commission: Number(x.commission_amount), refund: Number(x.refund_amount), net: Number(x.net_amount), status: x.status }))
    };
  }
};

/* ---------------- output ---------------- */

const pad = n => String(n).padStart(2, '0');

function plain(value, type) {
  if (value === null || value === undefined) return '';
  if (type === 'datetime' || type === 'date') {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const day = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    return type === 'date' ? day : `${day} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return String(value);
}

function csvCell(text) {
  const value = String(text);
  // Neutralise spreadsheet formulas.
  const safe = /^[=+\-@\t\r]/.test(value) && Number.isNaN(Number(value)) ? `'${value}` : value;
  return /[",\r\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function toCsv(dataset) {
  const lines = [dataset.columns.map(c => csvCell(c.label)).join(',')];
  for (const row of dataset.rows) lines.push(dataset.columns.map(c => csvCell(plain(row[c.key], c.type))).join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}

function send(req, res, name, dataset) {
  const generatedAt = new Date().toISOString();
  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}-${generatedAt.slice(0, 10)}.csv"`);
    res.send(toCsv(dataset));
    return;
  }
  res.json({ name, ...dataset, total: dataset.rows.length, truncated: dataset.rows.length >= LIMIT, generatedAt });
}

function audit(req, action, name) {
  req.auditAction = action;
  req.auditEntityType = 'EXPORT';
  req.auditEntityId = name;
}

adminExportRoutes.get('/:dataset', asyncHandler(async (req, res) => {
  const builder = ADMIN_DATASETS[req.params.dataset];
  if (!builder) throw new HttpError(404, `Unknown dataset. Available: ${Object.keys(ADMIN_DATASETS).join(', ')}`);
  audit(req, 'ADMIN_EXPORT', req.params.dataset);
  send(req, res, req.params.dataset, await builder(req));
}));

restaurantExportRoutes.get('/:restaurantId/:dataset', asyncHandler(async (req, res) => {
  const restaurantId = Number(req.params.restaurantId);
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) throw new HttpError(400, 'restaurantId is invalid');
  const owned = await query('SELECT owner_user_id FROM restaurants WHERE id = ? AND deleted_at IS NULL LIMIT 1', [restaurantId]);
  if (!owned[0]) throw new HttpError(404, 'Restaurant not found');
  if (req.user.role !== 'ADMIN' && Number(owned[0].owner_user_id) !== Number(req.user.id)) throw new HttpError(403, 'Permission denied');
  const builder = RESTAURANT_DATASETS[req.params.dataset];
  if (!builder) throw new HttpError(404, `Unknown dataset. Available: ${Object.keys(RESTAURANT_DATASETS).join(', ')}`);
  audit(req, 'RESTAURANT_EXPORT', `${restaurantId}:${req.params.dataset}`);
  send(req, res, `restaurant-${restaurantId}-${req.params.dataset}`, await builder(req, restaurantId));
}));
