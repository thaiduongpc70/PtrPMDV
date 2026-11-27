import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDataQualityReport } from '../src/modules/dashboard/admin-dashboard.routes.js';
import { clearRateLimitBuckets, rateLimit } from '../src/shared/middlewares/rate-limit.middleware.js';

test('báo cáo chất lượng dữ liệu: gom đủ các chỉ số và truyền ngưỡng vào SQL', async () => {
  const calls = [];
  const exec = async (sql, params = []) => { calls.push({ sql, params }); return [{ n: 7 }]; };
  const report = await buildDataQualityReport(exec, { staleKitchenMinutes: 100, staleDeliveryMinutes: 200, pendingTimeoutMinutes: 15, refundAutoApproveMinutes: 60 });
  assert.equal(report.checks.ordersOutsideOpeningHours, 7);
  assert.equal(report.checks.staleOrders.kitchen, 7);
  assert.equal(report.checks.staleOrders.pending, 7);
  const pendingCall = calls.find(call => /order_status = 'PENDING'/.test(call.sql));
  assert.doesNotMatch(pendingCall.sql, /payment_status/, 'đơn PENDING đã trả tiền cũng phải được đếm');
  assert.deepEqual(Object.keys(report.checks).sort(), ['activePromotionsPastEndDate', 'cancelledOrFailedStillPaid', 'closedOrdersPaymentStatusPending', 'duplicateCompletedRefunds', 'menuItemRatingMismatch', 'menuItemsWithoutImage', 'openPaymentsOnClosedOrders', 'ordersOutsideOpeningHours', 'paymentsOutOfSyncWithRefunds', 'refundsExceedPaid', 'refundsOverdue', 'restaurantRatingMismatch', 'staleOrders']);
  assert.ok([100, 200, 15, 60].every(value => calls.some(call => call.params[0] === value)));
  assert.ok(calls.every(call => !/LIMIT\s+\d/i.test(call.sql)), 'đếm toàn bộ, không giới hạn mẫu');
});

test('rate limit: ADMIN có trần cao hơn, khách giữ trần thấp', () => {
  clearRateLimitBuckets();
  const mw = rateLimit({ windowMs: 60_000, max: req => (req.user?.role === 'ADMIN' ? 5 : 2) });
  const hit = req => { let error; mw(req, { setHeader() {} }, e => { error = e; }); return error; };
  const guest = { ip: '1.1.1.1', path: '/x', user: null };
  const admin = { ip: '2.2.2.2', path: '/x', user: { role: 'ADMIN' } };
  assert.equal(hit(guest), undefined); assert.equal(hit(guest), undefined);
  assert.equal(hit(guest)?.statusCode, 429);
  for (let i = 0; i < 5; i += 1) assert.equal(hit(admin), undefined);
  assert.equal(hit(admin)?.statusCode, 429);
});
