import { Router } from 'express';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { HttpError } from '../../shared/http/http-error.js';
import { query, withTransaction } from '../../shared/database/mysql.js';
import { requireAuth, requireRole } from '../../shared/middlewares/require-auth.middleware.js';
import { requirePermission } from '../../shared/middlewares/require-permission.middleware.js';
import { orderRepository } from '../orders/order.repository.js';
import { listVouchers, priceOrder } from './voucher.js';
import { deliveryFeeFor, distanceKm, feeSettings } from '../../shared/pricing/delivery-fee.js';

/* Ưu đãi phía khách: ví voucher, báo giá giỏ hàng, điểm thưởng và đổi quà. Gắn tại /api/customer. */
export const rewardsCustomerRoutes = Router();
rewardsCustomerRoutes.use(requireAuth, requireRole('CUSTOMER'), requirePermission('promotion.view'));

const POINTS_PER_VND = 1000; // 1 điểm cho mỗi 1.000đ tiền món (khớp trigger trg_order_delivered_loyalty)

async function customerOf(userId) {
  const rows = await query('SELECT id, loyalty_points FROM customer_profiles WHERE user_id = ? LIMIT 1', [userId]);
  if (!rows[0]) throw new HttpError(404, 'Customer profile not found');
  return { id: Number(rows[0].id), points: Number(rows[0].loyalty_points) };
}

/** Phí giao tới địa chỉ (addressId, mặc định lấy địa chỉ mặc định). Không có toạ độ thì trả phí cơ bản. */
async function shippingFor(customerId, restaurantId, addressId = null) {
  const settings = await query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('delivery_base_fee', 'delivery_price_per_km', 'max_delivery_distance')");
  const options = feeSettings(Object.fromEntries(settings.map(row => [row.setting_key, Number(row.setting_value)])));
  if (!restaurantId) return { ...deliveryFeeFor(options, null), options };
  const rows = await query(
    `SELECT a.latitude AS a_lat, a.longitude AS a_lng, r.latitude AS r_lat, r.longitude AS r_lng
     FROM restaurants r LEFT JOIN customer_addresses a ON a.customer_id = ? AND a.deleted_at IS NULL AND (a.id = ? OR (? IS NULL AND a.is_default = TRUE))
     WHERE r.id = ? ORDER BY a.id DESC LIMIT 1`, [customerId, addressId, addressId, restaurantId]
  );
  const row = rows[0];
  return { ...deliveryFeeFor(options, row ? distanceKm(row.r_lat, row.r_lng, row.a_lat, row.a_lng) : null), options };
}

function readRestaurantId(value) {
  if (value === undefined || value === '' || value === null) return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'restaurantId must be a positive integer');
  return id;
}

/** Ví voucher: khách thấy mọi voucher còn dùng được, kèm cần mua thêm bao nhiêu để đủ điều kiện. */
rewardsCustomerRoutes.get('/vouchers', asyncHandler(async (req, res) => {
  const customer = await customerOf(req.user.id);
  const restaurantId = readRestaurantId(req.query.restaurantId);
  const cart = restaurantId ? await orderRepository.getCartForUser(req.user.id, restaurantId) : null;
  const subtotal = Number(cart?.subtotal ?? 0);
  const shipping = await shippingFor(customer.id, restaurantId, req.query.addressId ? Number(req.query.addressId) : null);
  const items = await listVouchers(query, { customerId: customer.id, restaurantId, subtotal, deliveryFee: shipping.fee });
  items.sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.discountAmount - a.discountAmount || a.shortfall - b.shortfall);
  res.json({ items, totalItems: items.length, subtotal });
}));

/** Báo giá giỏ hàng trước khi đặt: phí giao, giảm giá, tổng tiền, gợi ý voucher tốt nhất và mốc freeship. */
rewardsCustomerRoutes.post('/orders/quote', asyncHandler(async (req, res) => {
  const customer = await customerOf(req.user.id);
  const restaurantId = readRestaurantId(req.body?.restaurantId);
  if (!restaurantId) throw new HttpError(400, 'restaurantId is required');
  const cart = await orderRepository.getCartForUser(req.user.id, restaurantId);
  if (!cart || cart.items.length === 0) throw new HttpError(404, 'Cart is empty');
  const shipping = await shippingFor(customer.id, restaurantId, req.body?.addressId ? Number(req.body.addressId) : null);
  const fee = shipping.fee;
  const vouchers = await listVouchers(query, { customerId: customer.id, restaurantId, subtotal: cart.subtotal, deliveryFee: fee });
  const code = typeof req.body?.promotionCode === 'string' ? req.body.promotionCode.trim().toUpperCase() : '';
  const chosen = code ? vouchers.find(item => item.code.toUpperCase() === code) : null;
  const promotionError = code && !chosen ? 'Mã không tồn tại hoặc bạn không còn lượt dùng' : code && !chosen.eligible ? `Cần mua thêm ${chosen.shortfall} để dùng mã này` : null;
  const promotion = chosen?.eligible ? chosen : null;
  const taxRow = await query("SELECT setting_value FROM system_settings WHERE setting_key = 'tax_rate' LIMIT 1");
  const price = priceOrder({ subtotal: cart.subtotal, deliveryFee: fee, taxRate: Number(taxRow[0]?.setting_value ?? 0), promotion });
  const eligible = vouchers.filter(item => item.eligible);
  const best = eligible.reduce((top, item) => (!top || item.discountAmount > top.discountAmount ? item : top), null);
  const nextFreeship = vouchers.filter(item => item.discountType === 'FREE_DELIVERY' && !item.eligible).sort((a, b) => a.shortfall - b.shortfall)[0] ?? null;
  const nextDiscount = vouchers.filter(item => item.discountType !== 'FREE_DELIVERY' && !item.eligible).sort((a, b) => a.shortfall - b.shortfall)[0] ?? null;
  res.json({
    restaurantId, ...price, distanceKm: shipping.km, outOfRange: shipping.tooFar, maxDeliveryKm: shipping.options.maxKm, minimumOrder: cart.minimumOrder, meetsMinimum: cart.subtotal >= cart.minimumOrder,
    promotion: promotion ? { id: promotion.id, code: promotion.code, name: promotion.name, discountType: promotion.discountType } : null,
    promotionError,
    bestVoucher: best && best.id !== promotion?.id ? { code: best.code, name: best.name, discountAmount: best.discountAmount } : null,
    freeshipHint: nextFreeship && !promotion ? { code: nextFreeship.code, minimumOrder: nextFreeship.minimumOrder, shortfall: nextFreeship.shortfall } : null,
    discountHint: nextDiscount ? { code: nextDiscount.code, name: nextDiscount.name, shortfall: nextDiscount.shortfall, discountAmount: nextDiscount.discountAmount } : null,
    pointsToEarn: Math.floor(cart.subtotal / POINTS_PER_VND)
  });
}));

