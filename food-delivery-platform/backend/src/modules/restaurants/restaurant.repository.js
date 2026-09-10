import { query, withTransaction } from '../../shared/database/mysql.js';

const restaurantSelect = `
  SELECT
    r.id,
    r.owner_user_id,
    u.username AS owner_username,
    u.email AS owner_email,
    r.category_id,
    rc.name AS category_name,
    r.name,
    r.description,
    r.phone,
    r.email,
    r.address,
    r.ward,
    r.district,
    r.city,
    r.latitude,
    r.longitude,
    TIME_FORMAT(r.opening_time, '%H:%i:%s') AS opening_time,
    TIME_FORMAT(r.closing_time, '%H:%i:%s') AS closing_time,
    r.minimum_order,
    r.average_prepare_time,
    r.rating,
    r.total_reviews,
    r.total_orders,
    r.total_revenue,
    r.commission_rate,
    r.status,
    r.created_at,
    r.updated_at
  FROM restaurants r
  INNER JOIN users u
    ON u.id = r.owner_user_id
  LEFT JOIN restaurant_categories rc
    ON rc.id = r.category_id
`;

const categorySelect = `
  SELECT
    id,
    name,
    description,
    image_url,
    status,
    created_at,
    updated_at
  FROM restaurant_categories
`;

