import { query, withTransaction } from '../../shared/database/mysql.js';

export const orderRepository = {
  async getCartForUser(userId, restaurantId = null) {
    const params = [userId];
    const restaurantFilter = restaurantId ? 'AND c.restaurant_id = ?' : '';
    if (restaurantId) params.push(restaurantId);
    const carts = await query(
      `SELECT c.id, c.customer_id, c.restaurant_id, r.name AS restaurant_name, r.status AS restaurant_status,
              r.minimum_order, r.owner_user_id
       FROM carts c INNER JOIN customer_profiles cp ON cp.id = c.customer_id
       INNER JOIN restaurants r ON r.id = c.restaurant_id
       WHERE cp.user_id = ? ${restaurantFilter} LIMIT 1`, params
    );
    if (!carts[0]) return null;
    const cart = mapCart(carts[0]);
    const itemRows = await query(
      `SELECT ci.id, ci.cart_id, ci.menu_item_id, ci.variant_id, ci.quantity, ci.unit_price, ci.note,
              mi.name, mi.image_url, mi.base_price, mi.discount_price,
              COALESCE(mi.discount_price, mi.base_price) AS effective_price,
              v.name AS variant_name, v.price_adjustment
       FROM cart_items ci INNER JOIN menu_items mi ON mi.id = ci.menu_item_id
       LEFT JOIN menu_item_variants v ON v.id = ci.variant_id
       WHERE ci.cart_id = ? ORDER BY ci.id ASC`, [cart.id]
    );
    const itemIds = itemRows.map(row => Number(row.id));
    const toppingRows = itemIds.length === 0 ? [] : await query(
      `SELECT cit.cart_item_id, cit.topping_id, cit.price, cit.quantity, t.name
       FROM cart_item_toppings cit INNER JOIN toppings t ON t.id = cit.topping_id
       WHERE cit.cart_item_id IN (${itemIds.map(() => '?').join(',')}) ORDER BY cit.cart_item_id, cit.topping_id`, itemIds
    );
    const toppingsByItem = groupBy(toppingRows, row => Number(row.cart_item_id));
    cart.items = itemRows.map(row => {
      const toppings = (toppingsByItem.get(Number(row.id)) ?? []).map(mapCartTopping);
      const unitPrice = Number(row.unit_price) + toppings.reduce((sum, topping) => sum + topping.price * topping.quantity, 0);
      return { id: Number(row.id), cartId: Number(row.cart_id), menuItemId: Number(row.menu_item_id), variantId: row.variant_id == null ? null : Number(row.variant_id), name: row.name, imageUrl: row.image_url ?? null, variantName: row.variant_name ?? null, quantity: Number(row.quantity), unitPrice, baseUnitPrice: Number(row.effective_price), storedUnitPrice: Number(row.unit_price), note: row.note ?? null, toppings, lineTotal: roundMoney(unitPrice * Number(row.quantity)) };
    });
    cart.subtotal = roundMoney(cart.items.reduce((sum, item) => sum + item.lineTotal, 0));
    return cart;
  },

  async addCartItemForUser(userId, input) {
    return withTransaction(async connection => {
      const profileRows = await connection.execute(
        `SELECT cp.id FROM customer_profiles cp INNER JOIN users u ON u.id = cp.user_id WHERE u.id = ? AND u.status = 'ACTIVE' LIMIT 1 FOR UPDATE`, [userId]
      );
      if (!profileRows[0]) return { error: 'CUSTOMER_NOT_FOUND' };
      const customerId = Number(profileRows[0].id);
      const restaurantRows = await connection.execute(
        `SELECT id, status FROM restaurants WHERE id = ? AND status = 'ACTIVE' AND deleted_at IS NULL LIMIT 1 FOR UPDATE`, [input.restaurantId]
      );
      if (!restaurantRows[0]) return { error: 'RESTAURANT_UNAVAILABLE' };
      const itemRows = await connection.execute(
        `SELECT mi.id, mi.restaurant_id, mi.name, mi.is_available, COALESCE(mi.discount_price, mi.base_price) AS effective_price,
                v.id AS selected_variant_id
         FROM menu_items mi LEFT JOIN menu_item_variants v
           ON v.id = ? AND v.menu_item_id = mi.id AND v.status = 'ACTIVE'
         WHERE mi.id = ? AND mi.restaurant_id = ? AND mi.is_available = TRUE AND mi.deleted_at IS NULL LIMIT 1`, [input.variantId, input.menuItemId, input.restaurantId]
      );
      if (!itemRows[0]) return { error: 'MENU_ITEM_UNAVAILABLE' };
      if (input.variantId !== null && Number(itemRows[0].selected_variant_id ?? 0) !== input.variantId) return { error: 'VARIANT_UNAVAILABLE' };
      const selectedToppings = await loadAndValidateToppings(connection, input.menuItemId, input.toppingIds);
      let cartRows = await connection.execute('SELECT id FROM carts WHERE customer_id = ? AND restaurant_id = ? LIMIT 1 FOR UPDATE', [customerId, input.restaurantId]);
      let cartId;
      if (!cartRows[0]) {
        const result = await connection.execute('INSERT INTO carts (customer_id, restaurant_id) VALUES (?, ?)', [customerId, input.restaurantId]);
        cartId = Number(result.insertId);
      } else cartId = Number(cartRows[0].id);
      const variantAdjustment = await readVariantAdjustment(connection, input.variantId, input.menuItemId);
      const unitPrice = roundMoney(Number(itemRows[0].effective_price) + variantAdjustment);
      const result = await connection.execute(
        `INSERT INTO cart_items (cart_id, menu_item_id, variant_id, quantity, unit_price, note) VALUES (?, ?, ?, ?, ?, ?)`, [cartId, input.menuItemId, input.variantId, input.quantity, unitPrice, input.note]
      );
      const cartItemId = Number(result.insertId);
      for (const topping of selectedToppings) {
        await connection.execute('INSERT INTO cart_item_toppings (cart_item_id, topping_id, price, quantity) VALUES (?, ?, ?, 1)', [cartItemId, topping.id, topping.price]);
      }
      return { cartId, cartItemId };
    });
  },

  async updateCartItemForUser(userId, cartItemId, input) {
    return withTransaction(async connection => {
      const rows = await connection.execute(
        `SELECT ci.id, ci.cart_id, ci.menu_item_id, c.restaurant_id, cp.id AS customer_id
         FROM cart_items ci INNER JOIN carts c ON c.id = ci.cart_id
         INNER JOIN customer_profiles cp ON cp.id = c.customer_id
         WHERE ci.id = ? AND cp.user_id = ? LIMIT 1 FOR UPDATE`, [cartItemId, userId]
      );
      if (!rows[0]) return null;
      const current = rows[0];
      if (input.toppingIds !== undefined) {
        const selected = await loadAndValidateToppings(connection, Number(current.menu_item_id), input.toppingIds);
        await connection.execute('DELETE FROM cart_item_toppings WHERE cart_item_id = ?', [cartItemId]);
        for (const topping of selected) await connection.execute('INSERT INTO cart_item_toppings (cart_item_id, topping_id, price, quantity) VALUES (?, ?, ?, 1)', [cartItemId, topping.id, topping.price]);
      }
      const fields = [];
      const params = [];
      if (input.quantity !== null && input.quantity !== undefined) { fields.push('quantity = ?'); params.push(input.quantity); }
      if (input.note !== undefined) { fields.push('note = ?'); params.push(input.note); }
      if (fields.length > 0) await connection.execute(`UPDATE cart_items SET ${fields.join(', ')} WHERE id = ?`, [...params, cartItemId]);
      return { cartId: Number(current.cart_id), restaurantId: Number(current.restaurant_id) };
    });
  },

  async removeCartItemForUser(userId, cartItemId) {
    const result = await query(
      `DELETE ci FROM cart_items ci INNER JOIN carts c ON c.id = ci.cart_id
       INNER JOIN customer_profiles cp ON cp.id = c.customer_id WHERE ci.id = ? AND cp.user_id = ?`, [cartItemId, userId]
    );
    return result.affectedRows > 0;
  },

  async clearCartForUser(userId, restaurantId) {
    const result = await query(
      `DELETE c FROM carts c INNER JOIN customer_profiles cp ON cp.id = c.customer_id WHERE cp.user_id = ? AND c.restaurant_id = ?`, [userId, restaurantId]
    );
    return result.affectedRows > 0;
  },

  async findOrderByIdempotency(userId, key) {
    const rows = await query(
      `SELECT o.id, o.order_code FROM orders o INNER JOIN customer_profiles cp ON cp.id = o.customer_id WHERE cp.user_id = ? AND o.idempotency_key = ? LIMIT 1`, [userId, key]
    );
    return rows[0] ? { id: Number(rows[0].id), orderCode: rows[0].order_code } : null;
  },

  async checkoutForUser(userId, input, promotionRepository) {
    return withTransaction(async connection => {
      const existingRows = await connection.execute(
        `SELECT o.id, o.order_code FROM orders o INNER JOIN customer_profiles cp ON cp.id = o.customer_id WHERE cp.user_id = ? AND o.idempotency_key = ? LIMIT 1 FOR UPDATE`, [userId, input.idempotencyKey]
      );
      if (existingRows[0]) return { existing: true, orderId: Number(existingRows[0].id), orderCode: existingRows[0].order_code };
      const profileRows = await connection.execute(
        `SELECT cp.id, cp.full_name, u.phone, u.email FROM customer_profiles cp INNER JOIN users u ON u.id = cp.user_id WHERE u.id = ? AND u.status = 'ACTIVE' LIMIT 1 FOR UPDATE`, [userId]
      );
      if (!profileRows[0]) return { error: 'CUSTOMER_NOT_FOUND' };
      const customer = profileRows[0];
      const addressRows = await connection.execute(
        `SELECT id, receiver_name, receiver_phone, address_line, ward, district, city, latitude, longitude
         FROM customer_addresses WHERE id = ? AND customer_id = ? AND deleted_at IS NULL LIMIT 1`, [input.addressId, customer.id]
      );
      if (!addressRows[0]) return { error: 'ADDRESS_NOT_FOUND' };
      const address = addressRows[0];
      const cartRows = await connection.execute(
        `SELECT c.id, c.restaurant_id, r.name AS restaurant_name, r.owner_user_id, r.status, r.minimum_order,
                r.address AS restaurant_address, r.latitude AS restaurant_latitude, r.longitude AS restaurant_longitude
         FROM carts c INNER JOIN restaurants r ON r.id = c.restaurant_id
         INNER JOIN customer_profiles cp ON cp.id = c.customer_id
         WHERE cp.user_id = ? AND c.restaurant_id = ? AND r.status = 'ACTIVE' AND r.deleted_at IS NULL LIMIT 1 FOR UPDATE`, [userId, input.restaurantId]
      );
      if (!cartRows[0]) return { error: 'CART_EMPTY' };
      const cart = cartRows[0];
      const itemRows = await connection.execute(
        `SELECT ci.id, ci.menu_item_id, ci.variant_id, ci.quantity, ci.note,
                mi.name, mi.base_price, mi.discount_price, COALESCE(mi.discount_price, mi.base_price) AS effective_price,
                mi.is_available, v.name AS variant_name, v.price_adjustment
         FROM cart_items ci INNER JOIN menu_items mi ON mi.id = ci.menu_item_id
         LEFT JOIN menu_item_variants v ON v.id = ci.variant_id AND v.status = 'ACTIVE'
         WHERE ci.cart_id = ? AND mi.restaurant_id = ? AND mi.deleted_at IS NULL FOR UPDATE`, [cart.id, cart.restaurant_id]
      );
      if (itemRows.length === 0) return { error: 'CART_EMPTY' };
      if (itemRows.some(row => !row.is_available || (row.variant_id !== null && row.variant_name === null))) return { error: 'CART_ITEM_UNAVAILABLE' };
      const itemIds = itemRows.map(row => Number(row.id));
      const toppingRows = await connection.execute(
        `SELECT cit.cart_item_id, cit.topping_id, t.name, cit.price, cit.quantity
         FROM cart_item_toppings cit INNER JOIN toppings t ON t.id = cit.topping_id
         WHERE cit.cart_item_id IN (${itemIds.map(() => '?').join(',')})`, itemIds
      );
      const toppingsByItem = groupBy(toppingRows, row => Number(row.cart_item_id));
      const items = itemRows.map(row => {
        const toppings = (toppingsByItem.get(Number(row.id)) ?? []).map(row => ({ id: Number(row.topping_id), name: row.name, price: Number(row.price), quantity: Number(row.quantity) }));
        const unitPrice = roundMoney(Number(row.effective_price) + Number(row.price_adjustment ?? 0) + toppings.reduce((sum, topping) => sum + topping.price * topping.quantity, 0));
        return { sourceId: Number(row.id), menuItemId: Number(row.menu_item_id), variantId: row.variant_id == null ? null : Number(row.variant_id), name: row.name, variantName: row.variant_name ?? null, quantity: Number(row.quantity), unitPrice, totalPrice: roundMoney(unitPrice * Number(row.quantity)), note: row.note ?? null, toppings };
      });
      const subtotal = roundMoney(items.reduce((sum, item) => sum + item.totalPrice, 0));
      if (subtotal < Number(cart.minimum_order ?? 0)) return { error: 'MINIMUM_ORDER_NOT_MET', minimumOrder: Number(cart.minimum_order) };
      const settings = await connection.execute(`SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('delivery_base_fee', 'tax_rate')`);
      const settingMap = Object.fromEntries(settings.map(row => [row.setting_key, Number(row.setting_value)]));
      let deliveryFee = Number.isFinite(settingMap.delivery_base_fee) ? settingMap.delivery_base_fee : 15000;
      const serviceFee = 0;
      const taxAmount = roundMoney(subtotal * ((settingMap.tax_rate ?? 0) / 100));
      let discountAmount = 0;
      let promotion = null;
      if (input.promotionCode) {
        promotion = await findApplicablePromotion(connection, customer.id, cart.restaurant_id, input.promotionCode, subtotal);
        if (!promotion) return { error: 'PROMOTION_INVALID' };
        discountAmount = promotion.discountType === 'FREE_DELIVERY' ? deliveryFee : promotion.discountAmount;
        if (promotion.discountType === 'FREE_DELIVERY') deliveryFee = 0;
      }
      const totalAmount = roundMoney(Math.max(0, subtotal - discountAmount) + deliveryFee + serviceFee + taxAmount);
      const orderCode = `FD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const orderResult = await connection.execute(
        `INSERT INTO orders (order_code, idempotency_key, customer_id, restaurant_id, delivery_address_id,
           receiver_name, receiver_phone, delivery_address, delivery_latitude, delivery_longitude,
           subtotal, discount_amount, delivery_fee, service_fee, tax_amount, total_amount,
           payment_method, payment_status, order_status, customer_note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'PENDING', ?)`,
        [orderCode, input.idempotencyKey, customer.id, cart.restaurant_id, address.id, address.receiver_name, address.receiver_phone,
          formatAddress(address), address.latitude, address.longitude, subtotal, discountAmount, deliveryFee, serviceFee, taxAmount, totalAmount, input.paymentMethod, input.customerNote]
      );
      const orderId = Number(orderResult.insertId);
      for (const item of items) {
        const itemResult = await connection.execute(
          `INSERT INTO order_items (order_id, menu_item_id, variant_id, item_name, variant_name, quantity, unit_price, total_price, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [orderId, item.menuItemId, item.variantId, item.name, item.variantName, item.quantity, item.unitPrice, item.totalPrice, item.note]
        );
        const orderItemId = Number(itemResult.insertId);
        for (const topping of item.toppings) await connection.execute('INSERT INTO order_item_toppings (order_item_id, topping_id, topping_name, price, quantity) VALUES (?, ?, ?, ?, ?)', [orderItemId, topping.id, topping.name, topping.price, topping.quantity]);
      }
      await connection.execute('INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, note) VALUES (?, NULL, \'PENDING\', ?, ?)', [orderId, userId, 'Order created']);
      await connection.execute('INSERT INTO payments (order_id, payment_code, method, amount, status) VALUES (?, ?, ?, ?, \'PENDING\')', [orderId, `PAY-${orderCode}`, input.paymentMethod, totalAmount]);
      if (promotion) await promotionRepository.recordUsage(connection, promotion.id, customer.id, orderId, discountAmount);
      await connection.execute('DELETE FROM carts WHERE id = ?', [cart.id]);
      return { orderId, orderCode, customerUserId: Number(userId), customerEmail: customer.email, restaurantOwnerUserId: Number(cart.owner_user_id), status: 'PENDING', subtotal, discountAmount, deliveryFee, serviceFee, taxAmount, totalAmount, paymentMethod: input.paymentMethod, items };
    });
  },

  async listOrdersForCustomer(userId, filters = {}) {
    const params = [userId];
    const where = ['cp.user_id = ?', 'o.deleted_at IS NULL'];
    if (filters.status) { where.push('o.order_status = ?'); params.push(filters.status); }
    const rows = await query(
      `SELECT o.id, o.order_code, o.restaurant_id, r.name AS restaurant_name, o.subtotal, o.discount_amount,
              o.delivery_fee, o.service_fee, o.tax_amount, o.total_amount, o.payment_method, o.payment_status,
              o.order_status, o.ordered_at, o.confirmed_at, o.prepared_at, o.created_at
       FROM orders o INNER JOIN customer_profiles cp ON cp.id = o.customer_id INNER JOIN restaurants r ON r.id = o.restaurant_id
       WHERE ${where.join(' AND ')} ORDER BY o.created_at DESC, o.id DESC LIMIT 100`, params
    );
    return rows.map(mapOrderSummary);
  },

  async findOrderForCustomer(userId, orderId) {
    const rows = await query(
      `SELECT o.*, r.name AS restaurant_name, r.owner_user_id, u.id AS customer_user_id, u.email AS customer_email
       FROM orders o INNER JOIN customer_profiles cp ON cp.id = o.customer_id
       INNER JOIN restaurants r ON r.id = o.restaurant_id INNER JOIN users u ON u.id = cp.user_id
       WHERE cp.user_id = ? AND o.id = ? AND o.deleted_at IS NULL LIMIT 1`, [userId, orderId]
    );
    if (!rows[0]) return null;
    return loadOrderDetail(rows[0]);
  },

  async listOrdersForRestaurant(userId, filters = {}) {
    const params = [userId];
    const where = ['r.owner_user_id = ?', 'o.deleted_at IS NULL'];
    if (filters.status) { where.push('o.order_status = ?'); params.push(filters.status); }
    const rows = await query(
      `SELECT o.id, o.order_code, o.customer_id, o.restaurant_id, r.name AS restaurant_name,
              o.subtotal, o.discount_amount, o.delivery_fee, o.total_amount, o.payment_method,
              o.payment_status, o.order_status, o.customer_note, o.ordered_at, o.created_at
       FROM orders o INNER JOIN restaurants r ON r.id = o.restaurant_id WHERE ${where.join(' AND ')}
       ORDER BY o.created_at ASC, o.id ASC LIMIT 100`, params
    );
    return rows.map(mapOrderSummary);
  },

  async findOrderForRestaurant(userId, orderId) {
    const rows = await query(
      `SELECT o.*, r.name AS restaurant_name, r.owner_user_id, u.id AS customer_user_id, u.email AS customer_email
       FROM orders o INNER JOIN restaurants r ON r.id = o.restaurant_id
       INNER JOIN customer_profiles cp ON cp.id = o.customer_id INNER JOIN users u ON u.id = cp.user_id
       WHERE r.owner_user_id = ? AND o.id = ? AND o.deleted_at IS NULL LIMIT 1`, [userId, orderId]
    );
    if (!rows[0]) return null;
    return loadOrderDetail(rows[0]);
  },

  async transitionRestaurantOrder(userId, orderId, targetStatus, note, reasonCode = null) {
    return withTransaction(async connection => {
      const rows = await connection.execute(
        `SELECT o.*, r.name AS restaurant_name, r.owner_user_id, u.id AS customer_user_id, u.email AS customer_email
         FROM orders o INNER JOIN restaurants r ON r.id = o.restaurant_id
         INNER JOIN customer_profiles cp ON cp.id = o.customer_id INNER JOIN users u ON u.id = cp.user_id
         WHERE r.owner_user_id = ? AND o.id = ? AND o.deleted_at IS NULL LIMIT 1 FOR UPDATE`, [userId, orderId]
      );
      if (!rows[0]) return { error: 'NOT_FOUND' };
      const current = rows[0];
      const updates = targetStatus === 'CONFIRMED'
        ? 'confirmed_at = CURRENT_TIMESTAMP'
        : targetStatus === 'READY_FOR_PICKUP'
          ? 'prepared_at = CURRENT_TIMESTAMP'
          : targetStatus === 'CANCELLED'
            ? 'cancelled_at = CURRENT_TIMESTAMP'
            : '';
      await connection.execute(`UPDATE orders SET order_status = ?${updates ? `, ${updates}` : ''} WHERE id = ?`, [targetStatus, orderId]);
      await connection.execute('INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, note) VALUES (?, ?, ?, ?, ?)', [orderId, current.order_status, targetStatus, userId, note]);
      if (targetStatus === 'CANCELLED') await connection.execute('INSERT INTO order_cancellations (order_id, cancelled_by, reason_code, reason, refund_amount) VALUES (?, ?, ?, ?, 0)', [orderId, userId, reasonCode ?? 'RESTAURANT_REJECTED', note]);
      const updatedRows = await connection.execute('SELECT o.*, r.name AS restaurant_name, r.owner_user_id, u.email AS customer_email FROM orders o INNER JOIN restaurants r ON r.id = o.restaurant_id INNER JOIN customer_profiles cp ON cp.id = o.customer_id INNER JOIN users u ON u.id = cp.user_id WHERE o.id = ? LIMIT 1', [orderId]);
      return { before: mapOrderSummary(current), after: mapOrderSummary(updatedRows[0]), customerUserId: Number(current.customer_user_id), customerEmail: current.customer_email, restaurantOwnerUserId: Number(current.owner_user_id), orderCode: current.order_code, orderId: Number(orderId), status: targetStatus };
    });
  }
};

