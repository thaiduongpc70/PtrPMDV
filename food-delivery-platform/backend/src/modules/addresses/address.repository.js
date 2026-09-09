import { query, withTransaction } from '../../shared/database/mysql.js';

const addressSelect = `
  SELECT
    ca.id,
    ca.customer_id,
    ca.label,
    ca.receiver_name,
    ca.receiver_phone,
    ca.address_line,
    ca.ward,
    ca.district,
    ca.city,
    ca.latitude,
    ca.longitude,
    ca.is_default,
    ca.created_at,
    ca.updated_at
  FROM customer_addresses ca
  INNER JOIN customer_profiles cp
    ON cp.id = ca.customer_id
`;

export const addressRepository = {
  async findCustomerIdByUserId(userId) {
    const rows = await query(
      `
        SELECT cp.id
        FROM customer_profiles cp
        WHERE cp.user_id = ?
        LIMIT 1
      `,
      [userId]
    );

    return rows[0] ? Number(rows[0].id) : null;
  },

  async listForUser(userId) {
    const rows = await query(
      `
        ${addressSelect}
        WHERE cp.user_id = ?
          AND ca.deleted_at IS NULL
        ORDER BY ca.is_default DESC, ca.updated_at DESC, ca.id DESC
      `,
      [userId]
    );

    return rows.map(mapAddress);
  },

  async findForUser(userId, addressId) {
    const rows = await query(
      `
        ${addressSelect}
        WHERE cp.user_id = ?
          AND ca.id = ?
          AND ca.deleted_at IS NULL
        LIMIT 1
      `,
      [userId, addressId]
    );

    return rows[0] ? mapAddress(rows[0]) : null;
  },

  async createForUser(userId, input) {
    return withTransaction(async connection => {
      const profileRows = await connection.execute(
        `
          SELECT cp.id
          FROM customer_profiles cp
          WHERE cp.user_id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [userId]
      );

      if (profileRows.length === 0) {
        return null;
      }

      const customerId = Number(profileRows[0].id);
      const activeAddressRows = await connection.execute(
        `
          SELECT id
          FROM customer_addresses
          WHERE customer_id = ?
            AND deleted_at IS NULL
          LIMIT 1
        `,
        [customerId]
      );
      const shouldBeDefault = input.isDefault || activeAddressRows.length === 0;

      if (shouldBeDefault) {
        await connection.execute(
          `
            UPDATE customer_addresses
            SET is_default = FALSE
            WHERE customer_id = ?
              AND deleted_at IS NULL
          `,
          [customerId]
        );
      }

      const result = await connection.execute(
        `
          INSERT INTO customer_addresses (
            customer_id,
            label,
            receiver_name,
            receiver_phone,
            address_line,
            ward,
            district,
            city,
            latitude,
            longitude,
            is_default
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          customerId,
          input.label,
          input.receiverName,
          input.receiverPhone,
          input.addressLine,
          input.ward,
          input.district,
          input.city,
          input.latitude,
          input.longitude,
          shouldBeDefault ? 1 : 0
        ]
      );

      return {
        addressId: Number(result.insertId),
        customerId,
        isDefault: shouldBeDefault
      };
    });
  },

  async updateForUser(userId, addressId, input) {
    return withTransaction(async connection => {
      const currentRows = await connection.execute(
        `
          ${addressSelect}
          WHERE cp.user_id = ?
            AND ca.id = ?
            AND ca.deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [userId, addressId]
      );

      if (currentRows.length === 0) {
        return null;
      }

      const current = mapAddress(currentRows[0]);

      if (input.isDefault) {
        await connection.execute(
          `
            UPDATE customer_addresses
            SET is_default = FALSE
            WHERE customer_id = ?
              AND id <> ?
              AND deleted_at IS NULL
          `,
          [current.customerId, addressId]
        );
      }

      await connection.execute(
        `
          UPDATE customer_addresses
          SET
            label = ?,
            receiver_name = ?,
            receiver_phone = ?,
            address_line = ?,
            ward = ?,
            district = ?,
            city = ?,
            latitude = ?,
            longitude = ?,
            is_default = ?
          WHERE id = ?
            AND customer_id = ?
            AND deleted_at IS NULL
        `,
        [
          input.label,
          input.receiverName,
          input.receiverPhone,
          input.addressLine,
          input.ward,
          input.district,
          input.city,
          input.latitude,
          input.longitude,
          input.isDefault ? 1 : 0,
          addressId,
          current.customerId
        ]
      );

      const updatedRows = await connection.execute(
        `
          ${addressSelect}
          WHERE ca.id = ?
            AND ca.customer_id = ?
            AND ca.deleted_at IS NULL
          LIMIT 1
        `,
        [addressId, current.customerId]
      );

      return {
        before: current,
        after: updatedRows[0] ? mapAddress(updatedRows[0]) : null
      };
    });
  },

  async setDefaultForUser(userId, addressId) {
    return withTransaction(async connection => {
      const currentRows = await connection.execute(
        `
          ${addressSelect}
          WHERE cp.user_id = ?
            AND ca.id = ?
            AND ca.deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [userId, addressId]
      );

      if (currentRows.length === 0) {
        return null;
      }

      const current = mapAddress(currentRows[0]);
      const previousDefaultRows = await connection.execute(
        `
          SELECT id
          FROM customer_addresses
          WHERE customer_id = ?
            AND id <> ?
            AND is_default = TRUE
            AND deleted_at IS NULL
          ORDER BY id ASC
          LIMIT 1
        `,
        [current.customerId, addressId]
      );
      const previousDefaultId = current.isDefault
        ? current.id
        : previousDefaultRows[0]
          ? Number(previousDefaultRows[0].id)
          : null;

      await connection.execute(
        `
          UPDATE customer_addresses
          SET is_default = FALSE
          WHERE customer_id = ?
            AND deleted_at IS NULL
        `,
        [current.customerId]
      );

      await connection.execute(
        `
          UPDATE customer_addresses
          SET is_default = TRUE
          WHERE id = ?
            AND customer_id = ?
            AND deleted_at IS NULL
        `,
        [addressId, current.customerId]
      );

      const updatedRows = await connection.execute(
        `
          ${addressSelect}
          WHERE ca.id = ?
            AND ca.customer_id = ?
            AND ca.deleted_at IS NULL
          LIMIT 1
        `,
        [addressId, current.customerId]
      );

      return {
        before: current,
        after: updatedRows[0] ? mapAddress(updatedRows[0]) : null,
        previousDefaultId
      };
    });
  },

  async deleteForUser(userId, addressId) {
    return withTransaction(async connection => {
      const currentRows = await connection.execute(
        `
          ${addressSelect}
          WHERE cp.user_id = ?
            AND ca.id = ?
            AND ca.deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [userId, addressId]
      );

      if (currentRows.length === 0) {
        return null;
      }

      const current = mapAddress(currentRows[0]);
      let replacementDefaultAddressId = null;

      if (current.isDefault) {
        const replacementRows = await connection.execute(
          `
            SELECT id
            FROM customer_addresses
            WHERE customer_id = ?
              AND id <> ?
              AND deleted_at IS NULL
            ORDER BY created_at ASC, id ASC
            LIMIT 1
          `,
          [current.customerId, addressId]
        );

        if (replacementRows[0]) {
          replacementDefaultAddressId = Number(replacementRows[0].id);
          await connection.execute(
            `
              UPDATE customer_addresses
              SET is_default = TRUE
              WHERE id = ?
                AND customer_id = ?
                AND deleted_at IS NULL
            `,
            [replacementDefaultAddressId, current.customerId]
          );
        }
      }

      await connection.execute(
        `
          UPDATE customer_addresses
          SET
            is_default = FALSE,
            deleted_at = CURRENT_TIMESTAMP
          WHERE id = ?
            AND customer_id = ?
            AND deleted_at IS NULL
        `,
        [addressId, current.customerId]
      );

      return {
        before: current,
        replacementDefaultAddressId
      };
    });
  }
};

function mapAddress(row) {
  return {
    id: Number(row.id),
    customerId: Number(row.customer_id),
    label: row.label ?? null,
    receiverName: row.receiver_name,
    receiverPhone: row.receiver_phone,
    addressLine: row.address_line,
    ward: row.ward ?? null,
    district: row.district ?? null,
    city: row.city,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    isDefault: Number(row.is_default) === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
