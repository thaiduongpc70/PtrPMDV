import { Router } from 'express';
import { query, withTransaction } from '../../shared/database/mysql.js';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { HttpError } from '../../shared/http/http-error.js';
import { requireAuth, requireRole } from '../../shared/middlewares/require-auth.middleware.js';

export const adminManageRoutes = Router();
export const restaurantManageRoutes = Router();

adminManageRoutes.use(requireAuth, requireRole('ADMIN'));
restaurantManageRoutes.use(requireAuth, requireRole('RESTAURANT', 'ADMIN'));

/* ---------------- helpers ---------------- */

function audit(req, action, entityType, entityId = null) {
  req.auditAction = action;
  req.auditEntityType = entityType;
  req.auditEntityId = entityId === null ? null : String(entityId);
}

function id(value, name = 'id') {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new HttpError(400, `${name} is invalid`);
  return parsed;
}

function paging(req, defaultSize = 20) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || defaultSize));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function oneOf(value, allowed, name) {
  if (!allowed.includes(value)) throw new HttpError(400, `${name} must be one of ${allowed.join(', ')}`);
  return value;
}

function str(value, max, name, { required = false } = {}) {
  const text = String(value ?? '').trim();
  if (required && !text) throw new HttpError(400, `${name} is required`);
  if (text.length > max) throw new HttpError(400, `${name} is too long`);
  return text || null;
}

function money(value, name, { min = 0 } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) throw new HttpError(400, `${name} is invalid`);
  return parsed;
}

function days(req, fallback = 7) {
  return Math.min(180, Math.max(1, Number(req.query.days) || fallback));
}

function like(value) {
  return `%${String(value).replace(/[%_\\]/g, ch => `\\${ch}`)}%`;
}

async function assertRestaurantAccess(user, restaurantId) {
  const rows = await query(
    'SELECT id, owner_user_id, name, status FROM restaurants WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [restaurantId]
  );
  if (!rows[0]) throw new HttpError(404, 'Restaurant not found');
  if (user.role !== 'ADMIN' && Number(rows[0].owner_user_id) !== Number(user.id)) {
    throw new HttpError(403, 'Permission denied');
  }
  return rows[0];
}

const orderRow = row => ({
  id: Number(row.id),
  orderCode: row.order_code,
  status: row.order_status,
  paymentMethod: row.payment_method,
  paymentStatus: row.payment_status,
  totalAmount: Number(row.total_amount),
  deliveryFee: Number(row.delivery_fee ?? 0),
  receiverName: row.receiver_name,
  receiverPhone: row.receiver_phone,
  deliveryAddress: row.delivery_address,
  restaurantId: Number(row.restaurant_id),
  restaurantName: row.restaurant_name,
  shipperName: row.shipper_name ?? null,
  itemCount: Number(row.item_count ?? 0),
  createdAt: row.created_at,
  deliveredAt: row.delivered_at
});

/* ============================================================
   ADMIN
   ============================================================ */

