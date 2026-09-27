import { Router } from 'express';
import { query, withTransaction } from '../../shared/database/mysql.js';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { HttpError } from '../../shared/http/http-error.js';
import { requireAuth, requireRole } from '../../shared/middlewares/require-auth.middleware.js';
import { requirePermission } from '../../shared/middlewares/require-permission.middleware.js';

export const accountRoutes = Router();
export const shipperRoutes = Router();
export const deliveryRoutes = Router();
export const paymentRoutes = Router();
export const communicationRoutes = Router();
export const settlementRoutes = Router();

accountRoutes.use(requireAuth);
accountRoutes.get('/session', asyncHandler(async (req, res) => {
  const permissions = await query(
    `SELECT p.code
     FROM users u
     INNER JOIN role_permissions rp ON rp.role_id = u.role_id
     INNER JOIN permissions p ON p.id = rp.permission_id
     WHERE u.id = ? AND u.deleted_at IS NULL
     ORDER BY p.code`,
    [req.user.id]
  );
  res.json({ user: req.user, permissions: permissions.map(row => row.code) });
}));

accountRoutes.get('/admin/users', requireRole('ADMIN'), requirePermission('user.view'), asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT u.id, u.username, u.email, u.phone, u.status, u.created_at, r.name AS role
     FROM users u INNER JOIN roles r ON r.id = u.role_id
     WHERE u.deleted_at IS NULL
     ORDER BY u.created_at DESC, u.id DESC
     LIMIT 200`
  );
  res.json({ items: rows.map(mapUser), totalItems: rows.length });
}));

accountRoutes.patch('/admin/users/:userId/status', requireRole('ADMIN'), requirePermission('user.manage'), asyncHandler(async (req, res) => {
  const userId = readId(req.params.userId, 'userId');
  const status = readEnum(req.body?.status, ['ACTIVE', 'INACTIVE', 'LOCKED', 'PENDING'], 'status');
  await query('UPDATE users SET status = ? WHERE id = ? AND deleted_at IS NULL', [status, userId]);
  const rows = await query(
    `SELECT u.id, u.username, u.email, u.phone, u.status, u.created_at, r.name AS role
     FROM users u INNER JOIN roles r ON r.id = u.role_id WHERE u.id = ?`,
    [userId]
  );
  if (!rows[0]) throw new HttpError(404, 'User not found');
  audit(req, 'USER_STATUS_UPDATE', 'USER', userId, { status });
  res.json(mapUser(rows[0]));
}));

shipperRoutes.use(requireAuth, requireRole('SHIPPER'));
shipperRoutes.get('/profile', requirePermission('delivery.view'), asyncHandler(async (req, res) => {
  res.json(await requireShipper(req.user.id));
}));

shipperRoutes.patch('/profile', requirePermission('delivery.update'), asyncHandler(async (req, res) => {
  const current = await requireShipper(req.user.id);
  const input = {
    fullName: text(req.body?.fullName, 150, current.fullName),
    identityNumber: nullableText(req.body?.identityNumber, 50, current.identityNumber),
    vehicleType: readEnum(req.body?.vehicleType ?? current.vehicleType, ['MOTORBIKE', 'BICYCLE', 'CAR'], 'vehicleType'),
    vehiclePlate: nullableText(req.body?.vehiclePlate, 30, current.vehiclePlate),
    drivingLicense: nullableText(req.body?.drivingLicense, 100, current.drivingLicense)
  };
  await query(
    `UPDATE shipper_profiles
     SET full_name = ?, identity_number = ?, vehicle_type = ?, vehicle_plate = ?, driving_license = ?
     WHERE id = ?`,
    [input.fullName, input.identityNumber, input.vehicleType, input.vehiclePlate, input.drivingLicense, current.id]
  );
  audit(req, 'SHIPPER_PROFILE_UPDATE', 'SHIPPER', current.id, input);
  res.json(await requireShipper(req.user.id));
}));

shipperRoutes.patch('/availability', requirePermission('delivery.update'), asyncHandler(async (req, res) => {
  const shipper = await requireShipper(req.user.id);
  const status = readEnum(req.body?.availabilityStatus, ['OFFLINE', 'AVAILABLE', 'BUSY', 'SUSPENDED'], 'availabilityStatus');
  await query('UPDATE shipper_profiles SET availability_status = ? WHERE id = ?', [status, shipper.id]);
  audit(req, 'SHIPPER_AVAILABILITY_UPDATE', 'SHIPPER', shipper.id, { availabilityStatus: status });
  res.json(await requireShipper(req.user.id));
}));

shipperRoutes.get('/documents', requirePermission('delivery.view'), asyncHandler(async (req, res) => {
  const shipper = await requireShipper(req.user.id);
  const rows = await query(
    `SELECT id, shipper_id, document_type, document_number, image_url, verified, verified_by, verified_at, created_at
     FROM shipper_documents WHERE shipper_id = ? ORDER BY created_at DESC, id DESC`,
    [shipper.id]
  );
  res.json({ items: rows.map(mapDocument), totalItems: rows.length });
}));

shipperRoutes.post('/documents', requirePermission('delivery.update'), asyncHandler(async (req, res) => {
  const shipper = await requireShipper(req.user.id);
  const documentType = readEnum(req.body?.documentType, ['IDENTITY_CARD', 'DRIVING_LICENSE', 'VEHICLE_REGISTRATION', 'OTHER'], 'documentType');
  const result = await query(
    `INSERT INTO shipper_documents (shipper_id, document_type, document_number, image_url)
     VALUES (?, ?, ?, ?)`,
    [shipper.id, documentType, nullableText(req.body?.documentNumber, 100), nullableText(req.body?.imageUrl, 500)]
  );
  audit(req, 'SHIPPER_DOCUMENT_CREATE', 'SHIPPER_DOCUMENT', result.insertId, { documentType });
  res.status(201).json({ id: Number(result.insertId), shipperId: shipper.id, documentType });
}));

shipperRoutes.get('/assignments', requirePermission('delivery.view'), asyncHandler(async (req, res) => {
  const shipper = await requireShipper(req.user.id);
  const rows = await query(
    `SELECT da.*, o.order_code, o.total_amount, r.name AS restaurant_name, o.delivery_address
     FROM delivery_assignments da
     INNER JOIN orders o ON o.id = da.order_id
     INNER JOIN restaurants r ON r.id = o.restaurant_id
     WHERE da.shipper_id = ?
     ORDER BY da.offered_at DESC, da.id DESC
     LIMIT 100`,
    [shipper.id]
  );
  res.json({ items: rows.map(mapAssignment), totalItems: rows.length });
}));

shipperRoutes.post('/assignments/:assignmentId/accept', requirePermission('delivery.update'), asyncHandler(async (req, res) => {
  const result = await acceptAssignment(req.user.id, readId(req.params.assignmentId, 'assignmentId'));
  audit(req, 'DELIVERY_ASSIGNMENT_ACCEPT', 'DELIVERY_ASSIGNMENT', result.assignmentId, result);
  res.json(result);
}));

shipperRoutes.post('/assignments/:assignmentId/reject', requirePermission('delivery.update'), asyncHandler(async (req, res) => {
  const shipper = await requireShipper(req.user.id);
  const assignmentId = readId(req.params.assignmentId, 'assignmentId');
  await query(
    `UPDATE delivery_assignments
     SET assignment_status = 'REJECTED', rejected_at = CURRENT_TIMESTAMP, reject_reason = ?
     WHERE id = ? AND shipper_id = ? AND assignment_status = 'OFFERED'`,
    [nullableText(req.body?.reason, 500), assignmentId, shipper.id]
  );
  audit(req, 'DELIVERY_ASSIGNMENT_REJECT', 'DELIVERY_ASSIGNMENT', assignmentId, req.body);
  res.json({ id: assignmentId, status: 'REJECTED' });
}));

shipperRoutes.get('/deliveries', requirePermission('delivery.view'), asyncHandler(async (req, res) => {
  const shipper = await requireShipper(req.user.id);
  const rows = await listDeliveries({ shipperId: shipper.id });
  res.json({ items: rows.map(mapDelivery), totalItems: rows.length });
}));

shipperRoutes.post('/locations', requirePermission('delivery.update'), asyncHandler(async (req, res) => {
  const shipper = await requireShipper(req.user.id);
  const deliveryId = req.body?.deliveryId ? readId(req.body.deliveryId, 'deliveryId') : null;
  const latitude = readDecimal(req.body?.latitude, 'latitude');
  const longitude = readDecimal(req.body?.longitude, 'longitude');
  const result = await query(
    `INSERT INTO shipper_locations (shipper_id, delivery_id, latitude, longitude, speed, heading, accuracy)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      shipper.id,
      deliveryId,
      latitude,
      longitude,
      readOptionalDecimal(req.body?.speed, 0),
      readOptionalDecimal(req.body?.heading, 0),
      readOptionalDecimal(req.body?.accuracy, null)
    ]
  );
  await query(
    `UPDATE shipper_profiles
     SET current_latitude = ?, current_longitude = ?, last_location_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [latitude, longitude, shipper.id]
  );
  if (deliveryId) {
    await query(
      `INSERT INTO delivery_status_history (delivery_id, status, latitude, longitude, note)
       SELECT id, delivery_status, ?, ?, 'GPS update' FROM deliveries WHERE id = ? AND shipper_id = ?`,
      [latitude, longitude, deliveryId, shipper.id]
    );
  }
  res.status(201).json({ id: Number(result.insertId), shipperId: shipper.id, deliveryId, latitude, longitude });
}));

shipperRoutes.post('/deliveries/:deliveryId/status', requirePermission('delivery.update'), asyncHandler(async (req, res) => {
  const shipper = await requireShipper(req.user.id);
  const delivery = await updateDeliveryStatus({
    userId: req.user.id,
    deliveryId: readId(req.params.deliveryId, 'deliveryId'),
    shipperId: shipper.id,
    status: readEnum(req.body?.status, ['PICKED_UP', 'DELIVERING', 'DELIVERED', 'FAILED'], 'status'),
    latitude: req.body?.latitude === undefined ? null : readDecimal(req.body.latitude, 'latitude'),
    longitude: req.body?.longitude === undefined ? null : readDecimal(req.body.longitude, 'longitude'),
    proofImageUrl: nullableText(req.body?.proofImageUrl, 500),
    receiverSignatureUrl: nullableText(req.body?.receiverSignatureUrl, 500),
    note: nullableText(req.body?.note, 500)
  });
  audit(req, 'DELIVERY_STATUS_UPDATE', 'DELIVERY', delivery.id, delivery);
  res.json(delivery);
}));

shipperRoutes.get('/earnings', requirePermission('payment.view'), asyncHandler(async (req, res) => {
  const shipper = await requireShipper(req.user.id);
  const rows = await query(
    `SELECT se.*, d.order_id
     FROM shipper_earnings se INNER JOIN deliveries d ON d.id = se.delivery_id
     WHERE se.shipper_id = ?
     ORDER BY se.created_at DESC, se.id DESC
     LIMIT 200`,
    [shipper.id]
  );
  const withdrawals = await query(
    `SELECT * FROM shipper_withdrawals WHERE shipper_id = ? ORDER BY requested_at DESC, id DESC LIMIT 100`,
    [shipper.id]
  );
  const total = rows.reduce((sum, row) => sum + Number(row.net_earning), 0);
  res.json({ totalEarnings: total, items: rows.map(mapEarning), withdrawals: withdrawals.map(mapWithdrawal) });
}));

shipperRoutes.post('/withdrawals', requirePermission('payment.view'), asyncHandler(async (req, res) => {
  const shipper = await requireShipper(req.user.id);
  const amount = readPositiveMoney(req.body?.amount, 'amount');
  const result = await query(
    `INSERT INTO shipper_withdrawals (shipper_id, amount, bank_name, bank_account, account_holder)
     VALUES (?, ?, ?, ?, ?)`,
    [
      shipper.id,
      amount,
      nullableText(req.body?.bankName, 150),
      nullableText(req.body?.bankAccount, 100),
      nullableText(req.body?.accountHolder, 150)
    ]
  );
  audit(req, 'SHIPPER_WITHDRAWAL_CREATE', 'SHIPPER_WITHDRAWAL', result.insertId, req.body);
  res.status(201).json({ id: Number(result.insertId), shipperId: shipper.id, amount, status: 'PENDING' });
}));

deliveryRoutes.use(requireAuth);
deliveryRoutes.get('/order/:orderId', requirePermission('delivery.view'), asyncHandler(async (req, res) => {
  const orderId = readId(req.params.orderId, 'orderId');
  await assertOrderAccess(req.user, orderId);
  const rows = await listDeliveries({ orderId });
  res.json(rows[0] ? mapDelivery(rows[0]) : null);
}));

deliveryRoutes.post('/assign', requirePermission('delivery.assign'), asyncHandler(async (req, res) => {
  const orderId = readId(req.body?.orderId, 'orderId');
  const shipperId = readId(req.body?.shipperId, 'shipperId');
  await assertRestaurantOrAdminOrderAccess(req.user, orderId);
  const result = await createAssignment({
    orderId,
    shipperId,
    assignedBy: req.user.id,
    distanceKm: readOptionalDecimal(req.body?.distanceKm, 0),
    deliveryFee: readOptionalDecimal(req.body?.deliveryFee, null)
  });
  audit(req, 'DELIVERY_ASSIGN', 'DELIVERY_ASSIGNMENT', result.assignmentId, result);
  res.status(201).json(result);
}));

deliveryRoutes.get('/:deliveryId/locations', requirePermission('delivery.location.view'), asyncHandler(async (req, res) => {
  const deliveryId = readId(req.params.deliveryId, 'deliveryId');
  const deliveryRows = await listDeliveries({ deliveryId });
  if (!deliveryRows[0]) throw new HttpError(404, 'Delivery not found');
  await assertOrderAccess(req.user, Number(deliveryRows[0].order_id));
  const rows = await query(
    `SELECT * FROM shipper_locations WHERE delivery_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 200`,
    [deliveryId]
  );
  res.json({ items: rows.map(mapLocation), totalItems: rows.length });
}));

paymentRoutes.use(requireAuth);
paymentRoutes.get('/orders/:orderId', requirePermission('payment.view'), asyncHandler(async (req, res) => {
  const orderId = readId(req.params.orderId, 'orderId');
  await assertOrderAccess(req.user, orderId);
  const rows = await query('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC, id DESC', [orderId]);
  res.json({ items: rows.map(mapPayment), totalItems: rows.length });
}));

paymentRoutes.post('/:paymentId/callback', requirePermission('payment.manage'), asyncHandler(async (req, res) => {
  const paymentId = readId(req.params.paymentId, 'paymentId');
  const status = readEnum(req.body?.status, ['PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'PROCESSING'], 'status');
  const result = await processPaymentCallback(paymentId, status, req.body);
  audit(req, 'PAYMENT_CALLBACK', 'PAYMENT', paymentId, result);
  res.json(result);
}));

paymentRoutes.get('/cod', requirePermission('payment.view'), asyncHandler(async (req, res) => {
  const where = [];
  const params = [];
  if (req.user.role === 'SHIPPER') {
    const shipper = await requireShipper(req.user.id);
    where.push('ct.shipper_id = ?');
    params.push(shipper.id);
  }
  const rows = await query(
    `SELECT ct.*, o.order_code
     FROM cod_transactions ct INNER JOIN orders o ON o.id = ct.order_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY ct.created_at DESC, ct.id DESC
     LIMIT 200`,
    params
  );
  res.json({ items: rows.map(mapCod), totalItems: rows.length });
}));

paymentRoutes.post('/cod/:codId/collect', requirePermission('delivery.update'), asyncHandler(async (req, res) => {
  const codId = readId(req.params.codId, 'codId');
  await query(`UPDATE cod_transactions SET status = 'COLLECTED', collected_at = CURRENT_TIMESTAMP WHERE id = ?`, [codId]);
  audit(req, 'COD_COLLECT', 'COD_TRANSACTION', codId);
  res.json({ id: codId, status: 'COLLECTED' });
}));

paymentRoutes.post('/cod/:codId/settle', requirePermission('payment.manage'), asyncHandler(async (req, res) => {
  const codId = readId(req.params.codId, 'codId');
  await query(`UPDATE cod_transactions SET status = 'SETTLED', settled_at = CURRENT_TIMESTAMP WHERE id = ?`, [codId]);
  audit(req, 'COD_SETTLE', 'COD_TRANSACTION', codId);
  res.json({ id: codId, status: 'SETTLED' });
}));

paymentRoutes.post('/orders/:orderId/invoice', requirePermission('payment.view'), asyncHandler(async (req, res) => {
  const orderId = readId(req.params.orderId, 'orderId');
  await assertOrderAccess(req.user, orderId);
  const invoice = await ensureInvoice(orderId);
  audit(req, 'INVOICE_CREATE', 'INVOICE', invoice.id);
  res.status(201).json(invoice);
}));

paymentRoutes.get('/invoices/:orderCode', requirePermission('payment.view'), asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT i.*
     FROM invoices i INNER JOIN orders o ON o.id = i.order_id
     WHERE o.order_code = ? OR i.invoice_number = ?
     LIMIT 1`,
    [req.params.orderCode, req.params.orderCode]
  );
  if (!rows[0]) throw new HttpError(404, 'Invoice not found');
  await assertOrderAccess(req.user, Number(rows[0].order_id));
  res.json(mapInvoice(rows[0]));
}));

