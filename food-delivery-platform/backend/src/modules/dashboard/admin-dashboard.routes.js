import { Router } from 'express';
import { query } from '../../shared/database/mysql.js';
import { env } from '../../shared/config/env.js';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { requireAuth, requireRole } from '../../shared/middlewares/require-auth.middleware.js';
import { requirePermission } from '../../shared/middlewares/require-permission.middleware.js';

export const adminDashboardRoutes = Router();

adminDashboardRoutes.use(requireAuth, requireRole('ADMIN'), requirePermission('report.view'));

adminDashboardRoutes.get('/', asyncHandler(async (_req, res) => {
  const [overviewRows, revenueRows, orderStatusRows, restaurantStatusRows, userRoleRows, recentOrders, supportRows] = await Promise.all([
    query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND status = 'ACTIVE') AS active_users,
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) AS total_users,
        (SELECT COUNT(*) FROM restaurants WHERE deleted_at IS NULL AND status = 'ACTIVE') AS active_restaurants,
        (SELECT COUNT(*) FROM restaurants WHERE deleted_at IS NULL AND status = 'PENDING') AS pending_restaurants,
        (SELECT COUNT(*) FROM menu_items WHERE deleted_at IS NULL AND is_available = TRUE) AS active_menu_items,
        (SELECT COUNT(*) FROM orders) AS total_orders,
        (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE()) AS today_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE payment_status IN ('PAID', 'PARTIALLY_REFUNDED'))
          - (SELECT COALESCE(SUM(f.amount), 0) FROM refunds f INNER JOIN orders po ON po.id = f.order_id WHERE f.status = 'COMPLETED' AND po.payment_status = 'PARTIALLY_REFUNDED') AS paid_revenue,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE DATE(created_at) = CURRENT_DATE()) AS today_gmv
    `),
    query(`
      SELECT DATE(created_at) AS date, COUNT(*) AS orders, COALESCE(SUM(total_amount), 0) AS gmv
      FROM orders
      WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 DAY)
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `),
    query('SELECT order_status AS status, COUNT(*) AS total FROM orders GROUP BY order_status ORDER BY total DESC'),
    query('SELECT status, COUNT(*) AS total FROM restaurants WHERE deleted_at IS NULL GROUP BY status ORDER BY total DESC'),
    query(`
      SELECT r.name AS role, COUNT(*) AS total
      FROM users u INNER JOIN roles r ON r.id = u.role_id
      WHERE u.deleted_at IS NULL
      GROUP BY r.name
      ORDER BY total DESC
    `),
    query(`
      SELECT o.id, o.order_code, o.order_status, o.payment_status, o.total_amount, o.created_at, r.name AS restaurant_name
      FROM orders o INNER JOIN restaurants r ON r.id = o.restaurant_id
      ORDER BY o.created_at DESC
      LIMIT 8
    `),
    query("SELECT status, COUNT(*) AS total FROM support_tickets GROUP BY status ORDER BY total DESC")
  ]);

  res.json({
    overview: mapOverview(overviewRows[0] ?? {}),
    revenue7Days: revenueRows.map(row => ({ date: row.date, orders: Number(row.orders), gmv: Number(row.gmv) })),
    orderStatus: orderStatusRows.map(row => ({ status: row.status, total: Number(row.total) })),
    restaurantStatus: restaurantStatusRows.map(row => ({ status: row.status, total: Number(row.total) })),
    userRoles: userRoleRows.map(row => ({ role: row.role, total: Number(row.total) })),
    recentOrders: recentOrders.map(row => ({
      id: Number(row.id),
      orderCode: row.order_code,
      status: row.order_status,
      paymentStatus: row.payment_status,
      totalAmount: Number(row.total_amount),
      restaurantName: row.restaurant_name,
      createdAt: row.created_at
    })),
    supportStatus: supportRows.map(row => ({ status: row.status, total: Number(row.total) }))
  });
}));

function mapOverview(row) {
  return {
    activeUsers: Number(row.active_users ?? 0),
    totalUsers: Number(row.total_users ?? 0),
    activeRestaurants: Number(row.active_restaurants ?? 0),
    pendingRestaurants: Number(row.pending_restaurants ?? 0),
    activeMenuItems: Number(row.active_menu_items ?? 0),
    totalOrders: Number(row.total_orders ?? 0),
    todayOrders: Number(row.today_orders ?? 0),
    paidRevenue: Number(row.paid_revenue ?? 0),
    todayGmv: Number(row.today_gmv ?? 0)
  };
}

/** Báo cáo chất lượng dữ liệu (chỉ đọc, đếm trên 100% bản ghi bằng SQL). */
export async function buildDataQualityReport(exec = query, thresholds = {}) {
  const kitchen = Number(thresholds.staleKitchenMinutes ?? 180);
  const delivery = Number(thresholds.staleDeliveryMinutes ?? 240);
  const pending = Number(thresholds.pendingTimeoutMinutes ?? 30);
  const lastChange = 'COALESCE((SELECT MAX(h.created_at) FROM order_status_history h WHERE h.order_id = o.id), o.created_at)';
  const one = async (sql, params = []) => Number((await exec(sql, params))[0]?.n ?? 0);
  const paidSql = "SELECT order_id, SUM(amount) AS paid FROM payments WHERE status IN ('PAID', 'REFUNDED') GROUP BY order_id";
  const [refundOver, refundDuplicate, paymentsOutOfSync, openPaymentsClosedOrders] = await Promise.all([
    one(`SELECT COUNT(*) n FROM (SELECT order_id, SUM(amount) s FROM refunds WHERE status IN ('PENDING', 'PROCESSING', 'COMPLETED') GROUP BY order_id) r LEFT JOIN (${paidSql}) p ON p.order_id = r.order_id WHERE r.s > COALESCE(p.paid, 0) + 0.005`),
    one("SELECT COUNT(*) n FROM (SELECT order_id FROM refunds WHERE status = 'COMPLETED' GROUP BY order_id, amount HAVING COUNT(*) > 1) t"),
    one(`SELECT COUNT(*) n FROM orders o WHERE (o.payment_status = 'REFUNDED' AND EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id AND p.status = 'PAID'))
      OR (o.payment_status <> 'REFUNDED' AND EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id AND p.status = 'REFUNDED'))`),
    one("SELECT COUNT(*) n FROM payments p INNER JOIN orders o ON o.id = p.order_id WHERE o.order_status IN ('CANCELLED', 'FAILED') AND p.status IN ('PENDING', 'PROCESSING')")
  ]);
  const closedOrdersPaymentPending = await one("SELECT COUNT(*) n FROM orders WHERE order_status IN ('CANCELLED', 'FAILED') AND payment_status = 'PENDING'");
  const [totalOrders, outOfHours, cancelledStillPaid, stuckKitchen, stuckDelivery, stuckPending, shopRatingMismatch, itemRatingMismatch, itemsNoImage, itemsTotal, expiredActive, refundsOverdue] = await Promise.all([
    one('SELECT COUNT(*) n FROM orders'),
    one(`SELECT COUNT(*) n FROM orders o JOIN restaurants r ON r.id = o.restaurant_id WHERE o.deleted_at IS NULL AND r.opening_time <> r.closing_time AND NOT (
      (r.opening_time < r.closing_time AND TIME(o.ordered_at) >= r.opening_time AND TIME(o.ordered_at) < r.closing_time)
      OR (r.opening_time > r.closing_time AND (TIME(o.ordered_at) >= r.opening_time OR TIME(o.ordered_at) < r.closing_time)))`),
    one("SELECT COUNT(*) n FROM orders WHERE order_status IN ('CANCELLED','FAILED') AND payment_status = 'PAID'"),
    one(`SELECT COUNT(*) n FROM orders o WHERE o.deleted_at IS NULL AND o.order_status IN ('PREPARING','READY_FOR_PICKUP','SHIPPER_ASSIGNED') AND ${lastChange} < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? MINUTE)`, [kitchen]),
    one(`SELECT COUNT(*) n FROM orders o WHERE o.deleted_at IS NULL AND o.order_status IN ('PICKED_UP','DELIVERING') AND ${lastChange} < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? MINUTE)`, [delivery]),
    one("SELECT COUNT(*) n FROM orders o WHERE o.deleted_at IS NULL AND o.order_status = 'PENDING' AND o.created_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? MINUTE)", [pending]),
    one(`SELECT COUNT(*) n FROM restaurants r WHERE r.deleted_at IS NULL AND (
      r.total_reviews <> (SELECT COUNT(*) FROM restaurant_reviews x WHERE x.restaurant_id = r.id AND x.deleted_at IS NULL)
      OR ABS(r.rating - COALESCE((SELECT AVG(x.rating) FROM restaurant_reviews x WHERE x.restaurant_id = r.id AND x.deleted_at IS NULL), 0)) > 0.01)`),
    one(`SELECT COUNT(*) n FROM menu_items m WHERE m.deleted_at IS NULL AND (
      m.total_reviews <> (SELECT COUNT(*) FROM menu_item_reviews x WHERE x.menu_item_id = m.id AND x.deleted_at IS NULL)
      OR ABS(m.rating - COALESCE((SELECT AVG(x.rating) FROM menu_item_reviews x WHERE x.menu_item_id = m.id AND x.deleted_at IS NULL), 0)) > 0.01)`),
    one('SELECT COUNT(*) n FROM menu_items WHERE deleted_at IS NULL AND image_url IS NULL'),
    one('SELECT COUNT(*) n FROM menu_items WHERE deleted_at IS NULL'),
    one("SELECT COUNT(*) n FROM promotions WHERE deleted_at IS NULL AND status = 'ACTIVE' AND end_at < CURRENT_TIMESTAMP"),
    one("SELECT COUNT(*) n FROM refunds f JOIN orders o ON o.id = f.order_id WHERE f.status IN ('PENDING','PROCESSING') AND o.order_status IN ('CANCELLED','FAILED') AND f.created_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? MINUTE)", [Number(thresholds.refundAutoApproveMinutes ?? 240)])
  ]);
  return {
    generatedAt: new Date().toISOString(),
    scope: '100% bản ghi (đếm bằng SQL, không lấy mẫu)',
    totals: { orders: totalOrders, menuItems: itemsTotal },
    checks: {
      ordersOutsideOpeningHours: outOfHours,
      cancelledOrFailedStillPaid: cancelledStillPaid,
      staleOrders: { kitchen: stuckKitchen, delivery: stuckDelivery, pending: stuckPending }, // pending: mọi đơn quán chưa xác nhận quá hạn (kể cả đã trả tiền)
      restaurantRatingMismatch: shopRatingMismatch,
      menuItemRatingMismatch: itemRatingMismatch,
      menuItemsWithoutImage: itemsNoImage,
      activePromotionsPastEndDate: expiredActive,
      refundsOverdue,
      refundsExceedPaid: refundOver,
      duplicateCompletedRefunds: refundDuplicate,
      paymentsOutOfSyncWithRefunds: paymentsOutOfSync,
      openPaymentsOnClosedOrders: openPaymentsClosedOrders,
      closedOrdersPaymentStatusPending: closedOrdersPaymentPending
    }
  };
}

adminDashboardRoutes.get('/data-quality', asyncHandler(async (_req, res) => {
  res.json(await buildDataQualityReport(query, env.orders));
}));