adminManageRoutes.get('/orders', asyncHandler(async (req, res) => {
  const { page, pageSize, offset } = paging(req);
  const where = ['o.deleted_at IS NULL'];
  const params = [];
  if (req.query.status) { where.push('o.order_status = ?'); params.push(String(req.query.status)); }
  if (req.query.paymentStatus) { where.push('o.payment_status = ?'); params.push(String(req.query.paymentStatus)); }
  if (req.query.restaurantId) { where.push('o.restaurant_id = ?'); params.push(id(req.query.restaurantId)); }
  if (req.query.q) {
    where.push('(o.order_code LIKE ? OR o.receiver_name LIKE ? OR o.receiver_phone LIKE ? OR r.name LIKE ?)');
    const term = like(req.query.q);
    params.push(term, term, term, term);
  }
  const whereSql = where.join(' AND ');
  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM orders o INNER JOIN restaurants r ON r.id = o.restaurant_id WHERE ${whereSql}`,
    params
  );
  const rows = await query(
    `SELECT o.*, r.name AS restaurant_name, sp.full_name AS shipper_name,
            (SELECT COALESCE(SUM(quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
     FROM orders o
     INNER JOIN restaurants r ON r.id = o.restaurant_id
     LEFT JOIN shipper_profiles sp ON sp.id = o.shipper_id
     WHERE ${whereSql}
     ORDER BY o.created_at DESC, o.id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  res.json({ items: rows.map(orderRow), totalItems: Number(total), page, pageSize });
}));

adminManageRoutes.get('/orders/:orderId', asyncHandler(async (req, res) => {
  const orderId = id(req.params.orderId, 'orderId');
  const rows = await query(
    `SELECT o.*, r.name AS restaurant_name, r.address AS restaurant_address, sp.full_name AS shipper_name,
            cp.full_name AS customer_name, u.phone AS customer_phone
     FROM orders o
     INNER JOIN restaurants r ON r.id = o.restaurant_id
     INNER JOIN customer_profiles cp ON cp.id = o.customer_id
     INNER JOIN users u ON u.id = cp.user_id
     LEFT JOIN shipper_profiles sp ON sp.id = o.shipper_id
     WHERE o.id = ? LIMIT 1`,
    [orderId]
  );
  const o = rows[0];
  if (!o) throw new HttpError(404, 'Order not found');
  const [items, history, payments, delivery] = await Promise.all([
    query('SELECT item_name, variant_name, quantity, unit_price, total_price, note FROM order_items WHERE order_id = ? ORDER BY id', [orderId]),
    query('SELECT old_status, new_status, note, created_at FROM order_status_history WHERE order_id = ? ORDER BY created_at, id', [orderId]),
    query('SELECT payment_code, method, amount, status, gateway, paid_at FROM payments WHERE order_id = ? ORDER BY id', [orderId]),
    query('SELECT delivery_status, distance_km, delivery_fee, assigned_at, updated_at FROM deliveries WHERE order_id = ? LIMIT 1', [orderId])
  ]);
  res.json({
    ...orderRow({ ...o, item_count: items.reduce((sum, item) => sum + Number(item.quantity), 0) }),
    customerName: o.customer_name, customerPhone: o.customer_phone, restaurantAddress: o.restaurant_address,
    subtotal: Number(o.subtotal), discountAmount: Number(o.discount_amount), serviceFee: Number(o.service_fee ?? 0),
    taxAmount: Number(o.tax_amount ?? 0), customerNote: o.customer_note,
    items: items.map(i => ({ name: i.item_name, variantName: i.variant_name, quantity: Number(i.quantity), unitPrice: Number(i.unit_price), totalPrice: Number(i.total_price), note: i.note })),
    history: history.map(h => ({ from: h.old_status, to: h.new_status, note: h.note, at: h.created_at })),
    payments: payments.map(p => ({ code: p.payment_code, method: p.method, amount: Number(p.amount), status: p.status, gateway: p.gateway, paidAt: p.paid_at })),
    delivery: delivery[0] ? { status: delivery[0].delivery_status, distanceKm: Number(delivery[0].distance_km), fee: Number(delivery[0].delivery_fee), assignedAt: delivery[0].assigned_at, updatedAt: delivery[0].updated_at } : null
  });
}));

adminManageRoutes.get('/settlements', asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT s.*, r.name AS restaurant_name FROM restaurant_settlements s
     INNER JOIN restaurants r ON r.id = s.restaurant_id ORDER BY s.created_at DESC, s.id DESC LIMIT 200`
  );
  res.json({
    items: rows.map(row => ({
      id: Number(row.id), restaurantId: Number(row.restaurant_id), restaurantName: row.restaurant_name,
      periodStart: row.period_start, periodEnd: row.period_end, grossSales: Number(row.gross_sales),
      commissionAmount: Number(row.commission_amount), refundAmount: Number(row.refund_amount),
      adjustmentAmount: Number(row.adjustment_amount), netAmount: Number(row.net_amount), status: row.status, settledAt: row.settled_at
    }))
  });
}));

adminManageRoutes.patch('/settlements/:settlementId', asyncHandler(async (req, res) => {
  const settlementId = id(req.params.settlementId, 'settlementId');
  const status = oneOf(req.body?.status, ['PROCESSING', 'SETTLED', 'FAILED'], 'status');
  await query("UPDATE restaurant_settlements SET status = ?, settled_at = IF(? = 'SETTLED', CURRENT_TIMESTAMP, settled_at) WHERE id = ?", [status, status, settlementId]);
  audit(req, 'ADMIN_SETTLEMENT_UPDATE', 'RESTAURANT_SETTLEMENT', settlementId);
  res.json({ id: settlementId, status });
}));

adminManageRoutes.get('/customers', asyncHandler(async (req, res) => {
  const { page, pageSize, offset } = paging(req);
  const where = ["r.name = 'CUSTOMER'", 'u.deleted_at IS NULL'];
  const params = [];
  if (req.query.q) {
    where.push('(u.username LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR cp.full_name LIKE ?)');
    const term = like(req.query.q);
    params.push(term, term, term, term);
  }
  const base = `FROM users u INNER JOIN roles r ON r.id = u.role_id
                LEFT JOIN customer_profiles cp ON cp.user_id = u.id WHERE ${where.join(' AND ')}`;
  const [{ total }] = await query(`SELECT COUNT(*) AS total ${base}`, params);
  const rows = await query(
    `SELECT u.id, u.username, u.email, u.phone, u.status, u.created_at, u.last_login_at,
            cp.full_name, cp.loyalty_points, cp.total_orders, cp.total_spent
     ${base} ORDER BY cp.total_spent DESC, u.id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  res.json({
    items: rows.map(row => ({
      id: Number(row.id), username: row.username, email: row.email, phone: row.phone, status: row.status,
      fullName: row.full_name, loyaltyPoints: Number(row.loyalty_points ?? 0),
      totalOrders: Number(row.total_orders ?? 0), totalSpent: Number(row.total_spent ?? 0),
      createdAt: row.created_at, lastLoginAt: row.last_login_at
    })),
    totalItems: Number(total), page, pageSize
  });
}));

adminManageRoutes.get('/shippers', asyncHandler(async (req, res) => {
  const where = ['sp.deleted_at IS NULL'];
  const params = [];
  if (req.query.status) { where.push('sp.availability_status = ?'); params.push(String(req.query.status)); }
  const rows = await query(
    `SELECT sp.*, u.email, u.phone, u.status AS user_status,
            (SELECT COUNT(*) FROM shipper_documents d WHERE d.shipper_id = sp.id) AS documents,
            (SELECT COUNT(*) FROM shipper_documents d WHERE d.shipper_id = sp.id AND d.verified = TRUE) AS verified_documents,
            (SELECT COUNT(*) FROM deliveries d WHERE d.shipper_id = sp.id AND d.delivery_status IN ('ASSIGNED','ACCEPTED','PICKED_UP','DELIVERING')) AS active_deliveries
     FROM shipper_profiles sp INNER JOIN users u ON u.id = sp.user_id
     WHERE ${where.join(' AND ')}
     ORDER BY sp.total_deliveries DESC, sp.id DESC LIMIT 200`,
    params
  );
  res.json({
    items: rows.map(row => ({
      id: Number(row.id), userId: Number(row.user_id), fullName: row.full_name, email: row.email, phone: row.phone,
      vehicleType: row.vehicle_type, vehiclePlate: row.vehicle_plate, rating: Number(row.rating),
      totalDeliveries: Number(row.total_deliveries), totalEarnings: Number(row.total_earnings),
      status: row.availability_status, userStatus: row.user_status,
      documents: Number(row.documents), verifiedDocuments: Number(row.verified_documents),
      activeDeliveries: Number(row.active_deliveries), lastLocationAt: row.last_location_at
    }))
  });
}));

adminManageRoutes.patch('/shippers/:shipperId/status', asyncHandler(async (req, res) => {
  const shipperId = id(req.params.shipperId, 'shipperId');
  const status = oneOf(req.body?.status, ['OFFLINE', 'SUSPENDED'], 'status');
  const result = await query('UPDATE shipper_profiles SET availability_status = ? WHERE id = ? AND deleted_at IS NULL', [status, shipperId]);
  if (!result.affectedRows) throw new HttpError(404, 'Shipper not found');
  audit(req, 'ADMIN_SHIPPER_STATUS', 'SHIPPER_PROFILE', shipperId);
  res.json({ id: shipperId, status });
}));

adminManageRoutes.get('/shippers/:shipperId/documents', asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM shipper_documents WHERE shipper_id = ? ORDER BY id', [id(req.params.shipperId, 'shipperId')]);
  res.json({
    items: rows.map(row => ({
      id: Number(row.id), type: row.document_type, number: row.document_number, imageUrl: row.image_url,
      verified: Boolean(row.verified), verifiedAt: row.verified_at
    }))
  });
}));