paymentRoutes.get('/wallet', asyncHandler(async (req, res) => {
  const wallet = await ensureWallet(req.user.id);
  const rows = await query(
    `SELECT * FROM wallet_transactions WHERE wallet_id = ? ORDER BY created_at DESC, id DESC LIMIT 100`,
    [wallet.id]
  );
  res.json({ wallet, transactions: rows.map(mapWalletTransaction) });
}));

paymentRoutes.post('/wallet/deposit', asyncHandler(async (req, res) => {
  const amount = readPositiveMoney(req.body?.amount, 'amount');
  const wallet = await adjustWallet(req.user.id, 'DEPOSIT', amount, 'MANUAL', null, 'Nạp ví từ web');
  audit(req, 'WALLET_DEPOSIT', 'WALLET', wallet.id, { amount });
  res.status(201).json(wallet);
}));

paymentRoutes.post('/orders/:orderId/refund', requirePermission('payment.manage'), asyncHandler(async (req, res) => {
  const orderId = readId(req.params.orderId, 'orderId');
  const paymentRows = await query('SELECT id, amount FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1', [orderId]);
  const amount = req.body?.amount === undefined
    ? Number(paymentRows[0]?.amount ?? 0)
    : readPositiveMoney(req.body.amount, 'amount');
  const result = await query(
    `INSERT INTO refunds (order_id, payment_id, amount, reason, status, processed_by)
     VALUES (?, ?, ?, ?, 'PENDING', ?)`,
    [orderId, paymentRows[0]?.id ?? null, amount, nullableText(req.body?.reason, 1000), req.user.id]
  );
  audit(req, 'REFUND_CREATE', 'REFUND', result.insertId, { orderId, amount });
  res.status(201).json({ id: Number(result.insertId), orderId, amount, status: 'PENDING' });
}));