async function loadAndValidateToppings(connection, itemId, toppingIds) {
  if (toppingIds.length === 0) {
    const required = await connection.execute(`SELECT tg.id, tg.min_select, tg.max_select, tg.required
      FROM topping_groups tg INNER JOIN menu_item_topping_groups link ON link.topping_group_id = tg.id
      WHERE link.menu_item_id = ?`, [itemId]);
    if (required.some(group => group.required || Number(group.min_select) > 0)) throw new Error('REQUIRED_TOPPINGS_MISSING');
    return [];
  }
  const rows = await connection.execute(
    `SELECT t.id, t.group_id, t.name, t.price, tg.min_select, tg.max_select, tg.required
     FROM toppings t INNER JOIN topping_groups tg ON tg.id = t.group_id
     INNER JOIN menu_item_topping_groups link ON link.topping_group_id = tg.id
     WHERE link.menu_item_id = ? AND t.status = 'ACTIVE' AND t.id IN (${toppingIds.map(() => '?').join(',')})`, [itemId, ...toppingIds]
  );
  if (rows.length !== toppingIds.length) throw new Error('TOPPING_UNAVAILABLE');
  const groups = await connection.execute(`SELECT tg.id, tg.min_select, tg.max_select, tg.required
    FROM topping_groups tg INNER JOIN menu_item_topping_groups link ON link.topping_group_id = tg.id WHERE link.menu_item_id = ?`, [itemId]);
  for (const group of groups) {
    const count = rows.filter(row => Number(row.group_id) === Number(group.id)).length;
    if (count < Number(group.min_select) || count > Number(group.max_select) || (group.required && count === 0)) throw new Error('TOPPING_SELECTION_INVALID');
  }
  return rows.map(row => ({ id: Number(row.id), name: row.name, price: Number(row.price) }));
}
async function readVariantAdjustment(connection, variantId, itemId) { if (variantId === null) return 0; const rows = await connection.execute('SELECT price_adjustment FROM menu_item_variants WHERE id = ? AND menu_item_id = ? AND status = \'ACTIVE\' LIMIT 1', [variantId, itemId]); return rows[0] ? Number(rows[0].price_adjustment) : 0; }
async function findApplicablePromotion(connection, customerId, restaurantId, code, subtotal) {
  const rows = await connection.execute(
    `SELECT p.id, p.code, p.discount_type, p.discount_value, p.max_discount, p.minimum_order, p.usage_limit,
            p.usage_per_customer, p.used_count,
            (SELECT COUNT(*) FROM promotion_usage pu WHERE pu.promotion_id = p.id AND pu.customer_id = ?) AS customer_usage
     FROM promotions p WHERE UPPER(p.code) = UPPER(?) AND p.status = 'ACTIVE' AND p.deleted_at IS NULL
       AND (p.restaurant_id IS NULL OR p.restaurant_id = ?) AND p.start_at <= CURRENT_TIMESTAMP AND p.end_at >= CURRENT_TIMESTAMP
       AND p.minimum_order <= ? AND (p.usage_limit IS NULL OR p.used_count < p.usage_limit) LIMIT 1`, [customerId, code, restaurantId, subtotal]
  );
  if (!rows[0] || Number(rows[0].customer_usage) >= Number(rows[0].usage_per_customer)) return null;
  const row = rows[0];
  const raw = row.discount_type === 'PERCENT' ? subtotal * Number(row.discount_value) / 100 : Number(row.discount_value);
  return { id: Number(row.id), discountType: row.discount_type, discountAmount: roundMoney(Math.min(subtotal, row.max_discount == null ? raw : Math.min(raw, Number(row.max_discount)))) };
}
function formatAddress(row) { return [row.address_line, row.ward, row.district, row.city].filter(Boolean).join(', '); }
function mapCart(row) { return { id: Number(row.id), customerId: Number(row.customer_id), restaurantId: Number(row.restaurant_id), restaurantName: row.restaurant_name, restaurantStatus: row.restaurant_status, minimumOrder: Number(row.minimum_order), restaurantOwnerUserId: Number(row.owner_user_id), items: [], subtotal: 0 }; }
function mapCartTopping(row) { return { id: Number(row.topping_id), name: row.name, price: Number(row.price), quantity: Number(row.quantity) }; }
function mapOrderSummary(row) { return { id: Number(row.id), orderCode: row.order_code, customerId: row.customer_id == null ? null : Number(row.customer_id), restaurantId: Number(row.restaurant_id), restaurantName: row.restaurant_name, subtotal: Number(row.subtotal), discountAmount: Number(row.discount_amount), deliveryFee: Number(row.delivery_fee), serviceFee: Number(row.service_fee ?? 0), taxAmount: Number(row.tax_amount ?? 0), totalAmount: Number(row.total_amount), paymentMethod: row.payment_method, paymentStatus: row.payment_status, status: row.order_status, customerNote: row.customer_note ?? null, orderedAt: row.ordered_at, confirmedAt: row.confirmed_at ?? null, preparedAt: row.prepared_at ?? null, createdAt: row.created_at }; }
async function loadOrderDetail(row) {
  const items = await query(`SELECT oi.id, oi.menu_item_id, oi.variant_id, oi.item_name, oi.variant_name, oi.quantity, oi.unit_price, oi.total_price, oi.note FROM order_items oi WHERE oi.order_id = ? ORDER BY oi.id ASC`, [row.id]);
  const history = await query(`SELECT old_status, new_status, changed_by, note, created_at FROM order_status_history WHERE order_id = ? ORDER BY id ASC`, [row.id]);
  return { ...mapOrderSummary(row), deliveryAddress: row.delivery_address, receiverName: row.receiver_name, receiverPhone: row.receiver_phone, customerNote: row.customer_note ?? null, items: items.map(item => ({ id: Number(item.id), menuItemId: item.menu_item_id == null ? null : Number(item.menu_item_id), variantId: item.variant_id == null ? null : Number(item.variant_id), name: item.item_name, variantName: item.variant_name ?? null, quantity: Number(item.quantity), unitPrice: Number(item.unit_price), totalPrice: Number(item.total_price), note: item.note ?? null })), statusHistory: history.map(value => ({ oldStatus: value.old_status ?? null, newStatus: value.new_status, changedBy: value.changed_by == null ? null : Number(value.changed_by), note: value.note ?? null, createdAt: value.created_at })), customerUserId: Number(row.customer_user_id), restaurantOwnerUserId: Number(row.owner_user_id), customerEmail: row.customer_email, orderCode: row.order_code };
}
function groupBy(items, keyFn) { const map = new Map(); for (const item of items) { const key = keyFn(item); const list = map.get(key) ?? []; list.push(item); map.set(key, list); } return map; }
function roundMoney(value) { return Math.round(Number(value) * 100) / 100; }
