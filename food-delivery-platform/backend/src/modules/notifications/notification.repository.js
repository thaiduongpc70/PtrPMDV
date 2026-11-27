import { query } from '../../shared/database/mysql.js';

export const notificationRepository = {
  async createMany(items) {
    for (const item of items) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [item.userId, item.title, item.message, item.type, item.referenceType, item.referenceId]
      );
    }
  },
  /** Tạo thông báo KHÔNG TRÙNG: bỏ qua nếu người nhận đã có thông báo cùng loại + cùng đối tượng tham chiếu. Trả số dòng đã tạo. */
  async createOnce(items) {
    let created = 0;
    for (const item of items) {
      const result = await query(
        `INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
         SELECT ?, ?, ?, ?, ?, ? FROM DUAL
         WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = ? AND type = ? AND reference_type <=> ? AND reference_id <=> ? AND title = ?)`,
        [item.userId, item.title, item.message, item.type, item.referenceType, item.referenceId, item.userId, item.type, item.referenceType, item.referenceId, item.title]
      );
      created += Number(result?.affectedRows ?? 0);
    }
    return created;
  },
  async adminUserIds() {
    const rows = await query("SELECT u.id FROM users u INNER JOIN roles r ON r.id = u.role_id WHERE r.name = 'ADMIN' AND u.status = 'ACTIVE' AND u.deleted_at IS NULL");
    return rows.map(row => Number(row.id));
  },
  async shipperUserOfOrder(orderId) {
    const rows = await query('SELECT sp.user_id, o.order_code FROM orders o INNER JOIN shipper_profiles sp ON sp.id = o.shipper_id WHERE o.id = ? LIMIT 1', [orderId]);
    return rows[0] ? { userId: Number(rows[0].user_id), orderCode: rows[0].order_code } : null;
  },
  async shipperUserById(shipperId, orderId) {
    const rows = await query('SELECT sp.user_id, o.order_code FROM shipper_profiles sp INNER JOIN orders o ON o.id = ? WHERE sp.id = ? LIMIT 1', [orderId, shipperId]);
    return rows[0] ? { userId: Number(rows[0].user_id), orderCode: rows[0].order_code } : null;
  },
  async countForUser(userId) {
    const [row] = await query('SELECT COUNT(*) AS total, COALESCE(SUM(is_read = FALSE), 0) AS unread FROM notifications WHERE user_id = ?', [userId]);
    return { total: Number(row.total), unread: Number(row.unread) };
  },
  async listForUser(userId, filters = {}) {
    const limit = Number(filters.pageSize ?? filters.limit ?? 30);
    const offset = Number(filters.offset ?? 0);
    const rows = await query(
      `SELECT id, title, message, type, reference_type, reference_id, is_read, read_at, created_at
       FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [userId, limit, offset]
    );
    return rows.map(row => ({ id: Number(row.id), title: row.title, message: row.message, type: row.type, referenceType: row.reference_type ?? null, referenceId: row.reference_id == null ? null : Number(row.reference_id), isRead: Boolean(row.is_read), readAt: row.read_at, createdAt: row.created_at }));
  },
  /** Đánh dấu TẤT CẢ thông báo chưa đọc của chính người dùng là đã đọc (không xoá, không đụng thông báo người khác). Trả số dòng đã đổi. */
  async markAllRead(userId) {
    const result = await query('UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = FALSE', [userId]);
    return Number(result.affectedRows ?? 0);
  },
  async markRead(userId, notificationId) {
    const result = await query(
      `UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`, [notificationId, userId]
    );
    return result.affectedRows > 0;
  }
};