paymentRoutes.post('/orders/:orderId/cancel', requirePermission('order.cancel'), asyncHandler(async (req, res) => {
  const orderId = readId(req.params.orderId, 'orderId');
  const result = await cancelOrder(req.user, orderId, req.body);
  audit(req, 'ORDER_CANCEL', 'ORDER', orderId, result);
  res.json(result);
}));

communicationRoutes.use(requireAuth);
communicationRoutes.post('/orders/:orderId/restaurant-review', requireRole('CUSTOMER'), requirePermission('review.create'), asyncHandler(async (req, res) => {
  const order = await requireCustomerDeliveredOrder(req.user.id, readId(req.params.orderId, 'orderId'));
  const result = await query(
    `INSERT INTO restaurant_reviews (order_id, customer_id, restaurant_id, rating, comment)
     VALUES (?, ?, ?, ?, ?)`,
    [order.id, order.customer_id, order.restaurant_id, readRating(req.body?.rating), nullableText(req.body?.comment, 2000)]
  );
  audit(req, 'RESTAURANT_REVIEW_CREATE', 'RESTAURANT_REVIEW', result.insertId);
  res.status(201).json({ id: Number(result.insertId), orderId: order.id });
}));

communicationRoutes.post('/orders/:orderId/shipper-review', requireRole('CUSTOMER'), requirePermission('review.create'), asyncHandler(async (req, res) => {
  const order = await requireCustomerDeliveredOrder(req.user.id, readId(req.params.orderId, 'orderId'));
  if (!order.shipper_id) throw new HttpError(400, 'Order has no shipper');
  const result = await query(
    `INSERT INTO shipper_reviews (order_id, customer_id, shipper_id, rating, comment)
     VALUES (?, ?, ?, ?, ?)`,
    [order.id, order.customer_id, order.shipper_id, readRating(req.body?.rating), nullableText(req.body?.comment, 2000)]
  );
  audit(req, 'SHIPPER_REVIEW_CREATE', 'SHIPPER_REVIEW', result.insertId);
  res.status(201).json({ id: Number(result.insertId), orderId: order.id });
}));

