import { query } from '../../shared/database/mysql.js';

export const auditLogRepository = {
  async add(input) {
    await query(
      `
        INSERT INTO audit_logs (
          user_id,
          action,
          entity_type,
          entity_id,
          old_values,
          new_values,
          ip_address,
          user_agent
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.userId,
        input.action,
        input.entityType,
        input.entityId,
        input.oldValuesJson,
        input.newValuesJson,
        input.ipAddress,
        input.userAgent
      ]
    );
  },

  async search(filters) {
    const where = [];
    const params = [];

    if (filters.userId) {
      where.push('al.user_id = ?');
      params.push(filters.userId);
    }

    if (filters.action) {
      where.push('al.action = ?');
      params.push(filters.action);
    }

    if (filters.entityType) {
      where.push('al.entity_type = ?');
      params.push(filters.entityType);
    }

    if (filters.from) {
      where.push('al.created_at >= ?');
      params.push(filters.from);
    }

    if (filters.to) {
      where.push('al.created_at <= ?');
      params.push(filters.to);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const totalRows = await query(
      `
        SELECT COUNT(*) AS total
        FROM audit_logs al
        ${whereSql}
      `,
      params
    );

    const rows = await query(
      `
        SELECT
          al.id,
          al.user_id,
          u.username,
          al.action,
          al.entity_type,
          al.entity_id,
          CAST(al.old_values AS CHAR) AS old_values_json,
          CAST(al.new_values AS CHAR) AS new_values_json,
          al.ip_address,
          al.user_agent,
          al.created_at
        FROM audit_logs al
        LEFT JOIN users u
          ON u.id = al.user_id
        ${whereSql}
        ORDER BY al.created_at DESC, al.id DESC
        LIMIT ? OFFSET ?
      `,
      [...params, filters.pageSize, filters.offset]
    );

    return {
      items: rows.map(mapAuditLog),
      totalItems: Number(totalRows[0]?.total ?? 0)
    };
  }
};

function mapAuditLog(row) {
  return {
    id: Number(row.id),
    userId: row.user_id === null ? null : Number(row.user_id),
    username: row.username ?? null,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id === null ? null : Number(row.entity_id),
    oldValuesJson: row.old_values_json ?? null,
    newValuesJson: row.new_values_json ?? null,
    ipAddress: row.ip_address ?? null,
    userAgent: row.user_agent ?? null,
    createdAt: row.created_at
  };
}