adminManageRoutes.post('/shipper-documents/:documentId/verify', asyncHandler(async (req, res) => {
  const documentId = id(req.params.documentId, 'documentId');
  const verified = req.body?.verified !== false;
  await query(
    'UPDATE shipper_documents SET verified = ?, verified_by = ?, verified_at = IF(?, CURRENT_TIMESTAMP, NULL) WHERE id = ?',
    [verified, req.user.id, verified, documentId]
  );
  audit(req, 'ADMIN_SHIPPER_DOCUMENT_VERIFY', 'SHIPPER_DOCUMENT', documentId);
  res.json({ id: documentId, verified });
}));

adminManageRoutes.get('/payments', asyncHandler(async (req, res) => {
  const { page, pageSize, offset } = paging(req);
  const where = ['1 = 1'];
  const params = [];
  if (req.query.status) { where.push('p.status = ?'); params.push(String(req.query.status)); }
  if (req.query.method) { where.push('p.method = ?'); params.push(String(req.query.method)); }
  const whereSql = where.join(' AND ');
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM payments p WHERE ${whereSql}`, params);
  const rows = await query(
    `SELECT p.*, o.order_code, r.name AS restaurant_name
     FROM payments p INNER JOIN orders o ON o.id = p.order_id INNER JOIN restaurants r ON r.id = o.restaurant_id
     WHERE ${whereSql} ORDER BY p.created_at DESC, p.id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  const summary = await query(
    `SELECT status, COUNT(*) AS total, COALESCE(SUM(amount), 0) AS amount FROM payments GROUP BY status`
  );
  const methods = await query(
    `SELECT method, COUNT(*) AS total, COALESCE(SUM(amount), 0) AS amount FROM payments WHERE status = 'PAID' GROUP BY method ORDER BY amount DESC`
  );
  const cod = await query(`SELECT status, COUNT(*) AS total, COALESCE(SUM(amount), 0) AS amount FROM cod_transactions GROUP BY status`);
  res.json({
    items: rows.map(row => ({
      id: Number(row.id), paymentCode: row.payment_code, orderId: Number(row.order_id), orderCode: row.order_code,
      restaurantName: row.restaurant_name, method: row.method, amount: Number(row.amount), status: row.status,
      gateway: row.gateway, transactionId: row.transaction_id, paidAt: row.paid_at, createdAt: row.created_at
    })),
    totalItems: Number(total), page, pageSize,
    summary: summary.map(row => ({ status: row.status, total: Number(row.total), amount: Number(row.amount) })),
    methods: methods.map(row => ({ method: row.method, total: Number(row.total), amount: Number(row.amount) })),
    cod: cod.map(row => ({ status: row.status, total: Number(row.total), amount: Number(row.amount) }))
  });
}));