communicationRoutes.get('/chat/sessions', asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT cs.*, o.order_code, r.name AS restaurant_name
     FROM chat_sessions cs
     LEFT JOIN orders o ON o.id = cs.order_id
     LEFT JOIN restaurants r ON r.id = cs.restaurant_id
     WHERE ${chatAccessWhere(req.user)}
     ORDER BY cs.created_at DESC, cs.id DESC
     LIMIT 100`,
    await chatAccessParams(req.user)
  );
  res.json({ items: rows.map(mapChatSession), totalItems: rows.length });
}));

communicationRoutes.post('/chat/sessions', asyncHandler(async (req, res) => {
  const orderId = readId(req.body?.orderId, 'orderId');
  const order = await assertOrderAccess(req.user, orderId);
  const existing = await query('SELECT * FROM chat_sessions WHERE order_id = ? LIMIT 1', [orderId]);
  if (existing[0]) {
    res.json(mapChatSession(existing[0]));
    return;
  }
  const result = await query(
    `INSERT INTO chat_sessions (order_id, customer_id, shipper_id, restaurant_id)
     VALUES (?, ?, ?, ?)`,
    [order.id, order.customer_id, order.shipper_id, order.restaurant_id]
  );
  audit(req, 'CHAT_SESSION_CREATE', 'CHAT_SESSION', result.insertId);
  res.status(201).json({ id: Number(result.insertId), orderId });
}));

communicationRoutes.get('/chat/sessions/:sessionId/messages', asyncHandler(async (req, res) => {
  const sessionId = readId(req.params.sessionId, 'sessionId');
  await assertChatAccess(req.user, sessionId);
  const rows = await query(
    `SELECT cm.*, u.username
     FROM chat_messages cm INNER JOIN users u ON u.id = cm.sender_id
     WHERE cm.session_id = ?
     ORDER BY cm.created_at ASC, cm.id ASC`,
    [sessionId]
  );
  res.json({ items: rows.map(mapChatMessage), totalItems: rows.length });
}));

communicationRoutes.post('/chat/sessions/:sessionId/messages', asyncHandler(async (req, res) => {
  const sessionId = readId(req.params.sessionId, 'sessionId');
  await assertChatAccess(req.user, sessionId);
  const result = await query(
    `INSERT INTO chat_messages (session_id, sender_id, message, message_type, attachment_url)
     VALUES (?, ?, ?, ?, ?)`,
    [
      sessionId,
      req.user.id,
      text(req.body?.message, 5000),
      readEnum(req.body?.messageType ?? 'TEXT', ['TEXT', 'IMAGE', 'LOCATION', 'SYSTEM'], 'messageType'),
      nullableText(req.body?.attachmentUrl, 500)
    ]
  );
  audit(req, 'CHAT_MESSAGE_CREATE', 'CHAT_MESSAGE', result.insertId);
  res.status(201).json({ id: Number(result.insertId), sessionId });
}));

communicationRoutes.get('/support/tickets', asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT st.*, u.username
     FROM support_tickets st INNER JOIN users u ON u.id = st.user_id
     WHERE ${req.user.role === 'ADMIN' ? '1=1' : 'st.user_id = ?'}
     ORDER BY st.created_at DESC, st.id DESC
     LIMIT 200`,
    req.user.role === 'ADMIN' ? [] : [req.user.id]
  );
  res.json({ items: rows.map(mapSupportTicket), totalItems: rows.length });
}));

communicationRoutes.post('/support/tickets', requirePermission('support.create'), asyncHandler(async (req, res) => {
  const code = `SP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const result = await query(
    `INSERT INTO support_tickets (ticket_code, user_id, order_id, subject, description, category, priority)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      code,
      req.user.id,
      req.body?.orderId ? readId(req.body.orderId, 'orderId') : null,
      text(req.body?.subject, 255),
      text(req.body?.description, 5000),
      readEnum(req.body?.category ?? 'OTHER', ['ORDER', 'PAYMENT', 'DELIVERY', 'RESTAURANT', 'SHIPPER', 'ACCOUNT', 'OTHER'], 'category'),
      readEnum(req.body?.priority ?? 'MEDIUM', ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], 'priority')
    ]
  );
  audit(req, 'SUPPORT_TICKET_CREATE', 'SUPPORT_TICKET', result.insertId);
  res.status(201).json({ id: Number(result.insertId), ticketCode: code, status: 'OPEN' });
}));

communicationRoutes.patch('/support/tickets/:ticketId', requireRole('ADMIN'), requirePermission('support.manage'), asyncHandler(async (req, res) => {
  const ticketId = readId(req.params.ticketId, 'ticketId');
  const status = readEnum(req.body?.status, ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], 'status');
  await query(
    `UPDATE support_tickets
     SET status = ?, assigned_admin_id = COALESCE(assigned_admin_id, ?), resolved_at = IF(? IN ('RESOLVED','CLOSED'), CURRENT_TIMESTAMP, resolved_at)
     WHERE id = ?`,
    [status, req.user.id, status, ticketId]
  );
  audit(req, 'SUPPORT_TICKET_UPDATE', 'SUPPORT_TICKET', ticketId, { status });
  res.json({ id: ticketId, status });
}));

communicationRoutes.get('/support/tickets/:ticketId/messages', asyncHandler(async (req, res) => {
  const ticket = await requireTicketAccess(req.user, readId(req.params.ticketId, 'ticketId'));
  const rows = await query(
    `SELECT sm.*, u.username
     FROM support_messages sm INNER JOIN users u ON u.id = sm.sender_id
     WHERE sm.ticket_id = ?
     ORDER BY sm.created_at ASC, sm.id ASC`,
    [ticket.id]
  );
  res.json({ items: rows.map(mapSupportMessage), totalItems: rows.length });
}));

communicationRoutes.post('/support/tickets/:ticketId/messages', asyncHandler(async (req, res) => {
  const ticket = await requireTicketAccess(req.user, readId(req.params.ticketId, 'ticketId'));
  const result = await query(
    `INSERT INTO support_messages (ticket_id, sender_id, message, attachment_url)
     VALUES (?, ?, ?, ?)`,
    [ticket.id, req.user.id, text(req.body?.message, 5000), nullableText(req.body?.attachmentUrl, 500)]
  );
  audit(req, 'SUPPORT_MESSAGE_CREATE', 'SUPPORT_MESSAGE', result.insertId);
  res.status(201).json({ id: Number(result.insertId), ticketId: ticket.id });
}));

settlementRoutes.use(requireAuth);
settlementRoutes.get('/restaurant/settlements', requireRole('RESTAURANT'), requirePermission('report.view'), asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT rs.*, r.name AS restaurant_name
     FROM restaurant_settlements rs INNER JOIN restaurants r ON r.id = rs.restaurant_id
     WHERE r.owner_user_id = ?
     ORDER BY rs.created_at DESC, rs.id DESC
     LIMIT 100`,
    [req.user.id]
  );
  res.json({ items: rows.map(mapSettlement), totalItems: rows.length });
}));

settlementRoutes.get('/restaurant/commissions', requireRole('RESTAURANT'), requirePermission('report.view'), asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT rc.*, o.order_code, r.name AS restaurant_name
     FROM restaurant_commissions rc
     INNER JOIN orders o ON o.id = rc.order_id
     INNER JOIN restaurants r ON r.id = rc.restaurant_id
     WHERE r.owner_user_id = ?
     ORDER BY rc.created_at DESC, rc.id DESC
     LIMIT 200`,
    [req.user.id]
  );
  res.json({ items: rows.map(mapCommission), totalItems: rows.length });
}));

settlementRoutes.post('/admin/settlements/generate', requireRole('ADMIN'), requirePermission('payment.manage'), asyncHandler(async (req, res) => {
  const periodStart = text(req.body?.periodStart, 10);
  const periodEnd = text(req.body?.periodEnd, 10);
  const restaurantId = req.body?.restaurantId ? readId(req.body.restaurantId, 'restaurantId') : null;
  const items = await generateSettlements(periodStart, periodEnd, restaurantId);
  audit(req, 'RESTAURANT_SETTLEMENT_GENERATE', 'RESTAURANT_SETTLEMENT', null, { periodStart, periodEnd, restaurantId });
  res.status(201).json({ items, totalItems: items.length });
}));

