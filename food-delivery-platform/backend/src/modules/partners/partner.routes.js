import { Router } from 'express';
import { query, withTransaction } from '../../shared/database/mysql.js';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { HttpError } from '../../shared/http/http-error.js';
import { requireAuth, requireRole } from '../../shared/middlewares/require-auth.middleware.js';
import { hashPassword } from '../../shared/security/password.js';
import { COMMITMENTS, COMMITMENT_VERSION, readCommitment } from './commitments.js';
import { M } from '../../shared/http/messages.js';

export const partnerPublicRoutes = Router();
export const partnerAdminRoutes = Router();

partnerAdminRoutes.use(requireAuth, requireRole('ADMIN'));

function audit(req, action, entityType, entityId = null) {
  req.auditAction = action;
  req.auditEntityType = entityType;
  req.auditEntityId = entityId === null ? null : String(entityId);
}

function text(value, max, name, { required = false, pattern, message } = {}) {
  const out = String(value ?? '').trim();
  if (required && !out) throw new HttpError(400, M.nameRequired(name));
  if (out.length > max) throw new HttpError(400, M.nameTooLong(name));
  if (out && pattern && !pattern.test(out)) throw new HttpError(400, message || M.nameInvalid(name));
  return out || null;
}

/** Hồ sơ đối tác bắt buộc kèm bằng chứng đã đọc hết và đồng ý bản cam kết hiện hành. */
function requireCommitment(body, kind) {
  const commitment = readCommitment(body?.commitment, kind);
  if (!commitment) throw new HttpError(400, 'Bạn cần đọc hết bản cam kết (kéo xuống cuối) và đồng ý trước khi gửi hồ sơ');
  return commitment;
}

partnerPublicRoutes.get('/commitments/:kind', (req, res) => {
  const content = COMMITMENTS[req.params.kind];
  if (!content) throw new HttpError(404, M.commitmentNotFound);
  res.json({ kind: req.params.kind, version: COMMITMENT_VERSION, ...content });
});

function readAccount(body) {
  const password = String(body?.password ?? '');
  if (password.length < 8) throw new HttpError(400, M.passwordMin);
  return {
    username: text(body?.username, 100, 'username', { required: true, pattern: /^[a-zA-Z0-9_.-]{3,100}$/, message: 'Tên đăng nhập gồm 3-100 ký tự (chữ không dấu, số, dấu . _ -)' }),
    email: text(body?.email, 150, 'email', { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: M.emailRequired }).toLowerCase(),
    phone: text(body?.phone, 20, 'phone', { required: true, pattern: /^[0-9+().\-\s]{8,20}$/, message: M.phoneNumberInvalid }),
    password
  };
}

async function createPendingUser(connection, roleName, account) {
  const roles = await connection.execute('SELECT id FROM roles WHERE name = ? LIMIT 1', [roleName]);
  if (!roles[0]) throw new HttpError(500, M.roleMissing(roleName));
  const duplicate = await connection.execute(
    'SELECT id FROM users WHERE (username = ? OR email = ? OR phone = ?) LIMIT 1',
    [account.username, account.email, account.phone]
  );
  if (duplicate[0]) throw new HttpError(409, M.accountExists);
  const passwordHash = await hashPassword(account.password);
  const result = await connection.execute(
    "INSERT INTO users (role_id, username, email, phone, password_hash, status) VALUES (?, ?, ?, ?, ?, 'PENDING')",
    [roles[0].id, account.username, account.email, account.phone, passwordHash]
  );
  return Number(result.insertId);
}

const reply = application => ({
  applicationId: application.id,
  type: application.type,
  status: 'PENDING',
  message: 'Hồ sơ đã được gửi. Tài khoản sẽ đăng nhập được sau khi quản trị viên duyệt.'
});

/* ---------------- public: register ---------------- */

