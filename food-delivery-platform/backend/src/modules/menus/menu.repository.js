import { query, withTransaction } from '../../shared/database/mysql.js';

export const menuRepository = {
  async findRestaurantForOwner(userId, restaurantId) {
    const rows = await query(
      `SELECT id, name, status, minimum_order FROM restaurants
       WHERE id = ? AND owner_user_id = ? AND deleted_at IS NULL LIMIT 1`,
      [restaurantId, userId]
    );
    return rows[0] ? mapRestaurant(rows[0]) : null;
  },

  async listMenus(userId, restaurantId) {
    const rows = await query(
      `SELECT m.id, m.restaurant_id, m.name, m.description,
              TIME_FORMAT(m.start_time, '%H:%i:%s') AS start_time,
              TIME_FORMAT(m.end_time, '%H:%i:%s') AS end_time, m.status,
              m.created_at, m.updated_at
       FROM menus m INNER JOIN restaurants r ON r.id = m.restaurant_id
       WHERE r.owner_user_id = ? AND m.restaurant_id = ? AND m.deleted_at IS NULL
       ORDER BY m.id DESC`,
      [userId, restaurantId]
    );
    return rows.map(mapMenu);
  },

  async findMenu(userId, restaurantId, menuId) {
    const rows = await query(
      `SELECT m.id, m.restaurant_id, m.name, m.description,
              TIME_FORMAT(m.start_time, '%H:%i:%s') AS start_time,
              TIME_FORMAT(m.end_time, '%H:%i:%s') AS end_time, m.status,
              m.created_at, m.updated_at
       FROM menus m INNER JOIN restaurants r ON r.id = m.restaurant_id
       WHERE r.owner_user_id = ? AND m.restaurant_id = ? AND m.id = ?
         AND m.deleted_at IS NULL LIMIT 1`,
      [userId, restaurantId, menuId]
    );
    return rows[0] ? mapMenu(rows[0]) : null;
  },

  async createMenu(restaurantId, input) {
    const result = await query(
      `INSERT INTO menus (restaurant_id, name, description, start_time, end_time, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [restaurantId, input.name, input.description, input.startTime, input.endTime, input.status]
    );
    return Number(result.insertId);
  },

  async updateMenu(menuId, restaurantId, input) {
    const result = await query(
      `UPDATE menus SET name = ?, description = ?, start_time = ?, end_time = ?, status = ?
       WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL`,
      [input.name, input.description, input.startTime, input.endTime, input.status, menuId, restaurantId]
    );
    return result.affectedRows > 0;
  },

  async softDeleteMenu(menuId, restaurantId) {
    const result = await query(
      `UPDATE menus SET status = 'INACTIVE', deleted_at = CURRENT_TIMESTAMP
       WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL`,
      [menuId, restaurantId]
    );
    return result.affectedRows > 0;
  },

  async listCategories(userId, restaurantId) {
    const rows = await query(
      `SELECT mc.id, mc.restaurant_id, mc.menu_id, mc.name, mc.description,
              mc.sort_order, mc.status, mc.created_at, mc.updated_at
       FROM menu_categories mc INNER JOIN restaurants r ON r.id = mc.restaurant_id
       WHERE r.owner_user_id = ? AND mc.restaurant_id = ?
       ORDER BY mc.sort_order ASC, mc.id ASC`,
      [userId, restaurantId]
    );
    return rows.map(mapCategory);
  },

  async findCategory(userId, restaurantId, categoryId) {
    const rows = await query(
      `SELECT mc.id, mc.restaurant_id, mc.menu_id, mc.name, mc.description,
              mc.sort_order, mc.status, mc.created_at, mc.updated_at
       FROM menu_categories mc INNER JOIN restaurants r ON r.id = mc.restaurant_id
       WHERE r.owner_user_id = ? AND mc.restaurant_id = ? AND mc.id = ? LIMIT 1`,
      [userId, restaurantId, categoryId]
    );
    return rows[0] ? mapCategory(rows[0]) : null;
  },

  async createCategory(restaurantId, input) {
    const result = await query(
      `INSERT INTO menu_categories (restaurant_id, menu_id, name, description, sort_order, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [restaurantId, input.menuId, input.name, input.description, input.sortOrder, input.status]
    );
    return Number(result.insertId);
  },

  async updateCategory(categoryId, restaurantId, input) {
    const result = await query(
      `UPDATE menu_categories SET menu_id = ?, name = ?, description = ?, sort_order = ?, status = ?
       WHERE id = ? AND restaurant_id = ?`,
      [input.menuId, input.name, input.description, input.sortOrder, input.status, categoryId, restaurantId]
    );
    return result.affectedRows > 0;
  },

  async softDeleteCategory(categoryId, restaurantId) {
    const result = await query(
      `UPDATE menu_categories SET status = 'INACTIVE'
       WHERE id = ? AND restaurant_id = ?`,
      [categoryId, restaurantId]
    );
    return result.affectedRows > 0;
  },

  async listItems(userId, restaurantId, filters = {}) {
    const where = ['mi.restaurant_id = ?', 'r.owner_user_id = ?', 'mi.deleted_at IS NULL'];
    const params = [restaurantId, userId];
    if (filters.keyword) {
      where.push('(mi.name LIKE ? OR mi.description LIKE ?)');
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
    }
    if (filters.categoryId) { where.push('mi.category_id = ?'); params.push(filters.categoryId); }
    if (filters.available !== null && filters.available !== undefined) {
      where.push('mi.is_available = ?'); params.push(filters.available ? 1 : 0);
    }
    const totalRows = await query(
      `SELECT COUNT(*) AS total FROM menu_items mi INNER JOIN restaurants r ON r.id = mi.restaurant_id WHERE ${where.join(' AND ')}`,
      params
    );
    const rows = await query(
      `SELECT mi.id, mi.restaurant_id, mi.category_id, mi.name, mi.description, mi.image_url,
              mi.base_price, mi.discount_price, mi.preparation_time, mi.is_available,
              mi.is_featured, mi.sold_count, mi.created_at, mi.updated_at
       FROM menu_items mi INNER JOIN restaurants r ON r.id = mi.restaurant_id
       WHERE ${where.join(' AND ')} ORDER BY mi.is_featured DESC, mi.id DESC LIMIT ? OFFSET ?`,
      [...params, filters.pageSize ?? 50, filters.offset ?? 0]
    );
    return { items: rows.map(mapItem), totalItems: Number(totalRows[0]?.total ?? 0) };
  },

  async findItem(userId, restaurantId, itemId) {
    const rows = await query(
      `SELECT mi.id, mi.restaurant_id, mi.category_id, mi.name, mi.description, mi.image_url,
              mi.base_price, mi.discount_price, mi.preparation_time, mi.is_available,
              mi.is_featured, mi.sold_count, mi.created_at, mi.updated_at
       FROM menu_items mi INNER JOIN restaurants r ON r.id = mi.restaurant_id
       WHERE r.owner_user_id = ? AND mi.restaurant_id = ? AND mi.id = ?
         AND mi.deleted_at IS NULL LIMIT 1`,
      [userId, restaurantId, itemId]
    );
    return rows[0] ? mapItem(rows[0]) : null;
  },

  async createItem(restaurantId, input) {
    const result = await query(
      `INSERT INTO menu_items (restaurant_id, category_id, name, description, image_url,
         base_price, discount_price, preparation_time, is_available, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [restaurantId, input.categoryId, input.name, input.description, input.imageUrl,
        input.basePrice, input.discountPrice, input.preparationTime, input.isAvailable ? 1 : 0, input.isFeatured ? 1 : 0]
    );
    return Number(result.insertId);
  },

  async updateItem(itemId, restaurantId, input) {
    const result = await query(
      `UPDATE menu_items SET category_id = ?, name = ?, description = ?, image_url = ?,
         base_price = ?, discount_price = ?, preparation_time = ?, is_available = ?, is_featured = ?
       WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL`,
      [input.categoryId, input.name, input.description, input.imageUrl, input.basePrice,
        input.discountPrice, input.preparationTime, input.isAvailable ? 1 : 0, input.isFeatured ? 1 : 0, itemId, restaurantId]
    );
    return result.affectedRows > 0;
  },

  async softDeleteItem(itemId, restaurantId) {
    const result = await query(
      `UPDATE menu_items SET is_available = FALSE, deleted_at = CURRENT_TIMESTAMP
       WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL`,
      [itemId, restaurantId]
    );
    return result.affectedRows > 0;
  },

  async listVariants(userId, restaurantId, itemId) {
    const rows = await query(
      `SELECT v.id, v.menu_item_id, v.name, v.price_adjustment, v.status, v.created_at, v.updated_at
       FROM menu_item_variants v INNER JOIN menu_items mi ON mi.id = v.menu_item_id
       INNER JOIN restaurants r ON r.id = mi.restaurant_id
       WHERE r.owner_user_id = ? AND mi.restaurant_id = ? AND mi.id = ?
       ORDER BY v.id ASC`, [userId, restaurantId, itemId]
    );
    return rows.map(mapVariant);
  },

  async createVariant(itemId, input) {
    const result = await query(
      `INSERT INTO menu_item_variants (menu_item_id, name, price_adjustment, status)
       VALUES (?, ?, ?, ?)`, [itemId, input.name, input.priceAdjustment, input.status]
    );
    return Number(result.insertId);
  },

  async updateVariant(variantId, itemId, input) {
    const result = await query(
      `UPDATE menu_item_variants SET name = ?, price_adjustment = ?, status = ?
       WHERE id = ? AND menu_item_id = ?`, [input.name, input.priceAdjustment, input.status, variantId, itemId]
    );
    return result.affectedRows > 0;
  },

  async deleteVariant(variantId, itemId) {
    const result = await query(
      `UPDATE menu_item_variants SET status = 'INACTIVE' WHERE id = ? AND menu_item_id = ?`, [variantId, itemId]
    );
    return result.affectedRows > 0;
  },

  async listToppingGroups(userId, restaurantId) {
    const rows = await query(
      `SELECT tg.id, tg.restaurant_id, tg.name, tg.min_select, tg.max_select, tg.required,
              tg.created_at, tg.updated_at
       FROM topping_groups tg INNER JOIN restaurants r ON r.id = tg.restaurant_id
       WHERE r.owner_user_id = ? AND tg.restaurant_id = ? ORDER BY tg.id ASC`, [userId, restaurantId]
    );
    return rows.map(mapToppingGroup);
  },

  async createToppingGroup(restaurantId, input) {
    const result = await query(
      `INSERT INTO topping_groups (restaurant_id, name, min_select, max_select, required)
       VALUES (?, ?, ?, ?, ?)`, [restaurantId, input.name, input.minSelect, input.maxSelect, input.required ? 1 : 0]
    );
    return Number(result.insertId);
  },

  async updateToppingGroup(groupId, restaurantId, input) {
    const result = await query(
      `UPDATE topping_groups SET name = ?, min_select = ?, max_select = ?, required = ?
       WHERE id = ? AND restaurant_id = ?`, [input.name, input.minSelect, input.maxSelect, input.required ? 1 : 0, groupId, restaurantId]
    );
    return result.affectedRows > 0;
  },

  async deleteToppingGroup(groupId, restaurantId) {
    const result = await query(
      `DELETE FROM topping_groups WHERE id = ? AND restaurant_id = ?`, [groupId, restaurantId]
    );
    return result.affectedRows > 0;
  },

  async listToppings(userId, restaurantId, groupId) {
    const rows = await query(
      `SELECT t.id, t.group_id, t.name, t.price, t.status, t.created_at, t.updated_at
       FROM toppings t INNER JOIN topping_groups tg ON tg.id = t.group_id
       INNER JOIN restaurants r ON r.id = tg.restaurant_id
       WHERE r.owner_user_id = ? AND tg.restaurant_id = ? AND tg.id = ? ORDER BY t.id ASC`, [userId, restaurantId, groupId]
    );
    return rows.map(mapTopping);
  },

  async createTopping(groupId, input) {
    const result = await query(
      `INSERT INTO toppings (group_id, name, price, status) VALUES (?, ?, ?, ?)`, [groupId, input.name, input.price, input.status]
    );
    return Number(result.insertId);
  },

  async updateTopping(toppingId, groupId, input) {
    const result = await query(
      `UPDATE toppings SET name = ?, price = ?, status = ? WHERE id = ? AND group_id = ?`, [input.name, input.price, input.status, toppingId, groupId]
    );
    return result.affectedRows > 0;
  },

  async deleteTopping(toppingId, groupId) {
    const result = await query(
      `UPDATE toppings SET status = 'INACTIVE' WHERE id = ? AND group_id = ?`, [toppingId, groupId]
    );
    return result.affectedRows > 0;
  },

  async linkToppingGroups(itemId, restaurantId, groupIds) {
    return withTransaction(async connection => {
      const itemRows = await connection.execute(
        `SELECT id FROM menu_items WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL FOR UPDATE`, [itemId, restaurantId]
      );
      if (itemRows.length === 0) return false;
      await connection.execute('DELETE FROM menu_item_topping_groups WHERE menu_item_id = ?', [itemId]);
      for (const groupId of groupIds) {
        await connection.execute(
          `INSERT INTO menu_item_topping_groups (menu_item_id, topping_group_id)
           SELECT ?, id FROM topping_groups WHERE id = ? AND restaurant_id = ?`, [itemId, groupId, restaurantId]
        );
      }
      return true;
    });
  }
};

function mapRestaurant(row) { return { id: Number(row.id), name: row.name, status: row.status, minimumOrder: Number(row.minimum_order) }; }
function mapMenu(row) { return { id: Number(row.id), restaurantId: Number(row.restaurant_id), name: row.name, description: row.description ?? null, startTime: row.start_time ?? null, endTime: row.end_time ?? null, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapCategory(row) { return { id: Number(row.id), restaurantId: Number(row.restaurant_id), menuId: row.menu_id == null ? null : Number(row.menu_id), name: row.name, description: row.description ?? null, sortOrder: Number(row.sort_order), status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapItem(row) { return { id: Number(row.id), restaurantId: Number(row.restaurant_id), categoryId: row.category_id == null ? null : Number(row.category_id), name: row.name, description: row.description ?? null, imageUrl: row.image_url ?? null, basePrice: Number(row.base_price), discountPrice: row.discount_price == null ? null : Number(row.discount_price), effectivePrice: Number(row.discount_price ?? row.base_price), preparationTime: Number(row.preparation_time), isAvailable: Boolean(row.is_available), isFeatured: Boolean(row.is_featured), soldCount: Number(row.sold_count), createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapVariant(row) { return { id: Number(row.id), menuItemId: Number(row.menu_item_id), name: row.name, priceAdjustment: Number(row.price_adjustment), status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapToppingGroup(row) { return { id: Number(row.id), restaurantId: Number(row.restaurant_id), name: row.name, minSelect: Number(row.min_select), maxSelect: Number(row.max_select), required: Boolean(row.required), createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapTopping(row) { return { id: Number(row.id), groupId: Number(row.group_id), name: row.name, price: Number(row.price), status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }; }