async function requireShipper(userId) {
  const rows = await query(
    `SELECT id, user_id, full_name, identity_number, vehicle_type, vehicle_plate, driving_license,
            rating, total_reviews, total_deliveries, total_earnings, availability_status,
            current_latitude, current_longitude, last_location_at, created_at, updated_at
     FROM shipper_profiles
     WHERE user_id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [userId]
  );
  if (!rows[0]) throw new HttpError(404, 'Shipper profile not found');
  return mapShipper(rows[0]);
}

async function assertOrderAccess(user, orderId) {
  const rows = await query(
    `SELECT o.*, r.owner_user_id, cp.user_id AS customer_user_id, sp.user_id AS shipper_user_id
     FROM orders o
     INNER JOIN restaurants r ON r.id = o.restaurant_id
     INNER JOIN customer_profiles cp ON cp.id = o.customer_id
     LEFT JOIN shipper_profiles sp ON sp.id = o.shipper_id
     WHERE o.id = ? AND o.deleted_at IS NULL
     LIMIT 1`,
    [orderId]
  );
  const order = rows[0];
  if (!order) throw new HttpError(404, 'Order not found');
  const allowed = user.role === 'ADMIN'
    || Number(order.customer_user_id) === Number(user.id)
    || Number(order.owner_user_id) === Number(user.id)
    || Number(order.shipper_user_id ?? 0) === Number(user.id);
  if (!allowed) throw new HttpError(403, 'Permission denied');
  return order;
}

async function assertRestaurantOrAdminOrderAccess(user, orderId) {
  const order = await assertOrderAccess(user, orderId);
  if (user.role !== 'ADMIN' && Number(order.owner_user_id) !== Number(user.id)) {
    throw new HttpError(403, 'Permission denied');
  }
  return order;
}

async function createAssignment(input) {
  return withTransaction(async connection => {
    const orderRows = await connection.execute(
      `SELECT o.*, r.address AS pickup_address, r.latitude AS pickup_latitude, r.longitude AS pickup_longitude
       FROM orders o INNER JOIN restaurants r ON r.id = o.restaurant_id
       WHERE o.id = ? AND o.deleted_at IS NULL
       LIMIT 1 FOR UPDATE`,
      [input.orderId]
    );
    if (!orderRows[0]) throw new HttpError(404, 'Order not found');
    const shipperRows = await connection.execute(
      `SELECT id FROM shipper_profiles
       WHERE id = ? AND availability_status IN ('AVAILABLE','BUSY') AND deleted_at IS NULL
       LIMIT 1`,
      [input.shipperId]
    );
    if (!shipperRows[0]) throw new HttpError(400, 'Shipper is not available');
    await connection.execute(
      `INSERT INTO deliveries (order_id, shipper_id, pickup_address, delivery_address, pickup_latitude,
        pickup_longitude, delivery_latitude, delivery_longitude, distance_km, delivery_fee, delivery_status, assigned_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ASSIGNED', CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE shipper_id = VALUES(shipper_id), delivery_status = 'ASSIGNED', assigned_at = CURRENT_TIMESTAMP`,
      [
        input.orderId,
        input.shipperId,
        orderRows[0].pickup_address,
        orderRows[0].delivery_address,
        orderRows[0].pickup_latitude,
        orderRows[0].pickup_longitude,
        orderRows[0].delivery_latitude,
        orderRows[0].delivery_longitude,
        input.distanceKm,
        input.deliveryFee ?? Number(orderRows[0].delivery_fee ?? 0)
      ]
    );
    const deliveryRows = await connection.execute('SELECT id FROM deliveries WHERE order_id = ? LIMIT 1', [input.orderId]);
    const assignmentResult = await connection.execute(
      `INSERT INTO delivery_assignments (order_id, shipper_id, assigned_by)
       VALUES (?, ?, ?)`,
      [input.orderId, input.shipperId, input.assignedBy]
    );
    await connection.execute(
      `UPDATE orders SET shipper_id = ?, order_status = 'SHIPPER_ASSIGNED' WHERE id = ?`,
      [input.shipperId, input.orderId]
    );
    await connection.execute(
      `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, note)
       VALUES (?, ?, 'SHIPPER_ASSIGNED', ?, 'Shipper assigned')`,
      [input.orderId, orderRows[0].order_status, input.assignedBy]
    );
    await connection.execute(
      `INSERT INTO delivery_status_history (delivery_id, status, note)
       VALUES (?, 'ASSIGNED', 'Delivery assigned')`,
      [deliveryRows[0].id]
    );
    return { assignmentId: Number(assignmentResult.insertId), deliveryId: Number(deliveryRows[0].id), orderId: input.orderId, shipperId: input.shipperId };
  });
}

async function acceptAssignment(userId, assignmentId) {
  const shipper = await requireShipper(userId);
  return withTransaction(async connection => {
    const rows = await connection.execute(
      `SELECT da.*, d.id AS delivery_id
       FROM delivery_assignments da INNER JOIN deliveries d ON d.order_id = da.order_id
       WHERE da.id = ? AND da.shipper_id = ? AND da.assignment_status = 'OFFERED'
       LIMIT 1 FOR UPDATE`,
      [assignmentId, shipper.id]
    );
    if (!rows[0]) throw new HttpError(404, 'Assignment not found');
    await connection.execute(
      `UPDATE delivery_assignments SET assignment_status = 'ACCEPTED', accepted_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [assignmentId]
    );
    await connection.execute(
      `UPDATE deliveries SET delivery_status = 'ACCEPTED', accepted_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [rows[0].delivery_id]
    );
    await connection.execute(`UPDATE shipper_profiles SET availability_status = 'BUSY' WHERE id = ?`, [shipper.id]);
    await connection.execute(
      `INSERT INTO delivery_status_history (delivery_id, status, note) VALUES (?, 'ACCEPTED', 'Shipper accepted')`,
      [rows[0].delivery_id]
    );
    return { assignmentId, deliveryId: Number(rows[0].delivery_id), orderId: Number(rows[0].order_id), status: 'ACCEPTED' };
  });
}

