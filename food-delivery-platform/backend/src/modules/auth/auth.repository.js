import { query, withTransaction } from '../../shared/database/mysql.js';

export const authRepository = {
  async findRoleByName(name) {
    const rows = await query(
      `
        SELECT id, name
        FROM roles
        WHERE name = ?
        LIMIT 1
      `,
      [name]
    );

    return rows[0] ?? null;
  },

  async findUserByEmailOrUsername(identifier) {
    const rows = await query(
      `
        SELECT
          u.id,
          u.role_id,
          r.name AS role_name,
          u.username,
          u.email,
          u.phone,
          u.password_hash,
          u.avatar_url,
          u.status,
          u.email_verified_at,
          u.phone_verified_at,
          u.last_login_at,
          u.created_at,
          cp.id AS customer_id,
          cp.full_name,
          cp.date_of_birth,
          cp.gender,
          cp.loyalty_points,
          cp.total_orders,
          cp.total_spent
        FROM users u
        INNER JOIN roles r
          ON r.id = u.role_id
        LEFT JOIN customer_profiles cp
          ON cp.user_id = u.id
        WHERE u.deleted_at IS NULL
          AND (u.email = ? OR u.username = ?)
        LIMIT 1
      `,
      [identifier, identifier]
    );

    return rows[0] ? mapUser(rows[0]) : null;
  },

  async findUserById(userId) {
    const rows = await query(
      `
        SELECT
          u.id,
          u.role_id,
          r.name AS role_name,
          u.username,
          u.email,
          u.phone,
          u.password_hash,
          u.avatar_url,
          u.status,
          u.email_verified_at,
          u.phone_verified_at,
          u.last_login_at,
          u.created_at,
          cp.id AS customer_id,
          cp.full_name,
          cp.date_of_birth,
          cp.gender,
          cp.loyalty_points,
          cp.total_orders,
          cp.total_spent
        FROM users u
        INNER JOIN roles r
          ON r.id = u.role_id
        LEFT JOIN customer_profiles cp
          ON cp.user_id = u.id
        WHERE u.id = ?
          AND u.deleted_at IS NULL
        LIMIT 1
      `,
      [userId]
    );

    return rows[0] ? mapUser(rows[0]) : null;
  },

  async findExistingAccount(input) {
    const checks = [];
    const params = [];

    if (input.username) {
      checks.push('username = ?');
      params.push(input.username);
    }

    if (input.email) {
      checks.push('email = ?');
      params.push(input.email);
    }

    if (input.phone) {
      checks.push('phone = ?');
      params.push(input.phone);
    }

    if (checks.length === 0) {
      return null;
    }

    const rows = await query(
      `
        SELECT username, email, phone
        FROM users
        WHERE deleted_at IS NULL
          AND (${checks.join(' OR ')})
        LIMIT 1
      `,
      params
    );

    return rows[0] ?? null;
  },

  async createCustomerUser(input) {
    return withTransaction(async connection => {
      const userResult = await connection.execute(
        `
          INSERT INTO users (
            role_id,
            username,
            email,
            phone,
            password_hash,
            status
          )
          VALUES (?, ?, ?, ?, ?, 'ACTIVE')
        `,
        [
          input.roleId,
          input.username,
          input.email,
          input.phone,
          input.passwordHash
        ]
      );

      const userId = Number(userResult.insertId);

      const profileResult = await connection.execute(
        `
          INSERT INTO customer_profiles (
            user_id,
            full_name,
            date_of_birth,
            gender
          )
          VALUES (?, ?, ?, ?)
        `,
        [
          userId,
          input.fullName,
          input.dateOfBirth,
          input.gender
        ]
      );

      return {
        userId,
        customerId: Number(profileResult.insertId)
      };
    });
  },

  async updateLastLogin(userId) {
    await query(
      `
        UPDATE users
        SET last_login_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [userId]
    );
  },

  async addLoginHistory(input) {
    await query(
      `
        INSERT INTO login_history (
          user_id,
          email_attempted,
          ip_address,
          user_agent,
          success
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        input.userId,
        input.emailAttempted,
        input.ipAddress,
        input.userAgent,
        input.success
      ]
    );
  },

  async addRefreshToken(input) {
    await query(
      `
        INSERT INTO refresh_tokens (
          user_id,
          token_hash,
          expires_at
        )
        VALUES (?, ?, ?)
      `,
      [
        input.userId,
        input.tokenHash,
        input.expiresAt
      ]
    );
  },

  async findRefreshToken(tokenHash) {
    const rows = await query(
      `
        SELECT
          rt.id,
          rt.user_id,
          rt.expires_at,
          rt.revoked_at
        FROM refresh_tokens rt
        WHERE rt.token_hash = ?
        LIMIT 1
      `,
      [tokenHash]
    );

    return rows[0] ?? null;
  },

  async revokeRefreshToken(tokenHash) {
    await query(
      `
        UPDATE refresh_tokens
        SET revoked_at = CURRENT_TIMESTAMP
        WHERE token_hash = ?
          AND revoked_at IS NULL
      `,
      [tokenHash]
    );
  }
};

function mapUser(row) {
  return {
    id: Number(row.id),
    roleId: Number(row.role_id),
    role: row.role_name,
    username: row.username,
    email: row.email,
    phone: row.phone ?? null,
    passwordHash: row.password_hash,
    avatarUrl: row.avatar_url ?? null,
    status: row.status,
    emailVerifiedAt: row.email_verified_at ?? null,
    phoneVerifiedAt: row.phone_verified_at ?? null,
    lastLoginAt: row.last_login_at ?? null,
    createdAt: row.created_at,
    customerProfile: row.customer_id
      ? {
          id: Number(row.customer_id),
          fullName: row.full_name,
          dateOfBirth: row.date_of_birth ?? null,
          gender: row.gender ?? null,
          loyaltyPoints: Number(row.loyalty_points ?? 0),
          totalOrders: Number(row.total_orders ?? 0),
          totalSpent: Number(row.total_spent ?? 0)
        }
      : null
  };
}