partnerPublicRoutes.post('/register/shipper', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const account = readAccount(b);
  const fullName = text(b.fullName, 150, 'fullName', { required: true });
  const identityNumber = text(b.identityNumber, 50, 'identityNumber', { required: true, pattern: /^[0-9A-Za-z]{9,15}$/, message: 'Số CCCD/CMND không hợp lệ' });
  const vehicleType = ['MOTORBIKE', 'BICYCLE', 'CAR'].includes(b.vehicleType) ? b.vehicleType : 'MOTORBIKE';
  const vehiclePlate = text(b.vehiclePlate, 30, 'vehiclePlate', { required: vehicleType !== 'BICYCLE' });
  const drivingLicense = text(b.drivingLicense, 100, 'drivingLicense', { required: vehicleType !== 'BICYCLE' });
  const city = text(b.city, 100, 'city');
  const note = text(b.note, 500, 'note');
  const commitment = requireCommitment(b, 'shipper');

  const application = await withTransaction(async connection => {
    const dupId = await connection.execute('SELECT id FROM shipper_profiles WHERE identity_number = ? LIMIT 1', [identityNumber]);
    if (dupId[0]) throw new HttpError(409, 'Số CCCD/CMND này đã được đăng ký');
    const userId = await createPendingUser(connection, 'SHIPPER', account);
    const profile = await connection.execute(
      "INSERT INTO shipper_profiles (user_id, full_name, identity_number, vehicle_type, vehicle_plate, driving_license, availability_status) VALUES (?, ?, ?, ?, ?, ?, 'SUSPENDED')",
      [userId, fullName, identityNumber, vehicleType, vehiclePlate, drivingLicense]
    );
    const shipperId = Number(profile.insertId);
    const docs = [['IDENTITY_CARD', identityNumber], ['DRIVING_LICENSE', drivingLicense], ['VEHICLE_REGISTRATION', vehiclePlate]].filter(([, number]) => number);
    for (const [type, number] of docs) {
      await connection.execute('INSERT INTO shipper_documents (shipper_id, document_type, document_number) VALUES (?, ?, ?)', [shipperId, type, number]);
    }
    const app = await connection.execute(
      "INSERT INTO partner_applications (application_type, user_id, entity_id, applicant_name, payload) VALUES ('SHIPPER', ?, ?, ?, ?)",
      [userId, shipperId, fullName, JSON.stringify({ fullName, email: account.email, phone: account.phone, identityNumber, vehicleType, vehiclePlate, drivingLicense, city, note, commitment })]
    );
    return { id: Number(app.insertId), type: 'SHIPPER' };
  });
  audit(req, 'PARTNER_APPLY_SHIPPER', 'PARTNER_APPLICATION', application.id);
  res.status(201).json(reply(application));
}));