async function updateDeliveryStatus(input) {
  return withTransaction(async connection => {
    const rows = await connection.execute(
      `SELECT d.*, o.order_status, o.payment_method, o.total_amount
       FROM deliveries d INNER JOIN orders o ON o.id = d.order_id
       WHERE d.id = ? AND d.shipper_id = ?
       LIMIT 1 FOR UPDATE`,
      [input.deliveryId, input.shipperId]
    );
    if (!rows[0]) throw new HttpError(404, 'Delivery not found');
    const statusToOrder = {
      PICKED_UP: 'PICKED_UP',
      DELIVERING: 'DELIVERING',
      DELIVERED: 'DELIVERED',
      FAILED: 'FAILED'
    };
    const timestampColumn = input.status === 'PICKED_UP'
      ? 'picked_up_at'
      : input.status === 'DELIVERED'
        ? 'delivered_at'
        : null;
    await connection.execute(
      `UPDATE deliveries
       SET delivery_status = ?${timestampColumn ? `, ${timestampColumn} = CURRENT_TIMESTAMP` : ''},
           proof_image_url = COALESCE(?, proof_image_url),
           receiver_signature_url = COALESCE(?, receiver_signature_url),
           delivery_note = COALESCE(?, delivery_note)
       WHERE id = ?`,
      [input.status, input.proofImageUrl, input.receiverSignatureUrl, input.note, input.deliveryId]
    );
    await connection.execute(
      `UPDATE orders
       SET order_status = ?, picked_up_at = IF(? = 'PICKED_UP', CURRENT_TIMESTAMP, picked_up_at),
           delivered_at = IF(? = 'DELIVERED', CURRENT_TIMESTAMP, delivered_at)
       WHERE id = ?`,
      [statusToOrder[input.status], input.status, input.status, rows[0].order_id]
    );
    await connection.execute(
      `INSERT INTO delivery_status_history (delivery_id, status, latitude, longitude, note)
       VALUES (?, ?, ?, ?, ?)`,
      [input.deliveryId, input.status, input.latitude, input.longitude, input.note]
    );
    if (input.status === 'DELIVERED') {
      await connection.execute(`UPDATE shipper_profiles SET availability_status = 'AVAILABLE', total_deliveries = total_deliveries + 1 WHERE id = ?`, [input.shipperId]);
      await connection.execute(`UPDATE orders SET payment_status = IF(payment_method = 'COD', 'PAID', payment_status) WHERE id = ?`, [rows[0].order_id]);
      await connection.execute(`UPDATE payments SET status = IF(method = 'COD', 'PAID', status), paid_at = IF(method = 'COD', CURRENT_TIMESTAMP, paid_at) WHERE order_id = ?`, [rows[0].order_id]);
      await connection.execute(
        `INSERT INTO cod_transactions (order_id, shipper_id, amount, status, collected_at)
         SELECT id, shipper_id, total_amount, 'COLLECTED', CURRENT_TIMESTAMP
         FROM orders WHERE id = ? AND payment_method = 'COD'
         ON DUPLICATE KEY UPDATE status = status`,
        [rows[0].order_id]
      ).catch(() => null);
      await connection.execute(
        `INSERT IGNORE INTO shipper_earnings (shipper_id, delivery_id, delivery_fee, bonus, tip_amount, platform_fee, net_earning)
         VALUES (?, ?, ?, 0, 0, 0, ?)`,
        [input.shipperId, input.deliveryId, Number(rows[0].delivery_fee ?? 0), Number(rows[0].delivery_fee ?? 0)]
      );
      await connection.execute(
        `INSERT IGNORE INTO restaurant_commissions (order_id, restaurant_id, order_amount, commission_rate, commission_amount)
         SELECT o.id, o.restaurant_id, o.total_amount, r.commission_rate, ROUND(o.total_amount * r.commission_rate / 100, 2)
         FROM orders o INNER JOIN restaurants r ON r.id = o.restaurant_id WHERE o.id = ?`,
        [rows[0].order_id]
      );
    }
    const updated = await connection.execute('SELECT * FROM deliveries WHERE id = ? LIMIT 1', [input.deliveryId]);
    return mapDelivery(updated[0]);
  });
}

async function listDeliveries(filters = {}) {
  const where = [];
  const params = [];
  if (filters.orderId) { where.push('d.order_id = ?'); params.push(filters.orderId); }
  if (filters.deliveryId) { where.push('d.id = ?'); params.push(filters.deliveryId); }
  if (filters.shipperId) { where.push('d.shipper_id = ?'); params.push(filters.shipperId); }
  return query(
    `SELECT d.*, o.order_code, o.order_status, o.payment_method, o.total_amount, r.name AS restaurant_name,
            sp.full_name AS shipper_name
     FROM deliveries d
     INNER JOIN orders o ON o.id = d.order_id
     INNER JOIN restaurants r ON r.id = o.restaurant_id
     LEFT JOIN shipper_profiles sp ON sp.id = d.shipper_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY d.created_at DESC, d.id DESC
     LIMIT 200`,
    params
  );
}

async function processPaymentCallback(paymentId, status, body) {
  return withTransaction(async connection => {
    const rows = await connection.execute('SELECT * FROM payments WHERE id = ? LIMIT 1 FOR UPDATE', [paymentId]);
    if (!rows[0]) throw new HttpError(404, 'Payment not found');
    await connection.execute(
      `UPDATE payments SET status = ?, transaction_id = COALESCE(?, transaction_id), gateway = COALESCE(?, gateway),
       paid_at = IF(? = 'PAID', CURRENT_TIMESTAMP, paid_at) WHERE id = ?`,
      [status, nullableText(body?.transactionId, 255), nullableText(body?.gateway, 100), status, paymentId]
    );
    await connection.execute(
      `INSERT INTO payment_transactions (payment_id, transaction_type, request_data, response_data, status)
       VALUES (?, 'CALLBACK', ?, ?, ?)`,
      [paymentId, JSON.stringify(body ?? {}), JSON.stringify({ accepted: true, status }), status]
    );
    await connection.execute(
      `UPDATE orders SET payment_status = ? WHERE id = ?`,
      [status === 'PAID' ? 'PAID' : status === 'REFUNDED' ? 'REFUNDED' : status === 'FAILED' ? 'FAILED' : 'PENDING', rows[0].order_id]
    );
    return { id: paymentId, orderId: Number(rows[0].order_id), status };
  });
}

