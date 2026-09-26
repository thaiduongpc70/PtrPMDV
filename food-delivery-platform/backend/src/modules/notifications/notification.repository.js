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
  async listForUser(userId, filters = {}) {
    const limit = Math.min(Math.max(Number(filters.limit) || 30, 1), 100);
    const rows = await query(
      `SELECT id, title, message, type, reference_type, reference_id, is_read, read_at, created_at
       FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`, [userId, limit]
    );
    return rows.map(row => ({ id: Number(row.id), title: row.title, message: row.message, type: row.type, referenceType: row.reference_type ?? null, referenceId: row.reference_id == null ? null : Number(row.reference_id), isRead: Boolean(row.is_read), readAt: row.read_at, createdAt: row.created_at }));
  },
  async markRead(userId, notificationId) {
    const result = await query(
      `UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`, [notificationId, userId]
    );
    return result.affectedRows > 0;
  }
};