adminManageRoutes.get('/refunds', asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT f.*, o.order_code FROM refunds f INNER JOIN orders o ON o.id = f.order_id ORDER BY f.created_at DESC LIMIT 200`
  );
  res.json({
    items: rows.map(row => ({
      id: Number(row.id), orderId: Number(row.order_id), orderCode: row.order_code, amount: Number(row.amount),
      reason: row.reason, status: row.status, createdAt: row.created_at, processedAt: row.processed_at
    }))
  });
}));

adminManageRoutes.patch('/refunds/:refundId', asyncHandler(async (req, res) => {
  const refundId = id(req.params.refundId, 'refundId');
  const status = oneOf(req.body?.status, ['COMPLETED', 'REJECTED', 'PROCESSING'], 'status');
  await withTransaction(async connection => {
    const rows = await connection.execute('SELECT * FROM refunds WHERE id = ? LIMIT 1 FOR UPDATE', [refundId]);
    if (!rows[0]) throw new HttpError(404, 'Refund not found');
    await connection.execute(
      'UPDATE refunds SET status = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, req.user.id, refundId]
    );
    if (status === 'COMPLETED') {
      await connection.execute("UPDATE orders SET payment_status = 'REFUNDED' WHERE id = ?", [rows[0].order_id]);
    }
  });
  audit(req, 'ADMIN_REFUND_UPDATE', 'REFUND', refundId);
  res.json({ id: refundId, status });
}));

const promotionRow = row => ({
  id: Number(row.id), code: row.code, name: row.name, description: row.description,
  restaurantId: row.restaurant_id === null ? null : Number(row.restaurant_id), restaurantName: row.restaurant_name ?? null,
  discountType: row.discount_type, discountValue: Number(row.discount_value),
  maxDiscount: row.max_discount === null ? null : Number(row.max_discount), minimumOrder: Number(row.minimum_order),
  startAt: row.start_at, endAt: row.end_at, usageLimit: row.usage_limit, usedCount: Number(row.used_count), status: row.status,
  firstOrderOnly: Boolean(row.first_order_only), personal: row.customer_id != null
});

adminManageRoutes.get('/promotions', asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT p.*, r.name AS restaurant_name FROM promotions p LEFT JOIN restaurants r ON r.id = p.restaurant_id
     WHERE p.deleted_at IS NULL AND p.customer_id IS NULL ORDER BY (p.restaurant_id IS NULL) DESC, p.created_at DESC LIMIT 300`
  );
  res.json({ items: rows.map(promotionRow) });
}));