async function cancelOrder(user, orderId, body) {
  const order = await assertOrderAccess(user, orderId);
  if (!['PENDING', 'CONFIRMED', 'PREPARING'].includes(order.order_status)) {
    throw new HttpError(400, 'Order cannot be cancelled in the current status');
  }
  return withTransaction(async connection => {
    await connection.execute(
      `UPDATE orders SET order_status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [orderId]
    );
    await connection.execute(
      `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, note)
       VALUES (?, ?, 'CANCELLED', ?, ?)`,
      [orderId, order.order_status, user.id, nullableText(body?.reason, 500) ?? 'Order cancelled']
    );
    const refundAmount = ['PAID', 'PARTIALLY_REFUNDED'].includes(order.payment_status)
      ? Number(order.total_amount)
      : 0;
    await connection.execute(
      `INSERT INTO order_cancellations (order_id, cancelled_by, reason_code, reason, refund_amount)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE reason = VALUES(reason), refund_amount = VALUES(refund_amount)`,
      [
        orderId,
        user.id,
        readEnum(body?.reasonCode ?? 'CUSTOMER_CHANGED_MIND', ['CUSTOMER_CHANGED_MIND', 'RESTAURANT_REJECTED', 'OUT_OF_STOCK', 'SHIPPER_UNAVAILABLE', 'PAYMENT_FAILED', 'SYSTEM_TIMEOUT', 'OTHER'], 'reasonCode'),
        nullableText(body?.reason, 1000),
        refundAmount
      ]
    );
    if (refundAmount > 0) {
      const payments = await connection.execute('SELECT id FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1', [orderId]);
      await connection.execute(
        `INSERT INTO refunds (order_id, payment_id, amount, reason, status, processed_by)
         VALUES (?, ?, ?, ?, 'PENDING', ?)`,
        [orderId, payments[0]?.id ?? null, refundAmount, nullableText(body?.reason, 1000), user.id]
      );
    }
    await connection.execute(`UPDATE deliveries SET delivery_status = 'CANCELLED' WHERE order_id = ?`, [orderId]);
    await connection.execute(`UPDATE delivery_assignments SET assignment_status = 'CANCELLED' WHERE order_id = ? AND assignment_status = 'OFFERED'`, [orderId]);
    return { orderId, status: 'CANCELLED', refundAmount };
  });
}

async function ensureInvoice(orderId) {
  const existing = await query('SELECT * FROM invoices WHERE order_id = ? LIMIT 1', [orderId]);
  if (existing[0]) return mapInvoice(existing[0]);
  const rows = await query(
    `SELECT o.*, cp.full_name AS customer_name, r.name AS restaurant_name
     FROM orders o INNER JOIN customer_profiles cp ON cp.id = o.customer_id
     INNER JOIN restaurants r ON r.id = o.restaurant_id
     WHERE o.id = ? LIMIT 1`,
    [orderId]
  );
  if (!rows[0]) throw new HttpError(404, 'Order not found');
  const number = `INV-${rows[0].order_code}`;
  await query(
    `INSERT INTO invoices (invoice_number, order_id, customer_name, restaurant_name, subtotal, discount_amount,
       delivery_fee, service_fee, tax_amount, total_amount, pdf_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      number,
      orderId,
      rows[0].customer_name,
      rows[0].restaurant_name,
      rows[0].subtotal,
      rows[0].discount_amount,
      rows[0].delivery_fee,
      rows[0].service_fee,
      rows[0].tax_amount,
      rows[0].total_amount,
      `/invoices/${number}.pdf`
    ]
  );
  const created = await query('SELECT * FROM invoices WHERE order_id = ? LIMIT 1', [orderId]);
  return mapInvoice(created[0]);
}

async function ensureWallet(userId) {
  await query(
    `INSERT INTO wallets (user_id, balance, status)
     VALUES (?, 0, 'ACTIVE')
     ON DUPLICATE KEY UPDATE updated_at = updated_at`,
    [userId]
  );
  const rows = await query('SELECT * FROM wallets WHERE user_id = ? LIMIT 1', [userId]);
  return mapWallet(rows[0]);
}

async function adjustWallet(userId, type, amount, referenceType, referenceId, description) {
  return withTransaction(async connection => {
    await connection.execute(
      `INSERT INTO wallets (user_id, balance, status)
       VALUES (?, 0, 'ACTIVE')
       ON DUPLICATE KEY UPDATE updated_at = updated_at`,
      [userId]
    );
    const rows = await connection.execute('SELECT * FROM wallets WHERE user_id = ? LIMIT 1 FOR UPDATE', [userId]);
    const before = Number(rows[0].balance);
    const after = ['DEPOSIT', 'REFUND', 'EARNING', 'ADJUSTMENT'].includes(type)
      ? before + amount
      : before - amount;
    if (after < 0) throw new HttpError(400, 'Wallet balance is insufficient');
    await connection.execute('UPDATE wallets SET balance = ? WHERE id = ?', [after, rows[0].id]);
    await connection.execute(
      `INSERT INTO wallet_transactions (wallet_id, type, amount, reference_type, reference_id, balance_before, balance_after, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [rows[0].id, type, amount, referenceType, referenceId, before, after, description]
    );
    return { id: Number(rows[0].id), userId, balance: after, status: rows[0].status };
  });
}

async function requireCustomerDeliveredOrder(userId, orderId) {
  const rows = await query(
    `SELECT o.*
     FROM orders o INNER JOIN customer_profiles cp ON cp.id = o.customer_id
     WHERE cp.user_id = ? AND o.id = ? AND o.order_status = 'DELIVERED'
     LIMIT 1`,
    [userId, orderId]
  );
  if (!rows[0]) throw new HttpError(400, 'Review requires a delivered order');
  return rows[0];
}

function chatAccessWhere(user) {
  if (user.role === 'ADMIN') return '1=1';
  if (user.role === 'CUSTOMER') return 'EXISTS (SELECT 1 FROM customer_profiles cp WHERE cp.id = cs.customer_id AND cp.user_id = ?)';
  if (user.role === 'RESTAURANT') return 'EXISTS (SELECT 1 FROM restaurants r WHERE r.id = cs.restaurant_id AND r.owner_user_id = ?)';
  if (user.role === 'SHIPPER') return 'EXISTS (SELECT 1 FROM shipper_profiles sp WHERE sp.id = cs.shipper_id AND sp.user_id = ?)';
  return '1=0';
}

async function chatAccessParams(user) {
  return user.role === 'ADMIN' ? [] : [user.id];
}

async function assertChatAccess(user, sessionId) {
  const rows = await query(`SELECT cs.* FROM chat_sessions cs WHERE cs.id = ? AND ${chatAccessWhere(user)} LIMIT 1`, [sessionId, ...(await chatAccessParams(user))]);
  if (!rows[0]) throw new HttpError(403, 'Permission denied');
  return rows[0];
}

async function requireTicketAccess(user, ticketId) {
  const rows = await query(
    `SELECT * FROM support_tickets WHERE id = ? AND (${user.role === 'ADMIN' ? '1=1' : 'user_id = ?'})
     LIMIT 1`,
    user.role === 'ADMIN' ? [ticketId] : [ticketId, user.id]
  );
  if (!rows[0]) throw new HttpError(404, 'Ticket not found');
  return rows[0];
}

async function generateSettlements(periodStart, periodEnd, restaurantId) {
  const where = ['DATE(o.delivered_at) BETWEEN ? AND ?', "o.order_status = 'DELIVERED'"];
  const params = [periodStart, periodEnd];
  if (restaurantId) { where.push('o.restaurant_id = ?'); params.push(restaurantId); }
  const rows = await query(
    `SELECT o.restaurant_id, SUM(o.total_amount) AS gross_sales,
            COALESCE(SUM(rc.commission_amount), 0) AS commission_amount,
            COALESCE((SELECT SUM(ref.amount) FROM refunds ref INNER JOIN orders ro ON ro.id = ref.order_id
                      WHERE ro.restaurant_id = o.restaurant_id AND ref.status IN ('PENDING','PROCESSING','COMPLETED')
                      AND DATE(ref.created_at) BETWEEN ? AND ?), 0) AS refund_amount
     FROM orders o
     LEFT JOIN restaurant_commissions rc ON rc.order_id = o.id
     WHERE ${where.join(' AND ')}
     GROUP BY o.restaurant_id`,
    [periodStart, periodEnd, ...params]
  );
  const items = [];
  for (const row of rows) {
    const gross = Number(row.gross_sales);
    const commission = Number(row.commission_amount);
    const refund = Number(row.refund_amount);
    const net = gross - commission - refund;
    await query(
      `INSERT INTO restaurant_settlements (restaurant_id, period_start, period_end, gross_sales, commission_amount, refund_amount, net_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [row.restaurant_id, periodStart, periodEnd, gross, commission, refund, net]
    );
    items.push({ restaurantId: Number(row.restaurant_id), periodStart, periodEnd, grossSales: gross, commissionAmount: commission, refundAmount: refund, netAmount: net, status: 'PENDING' });
  }
  return items;
}

function readId(value, field) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, `${field} must be a positive integer`);
  return id;
}

function text(value, max, fallback = null) {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (fallback !== null) return fallback;
    throw new HttpError(400, 'Required text is missing');
  }
  const output = String(value).trim();
  if (output.length > max) throw new HttpError(400, `Text must be at most ${max} characters`);
  return output;
}

function nullableText(value, max, fallback = null) {
  if (value === undefined) return fallback;
  if (value === null || String(value).trim() === '') return null;
  const output = String(value).trim();
  if (output.length > max) throw new HttpError(400, `Text must be at most ${max} characters`);
  return output;
}

function readEnum(value, allowed, field) {
  const output = String(value ?? '').trim().toUpperCase();
  if (!allowed.includes(output)) throw new HttpError(400, `${field} is invalid`);
  return output;
}

function readDecimal(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new HttpError(400, `${field} is invalid`);
  return number;
}

function readOptionalDecimal(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return readDecimal(value, 'number');
}

