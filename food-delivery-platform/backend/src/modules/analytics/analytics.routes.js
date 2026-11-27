import { Router } from 'express';
import { query } from '../../shared/database/mysql.js';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { HttpError } from '../../shared/http/http-error.js';
import { requireAuth, requireRole } from '../../shared/middlewares/require-auth.middleware.js';
import { sendDataset } from '../exports/export.routes.js';
import { ADMIN_REPORTS, RESTAURANT_REPORTS, myOrdersReport, shippersReport } from './analytics.service.js';
import { M } from '../../shared/http/messages.js';

/* /api/analytics/{admin|restaurant|shipper|customer}/...: số liệu thống kê + xuất file.
   Thêm ?format=xlsx|pdf|csv để tải đúng bảng dữ liệu của báo cáo đang xem; không có format thì trả JSON cho biểu đồ. */
export const analyticsRoutes = Router();
analyticsRoutes.use(requireAuth);

async function respond(req, res, name, payload) {
  const format = req.query.format;
  if (['csv', 'xlsx', 'pdf'].includes(format)) {
    req.auditAction = 'ANALYTICS_EXPORT';
    req.auditEntityType = 'EXPORT';
    req.auditEntityId = name;
    await sendDataset(req, res, name, payload.dataset);
    return;
  }
  res.json(payload);
}

analyticsRoutes.get('/admin/:report', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const builder = ADMIN_REPORTS[req.params.report];
  if (!builder) throw new HttpError(404, `Báo cáo không tồn tại. Có: ${Object.keys(ADMIN_REPORTS).join(', ')}`);
  await respond(req, res, `admin-${req.params.report}`, await builder({}, req.query, { isAdmin: true }));
}));

analyticsRoutes.get('/restaurant/:restaurantId/:report', requireRole('RESTAURANT', 'ADMIN'), asyncHandler(async (req, res) => {
  const restaurantId = Number(req.params.restaurantId);
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) throw new HttpError(400, M.restaurantIdInvalid);
  const [owned] = await query('SELECT owner_user_id FROM restaurants WHERE id = ? AND deleted_at IS NULL LIMIT 1', [restaurantId]);
  if (!owned) throw new HttpError(404, M.restaurantNotFound);
  if (req.user.role !== 'ADMIN' && Number(owned.owner_user_id) !== Number(req.user.id)) throw new HttpError(403, M.permissionDenied);
  const builder = RESTAURANT_REPORTS[req.params.report];
  if (!builder) throw new HttpError(404, `Báo cáo không tồn tại. Có: ${Object.keys(RESTAURANT_REPORTS).join(', ')}`);
  await respond(req, res, `restaurant-${restaurantId}-${req.params.report}`, await builder({ restaurantId }, req.query, { isAdmin: false }));
}));

analyticsRoutes.get('/shipper/performance', requireRole('SHIPPER'), asyncHandler(async (req, res) => {
  const [profile] = await query('SELECT id FROM shipper_profiles WHERE user_id = ? AND deleted_at IS NULL LIMIT 1', [req.user.id]);
  if (!profile) throw new HttpError(404, M.shipperProfileNotFound);
  await respond(req, res, 'shipper-performance', await shippersReport({ shipperId: Number(profile.id) }, req.query));
}));

analyticsRoutes.get('/customer/spending', requireRole('CUSTOMER'), asyncHandler(async (req, res) => {
  const [profile] = await query('SELECT id FROM customer_profiles WHERE user_id = ? LIMIT 1', [req.user.id]);
  if (!profile) throw new HttpError(404, M.customerNotFound);
  await respond(req, res, 'customer-spending', await myOrdersReport({ customerId: Number(profile.id) }, req.query));
}));