export const restaurantRepository = {
  async listPublicCategories() {
    const rows = await query(
      `
        ${categorySelect}
        WHERE status = 'ACTIVE'
        ORDER BY name ASC, id ASC
      `
    );
    return rows.map(mapCategory);
  },

  async listCategoriesForAdmin() {
    const rows = await query(
      `
        ${categorySelect}
        ORDER BY status ASC, name ASC, id ASC
      `
    );
    return rows.map(mapCategory);
  },

  async findCategoryById(categoryId) {
    const rows = await query(
      `
        ${categorySelect}
        WHERE id = ?
        LIMIT 1
      `,
      [categoryId]
    );
    return rows[0] ? mapCategory(rows[0]) : null;
  },

  async isActiveCategory(categoryId) {
    if (categoryId === null) {
      return true;
    }

    const rows = await query(
      `
        SELECT id
        FROM restaurant_categories
        WHERE id = ?
          AND status = 'ACTIVE'
        LIMIT 1
      `,
      [categoryId]
    );
    return rows.length > 0;
  },

  async createCategory(input) {
    const result = await query(
      `
        INSERT INTO restaurant_categories (
          name,
          description,
          image_url,
          status
        )
        VALUES (?, ?, ?, ?)
      `,
      [input.name, input.description, input.imageUrl, input.status]
    );
    return Number(result.insertId);
  },

  async updateCategory(categoryId, input) {
    const result = await query(
      `
        UPDATE restaurant_categories
        SET
          name = ?,
          description = ?,
          image_url = ?,
          status = ?
        WHERE id = ?
      `,
      [input.name, input.description, input.imageUrl, input.status, categoryId]
    );
    return result.affectedRows > 0;
  },

  async deactivateCategory(categoryId) {
    const result = await query(
      `
        UPDATE restaurant_categories
        SET status = 'INACTIVE'
        WHERE id = ?
      `,
      [categoryId]
    );
    return result.affectedRows > 0;
  },

  async listForOwner(userId) {
    const rows = await query(
      `
        ${restaurantSelect}
        WHERE r.owner_user_id = ?
          AND r.deleted_at IS NULL
        ORDER BY r.updated_at DESC, r.id DESC
      `,
      [userId]
    );
    return rows.map(mapRestaurant);
  },

  async findForOwner(userId, restaurantId) {
    const rows = await query(
      `
        ${restaurantSelect}
        WHERE r.owner_user_id = ?
          AND r.id = ?
          AND r.deleted_at IS NULL
        LIMIT 1
      `,
      [userId, restaurantId]
    );
    return rows[0] ? loadRestaurantDetail(mapRestaurant(rows[0])) : null;
  },

  async findForAdmin(restaurantId) {
    const rows = await query(
      `
        ${restaurantSelect}
        WHERE r.id = ?
          AND r.deleted_at IS NULL
        LIMIT 1
      `,
      [restaurantId]
    );
    return rows[0] ? loadRestaurantDetail(mapRestaurant(rows[0])) : null;
  },

  async listForAdmin(filters) {
    const where = ['r.deleted_at IS NULL'];
    const params = [];

    if (filters.status) {
      where.push('r.status = ?');
      params.push(filters.status);
    }
    if (filters.categoryId) {
      where.push('r.category_id = ?');
      params.push(filters.categoryId);
    }
    if (filters.ownerUserId) {
      where.push('r.owner_user_id = ?');
      params.push(filters.ownerUserId);
    }
    if (filters.keyword) {
      where.push('(r.name LIKE ? OR r.email LIKE ? OR u.username LIKE ?)');
      const keyword = `%${filters.keyword}%`;
      params.push(keyword, keyword, keyword);
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;
    const totalRows = await query(
      `
        SELECT COUNT(*) AS total
        FROM restaurants r
        INNER JOIN users u
          ON u.id = r.owner_user_id
        ${whereSql}
      `,
      params
    );
    const rows = await query(
      `
        ${restaurantSelect}
        ${whereSql}
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT ? OFFSET ?
      `,
      [...params, filters.pageSize, filters.offset]
    );

    return {
      items: rows.map(mapRestaurant),
      totalItems: Number(totalRows[0]?.total ?? 0)
    };
  },

  async createForAdmin(input) {
    return withTransaction(async connection => {
      const ownerRows = await connection.execute(
        `
          SELECT u.id
          FROM users u
          INNER JOIN roles ro
            ON ro.id = u.role_id
          WHERE u.id = ?
            AND ro.name = 'RESTAURANT'
            AND u.status = 'ACTIVE'
            AND u.deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [input.ownerUserId]
      );
      if (ownerRows.length === 0) {
        return { error: 'OWNER_NOT_FOUND' };
      }

      if (input.categoryId !== null) {
        const categoryRows = await connection.execute(
          `
            SELECT id
            FROM restaurant_categories
            WHERE id = ?
              AND status = 'ACTIVE'
            LIMIT 1
          `,
          [input.categoryId]
        );
        if (categoryRows.length === 0) {
          return { error: 'CATEGORY_NOT_FOUND' };
        }
      }

      const result = await connection.execute(
        `
          INSERT INTO restaurants (
            owner_user_id,
            category_id,
            name,
            description,
            phone,
            email,
            address,
            ward,
            district,
            city,
            latitude,
            longitude,
            opening_time,
            closing_time,
            minimum_order,
            average_prepare_time,
            commission_rate,
            status
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        restaurantValues(input, [
          input.ownerUserId,
          input.commissionRate,
          input.status
        ])
      );

      return { restaurantId: Number(result.insertId) };
    });
  },

  async updateForOwner(userId, restaurantId, input) {
    return withTransaction(async connection => {
      const ownedRows = await lockRestaurant(connection, restaurantId, userId);
      if (ownedRows.length === 0) {
        return { error: 'NOT_FOUND' };
      }

      if (!await categoryIsActive(connection, input.categoryId)) {
        return { error: 'CATEGORY_NOT_FOUND' };
      }

      await updateRestaurantProfile(connection, restaurantId, input);
      return { updated: true };
    });
  },

  async updateForAdmin(restaurantId, input) {
    return withTransaction(async connection => {
      const rows = await lockRestaurant(connection, restaurantId);
      if (rows.length === 0) {
        return { error: 'NOT_FOUND' };
      }

      if (!await categoryIsActive(connection, input.categoryId)) {
        return { error: 'CATEGORY_NOT_FOUND' };
      }

      await updateRestaurantProfile(connection, restaurantId, input);
      return { updated: true };
    });
  },

  async updateStateForAdmin(restaurantId, input) {
    const result = await query(
      `
        UPDATE restaurants
        SET
          status = ?,
          commission_rate = ?
        WHERE id = ?
          AND deleted_at IS NULL
      `,
      [input.status, input.commissionRate, restaurantId]
    );
    return result.affectedRows > 0;
  },

  async softDeleteForOwner(userId, restaurantId) {
    const result = await query(
      `
        UPDATE restaurants
        SET
          status = 'INACTIVE',
          deleted_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND owner_user_id = ?
          AND deleted_at IS NULL
      `,
      [restaurantId, userId]
    );
    return result.affectedRows > 0;
  },

  async softDeleteForAdmin(restaurantId) {
    const result = await query(
      `
        UPDATE restaurants
        SET
          status = 'INACTIVE',
          deleted_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND deleted_at IS NULL
      `,
      [restaurantId]
    );
    return result.affectedRows > 0;
  },

  async replaceOperatingHours(userId, restaurantId, operatingHours) {
    return withTransaction(async connection => {
      const ownedRows = await lockRestaurant(connection, restaurantId, userId);
      if (ownedRows.length === 0) {
        return null;
      }

      const currentRows = await connection.execute(
        `
          SELECT day_of_week, open_time, close_time, is_closed
          FROM restaurant_operating_hours
          WHERE restaurant_id = ?
          ORDER BY day_of_week ASC
          FOR UPDATE
        `,
        [restaurantId]
      );

      await connection.execute(
        'DELETE FROM restaurant_operating_hours WHERE restaurant_id = ?',
        [restaurantId]
      );

      for (const item of operatingHours) {
        await connection.execute(
          `
            INSERT INTO restaurant_operating_hours (
              restaurant_id,
              day_of_week,
              open_time,
              close_time,
              is_closed
            )
            VALUES (?, ?, ?, ?, ?)
          `,
          [
            restaurantId,
            item.dayOfWeek,
            item.openTime,
            item.closeTime,
            item.isClosed ? 1 : 0
          ]
        );
      }

      return {
        before: currentRows.map(mapOperatingHour),
        after: operatingHours
      };
    });
  },

  async addImage(userId, restaurantId, input) {
    return withTransaction(async connection => {
      const ownedRows = await lockRestaurant(connection, restaurantId, userId);
      if (ownedRows.length === 0) {
        return { error: 'NOT_FOUND' };
      }

      if (input.imageType !== 'GALLERY') {
        const existingRows = await connection.execute(
          `
            SELECT id
            FROM restaurant_images
            WHERE restaurant_id = ?
              AND image_type = ?
            LIMIT 1
            FOR UPDATE
          `,
          [restaurantId, input.imageType]
        );
        if (existingRows.length > 0) {
          return { error: 'IMAGE_TYPE_EXISTS' };
        }
      }

      const result = await connection.execute(
        `
          INSERT INTO restaurant_images (
            restaurant_id,
            image_url,
            image_type,
            sort_order
          )
          VALUES (?, ?, ?, ?)
        `,
        [restaurantId, input.imageUrl, input.imageType, input.sortOrder]
      );
      return { imageId: Number(result.insertId) };
    });
  },

  async findOwnedImage(userId, restaurantId, imageId) {
    const rows = await query(
      `
        SELECT ri.id, ri.restaurant_id, ri.image_url, ri.image_type, ri.sort_order, ri.created_at
        FROM restaurant_images ri
        INNER JOIN restaurants r
          ON r.id = ri.restaurant_id
        WHERE r.owner_user_id = ?
          AND r.id = ?
          AND ri.id = ?
          AND r.deleted_at IS NULL
        LIMIT 1
      `,
      [userId, restaurantId, imageId]
    );
    return rows[0] ? mapImage(rows[0]) : null;
  },

  async updateImage(userId, restaurantId, imageId, input) {
    return withTransaction(async connection => {
      const imageRows = await connection.execute(
        `
          SELECT ri.id, ri.restaurant_id, ri.image_url, ri.image_type, ri.sort_order, ri.created_at
          FROM restaurant_images ri
          INNER JOIN restaurants r
            ON r.id = ri.restaurant_id
          WHERE r.owner_user_id = ?
            AND r.id = ?
            AND ri.id = ?
            AND r.deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [userId, restaurantId, imageId]
      );
      if (imageRows.length === 0) {
        return { error: 'NOT_FOUND' };
      }

      if (input.imageType !== 'GALLERY') {
        const duplicateRows = await connection.execute(
          `
            SELECT id
            FROM restaurant_images
            WHERE restaurant_id = ?
              AND image_type = ?
              AND id <> ?
            LIMIT 1
            FOR UPDATE
          `,
          [restaurantId, input.imageType, imageId]
        );
        if (duplicateRows.length > 0) {
          return { error: 'IMAGE_TYPE_EXISTS' };
        }
      }

      await connection.execute(
        `
          UPDATE restaurant_images
          SET
            image_url = ?,
            image_type = ?,
            sort_order = ?
          WHERE id = ?
            AND restaurant_id = ?
        `,
        [input.imageUrl, input.imageType, input.sortOrder, imageId, restaurantId]
      );
      const updatedRows = await connection.execute(
        `
          SELECT id, restaurant_id, image_url, image_type, sort_order, created_at
          FROM restaurant_images
          WHERE id = ?
          LIMIT 1
        `,
        [imageId]
      );

      return {
        before: mapImage(imageRows[0]),
        after: mapImage(updatedRows[0])
      };
    });
  },

  async deleteImage(userId, restaurantId, imageId) {
    return withTransaction(async connection => {
      const imageRows = await connection.execute(
        `
          SELECT ri.id, ri.restaurant_id, ri.image_url, ri.image_type, ri.sort_order, ri.created_at
          FROM restaurant_images ri
          INNER JOIN restaurants r
            ON r.id = ri.restaurant_id
          WHERE r.owner_user_id = ?
            AND r.id = ?
            AND ri.id = ?
            AND r.deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [userId, restaurantId, imageId]
      );
      if (imageRows.length === 0) {
        return null;
      }

      await connection.execute(
        'DELETE FROM restaurant_images WHERE id = ? AND restaurant_id = ?',
        [imageId, restaurantId]
      );
      return mapImage(imageRows[0]);
    });
  }
};

async function loadRestaurantDetail(restaurant) {
  const operatingHourRows = await query(
    `
      SELECT day_of_week, open_time, close_time, is_closed
      FROM restaurant_operating_hours
      WHERE restaurant_id = ?
      ORDER BY day_of_week ASC
    `,
    [restaurant.id]
  );
  const imageRows = await query(
    `
      SELECT id, restaurant_id, image_url, image_type, sort_order, created_at
      FROM restaurant_images
      WHERE restaurant_id = ?
      ORDER BY sort_order ASC, id ASC
    `,
    [restaurant.id]
  );

  return {
    ...restaurant,
    operatingHours: operatingHourRows.map(mapOperatingHour),
    images: imageRows.map(mapImage)
  };
}

async function lockRestaurant(connection, restaurantId, ownerUserId = null) {
  const ownerClause = ownerUserId === null ? '' : 'AND owner_user_id = ?';
  const params = ownerUserId === null
    ? [restaurantId]
    : [restaurantId, ownerUserId];
  return connection.execute(
    `
      SELECT id
      FROM restaurants
      WHERE id = ?
        ${ownerClause}
        AND deleted_at IS NULL
      LIMIT 1
      FOR UPDATE
    `,
    params
  );
}

async function categoryIsActive(connection, categoryId) {
  if (categoryId === null) {
    return true;
  }
  const rows = await connection.execute(
    `
      SELECT id
      FROM restaurant_categories
      WHERE id = ?
        AND status = 'ACTIVE'
      LIMIT 1
    `,
    [categoryId]
  );
  return rows.length > 0;
}

async function updateRestaurantProfile(connection, restaurantId, input) {
  await connection.execute(
    `
      UPDATE restaurants
      SET
        category_id = ?,
        name = ?,
        description = ?,
        phone = ?,
        email = ?,
        address = ?,
        ward = ?,
        district = ?,
        city = ?,
        latitude = ?,
        longitude = ?,
        opening_time = ?,
        closing_time = ?,
        minimum_order = ?,
        average_prepare_time = ?
      WHERE id = ?
        AND deleted_at IS NULL
    `,
    [...restaurantValues(input), restaurantId]
  );
}

function restaurantValues(input, surroundingValues = []) {
  const profileValues = [
    input.categoryId,
    input.name,
    input.description,
    input.phone,
    input.email,
    input.address,
    input.ward,
    input.district,
    input.city,
    input.latitude,
    input.longitude,
    input.openingTime,
    input.closingTime,
    input.minimumOrder,
    input.averagePrepareTime
  ];

  if (surroundingValues.length === 0) {
    return profileValues;
  }
  return [surroundingValues[0], ...profileValues, ...surroundingValues.slice(1)];
}

function mapRestaurant(row) {
  return {
    id: Number(row.id),
    ownerUserId: Number(row.owner_user_id),
    ownerUsername: row.owner_username,
    ownerEmail: row.owner_email,
    categoryId: row.category_id === null ? null : Number(row.category_id),
    categoryName: row.category_name ?? null,
    name: row.name,
    description: row.description ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    address: row.address,
    ward: row.ward ?? null,
    district: row.district ?? null,
    city: row.city,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    openingTime: row.opening_time ?? null,
    closingTime: row.closing_time ?? null,
    minimumOrder: Number(row.minimum_order),
    averagePrepareTime: Number(row.average_prepare_time),
    rating: Number(row.rating),
    totalReviews: Number(row.total_reviews),
    totalOrders: Number(row.total_orders),
    totalRevenue: Number(row.total_revenue),
    commissionRate: Number(row.commission_rate),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapOperatingHour(row) {
  return {
    dayOfWeek: Number(row.day_of_week),
    openTime: row.open_time ?? null,
    closeTime: row.close_time ?? null,
    isClosed: Number(row.is_closed) === 1
  };
}

function mapImage(row) {
  return {
    id: Number(row.id),
    restaurantId: Number(row.restaurant_id),
    imageUrl: row.image_url,
    imageType: row.image_type,
    sortOrder: Number(row.sort_order),
    createdAt: row.created_at
  };
}

function mapCategory(row) {
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description ?? null,
    imageUrl: row.image_url ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
