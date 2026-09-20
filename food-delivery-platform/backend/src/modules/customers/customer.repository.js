import { query, withTransaction } from '../../shared/database/mysql.js';

const profileSelect = `
  SELECT
    u.id AS user_id,
    u.username,
    u.email,
    u.phone,
    u.avatar_url,
    u.status,
    u.email_verified_at,
    u.phone_verified_at,
    cp.id AS customer_id,
    cp.full_name,
    cp.date_of_birth,
    cp.gender,
    cp.loyalty_points,
    cp.total_orders,
    cp.total_spent,
    cp.created_at,
    cp.updated_at
  FROM users u
  INNER JOIN customer_profiles cp
    ON cp.user_id = u.id
`;

export const customerRepository = {
  async findProfileByUserId(userId) {
    const rows = await query(
      `
        ${profileSelect}
        WHERE u.id = ?
          AND u.deleted_at IS NULL
        LIMIT 1
      `,
      [userId]
    );

    return rows[0] ? mapCustomerProfile(rows[0]) : null;
  },

  async updateProfileForUser(userId, input) {
    return withTransaction(async connection => {
      const rows = await connection.execute(
        `
          ${profileSelect}
          WHERE u.id = ?
            AND u.deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [userId]
      );

      if (rows.length === 0) {
        return null;
      }

      const before = mapCustomerProfile(rows[0]);

      await connection.execute(
        `
          UPDATE users
          SET
            phone = ?,
            avatar_url = ?
          WHERE id = ?
            AND deleted_at IS NULL
        `,
        [input.phone, input.avatarUrl, userId]
      );

      await connection.execute(
        `
          UPDATE customer_profiles
          SET
            full_name = ?,
            date_of_birth = ?,
            gender = ?
          WHERE user_id = ?
        `,
        [input.fullName, input.dateOfBirth, input.gender, userId]
      );

      const afterRows = await connection.execute(
        `
          ${profileSelect}
          WHERE u.id = ?
            AND u.deleted_at IS NULL
          LIMIT 1
        `,
        [userId]
      );

      return {
        before,
        after: afterRows[0] ? mapCustomerProfile(afterRows[0]) : null
      };
    });
  }
};

function mapCustomerProfile(row) {
  return {
    userId: Number(row.user_id),
    username: row.username,
    email: row.email,
    phone: row.phone ?? null,
    avatarUrl: row.avatar_url ?? null,
    status: row.status,
    emailVerifiedAt: row.email_verified_at ?? null,
    phoneVerifiedAt: row.phone_verified_at ?? null,
    customerId: Number(row.customer_id),
    fullName: row.full_name,
    dateOfBirth: row.date_of_birth ?? null,
    gender: row.gender ?? null,
    loyaltyPoints: Number(row.loyalty_points ?? 0),
    totalOrders: Number(row.total_orders ?? 0),
    totalSpent: Number(row.total_spent ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
