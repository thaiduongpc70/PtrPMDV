import { query, withTransaction } from '../../shared/database/mysql.js';

export const engagementRepository = {
  async ownsRestaurant(userId, restaurantId) {
    const rows = await query(
      `SELECT id FROM restaurants WHERE id = ? AND owner_user_id = ? AND deleted_at IS NULL LIMIT 1`,
      [restaurantId, userId]
    );
    return rows.length > 0;
  },
  async listPromotions(filters = {}) {
    const where = ["p.status = 'ACTIVE'", 'p.deleted_at IS NULL', '(p.start_at IS NULL OR p.start_at <= CURRENT_TIMESTAMP)', '(p.end_at IS NULL OR p.end_at >= CURRENT_TIMESTAMP)'];
    const params = [];
    if (filters.restaurantId) { where.push('(p.restaurant_id IS NULL OR p.restaurant_id = ?)'); params.push(filters.restaurantId); }
    const rows = await query(
      `SELECT p.id, p.restaurant_id, r.name AS restaurant_name, p.code, p.name, p.description,
              p.discount_type, p.discount_value, p.max_discount, p.minimum_order,
              p.start_at, p.end_at, p.usage_limit, p.usage_per_customer, p.used_count, p.status
       FROM promotions p LEFT JOIN restaurants r ON r.id = p.restaurant_id
       WHERE ${where.join(' AND ')} ORDER BY p.end_at ASC, p.id DESC`, params
    );
    return rows.map(mapPromotion);
  },

  async listPromotionsForOwner(userId, restaurantId) {
    const rows = await query(
      `SELECT p.id, p.restaurant_id, r.name AS restaurant_name, p.code, p.name, p.description,
              p.discount_type, p.discount_value, p.max_discount, p.minimum_order,
              p.start_at, p.end_at, p.usage_limit, p.usage_per_customer, p.used_count, p.status
       FROM promotions p INNER JOIN restaurants r ON r.id = p.restaurant_id
       WHERE r.owner_user_id = ? AND p.restaurant_id = ? AND p.deleted_at IS NULL
       ORDER BY p.id DESC`, [userId, restaurantId]
    );
    return rows.map(mapPromotion);
  },

  async createPromotion(restaurantId, input) {
    const result = await query(
      `INSERT INTO promotions (restaurant_id, code, name, description, discount_type, discount_value,
         max_discount, minimum_order, start_at, end_at, usage_limit, usage_per_customer, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [restaurantId, input.code, input.name, input.description, input.discountType, input.discountValue,
        input.maxDiscount, input.minimumOrder, input.startAt, input.endAt, input.usageLimit, input.usagePerCustomer, input.status]
    );
    return Number(result.insertId);
  },

  async updatePromotion(userId, restaurantId, promotionId, input) {
    const result = await query(
      `UPDATE promotions p INNER JOIN restaurants r ON r.id = p.restaurant_id
       SET p.code = ?, p.name = ?, p.description = ?, p.discount_type = ?, p.discount_value = ?, p.max_discount = ?,
           p.minimum_order = ?, p.start_at = ?, p.end_at = ?, p.usage_limit = ?, p.usage_per_customer = ?, p.status = ?
       WHERE p.id = ? AND p.restaurant_id = ? AND r.owner_user_id = ? AND p.deleted_at IS NULL`,
      [input.code, input.name, input.description, input.discountType, input.discountValue, input.maxDiscount,
        input.minimumOrder, input.startAt, input.endAt, input.usageLimit, input.usagePerCustomer, input.status,
        promotionId, restaurantId, userId]
    );
    return result.affectedRows > 0;
  },

  async deletePromotion(userId, restaurantId, promotionId) {
    const result = await query(
      `UPDATE promotions p INNER JOIN restaurants r ON r.id = p.restaurant_id
       SET p.status = 'INACTIVE', p.deleted_at = CURRENT_TIMESTAMP
       WHERE p.id = ? AND p.restaurant_id = ? AND r.owner_user_id = ? AND p.deleted_at IS NULL`,
      [promotionId, restaurantId, userId]
    );
    return result.affectedRows > 0;
  },

  async findApplicable(customerId, restaurantId, code, subtotal) {
    const rows = await query(
      `SELECT p.id, p.restaurant_id, p.code, p.name, p.discount_type, p.discount_value,
              p.max_discount, p.minimum_order, p.usage_limit, p.usage_per_customer, p.used_count
       FROM promotions p
       WHERE UPPER(p.code) = UPPER(?) AND p.status = 'ACTIVE' AND p.deleted_at IS NULL
         AND (p.restaurant_id IS NULL OR p.restaurant_id = ?)
         AND p.start_at <= CURRENT_TIMESTAMP AND p.end_at >= CURRENT_TIMESTAMP
         AND p.minimum_order <= ?
         AND (p.usage_limit IS NULL OR p.used_count < p.usage_limit)
         AND (SELECT COUNT(*) FROM promotion_usage pu INNER JOIN customer_profiles cp ON cp.id = pu.customer_id
              WHERE pu.promotion_id = p.id AND cp.user_id = ?) < p.usage_per_customer
       LIMIT 1`, [code, restaurantId, subtotal, customerId]
    );
    if (!rows[0]) return null;
    const row = rows[0];
    const raw = row.discount_type === 'PERCENT'
      ? Number(subtotal) * Number(row.discount_value) / 100
      : row.discount_type === 'FREE_DELIVERY' ? 0 : Number(row.discount_value);
    return { ...mapPromotion(row), discountAmount: Math.max(0, Math.min(Number(subtotal), row.max_discount == null ? raw : Math.min(raw, Number(row.max_discount)))) };
  },

  async recordUsage(connection, promotionId, customerId, orderId, discountAmount) {
    await connection.execute(
      `INSERT INTO promotion_usage (promotion_id, customer_id, order_id, discount_amount) VALUES (?, ?, ?, ?)`,
      [promotionId, customerId, orderId, discountAmount]
    );
  },

  async toggleFavoriteRestaurant(userId, restaurantId) {
    return withTransaction(async connection => {
      const profileRows = await connection.execute('SELECT id FROM customer_profiles WHERE user_id = ? LIMIT 1', [userId]);
      if (!profileRows[0]) return null;
      const customerId = Number(profileRows[0].id);
      const existing = await connection.execute('SELECT 1 FROM favorite_restaurants WHERE customer_id = ? AND restaurant_id = ? LIMIT 1', [customerId, restaurantId]);
      if (existing.length > 0) {
        await connection.execute('DELETE FROM favorite_restaurants WHERE customer_id = ? AND restaurant_id = ?', [customerId, restaurantId]);
        return false;
      }
      await connection.execute('INSERT INTO favorite_restaurants (customer_id, restaurant_id) VALUES (?, ?)', [customerId, restaurantId]);
      return true;
    });
  },

  async toggleFavoriteMenuItem(userId, itemId) {
    return withTransaction(async connection => {
      const profileRows = await connection.execute('SELECT id FROM customer_profiles WHERE user_id = ? LIMIT 1', [userId]);
      if (!profileRows[0]) return null;
      const customerId = Number(profileRows[0].id);
      const existing = await connection.execute('SELECT 1 FROM favorite_menu_items WHERE customer_id = ? AND menu_item_id = ? LIMIT 1', [customerId, itemId]);
      if (existing.length > 0) {
        await connection.execute('DELETE FROM favorite_menu_items WHERE customer_id = ? AND menu_item_id = ?', [customerId, itemId]);
        return false;
      }
      await connection.execute('INSERT INTO favorite_menu_items (customer_id, menu_item_id) VALUES (?, ?)', [customerId, itemId]);
      return true;
    });
  },

  async listFavorites(userId) {
    const [restaurants, items] = await Promise.all([
      query(`SELECT r.id, r.name, r.description, r.city, r.district, r.rating, r.total_reviews
             FROM favorite_restaurants f INNER JOIN customer_profiles cp ON cp.id = f.customer_id
             INNER JOIN restaurants r ON r.id = f.restaurant_id WHERE cp.user_id = ? ORDER BY f.created_at DESC`, [userId]),
      query(`SELECT mi.id, mi.restaurant_id, r.name AS restaurant_name, mi.name, mi.image_url,
                    mi.base_price, mi.discount_price, COALESCE(mi.discount_price, mi.base_price) AS effective_price
             FROM favorite_menu_items f INNER JOIN customer_profiles cp ON cp.id = f.customer_id
             INNER JOIN menu_items mi ON mi.id = f.menu_item_id INNER JOIN restaurants r ON r.id = mi.restaurant_id
             WHERE cp.user_id = ? AND mi.deleted_at IS NULL ORDER BY f.created_at DESC`, [userId])
    ]);
    return {
      restaurants: restaurants.map(row => ({ id: Number(row.id), name: row.name, description: row.description ?? null, city: row.city, district: row.district ?? null, rating: Number(row.rating), totalReviews: Number(row.total_reviews) })),
      menuItems: items.map(row => ({ id: Number(row.id), restaurantId: Number(row.restaurant_id), restaurantName: row.restaurant_name, name: row.name, imageUrl: row.image_url ?? null, basePrice: Number(row.base_price), discountPrice: row.discount_price === null ? null : Number(row.discount_price), effectivePrice: Number(row.effective_price) }))
    };
  },

  async listBanners() {
    const rows = await query(`SELECT id, title, image_url, target_url, start_at, end_at, sort_order
                              FROM banners WHERE status = 'ACTIVE'
                                AND (start_at IS NULL OR start_at <= CURRENT_TIMESTAMP)
                                AND (end_at IS NULL OR end_at >= CURRENT_TIMESTAMP)
                              ORDER BY sort_order ASC, id DESC`);
    return rows.map(row => ({ id: Number(row.id), title: row.title, imageUrl: row.image_url, targetUrl: row.target_url ?? null, startAt: row.start_at, endAt: row.end_at, sortOrder: Number(row.sort_order) }));
  },

  async createBanner(input) {
    const result = await query(
      `INSERT INTO banners (title, image_url, target_url, start_at, end_at, sort_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [input.title, input.imageUrl, input.targetUrl, input.startAt, input.endAt, input.sortOrder, input.status]
    );
    return Number(result.insertId);
  },

  async findBanner(bannerId) {
    const rows = await query(`SELECT id, title, image_url, target_url, start_at, end_at, sort_order, status FROM banners WHERE id = ? LIMIT 1`, [bannerId]);
    return rows[0] ? mapBanner(rows[0]) : null;
  },

  async updateBanner(bannerId, input) {
    const result = await query(
      `UPDATE banners SET title = ?, image_url = ?, target_url = ?, start_at = ?, end_at = ?, sort_order = ?, status = ? WHERE id = ?`,
      [input.title, input.imageUrl, input.targetUrl, input.startAt, input.endAt, input.sortOrder, input.status, bannerId]
    );
    return result.affectedRows > 0;
  },

  async deleteBanner(bannerId) {
    const result = await query(`UPDATE banners SET status = 'INACTIVE' WHERE id = ?`, [bannerId]);
    return result.affectedRows > 0;
  }
};

function mapPromotion(row) {
  return { id: Number(row.id), restaurantId: row.restaurant_id == null ? null : Number(row.restaurant_id), restaurantName: row.restaurant_name ?? null, code: row.code, name: row.name, description: row.description ?? null, discountType: row.discount_type, discountValue: Number(row.discount_value), maxDiscount: row.max_discount == null ? null : Number(row.max_discount), minimumOrder: Number(row.minimum_order), startAt: row.start_at, endAt: row.end_at, usageLimit: row.usage_limit == null ? null : Number(row.usage_limit), usagePerCustomer: Number(row.usage_per_customer), usedCount: Number(row.used_count), status: row.status };
}
function mapBanner(row) { return { id: Number(row.id), title: row.title, imageUrl: row.image_url, targetUrl: row.target_url ?? null, startAt: row.start_at, endAt: row.end_at, sortOrder: Number(row.sort_order), status: row.status }; }