partnerPublicRoutes.post('/register/restaurant', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const account = readAccount(b);
  const ownerName = text(b.ownerName, 150, 'ownerName', { required: true });
  const name = text(b.restaurantName, 200, 'restaurantName', { required: true });
  const address = text(b.address, 255, 'address', { required: true });
  const city = text(b.city, 100, 'city', { required: true });
  const ward = text(b.ward, 100, 'ward');
  const district = text(b.district, 100, 'district');
  const description = text(b.description, 2000, 'description');
  const restaurantPhone = text(b.restaurantPhone, 20, 'restaurantPhone', { pattern: /^[0-9+().\-\s]{8,20}$/, message: 'Số điện thoại nhà hàng không hợp lệ' }) || account.phone;
  const time = value => (/^\d{2}:\d{2}$/.test(String(value || '')) ? `${value}:00` : null);
  const minimumOrder = Math.max(0, Number(b.minimumOrder) || 0);
  const categoryId = Number(b.categoryId) > 0 ? Number(b.categoryId) : null;
  const businessLicense = text(b.businessLicense, 50, 'businessLicense');
  const commitment = requireCommitment(b, 'restaurant');

  const application = await withTransaction(async connection => {
    const userId = await createPendingUser(connection, 'RESTAURANT', account);
    const row = await connection.execute(
      `INSERT INTO restaurants (owner_user_id, category_id, name, description, phone, email, address, ward, district, city,
                                opening_time, closing_time, minimum_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [userId, categoryId, name, description, restaurantPhone, account.email, address, ward, district, city, time(b.openingTime), time(b.closingTime), minimumOrder]
    );
    const restaurantId = Number(row.insertId);
    const app = await connection.execute(
      "INSERT INTO partner_applications (application_type, user_id, entity_id, applicant_name, payload) VALUES ('RESTAURANT', ?, ?, ?, ?)",
      [userId, restaurantId, name, JSON.stringify({ ownerName, restaurantName: name, email: account.email, phone: account.phone, address, ward, district, city, categoryId, businessLicense, minimumOrder, commitment })]
    );
    return { id: Number(app.insertId), type: 'RESTAURANT' };
  });
  audit(req, 'PARTNER_APPLY_RESTAURANT', 'PARTNER_APPLICATION', application.id);
  res.status(201).json(reply(application));
}));

/* ---------------- admin: review ---------------- */

const toApplication = row => ({
  id: Number(row.id), type: row.application_type, userId: Number(row.user_id), entityId: row.entity_id ? Number(row.entity_id) : null,
  applicantName: row.applicant_name, status: row.status, reviewNote: row.review_note, reviewedAt: row.reviewed_at, createdAt: row.created_at,
  username: row.username, email: row.email, phone: row.phone, userStatus: row.user_status,
  payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {})
});

const APPLICATION_SQL = `SELECT a.*, u.username, u.email, u.phone, u.status AS user_status
  FROM partner_applications a INNER JOIN users u ON u.id = a.user_id`;

partnerAdminRoutes.get('/applications', asyncHandler(async (req, res) => {
  const where = [];
  const params = [];
  if (['PENDING', 'APPROVED', 'REJECTED'].includes(req.query.status)) { where.push('a.status = ?'); params.push(req.query.status); }
  if (['SHIPPER', 'RESTAURANT'].includes(req.query.type)) { where.push('a.application_type = ?'); params.push(req.query.type); }
  const rows = await query(`${APPLICATION_SQL} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY (a.status = 'PENDING') DESC, a.created_at DESC, a.id DESC LIMIT 200`, params);
  const counts = await query('SELECT status, COUNT(*) AS n FROM partner_applications GROUP BY status');
  res.json({ items: rows.map(toApplication), counts: Object.fromEntries(counts.map(c => [c.status, Number(c.n)])) });
}));

async function loadPending(rawId) {
  const applicationId = Number(rawId);
  if (!Number.isInteger(applicationId) || applicationId <= 0) throw new HttpError(400, M.applicationIdInvalid);
  const rows = await query(`${APPLICATION_SQL} WHERE a.id = ? LIMIT 1`, [applicationId]);
  if (!rows[0]) throw new HttpError(404, M.applicationNotFound);
  if (rows[0].status !== 'PENDING') throw new HttpError(409, M.applicationReviewed);
  return { app: rows[0], applicationId };
}

partnerAdminRoutes.post('/applications/:applicationId/approve', asyncHandler(async (req, res) => {
  const { app, applicationId } = await loadPending(req.params.applicationId);
  const note = text(req.body?.note, 500, 'note');
  const commission = Math.min(100, Math.max(0, Number(req.body?.commissionRate ?? 15)));
  await withTransaction(async connection => {
    await connection.execute("UPDATE users SET status = 'ACTIVE', email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP) WHERE id = ?", [app.user_id]);
    if (app.application_type === 'SHIPPER') {
      await connection.execute("UPDATE shipper_profiles SET availability_status = 'OFFLINE' WHERE id = ?", [app.entity_id]);
      await connection.execute('UPDATE shipper_documents SET verified = TRUE, verified_by = ?, verified_at = CURRENT_TIMESTAMP WHERE shipper_id = ?', [req.user.id, app.entity_id]);
    } else {
      await connection.execute("UPDATE restaurants SET status = 'ACTIVE', commission_rate = ? WHERE id = ?", [commission, app.entity_id]);
    }
    const wallet = await connection.execute('SELECT id FROM wallets WHERE user_id = ? LIMIT 1', [app.user_id]);
    if (!wallet[0]) await connection.execute("INSERT INTO wallets (user_id, balance, status) VALUES (?, 0, 'ACTIVE')", [app.user_id]);
    await connection.execute(
      "UPDATE partner_applications SET status = 'APPROVED', review_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?",
      [note, req.user.id, applicationId]
    );
  });
  audit(req, 'ADMIN_PARTNER_APPROVE', 'PARTNER_APPLICATION', applicationId);
  res.json({ id: applicationId, status: 'APPROVED' });
}));

partnerAdminRoutes.post('/applications/:applicationId/reject', asyncHandler(async (req, res) => {
  const { app, applicationId } = await loadPending(req.params.applicationId);
  const note = text(req.body?.note, 500, 'note', { required: true });
  await withTransaction(async connection => {
    await connection.execute("UPDATE users SET status = 'INACTIVE' WHERE id = ?", [app.user_id]);
    if (app.application_type === 'RESTAURANT') await connection.execute("UPDATE restaurants SET status = 'INACTIVE' WHERE id = ?", [app.entity_id]);
    await connection.execute(
      "UPDATE partner_applications SET status = 'REJECTED', review_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?",
      [note, req.user.id, applicationId]
    );
  });
  audit(req, 'ADMIN_PARTNER_REJECT', 'PARTNER_APPLICATION', applicationId);
  res.json({ id: applicationId, status: 'REJECTED' });
}));