adminManageRoutes.post('/promotions', asyncHandler(async (req, res) => {
  const b = req.body ?? {};
  const code = str(b.code, 50, 'code', { required: true }).toUpperCase();
  const name = str(b.name, 200, 'name', { required: true });
  const type = oneOf(b.discountType, ['PERCENT', 'FIXED_AMOUNT', 'FREE_DELIVERY'], 'discountType');
  const value = money(b.discountValue ?? 0, 'discountValue');
  if (type === 'PERCENT' && value > 100) throw new HttpError(400, 'discountValue must be <= 100');
  const start = new Date(b.startAt ?? Date.now());
  // Mã giảm giá chung (giảm % / giảm trực tiếp) không giới hạn hạn ngạch và ngày; freeship bắt buộc có hạn ngạch + ngày kết thúc.
  const isFreeship = type === 'FREE_DELIVERY';
  if (isFreeship && (!b.usageLimit || !b.endAt)) throw new HttpError(400, 'Mã freeship phải có hạn ngạch (usageLimit) và ngày kết thúc (endAt)');
  const end = new Date(b.endAt ?? (isFreeship ? Date.now() + 30 * 86400000 : '2099-12-31T16:59:59Z'));
  if (Number.isNaN(+start) || Number.isNaN(+end) || end <= start) throw new HttpError(400, 'Invalid time range');
  try {
    const result = await query(
      `INSERT INTO promotions (restaurant_id, code, name, description, discount_type, discount_value, max_discount,
        minimum_order, start_at, end_at, usage_limit, usage_per_customer, first_order_only)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, name, str(b.description, 1000, 'description'), type, value,
        b.maxDiscount === undefined || b.maxDiscount === '' ? null : money(b.maxDiscount, 'maxDiscount'),
        money(b.minimumOrder ?? 0, 'minimumOrder'), start, end,
        isFreeship ? id(b.usageLimit, 'usageLimit') : null, b.usagePerCustomer ? id(b.usagePerCustomer, 'usagePerCustomer') : 1, b.firstOrderOnly === true]
    );
    audit(req, 'ADMIN_PROMOTION_CREATE', 'PROMOTION', result.insertId);
    res.status(201).json({ id: Number(result.insertId), code });
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Mã khuyến mãi đã tồn tại');
    throw error;
  }
}));

adminManageRoutes.patch('/promotions/:promotionId', asyncHandler(async (req, res) => {
  const promotionId = id(req.params.promotionId, 'promotionId');
  const status = oneOf(req.body?.status, ['ACTIVE', 'INACTIVE'], 'status');
  await query('UPDATE promotions SET status = ? WHERE id = ? AND deleted_at IS NULL', [status, promotionId]);
  audit(req, 'ADMIN_PROMOTION_STATUS', 'PROMOTION', promotionId);
  res.json({ id: promotionId, status });
}));

const rewardRow = row => ({
  id: Number(row.id), name: row.name, description: row.description, pointsCost: Number(row.points_cost), discountType: row.discount_type,
  discountValue: Number(row.discount_value), maxDiscount: row.max_discount === null ? null : Number(row.max_discount), minimumOrder: Number(row.minimum_order),
  validDays: Number(row.valid_days), stock: row.stock === null ? null : Number(row.stock), status: row.status, redeemed: Number(row.redeemed ?? 0)
});

adminManageRoutes.get('/loyalty-rewards', asyncHandler(async (_req, res) => {
  const rows = await query(`SELECT lr.*, (SELECT COUNT(*) FROM loyalty_transactions lt WHERE lt.reward_id = lr.id AND lt.type = 'REDEEM') AS redeemed
    FROM loyalty_rewards lr ORDER BY lr.points_cost`);
  res.json({ items: rows.map(rewardRow) });
}));

adminManageRoutes.post('/loyalty-rewards', asyncHandler(async (req, res) => {
  const b = req.body ?? {};
  const type = oneOf(b.discountType, ['PERCENT', 'FIXED_AMOUNT', 'FREE_DELIVERY'], 'discountType');
  const value = money(b.discountValue ?? 0, 'discountValue');
  if (type === 'PERCENT' && value > 100) throw new HttpError(400, 'discountValue must be <= 100');
  const result = await query(
    `INSERT INTO loyalty_rewards (name, description, points_cost, discount_type, discount_value, max_discount, minimum_order, valid_days, stock)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [str(b.name, 200, 'name', { required: true }), str(b.description, 500, 'description'), id(b.pointsCost, 'pointsCost'), type, value,
      b.maxDiscount === undefined || b.maxDiscount === null || b.maxDiscount === '' ? null : money(b.maxDiscount, 'maxDiscount'),
      money(b.minimumOrder ?? 0, 'minimumOrder'), b.validDays ? id(b.validDays, 'validDays') : 30, b.stock === undefined || b.stock === null || b.stock === '' ? null : Number(b.stock)]
  );
  audit(req, 'ADMIN_REWARD_CREATE', 'LOYALTY_REWARD', result.insertId);
  res.status(201).json({ id: Number(result.insertId) });
}));

adminManageRoutes.patch('/loyalty-rewards/:rewardId', asyncHandler(async (req, res) => {
  const rewardId = id(req.params.rewardId, 'rewardId');
  const status = oneOf(req.body?.status, ['ACTIVE', 'INACTIVE'], 'status');
  await query('UPDATE loyalty_rewards SET status = ? WHERE id = ?', [status, rewardId]);
  audit(req, 'ADMIN_REWARD_STATUS', 'LOYALTY_REWARD', rewardId);
  res.json({ id: rewardId, status });
}));

adminManageRoutes.post('/promotions/:promotionId/extend', asyncHandler(async (req, res) => {
  const promotionId = id(req.params.promotionId, 'promotionId');
  const rows = await query('SELECT * FROM promotions WHERE id = ? AND restaurant_id IS NULL AND customer_id IS NULL AND deleted_at IS NULL LIMIT 1', [promotionId]);
  if (!rows[0]) throw new HttpError(404, 'Voucher nền tảng không tồn tại');
  const days = Number(req.body?.days ?? 0);
  const addQuota = Number(req.body?.addQuota ?? 0);
  if (!Number.isInteger(days) || days < 0 || days > 365 || !Number.isInteger(addQuota) || addQuota < 0 || (days === 0 && addQuota === 0)) throw new HttpError(400, 'Cần gia hạn 1-365 ngày và/hoặc thêm hạn ngạch');
  await query(
    `UPDATE promotions SET end_at = IF(? > 0, DATE_ADD(GREATEST(end_at, CURRENT_TIMESTAMP), INTERVAL ? DAY), end_at),
       usage_limit = IF(usage_limit IS NULL, NULL, usage_limit + ?), status = 'ACTIVE' WHERE id = ?`, [days, days, addQuota, promotionId]
  );
  audit(req, 'ADMIN_PROMOTION_EXTEND', 'PROMOTION', promotionId);
  res.json({ id: promotionId, extendedDays: days, addedQuota: addQuota });
}));

adminManageRoutes.delete('/promotions/:promotionId', asyncHandler(async (req, res) => {
  const promotionId = id(req.params.promotionId, 'promotionId');
  await query('UPDATE promotions SET deleted_at = CURRENT_TIMESTAMP, status = \'INACTIVE\' WHERE id = ?', [promotionId]);
  audit(req, 'ADMIN_PROMOTION_DELETE', 'PROMOTION', promotionId);
  res.json({ id: promotionId, deleted: true });
}));

adminManageRoutes.get('/banners', asyncHandler(async (_req, res) => {
  const rows = await query('SELECT * FROM banners ORDER BY sort_order, id DESC');
  res.json({
    items: rows.map(row => ({
      id: Number(row.id), title: row.title, imageUrl: row.image_url, targetUrl: row.target_url,
      startAt: row.start_at, endAt: row.end_at, sortOrder: row.sort_order, status: row.status
    }))
  });
}));

adminManageRoutes.get('/reviews', asyncHandler(async (req, res) => {
  const { page, pageSize, offset } = paging(req);
  const maxRating = req.query.maxRating ? Math.min(5, Number(req.query.maxRating)) : 5;
  const [{ total }] = await query('SELECT COUNT(*) AS total FROM restaurant_reviews WHERE deleted_at IS NULL AND rating <= ?', [maxRating]);
  const rows = await query(
    `SELECT rv.*, r.name AS restaurant_name, o.order_code, cp.full_name AS customer_name
     FROM restaurant_reviews rv
     INNER JOIN restaurants r ON r.id = rv.restaurant_id
     INNER JOIN orders o ON o.id = rv.order_id
     INNER JOIN customer_profiles cp ON cp.id = rv.customer_id
     WHERE rv.deleted_at IS NULL AND rv.rating <= ?
     ORDER BY rv.created_at DESC LIMIT ? OFFSET ?`,
    [maxRating, pageSize, offset]
  );
  res.json({
    items: rows.map(row => ({
      id: Number(row.id), rating: Number(row.rating), comment: row.comment, reply: row.restaurant_reply,
      restaurantName: row.restaurant_name, orderCode: row.order_code, customerName: row.customer_name, createdAt: row.created_at
    })),
    totalItems: Number(total), page, pageSize
  });
}));

adminManageRoutes.delete('/reviews/:reviewId', asyncHandler(async (req, res) => {
  const reviewId = id(req.params.reviewId, 'reviewId');
  await query('UPDATE restaurant_reviews SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [reviewId]);
  audit(req, 'ADMIN_REVIEW_DELETE', 'RESTAURANT_REVIEW', reviewId);
  res.json({ id: reviewId, deleted: true });
}));

adminManageRoutes.get('/reports', asyncHandler(async (req, res) => {
  const range = days(req, 30);
  const since = `DATE_SUB(CURRENT_DATE(), INTERVAL ${range - 1} DAY)`;
  const [daily, topRestaurants, topItems, delivery, methods, hourly] = await Promise.all([
    query(`SELECT DATE(created_at) AS date, COUNT(*) AS orders,
                  COALESCE(SUM(CASE WHEN order_status <> 'CANCELLED' THEN total_amount END), 0) AS gmv,
                  SUM(order_status = 'DELIVERED') AS delivered, SUM(order_status = 'CANCELLED') AS cancelled
           FROM orders WHERE created_at >= ${since} GROUP BY DATE(created_at) ORDER BY date`),
    query(`SELECT r.id, r.name, COUNT(*) AS orders, COALESCE(SUM(o.total_amount), 0) AS gmv
           FROM orders o INNER JOIN restaurants r ON r.id = o.restaurant_id
           WHERE o.created_at >= ${since} AND o.order_status <> 'CANCELLED'
           GROUP BY r.id, r.name ORDER BY gmv DESC LIMIT 8`),
    query(`SELECT oi.item_name AS name, SUM(oi.quantity) AS quantity, SUM(oi.total_price) AS revenue
           FROM order_items oi INNER JOIN orders o ON o.id = oi.order_id
           WHERE o.created_at >= ${since} AND o.order_status <> 'CANCELLED'
           GROUP BY oi.item_name ORDER BY quantity DESC LIMIT 8`),
    query(`SELECT COUNT(*) AS total, SUM(delivery_status = 'DELIVERED') AS delivered, SUM(delivery_status = 'FAILED') AS failed,
                  AVG(CASE WHEN delivery_status = 'DELIVERED' THEN TIMESTAMPDIFF(MINUTE, assigned_at, updated_at) END) AS avg_minutes
           FROM deliveries WHERE created_at >= ${since}`),
    query(`SELECT payment_method AS method, COUNT(*) AS orders FROM orders WHERE created_at >= ${since} GROUP BY payment_method ORDER BY orders DESC`),
    query(`SELECT HOUR(created_at) AS hour, COUNT(*) AS orders FROM orders WHERE created_at >= ${since} GROUP BY HOUR(created_at) ORDER BY hour`)
  ]);
  const d = delivery[0] ?? {};
  const total = Number(d.total ?? 0);
  res.json({
    days: range,
    daily: daily.map(r => ({ date: r.date, orders: Number(r.orders), gmv: Number(r.gmv), delivered: Number(r.delivered ?? 0), cancelled: Number(r.cancelled ?? 0) })),
    topRestaurants: topRestaurants.map(r => ({ id: Number(r.id), name: r.name, orders: Number(r.orders), gmv: Number(r.gmv) })),
    topItems: topItems.map(r => ({ name: r.name, quantity: Number(r.quantity), revenue: Number(r.revenue) })),
    delivery: {
      total, delivered: Number(d.delivered ?? 0), failed: Number(d.failed ?? 0),
      successRate: total ? Number(d.delivered ?? 0) / total : 0, avgMinutes: d.avg_minutes === null || d.avg_minutes === undefined ? null : Number(d.avg_minutes)
    },
    paymentMethods: methods.map(r => ({ method: r.method, orders: Number(r.orders) })),
    hourly: hourly.map(r => ({ hour: Number(r.hour), orders: Number(r.orders) }))
  });
}));

adminManageRoutes.get('/zones', asyncHandler(async (_req, res) => {
  const rows = await query('SELECT * FROM delivery_zones ORDER BY city, district, id');
  res.json({
    items: rows.map(row => ({
      id: Number(row.id), name: row.name, city: row.city, district: row.district, baseFee: Number(row.base_fee),
      pricePerKm: Number(row.price_per_km), minimumFee: Number(row.minimum_fee), maximumDistance: Number(row.maximum_distance), status: row.status
    }))
  });
}));

adminManageRoutes.post('/zones', asyncHandler(async (req, res) => {
  const b = req.body ?? {};
  const result = await query(
    `INSERT INTO delivery_zones (name, city, district, base_fee, price_per_km, minimum_fee, maximum_distance)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [str(b.name, 150, 'name', { required: true }), str(b.city, 100, 'city', { required: true }), str(b.district, 100, 'district'),
      money(b.baseFee ?? 15000, 'baseFee'), money(b.pricePerKm ?? 5000, 'pricePerKm'), money(b.minimumFee ?? 15000, 'minimumFee'),
      money(b.maximumDistance ?? 15, 'maximumDistance', { min: 1 })]
  );
  audit(req, 'ADMIN_ZONE_CREATE', 'DELIVERY_ZONE', result.insertId);
  res.status(201).json({ id: Number(result.insertId) });
}));

adminManageRoutes.patch('/zones/:zoneId', asyncHandler(async (req, res) => {
  const zoneId = id(req.params.zoneId, 'zoneId');
  const b = req.body ?? {};
  const fields = [];
  const values = [];
  if (b.status !== undefined) { fields.push('status = ?'); values.push(oneOf(b.status, ['ACTIVE', 'INACTIVE'], 'status')); }
  if (b.baseFee !== undefined) { fields.push('base_fee = ?'); values.push(money(b.baseFee, 'baseFee')); }
  if (b.pricePerKm !== undefined) { fields.push('price_per_km = ?'); values.push(money(b.pricePerKm, 'pricePerKm')); }
  if (b.minimumFee !== undefined) { fields.push('minimum_fee = ?'); values.push(money(b.minimumFee, 'minimumFee')); }
  if (b.maximumDistance !== undefined) { fields.push('maximum_distance = ?'); values.push(money(b.maximumDistance, 'maximumDistance', { min: 1 })); }
  if (!fields.length) throw new HttpError(400, 'Nothing to update');
  await query(`UPDATE delivery_zones SET ${fields.join(', ')} WHERE id = ?`, [...values, zoneId]);
  audit(req, 'ADMIN_ZONE_UPDATE', 'DELIVERY_ZONE', zoneId);
  res.json({ id: zoneId });
}));

/* ============================================================
   RESTAURANT OWNER
   ============================================================ */

restaurantManageRoutes.get('/:restaurantId/stats', asyncHandler(async (req, res) => {
  const restaurantId = id(req.params.restaurantId, 'restaurantId');
  const restaurant = await assertRestaurantAccess(req.user, restaurantId);
  const range = days(req, 7);
  const since = `DATE_SUB(CURRENT_DATE(), INTERVAL ${range - 1} DAY)`;
  const [today, daily, status, topItems, topCustomers, rating, pending] = await Promise.all([
    query(`SELECT COUNT(*) AS orders,
                  COALESCE(SUM(CASE WHEN order_status <> 'CANCELLED' THEN total_amount END), 0) AS revenue,
                  SUM(order_status = 'CANCELLED') AS cancelled
           FROM orders WHERE restaurant_id = ? AND DATE(created_at) = CURRENT_DATE()`, [restaurantId]),
    query(`SELECT DATE(created_at) AS date, COUNT(*) AS orders,
                  COALESCE(SUM(CASE WHEN order_status <> 'CANCELLED' THEN total_amount END), 0) AS revenue
           FROM orders WHERE restaurant_id = ? AND created_at >= ${since} GROUP BY DATE(created_at) ORDER BY date`, [restaurantId]),
    query(`SELECT order_status AS status, COUNT(*) AS total FROM orders WHERE restaurant_id = ? AND created_at >= ${since} GROUP BY order_status`, [restaurantId]),
    query(`SELECT oi.item_name AS name, SUM(oi.quantity) AS quantity, SUM(oi.total_price) AS revenue
           FROM order_items oi INNER JOIN orders o ON o.id = oi.order_id
           WHERE o.restaurant_id = ? AND o.created_at >= ${since} AND o.order_status <> 'CANCELLED'
           GROUP BY oi.item_name ORDER BY quantity DESC LIMIT 6`, [restaurantId]),
    query(`SELECT o.receiver_name AS name, COUNT(*) AS orders, SUM(o.total_amount) AS spent
           FROM orders o WHERE o.restaurant_id = ? AND o.order_status <> 'CANCELLED'
           GROUP BY o.customer_id, o.receiver_name ORDER BY spent DESC LIMIT 5`, [restaurantId]),
    query('SELECT rating, total_reviews, total_orders, total_revenue, commission_rate, status FROM restaurants WHERE id = ?', [restaurantId]),
    query(`SELECT COUNT(*) AS total FROM orders WHERE restaurant_id = ? AND order_status = 'PENDING'`, [restaurantId])
  ]);
  const t = today[0] ?? {};
  const r = rating[0] ?? {};
  res.json({
    restaurant: { id: restaurantId, name: restaurant.name, status: r.status, rating: Number(r.rating), totalReviews: Number(r.total_reviews), totalOrders: Number(r.total_orders), totalRevenue: Number(r.total_revenue), commissionRate: Number(r.commission_rate) },
    today: { orders: Number(t.orders ?? 0), revenue: Number(t.revenue ?? 0), cancelled: Number(t.cancelled ?? 0), pending: Number(pending[0]?.total ?? 0) },
    days: range,
    daily: daily.map(row => ({ date: row.date, orders: Number(row.orders), revenue: Number(row.revenue) })),
    orderStatus: status.map(row => ({ status: row.status, total: Number(row.total) })),
    topItems: topItems.map(row => ({ name: row.name, quantity: Number(row.quantity), revenue: Number(row.revenue) })),
    topCustomers: topCustomers.map(row => ({ name: row.name, orders: Number(row.orders), spent: Number(row.spent) }))
  });
}));

restaurantManageRoutes.get('/:restaurantId/orders', asyncHandler(async (req, res) => {
  const restaurantId = id(req.params.restaurantId, 'restaurantId');
  await assertRestaurantAccess(req.user, restaurantId);
  const { page, pageSize, offset } = paging(req);
  const where = ['o.restaurant_id = ?', 'o.deleted_at IS NULL'];
  const params = [restaurantId];
  if (req.query.status) { where.push('o.order_status = ?'); params.push(String(req.query.status)); }
  if (req.query.from) { where.push('o.created_at >= ?'); params.push(new Date(String(req.query.from))); }
  if (req.query.to) { where.push('o.created_at < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(new Date(String(req.query.to))); }
  if (req.query.q) {
    where.push('(o.order_code LIKE ? OR o.receiver_name LIKE ? OR o.receiver_phone LIKE ?)');
    const term = like(req.query.q);
    params.push(term, term, term);
  }
  const whereSql = where.join(' AND ');
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM orders o WHERE ${whereSql}`, params);
  const rows = await query(
    `SELECT o.*, r.name AS restaurant_name, sp.full_name AS shipper_name,
            (SELECT COALESCE(SUM(quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
     FROM orders o INNER JOIN restaurants r ON r.id = o.restaurant_id LEFT JOIN shipper_profiles sp ON sp.id = o.shipper_id
     WHERE ${whereSql} ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  res.json({ items: rows.map(orderRow), totalItems: Number(total), page, pageSize });
}));

restaurantManageRoutes.get('/:restaurantId/reviews', asyncHandler(async (req, res) => {
  const restaurantId = id(req.params.restaurantId, 'restaurantId');
  await assertRestaurantAccess(req.user, restaurantId);
  const rows = await query(
    `SELECT rv.*, o.order_code, cp.full_name AS customer_name
     FROM restaurant_reviews rv INNER JOIN orders o ON o.id = rv.order_id INNER JOIN customer_profiles cp ON cp.id = rv.customer_id
     WHERE rv.restaurant_id = ? AND rv.deleted_at IS NULL ORDER BY rv.created_at DESC LIMIT 100`,
    [restaurantId]
  );
  res.json({
    items: rows.map(row => ({
      id: Number(row.id), rating: Number(row.rating), comment: row.comment, reply: row.restaurant_reply, repliedAt: row.replied_at,
      orderCode: row.order_code, customerName: row.customer_name, createdAt: row.created_at
    }))
  });
}));

restaurantManageRoutes.post('/:restaurantId/reviews/:reviewId/reply', asyncHandler(async (req, res) => {
  const restaurantId = id(req.params.restaurantId, 'restaurantId');
  const reviewId = id(req.params.reviewId, 'reviewId');
  await assertRestaurantAccess(req.user, restaurantId);
  const reply = str(req.body?.reply, 1000, 'reply', { required: true });
  const result = await query(
    'UPDATE restaurant_reviews SET restaurant_reply = ?, replied_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL',
    [reply, reviewId, restaurantId]
  );
  if (!result.affectedRows) throw new HttpError(404, 'Review not found');
  audit(req, 'RESTAURANT_REVIEW_REPLY', 'RESTAURANT_REVIEW', reviewId);
  res.json({ id: reviewId, reply });
}));

restaurantManageRoutes.get('/:restaurantId/hours', asyncHandler(async (req, res) => {
  const restaurantId = id(req.params.restaurantId, 'restaurantId');
  const restaurant = await assertRestaurantAccess(req.user, restaurantId);
  const rows = await query('SELECT * FROM restaurant_operating_hours WHERE restaurant_id = ? ORDER BY day_of_week', [restaurantId]);
  const byDay = new Map(rows.map(row => [Number(row.day_of_week), row]));
  const fallback = (await query('SELECT opening_time, closing_time FROM restaurants WHERE id = ?', [restaurantId]))[0] ?? {};
  res.json({
    status: restaurant.status,
    items: [1, 2, 3, 4, 5, 6, 7].map(day => {
      const row = byDay.get(day);
      return {
        dayOfWeek: day,
        openTime: String(row?.open_time ?? fallback.opening_time ?? '08:00:00').slice(0, 5),
        closeTime: String(row?.close_time ?? fallback.closing_time ?? '22:00:00').slice(0, 5),
        isClosed: row ? Boolean(row.is_closed) : false
      };
    })
  });
}));

restaurantManageRoutes.put('/:restaurantId/hours', asyncHandler(async (req, res) => {
  const restaurantId = id(req.params.restaurantId, 'restaurantId');
  await assertRestaurantAccess(req.user, restaurantId);
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (items.length !== 7) throw new HttpError(400, 'Cần đủ 7 ngày trong tuần');
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  await withTransaction(async connection => {
    for (const item of items) {
      const day = Number(item.dayOfWeek);
      if (!Number.isInteger(day) || day < 1 || day > 7) throw new HttpError(400, 'dayOfWeek is invalid');
      if (!item.isClosed && (!time.test(item.openTime) || !time.test(item.closeTime) || item.openTime >= item.closeTime)) {
        throw new HttpError(400, `Giờ mở cửa ngày ${day} không hợp lệ`);
      }
      await connection.execute(
        `INSERT INTO restaurant_operating_hours (restaurant_id, day_of_week, open_time, close_time, is_closed)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE open_time = VALUES(open_time), close_time = VALUES(close_time), is_closed = VALUES(is_closed)`,
        [restaurantId, day, item.isClosed ? null : `${item.openTime}:00`, item.isClosed ? null : `${item.closeTime}:00`, Boolean(item.isClosed)]
      );
    }
    const open = items.filter(item => !item.isClosed);
    if (open.length) {
      await connection.execute('UPDATE restaurants SET opening_time = ?, closing_time = ? WHERE id = ?', [`${open[0].openTime}:00`, `${open[0].closeTime}:00`, restaurantId]);
    }
  });
  audit(req, 'RESTAURANT_HOURS_UPDATE', 'RESTAURANT', restaurantId);
  res.json({ restaurantId, saved: 7 });
}));

restaurantManageRoutes.patch('/:restaurantId/availability', asyncHandler(async (req, res) => {
  const restaurantId = id(req.params.restaurantId, 'restaurantId');
  const restaurant = await assertRestaurantAccess(req.user, restaurantId);
  if (!['ACTIVE', 'INACTIVE'].includes(restaurant.status)) throw new HttpError(400, 'Nhà hàng chưa được duyệt hoặc đang bị khóa');
  const status = req.body?.open ? 'ACTIVE' : 'INACTIVE';
  await query('UPDATE restaurants SET status = ? WHERE id = ?', [status, restaurantId]);
  audit(req, 'RESTAURANT_AVAILABILITY', 'RESTAURANT', restaurantId);
  res.json({ id: restaurantId, status });
}));