function readPositiveMoney(value, field) {
  const number = readDecimal(value, field);
  if (number <= 0) throw new HttpError(400, `${field} must be greater than 0`);
  return Math.round(number * 100) / 100;
}

function readRating(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 5) throw new HttpError(400, 'rating must be between 1 and 5');
  return number;
}

function audit(req, action, entityType, entityId = null, newValues = null) {
  req.auditUserId = req.user?.id ?? null;
  req.auditAction = action;
  req.auditEntityType = entityType;
  req.auditEntityId = entityId;
  req.auditNewValues = newValues;
}

function mapUser(row) { return { id: Number(row.id), username: row.username, email: row.email, phone: row.phone, role: row.role, status: row.status, createdAt: row.created_at }; }
function mapShipper(row) { return { id: Number(row.id), userId: Number(row.user_id), fullName: row.full_name, identityNumber: row.identity_number, vehicleType: row.vehicle_type, vehiclePlate: row.vehicle_plate, drivingLicense: row.driving_license, rating: Number(row.rating), totalReviews: Number(row.total_reviews), totalDeliveries: Number(row.total_deliveries), totalEarnings: Number(row.total_earnings), availabilityStatus: row.availability_status, currentLatitude: row.current_latitude, currentLongitude: row.current_longitude, lastLocationAt: row.last_location_at, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapDocument(row) { return { id: Number(row.id), shipperId: Number(row.shipper_id), documentType: row.document_type, documentNumber: row.document_number, imageUrl: row.image_url, verified: Boolean(row.verified), verifiedBy: row.verified_by, verifiedAt: row.verified_at, createdAt: row.created_at }; }
function mapAssignment(row) { return { id: Number(row.id), orderId: Number(row.order_id), shipperId: Number(row.shipper_id), assignedBy: row.assigned_by, status: row.assignment_status, orderCode: row.order_code, restaurantName: row.restaurant_name, deliveryAddress: row.delivery_address, totalAmount: Number(row.total_amount), offeredAt: row.offered_at, acceptedAt: row.accepted_at, rejectedAt: row.rejected_at, rejectReason: row.reject_reason }; }
function mapDelivery(row) { return { id: Number(row.id), orderId: Number(row.order_id), orderCode: row.order_code, shipperId: row.shipper_id === null ? null : Number(row.shipper_id), shipperName: row.shipper_name ?? null, restaurantName: row.restaurant_name ?? null, pickupAddress: row.pickup_address, deliveryAddress: row.delivery_address, distanceKm: Number(row.distance_km), deliveryFee: Number(row.delivery_fee), status: row.delivery_status, proofImageUrl: row.proof_image_url, receiverSignatureUrl: row.receiver_signature_url, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapLocation(row) { return { id: Number(row.id), shipperId: Number(row.shipper_id), deliveryId: row.delivery_id === null ? null : Number(row.delivery_id), latitude: Number(row.latitude), longitude: Number(row.longitude), speed: Number(row.speed), heading: Number(row.heading), accuracy: row.accuracy === null ? null : Number(row.accuracy), recordedAt: row.recorded_at }; }
function mapEarning(row) { return { id: Number(row.id), shipperId: Number(row.shipper_id), deliveryId: Number(row.delivery_id), orderId: Number(row.order_id), deliveryFee: Number(row.delivery_fee), bonus: Number(row.bonus), tipAmount: Number(row.tip_amount), platformFee: Number(row.platform_fee), netEarning: Number(row.net_earning), createdAt: row.created_at }; }
function mapWithdrawal(row) { return { id: Number(row.id), shipperId: Number(row.shipper_id), amount: Number(row.amount), bankName: row.bank_name, bankAccount: row.bank_account, accountHolder: row.account_holder, status: row.status, requestedAt: row.requested_at, processedAt: row.processed_at, rejectReason: row.reject_reason }; }
function mapPayment(row) { return { id: Number(row.id), orderId: Number(row.order_id), paymentCode: row.payment_code, method: row.method, amount: Number(row.amount), status: row.status, transactionId: row.transaction_id, gateway: row.gateway, paidAt: row.paid_at, createdAt: row.created_at }; }
function mapCod(row) { return { id: Number(row.id), orderId: Number(row.order_id), orderCode: row.order_code, shipperId: Number(row.shipper_id), amount: Number(row.amount), status: row.status, collectedAt: row.collected_at, settledAt: row.settled_at, createdAt: row.created_at }; }
function mapInvoice(row) { return { id: Number(row.id), invoiceNumber: row.invoice_number, orderId: Number(row.order_id), customerName: row.customer_name, restaurantName: row.restaurant_name, subtotal: Number(row.subtotal), discountAmount: Number(row.discount_amount), deliveryFee: Number(row.delivery_fee), serviceFee: Number(row.service_fee), taxAmount: Number(row.tax_amount), totalAmount: Number(row.total_amount), issuedAt: row.issued_at, pdfUrl: row.pdf_url }; }
function mapWallet(row) { return { id: Number(row.id), userId: Number(row.user_id), balance: Number(row.balance), status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapWalletTransaction(row) { return { id: Number(row.id), walletId: Number(row.wallet_id), type: row.type, amount: Number(row.amount), referenceType: row.reference_type, referenceId: row.reference_id, balanceBefore: Number(row.balance_before), balanceAfter: Number(row.balance_after), description: row.description, createdAt: row.created_at }; }
function mapChatSession(row) { return { id: Number(row.id), orderId: row.order_id === null ? null : Number(row.order_id), orderCode: row.order_code, customerId: row.customer_id, shipperId: row.shipper_id, restaurantId: row.restaurant_id, restaurantName: row.restaurant_name, status: row.status, createdAt: row.created_at, closedAt: row.closed_at }; }
function mapChatMessage(row) { return { id: Number(row.id), sessionId: Number(row.session_id), senderId: Number(row.sender_id), username: row.username, message: row.message, messageType: row.message_type, attachmentUrl: row.attachment_url, isRead: Boolean(row.is_read), createdAt: row.created_at }; }
function mapSupportTicket(row) { return { id: Number(row.id), ticketCode: row.ticket_code, userId: Number(row.user_id), username: row.username, orderId: row.order_id, subject: row.subject, description: row.description, category: row.category, priority: row.priority, status: row.status, assignedAdminId: row.assigned_admin_id, createdAt: row.created_at, updatedAt: row.updated_at, resolvedAt: row.resolved_at }; }
function mapSupportMessage(row) { return { id: Number(row.id), ticketId: Number(row.ticket_id), senderId: Number(row.sender_id), username: row.username, message: row.message, attachmentUrl: row.attachment_url, createdAt: row.created_at }; }
function mapSettlement(row) { return { id: Number(row.id), restaurantId: Number(row.restaurant_id), restaurantName: row.restaurant_name, periodStart: row.period_start, periodEnd: row.period_end, grossSales: Number(row.gross_sales), commissionAmount: Number(row.commission_amount), refundAmount: Number(row.refund_amount), adjustmentAmount: Number(row.adjustment_amount), netAmount: Number(row.net_amount), status: row.status, settledAt: row.settled_at, createdAt: row.created_at }; }
function mapCommission(row) { return { id: Number(row.id), orderId: Number(row.order_id), orderCode: row.order_code, restaurantId: Number(row.restaurant_id), restaurantName: row.restaurant_name, orderAmount: Number(row.order_amount), commissionRate: Number(row.commission_rate), commissionAmount: Number(row.commission_amount), createdAt: row.created_at }; }