/** Điểm thưởng: số dư, quà có thể đổi và lịch sử cộng/trừ điểm. */
rewardsCustomerRoutes.get('/loyalty', asyncHandler(async (req, res) => {
  const customer = await customerOf(req.user.id);
  const [rewards, history, summary] = await Promise.all([
    query("SELECT * FROM loyalty_rewards WHERE status = 'ACTIVE' AND (stock IS NULL OR stock > 0) ORDER BY points_cost"),
    query('SELECT id, type, points, balance_after, description, created_at FROM loyalty_transactions WHERE customer_id = ? ORDER BY id DESC LIMIT 20', [customer.id]),
    query(`SELECT COALESCE(SUM(CASE WHEN type = 'EARN' THEN points END), 0) AS earned, COALESCE(-SUM(CASE WHEN type = 'REDEEM' THEN points END), 0) AS redeemed
           FROM loyalty_transactions WHERE customer_id = ?`, [customer.id])
  ]);
  res.json({
    points: customer.points, earnedTotal: Number(summary[0].earned), redeemedTotal: Number(summary[0].redeemed),
    earnRule: `Mỗi ${POINTS_PER_VND.toLocaleString('vi-VN')}đ tiền món khi đơn giao thành công được 1 điểm`,
    rewards: rewards.map(row => ({
      id: Number(row.id), name: row.name, description: row.description, pointsCost: Number(row.points_cost),
      discountType: row.discount_type, discountValue: Number(row.discount_value), maxDiscount: row.max_discount == null ? null : Number(row.max_discount),
      minimumOrder: Number(row.minimum_order), validDays: Number(row.valid_days), stock: row.stock == null ? null : Number(row.stock),
      canRedeem: customer.points >= Number(row.points_cost), missingPoints: Math.max(0, Number(row.points_cost) - customer.points)
    })),
    history: history.map(row => ({ id: Number(row.id), type: row.type, points: Number(row.points), balanceAfter: Number(row.balance_after), description: row.description, createdAt: row.created_at }))
  });
}));

/** Đổi điểm lấy voucher cá nhân (dùng 1 lần, có hạn). */
rewardsCustomerRoutes.post('/loyalty/rewards/:rewardId/redeem', asyncHandler(async (req, res) => {
  const rewardId = Number(req.params.rewardId);
  if (!Number.isInteger(rewardId) || rewardId <= 0) throw new HttpError(400, 'rewardId must be a positive integer');
  const result = await withTransaction(async connection => {
    const profiles = await connection.execute('SELECT id, loyalty_points FROM customer_profiles WHERE user_id = ? LIMIT 1 FOR UPDATE', [req.user.id]);
    if (!profiles[0]) throw new HttpError(404, 'Customer profile not found');
    const rewards = await connection.execute("SELECT * FROM loyalty_rewards WHERE id = ? AND status = 'ACTIVE' LIMIT 1 FOR UPDATE", [rewardId]);
    const reward = rewards[0];
    if (!reward) throw new HttpError(404, 'Reward not found');
    if (reward.stock != null && Number(reward.stock) <= 0) throw new HttpError(409, 'Quà này đã hết lượt đổi');
    const points = Number(profiles[0].loyalty_points);
    const cost = Number(reward.points_cost);
    if (points < cost) throw new HttpError(400, `Bạn cần thêm ${cost - points} điểm để đổi quà này`);
    const customerId = Number(profiles[0].id);
    const code = `RW${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    const inserted = await connection.execute(
      `INSERT INTO promotions (restaurant_id, customer_id, code, name, description, discount_type, discount_value, max_discount, minimum_order,
         start_at, end_at, usage_limit, usage_per_customer)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY), 1, 1)`,
      [customerId, code, reward.name, `Voucher đổi từ ${cost} điểm thưởng`, reward.discount_type, reward.discount_value, reward.max_discount, reward.minimum_order, Number(reward.valid_days)]
    );
    await connection.execute(
      `INSERT INTO loyalty_transactions (customer_id, type, points, balance_after, reward_id, promotion_id, description) VALUES (?, 'REDEEM', ?, ?, ?, ?, ?)`,
      [customerId, -cost, points - cost, rewardId, inserted.insertId, `Đổi điểm lấy "${reward.name}"`]
    );
    if (reward.stock != null) await connection.execute('UPDATE loyalty_rewards SET stock = stock - 1 WHERE id = ?', [rewardId]);
    return { promotionId: Number(inserted.insertId), code, name: reward.name, pointsSpent: cost, pointsLeft: points - cost, validDays: Number(reward.valid_days) };
  });
  res.status(201).json(result);
}));
