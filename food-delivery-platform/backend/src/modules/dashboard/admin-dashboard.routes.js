import { Router } from 'express';
import { query } from '../../shared/database/mysql.js';
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
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE payment_status = 'PAID') AS paid_revenue,
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
