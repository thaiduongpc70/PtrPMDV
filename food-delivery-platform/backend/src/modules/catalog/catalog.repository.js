import { isOpenNow } from '../../shared/time/opening-hours.js';
import { DEFAULT_MAX_KM, INCLUDED_KM } from '../../shared/pricing/delivery-fee.js';
import { query } from '../../shared/database/mysql.js';

export const catalogRepository = {
  async searchRestaurants(filters) {
    const where = [
      "r.status = 'ACTIVE'",
      'r.deleted_at IS NULL'
    ];
    const params = [];

    if (filters.cities) {
      where.push(`r.city IN (${filters.cities.map(() => '?').join(',')})`);
      params.push(...filters.cities);
    }

    if (filters.district) {
      where.push('r.district = ?');
      params.push(filters.district);
    }

    if (filters.categoryId) {
      where.push('r.category_id = ?');
      params.push(filters.categoryId);
    }

    if (filters.keyword) {
      where.push('(r.name LIKE ? OR r.description LIKE ?)');
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
    }

    const restaurantPromo = `EXISTS (SELECT 1 FROM promotions p WHERE p.restaurant_id = r.id AND p.customer_id IS NULL
      AND p.status = 'ACTIVE' AND p.deleted_at IS NULL AND p.start_at <= CURRENT_TIMESTAMP AND p.end_at >= CURRENT_TIMESTAMP
      AND (p.usage_limit IS NULL OR p.used_count < p.usage_limit))`;
    if (filters.promoOnly) where.push(restaurantPromo);
    if (filters.lateNight) where.push("(r.closing_time < r.opening_time OR r.closing_time >= '23:00:00')");
    if (filters.hasCombo) where.push("EXISTS (SELECT 1 FROM menu_items mi WHERE mi.restaurant_id = r.id AND mi.item_type = 'COMBO' AND mi.deleted_at IS NULL AND mi.is_available = TRUE)");
    if (filters.minRating) { where.push('r.rating >= ?'); params.push(filters.minRating); }
    if (filters.maxPrepare) { where.push('r.average_prepare_time <= ?'); params.push(filters.maxPrepare); }
    if (filters.openNow) {
      where.push(`(r.opening_time = r.closing_time OR (r.opening_time < r.closing_time AND CURTIME() >= r.opening_time AND CURTIME() < r.closing_time)
        OR (r.opening_time > r.closing_time AND (CURTIME() >= r.opening_time OR CURTIME() < r.closing_time)))`);
    }
    const whereSql = where.join(' AND ');
    const hasPoint = filters.lat !== null && filters.lat !== undefined && filters.lng !== null && filters.lng !== undefined;
    const distanceSql = hasPoint ? 'ST_Distance_Sphere(POINT(r.longitude, r.latitude), POINT(?, ?)) / 1000' : 'NULL';
    const orderSql = {
      nearest: 'distance_km ASC, r.rating DESC',
      popular: 'r.total_orders DESC, r.rating DESC',
      top_rated: 'r.rating DESC, r.total_reviews DESC, r.total_orders DESC',
      fastest: 'r.average_prepare_time ASC, r.rating DESC',
      promo: `${restaurantPromo} DESC, r.total_orders DESC`,
      featured: 'r.rating * LOG10(r.total_reviews + 10) DESC, r.total_orders DESC, r.id DESC'
    }[filters.sort ?? 'featured'];

    const totalRows = await query(
      `
        SELECT COUNT(*) AS total
        FROM restaurants r
        LEFT JOIN restaurant_categories c
          ON c.id = r.category_id
        WHERE ${whereSql}
      `,
      params
    );

    const rows = await query(
      `
        SELECT
          r.id,
          r.name,
          r.description,
          r.category_id,
          c.name AS category_name,
          r.address,
          r.district,
          r.city,
          (
            SELECT ri.image_url
            FROM restaurant_images ri
            WHERE ri.restaurant_id = r.id
              AND ri.image_type = 'LOGO'
            ORDER BY ri.sort_order ASC, ri.id ASC
            LIMIT 1
          ) AS logo_url,
          (
            SELECT ri.image_url
            FROM restaurant_images ri
            WHERE ri.restaurant_id = r.id
              AND ri.image_type = 'COVER'
            ORDER BY ri.sort_order ASC, ri.id ASC
            LIMIT 1
          ) AS cover_url,
          TIME_FORMAT(r.opening_time, '%H:%i:%s') AS opening_time,
          TIME_FORMAT(r.closing_time, '%H:%i:%s') AS closing_time,
          r.minimum_order,
          r.average_prepare_time,
          r.rating,
          r.total_reviews,
          r.total_orders,
          ${distanceSql} AS distance_km
        FROM restaurants r
        LEFT JOIN restaurant_categories c
          ON c.id = r.category_id
          AND c.status = 'ACTIVE'
        WHERE ${whereSql}
        ORDER BY ${orderSql}
        LIMIT ? OFFSET ?
      `,
      [...(hasPoint ? [filters.lng, filters.lat] : []), ...params, filters.pageSize, filters.offset]
    );

    // Nhãn khuyến mãi của từng quán: voucher của quán còn hạn và còn lượt
    const ids = rows.map(row => Number(row.id));
    const promoRows = ids.length === 0 ? [] : await query(
      `SELECT p.restaurant_id, p.code, p.discount_type, p.discount_value, p.minimum_order
       FROM promotions p
       WHERE p.restaurant_id IN (${ids.map(() => '?').join(',')}) AND p.customer_id IS NULL AND p.status = 'ACTIVE' AND p.deleted_at IS NULL
         AND p.start_at <= CURRENT_TIMESTAMP AND p.end_at >= CURRENT_TIMESTAMP AND (p.usage_limit IS NULL OR p.used_count < p.usage_limit)
       ORDER BY p.discount_value DESC`, ids
    );
    const promosByRestaurant = groupByRaw(promoRows, row => Number(row.restaurant_id));
    return {
      items: rows.map(row => ({
        ...mapRestaurantSummary(row),
        distanceKm: row.distance_km == null ? null : Math.round(Number(row.distance_km) * 10) / 10,
        promotions: (promosByRestaurant.get(Number(row.id)) ?? []).slice(0, 2).map(promo => ({
          code: promo.code,
          label: promo.discount_type === 'PERCENT' ? `Giảm ${Number(promo.discount_value)}%` : `Giảm ${Math.round(Number(promo.discount_value) / 1000)}K`,
          minimumOrder: Number(promo.minimum_order)
        }))
      })),
      totalItems: Number(totalRows[0]?.total ?? 0)
    };
  },

  /** Số liệu thật cho trang chủ: thống kê, voucher toàn sàn đang chạy, danh mục bán chạy, combo tiết kiệm nhất, điểm thưởng, liên hệ. */
  async getStorefront() {
    const [[stats], vouchers, categories, combos, rewards, contact, hours] = await Promise.all([
      query(`SELECT (SELECT COUNT(*) FROM restaurants WHERE status = 'ACTIVE' AND deleted_at IS NULL) AS restaurants,
                    (SELECT COUNT(*) FROM menu_items WHERE deleted_at IS NULL AND is_available = TRUE) AS dishes,
                    (SELECT COUNT(*) FROM orders WHERE order_status = 'DELIVERED') AS delivered_orders,
                    (SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, o.created_at, d.delivered_at))) FROM deliveries d INNER JOIN orders o ON o.id = d.order_id
                      WHERE d.delivery_status = 'DELIVERED' AND d.delivered_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 DAY)) AS avg_delivery_minutes,
                    (SELECT COUNT(*) FROM menu_items WHERE item_type = 'COMBO' AND deleted_at IS NULL AND is_available = TRUE) AS combos`).then(rows => [rows[0]]),
      query(`SELECT code, name, discount_type, discount_value, max_discount, minimum_order, first_order_only, end_at FROM promotions
             WHERE restaurant_id IS NULL AND customer_id IS NULL AND status = 'ACTIVE' AND deleted_at IS NULL AND start_at <= CURRENT_TIMESTAMP AND end_at >= CURRENT_TIMESTAMP
               AND (usage_limit IS NULL OR used_count < usage_limit) ORDER BY (discount_type = 'FREE_DELIVERY') DESC, discount_value DESC LIMIT 8`),
      query(`SELECT c.id, c.name, COUNT(*) AS orders, ROUND(AVG(TIMESTAMPDIFF(MINUTE, o.created_at, d.delivered_at))) AS avg_minutes
             FROM orders o INNER JOIN restaurants r ON r.id = o.restaurant_id INNER JOIN restaurant_categories c ON c.id = r.category_id
             INNER JOIN deliveries d ON d.order_id = o.id AND d.delivery_status = 'DELIVERED'
             WHERE o.order_status = 'DELIVERED' AND o.created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 DAY) GROUP BY c.id, c.name ORDER BY orders DESC LIMIT 4`),
      query(`SELECT mi.id, mi.name, mi.restaurant_id, r.name AS restaurant_name, COALESCE(mi.discount_price, mi.base_price) AS price,
                    (SELECT SUM(COALESCE(p.discount_price, p.base_price) * c.quantity) FROM menu_item_combo_components c INNER JOIN menu_items p ON p.id = c.component_item_id WHERE c.combo_item_id = mi.id) AS original
             FROM menu_items mi INNER JOIN restaurants r ON r.id = mi.restaurant_id
             WHERE mi.item_type = 'COMBO' AND mi.deleted_at IS NULL AND mi.is_available = TRUE AND r.status = 'ACTIVE' ORDER BY (original - price) DESC LIMIT 1`),
      query(`SELECT name, points_cost FROM loyalty_rewards WHERE status = 'ACTIVE' AND (stock IS NULL OR stock > 0) ORDER BY points_cost ASC LIMIT 1`),
      query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('app.owner.name', 'app.owner.email', 'app.owner.phone', 'delivery_base_fee', 'delivery_price_per_km', 'max_delivery_distance')"),
      query("SELECT TIME_FORMAT(MIN(opening_time), '%H:%i') AS opens, TIME_FORMAT(MAX(closing_time), '%H:%i') AS closes FROM restaurants WHERE status = 'ACTIVE' AND deleted_at IS NULL")
    ]);
    const setting = key => contact.find(row => row.setting_key === key)?.setting_value ?? null;
    const combo = combos[0];
    return {
      stats: { restaurants: Number(stats.restaurants), dishes: Number(stats.dishes), deliveredOrders: Number(stats.delivered_orders), avgDeliveryMinutes: stats.avg_delivery_minutes == null ? null : Number(stats.avg_delivery_minutes), combos: Number(stats.combos) },
      vouchers: vouchers.map(row => ({ code: row.code, name: row.name, discountType: row.discount_type, discountValue: Number(row.discount_value), maxDiscount: row.max_discount == null ? null : Number(row.max_discount), minimumOrder: Number(row.minimum_order), firstOrderOnly: Boolean(row.first_order_only), endAt: row.end_at })),
      categories: categories.map(row => ({ id: Number(row.id), name: row.name, orders: Number(row.orders), avgMinutes: Number(row.avg_minutes) })),
      topCombo: combo ? { id: Number(combo.id), name: combo.name, restaurantId: Number(combo.restaurant_id), restaurantName: combo.restaurant_name, price: Number(combo.price), originalPrice: Number(combo.original ?? 0), savings: Math.max(0, Number(combo.original ?? 0) - Number(combo.price)) } : null,
      loyalty: { pointsPerThousand: 1, cheapestReward: rewards[0] ? { name: rewards[0].name, pointsCost: Number(rewards[0].points_cost) } : null },
      delivery: { maxKm: Number(setting('max_delivery_distance') ?? DEFAULT_MAX_KM), baseFee: Number(setting('delivery_base_fee') ?? 15000), perKm: Number(setting('delivery_price_per_km') ?? 5000), includedKm: INCLUDED_KM },
      contact: { name: setting('app.owner.name'), email: setting('app.owner.email'), phone: setting('app.owner.phone'), opens: hours[0]?.opens ?? null, closes: hours[0]?.closes ?? null }
    };
  },

  /** Bộ sưu tập tính từ dữ liệu thật: mỗi bộ kèm số quán và bộ lọc để mở danh sách tương ứng. */
  async listCollections(cities) {
    const cityWhere = cities ? `AND r.city IN (${cities.map(() => '?').join(',')})` : '';
    const params = cities ?? [];
    const [counts] = await query(
      `SELECT COUNT(*) AS total,
              SUM(r.rating >= 4) AS top_rated, SUM(r.average_prepare_time <= 18) AS fast,
              SUM(r.closing_time < r.opening_time OR r.closing_time >= '23:00:00') AS late_night,
              SUM(EXISTS (SELECT 1 FROM promotions p WHERE p.restaurant_id = r.id AND p.customer_id IS NULL AND p.status = 'ACTIVE' AND p.deleted_at IS NULL
                          AND p.start_at <= CURRENT_TIMESTAMP AND p.end_at >= CURRENT_TIMESTAMP AND (p.usage_limit IS NULL OR p.used_count < p.usage_limit))) AS with_voucher,
              SUM(EXISTS (SELECT 1 FROM menu_items mi WHERE mi.restaurant_id = r.id AND mi.item_type = 'COMBO' AND mi.deleted_at IS NULL AND mi.is_available = TRUE)) AS with_combo
       FROM restaurants r WHERE r.status = 'ACTIVE' AND r.deleted_at IS NULL ${cityWhere}`, params
    ).then(rows => rows);
    const categories = await query(
      `SELECT c.id, c.name, COUNT(*) AS total FROM restaurants r INNER JOIN restaurant_categories c ON c.id = r.category_id AND c.status = 'ACTIVE'
       WHERE r.status = 'ACTIVE' AND r.deleted_at IS NULL ${cityWhere} GROUP BY c.id, c.name ORDER BY total DESC, c.name LIMIT 6`, params
    );
    const freeship = await query(
      "SELECT code, minimum_order, COALESCE(max_discount, discount_value) AS cap FROM promotions WHERE restaurant_id IS NULL AND customer_id IS NULL AND discount_type = 'FREE_DELIVERY' AND status = 'ACTIVE' AND deleted_at IS NULL AND start_at <= CURRENT_TIMESTAMP AND end_at >= CURRENT_TIMESTAMP AND (usage_limit IS NULL OR used_count < usage_limit) ORDER BY minimum_order ASC LIMIT 1"
    );
    const n = value => Number(value ?? 0);
    const items = [];
    if (freeship[0]) items.push({ key: 'freeship', title: `Freeship đơn từ ${Math.round(n(freeship[0].minimum_order) / 1000)}K`, subtitle: `Mã ${freeship[0].code}`, emoji: '🛵', tone: 'green', count: n(counts.total), filter: { sort: 'featured' } });
    if (n(counts.with_voucher)) items.push({ key: 'voucher', title: 'Quán có voucher giảm giá', subtitle: 'Giảm % hoặc giảm trực tiếp', emoji: '🎟️', tone: 'red', count: n(counts.with_voucher), filter: { sort: 'promo', promo: '1' } });
    if (n(counts.with_combo)) items.push({ key: 'combo', title: 'Combo rẻ hơn mua lẻ', subtitle: 'Tiết kiệm khi mua trọn gói', emoji: '🍱', tone: 'amber', count: n(counts.with_combo), filter: { combo: '1', sort: 'popular' } });
    if (n(counts.top_rated)) items.push({ key: 'top_rated', title: 'Quán đánh giá từ 4★', subtitle: 'Được khách chấm cao', emoji: '⭐', tone: 'yellow', count: n(counts.top_rated), filter: { minRating: '4', sort: 'top_rated' } });
    if (n(counts.fast)) items.push({ key: 'fast', title: 'Chuẩn bị nhanh ≤ 18 phút', subtitle: 'Giao nhanh', emoji: '⚡', tone: 'blue', count: n(counts.fast), filter: { maxPrepare: '18', sort: 'fastest' } });
    if (n(counts.late_night)) items.push({ key: 'late', title: 'Mở cửa khuya', subtitle: 'Đóng cửa sau 23:00', emoji: '🌙', tone: 'purple', count: n(counts.late_night), filter: { late: '1', sort: 'popular' } });
    const emojiByName = { 'Cơm': '🍚', 'Bún - Phở': '🍜', 'Đồ uống': '🧋', 'Trà sữa': '🧋', 'Pizza': '🍕', 'Gà rán': '🍗', 'Đồ ăn nhanh': '🍔', 'Đồ ăn vặt': '🍟', 'Đồ chay': '🥗', 'Món Việt': '🍲' };
    for (const category of categories) items.push({ key: `category-${category.id}`, title: category.name, subtitle: 'Danh mục', emoji: emojiByName[category.name] ?? '🍽️', tone: 'orange', count: n(category.total), filter: { categoryId: String(category.id), sort: 'popular' } });
    return items;
  },

  async countRestaurantsByCity() {
    const rows = await query("SELECT city, COUNT(*) AS total FROM restaurants WHERE status = 'ACTIVE' AND deleted_at IS NULL GROUP BY city");
    return rows.map(row => ({ city: row.city, total: Number(row.total) }));
  },

  async listDistricts(cities) {
    const rows = await query(
      `SELECT district, COUNT(*) AS total FROM restaurants WHERE status = 'ACTIVE' AND deleted_at IS NULL AND district IS NOT NULL
       ${cities ? `AND city IN (${cities.map(() => '?').join(',')})` : ''} GROUP BY district ORDER BY total DESC, district`, cities ?? []
    );
    return rows.map(row => ({ name: row.district, restaurantCount: Number(row.total) }));
  },

  async getRestaurant(restaurantId) {
    const rows = await query(
      `
        SELECT
          r.id,
          r.name,
          r.description,
          r.category_id,
          c.name AS category_name,
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
          r.total_orders
        FROM restaurants r
        LEFT JOIN restaurant_categories c
          ON c.id = r.category_id
          AND c.status = 'ACTIVE'
        WHERE r.id = ?
          AND r.status = 'ACTIVE'
          AND r.deleted_at IS NULL
        LIMIT 1
      `,
      [restaurantId]
    );

    if (rows.length === 0) {
      return null;
    }

    const [images, operatingHours] = await Promise.all([
      query(
        `
          SELECT id, image_url, image_type, sort_order
          FROM restaurant_images
          WHERE restaurant_id = ?
          ORDER BY sort_order ASC, id ASC
        `,
        [restaurantId]
      ),
      query(
        `
          SELECT
            day_of_week,
            TIME_FORMAT(open_time, '%H:%i:%s') AS open_time,
            TIME_FORMAT(close_time, '%H:%i:%s') AS close_time,
            is_closed
          FROM restaurant_operating_hours
          WHERE restaurant_id = ?
          ORDER BY day_of_week ASC
        `,
        [restaurantId]
      )
    ]);

    return {
      ...mapRestaurantDetail(rows[0]),
      images: images.map(mapRestaurantImage),
      operatingHours: operatingHours.map(mapOperatingHour)
    };
  },

  async getRestaurantMenu(restaurantId) {
    const [
      menus,
      categories,
      items,
      variants,
      groupLinks,
      toppingGroups,
      toppings,
      comboComponents
    ] = await Promise.all([
      query(
        `
          SELECT
            id,
            name,
            description,
            TIME_FORMAT(start_time, '%H:%i:%s') AS start_time,
            TIME_FORMAT(end_time, '%H:%i:%s') AS end_time
          FROM menus
          WHERE restaurant_id = ?
            AND status = 'ACTIVE'
            AND deleted_at IS NULL
          ORDER BY id ASC
        `,
        [restaurantId]
      ),
      query(
        `
          SELECT id, menu_id, name, description, sort_order
          FROM menu_categories
          WHERE restaurant_id = ?
            AND status = 'ACTIVE'
          ORDER BY sort_order ASC, id ASC
        `,
        [restaurantId]
      ),
      query(
        `
          SELECT
            id,
            restaurant_id,
            category_id,
            name,
            description,
            image_url,
            base_price,
            discount_price,
            COALESCE(discount_price, base_price) AS effective_price,
            preparation_time,
            is_available,
            is_featured,
            sold_count,
            rating,
            total_reviews,
            item_type
          FROM menu_items
          WHERE restaurant_id = ?
            AND is_available = TRUE
            AND deleted_at IS NULL
          ORDER BY is_featured DESC, sold_count DESC, id ASC
        `,
        [restaurantId]
      ),
      query(
        `
          SELECT v.id, v.menu_item_id, v.name, v.price_adjustment
          FROM menu_item_variants v
          INNER JOIN menu_items mi
            ON mi.id = v.menu_item_id
          WHERE mi.restaurant_id = ?
            AND mi.deleted_at IS NULL
            AND v.status = 'ACTIVE'
          ORDER BY v.id ASC
        `,
        [restaurantId]
      ),
      query(
        `
          SELECT mitg.menu_item_id, mitg.topping_group_id
          FROM menu_item_topping_groups mitg
          INNER JOIN menu_items mi
            ON mi.id = mitg.menu_item_id
          INNER JOIN topping_groups tg
            ON tg.id = mitg.topping_group_id
          WHERE mi.restaurant_id = ?
            AND mi.deleted_at IS NULL
            AND tg.restaurant_id = ?
          ORDER BY mitg.menu_item_id ASC, tg.id ASC
        `,
        [restaurantId, restaurantId]
      ),
      query(
        `
          SELECT id, name, min_select, max_select, required
          FROM topping_groups
          WHERE restaurant_id = ?
          ORDER BY id ASC
        `,
        [restaurantId]
      ),
      query(
        `
          SELECT t.id, t.group_id, t.name, t.price
          FROM toppings t
          INNER JOIN topping_groups tg
            ON tg.id = t.group_id
          WHERE tg.restaurant_id = ?
            AND t.status = 'ACTIVE'
          ORDER BY t.group_id ASC, t.id ASC
        `,
        [restaurantId]
      ),
      query(
        `
          SELECT c.combo_item_id, c.component_item_id, c.quantity, mi.name,
                 COALESCE(mi.discount_price, mi.base_price) AS price
          FROM menu_item_combo_components c
          INNER JOIN menu_items combo ON combo.id = c.combo_item_id
          INNER JOIN menu_items mi ON mi.id = c.component_item_id
          WHERE combo.restaurant_id = ? AND combo.deleted_at IS NULL
          ORDER BY c.combo_item_id ASC, mi.id ASC
        `,
        [restaurantId]
      )
    ]);

    return buildMenuResponse({
      menus,
      categories,
      items,
      variants,
      groupLinks,
      toppingGroups,
      toppings,
      comboComponents
    });
  },

  async searchMenuItems(filters) {
    const where = [
      "r.status = 'ACTIVE'",
      'r.deleted_at IS NULL',
      'mi.deleted_at IS NULL',
      'mi.is_available = TRUE'
    ];
    const params = [];
    if (filters.restaurantId) { where.push('mi.restaurant_id = ?'); params.push(filters.restaurantId); }
    if (filters.cities) { where.push(`r.city IN (${filters.cities.map(() => '?').join(',')})`); params.push(...filters.cities); }
    if (filters.categoryId) { where.push('r.category_id = ?'); params.push(filters.categoryId); }
    if (filters.keyword) {
      where.push('(mi.name LIKE ? OR mi.description LIKE ? OR r.name LIKE ?)');
      const keyword = `%${filters.keyword}%`;
      params.push(keyword, keyword, keyword);
    }
    const whereSql = where.join(' AND ');
    const orderBy = filters.sort === 'price_asc'
      ? 'effective_price ASC, mi.id DESC'
      : filters.sort === 'price_desc'
        ? 'effective_price DESC, mi.id DESC'
        : filters.sort === 'popular'
          ? 'mi.sold_count DESC, mi.id DESC'
          : 'mi.is_featured DESC, mi.sold_count DESC, mi.id DESC';
    const totalRows = await query(
      `SELECT COUNT(*) AS total FROM menu_items mi
       INNER JOIN restaurants r ON r.id = mi.restaurant_id
       WHERE ${whereSql}`,
      params
    );
    const rows = await query(
      `SELECT mi.id, mi.restaurant_id, r.name AS restaurant_name, mi.category_id,
              mi.name, mi.description, mi.image_url, mi.base_price, mi.discount_price,
              COALESCE(mi.discount_price, mi.base_price) AS effective_price,
              mi.preparation_time, mi.is_available, mi.is_featured, mi.sold_count, mi.rating, mi.total_reviews, mi.item_type
       FROM menu_items mi INNER JOIN restaurants r ON r.id = mi.restaurant_id
       WHERE ${whereSql}
       ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, filters.pageSize, filters.offset]
    );
    return {
      items: rows.map(row => ({
        id: Number(row.id), restaurantId: Number(row.restaurant_id), restaurantName: row.restaurant_name,
        categoryId: row.category_id === null ? null : Number(row.category_id), name: row.name,
        description: row.description ?? null, imageUrl: row.image_url ?? null,
        basePrice: Number(row.base_price), discountPrice: row.discount_price === null ? null : Number(row.discount_price),
        effectivePrice: Number(row.effective_price), preparationTime: Number(row.preparation_time),
        isAvailable: Boolean(row.is_available), isFeatured: Boolean(row.is_featured), soldCount: Number(row.sold_count),
        rating: Number(row.rating), totalReviews: Number(row.total_reviews), itemType: row.item_type, isCombo: row.item_type === 'COMBO'
      })),
      totalItems: Number(totalRows[0]?.total ?? 0)
    };
  },

  async listMenuItemReviews(filters) {
    const [summary] = await query(
      `SELECT COUNT(*) AS total, COALESCE(ROUND(AVG(rating), 2), 0) AS average,
              SUM(rating = 1) AS s1, SUM(rating = 2) AS s2, SUM(rating = 3) AS s3, SUM(rating = 4) AS s4, SUM(rating = 5) AS s5
       FROM menu_item_reviews WHERE menu_item_id = ? AND deleted_at IS NULL`,
      [filters.menuItemId]
    );
    const rows = await query(
      `SELECT mr.id, mr.order_id, mr.rating, mr.comment, mr.created_at,
              COALESCE(cp.full_name, 'Khách hàng') AS customer_name
       FROM menu_item_reviews mr
       INNER JOIN customer_profiles cp ON cp.id = mr.customer_id
       WHERE mr.menu_item_id = ? AND mr.deleted_at IS NULL
       ORDER BY mr.created_at DESC, mr.id DESC
       LIMIT ? OFFSET ?`,
      [filters.menuItemId, filters.pageSize, filters.offset]
    );
    return {
      items: rows.map(row => ({
        id: Number(row.id), orderId: Number(row.order_id), rating: Number(row.rating), comment: row.comment ?? null,
        customerName: row.customer_name, createdAt: row.created_at
      })),
      totalItems: Number(summary?.total ?? 0),
      summary: {
        average: Number(summary?.average ?? 0),
        total: Number(summary?.total ?? 0),
        distribution: { 1: Number(summary?.s1 ?? 0), 2: Number(summary?.s2 ?? 0), 3: Number(summary?.s3 ?? 0), 4: Number(summary?.s4 ?? 0), 5: Number(summary?.s5 ?? 0) }
      }
    };
  },

  async listRestaurantReviews(filters) {
    const totalRows = await query(
      `SELECT COUNT(*) AS total
       FROM restaurant_reviews rr
       WHERE rr.restaurant_id = ?
         AND rr.deleted_at IS NULL`,
      [filters.restaurantId]
    );

    const rows = await query(
      `SELECT
          rr.id,
          rr.order_id,
          rr.customer_id,
          rr.restaurant_id,
          rr.rating,
          rr.comment,
          rr.restaurant_reply,
          rr.replied_at,
          rr.created_at,
          COALESCE(cp.full_name, u.username, 'Khách hàng') AS customer_name
       FROM restaurant_reviews rr
       INNER JOIN customer_profiles cp
         ON cp.id = rr.customer_id
       INNER JOIN users u
         ON u.id = cp.user_id
       WHERE rr.restaurant_id = ?
         AND rr.deleted_at IS NULL
       ORDER BY rr.created_at DESC, rr.id DESC
       LIMIT ? OFFSET ?`,
      [filters.restaurantId, filters.pageSize, filters.offset]
    );

    return {
      items: rows.map(mapRestaurantReview),
      totalItems: Number(totalRows[0]?.total ?? 0)
    };
  },

  async addSearchHistory(userId, keyword) {
    await query(
      `INSERT INTO search_history (customer_id, keyword)
       SELECT cp.id, ? FROM customer_profiles cp WHERE cp.user_id = ? LIMIT 1`,
      [keyword, userId]
    );
  },

  async listSearchHistory(userId, limit = 20) {
    const rows = await query(
      `SELECT sh.id, sh.keyword, sh.searched_at
       FROM search_history sh INNER JOIN customer_profiles cp ON cp.id = sh.customer_id
       WHERE cp.user_id = ? ORDER BY sh.searched_at DESC, sh.id DESC LIMIT ?`,
      [userId, limit]
    );
    return rows.map(row => ({ id: Number(row.id), keyword: row.keyword, searchedAt: row.searched_at }));
  }
};

function buildMenuResponse(data) {
  const toppingsByGroupId = groupBy(data.toppings.map(mapTopping), 'groupId');
  const groupsById = new Map(
    data.toppingGroups.map(group => [
      Number(group.id),
      mapToppingGroup(group, toppingsByGroupId.get(Number(group.id)) ?? [])
    ])
  );

  const variantsByItemId = groupBy(data.variants.map(mapVariant), 'menuItemId');
  const groupIdsByItemId = groupByRaw(data.groupLinks, row => Number(row.menu_item_id));

  const componentsByCombo = groupByRaw(data.comboComponents ?? [], row => Number(row.combo_item_id));
  const mappedItems = data.items.map(item => {
    const itemId = Number(item.id);
    const groupIds = groupIdsByItemId.get(itemId) ?? [];
    const itemGroups = groupIds
      .map(row => groupsById.get(Number(row.topping_group_id)))
      .filter(Boolean);

    return mapMenuItem(
      item,
      variantsByItemId.get(itemId) ?? [],
      itemGroups,
      (componentsByCombo.get(itemId) ?? []).map(row => ({ itemId: Number(row.component_item_id), name: row.name, quantity: Number(row.quantity), unitPrice: Number(row.price) }))
    );
  });

  const itemsByCategoryId = groupBy(
    mappedItems.filter(item => item.categoryId !== null),
    'categoryId'
  );
  const uncategorizedItems = mappedItems.filter(item => item.categoryId === null);

  return data.menus.map(menu => {
    const menuId = Number(menu.id);
    const menuCategories = data.categories
      .filter(category => category.menu_id === null || Number(category.menu_id) === menuId)
      .map(category => mapMenuCategory(
        category,
        itemsByCategoryId.get(Number(category.id)) ?? []
      ));

    return {
      id: menuId,
      name: menu.name,
      description: menu.description ?? null,
      startTime: menu.start_time ?? null,
      endTime: menu.end_time ?? null,
      categories: menuCategories,
      uncategorizedItems
    };
  });
}

function mapRestaurantSummary(row) {
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description ?? null,
    categoryId: row.category_id === null ? null : Number(row.category_id),
    categoryName: row.category_name ?? null,
    address: row.address,
    district: row.district ?? null,
    city: row.city,
    logoUrl: row.logo_url ?? null,
    coverUrl: row.cover_url ?? null,
    openingTime: row.opening_time ?? null,
    closingTime: row.closing_time ?? null,
    minimumOrder: Number(row.minimum_order),
    averagePrepareTime: Number(row.average_prepare_time),
    rating: Number(row.rating),
    totalReviews: Number(row.total_reviews),
    totalOrders: Number(row.total_orders),
    isOpen: isOpenNow(row.opening_time, row.closing_time)
  };
}

function mapRestaurantDetail(row) {
  return {
    ...mapRestaurantSummary(row),
    phone: row.phone ?? null,
    email: row.email ?? null,
    ward: row.ward ?? null,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude)
  };
}

function mapRestaurantImage(row) {
  return {
    id: Number(row.id),
    imageUrl: row.image_url,
    imageType: row.image_type,
    sortOrder: Number(row.sort_order)
  };
}

function mapOperatingHour(row) {
  return {
    dayOfWeek: Number(row.day_of_week),
    openTime: row.open_time ?? null,
    closeTime: row.close_time ?? null,
    isClosed: Boolean(row.is_closed)
  };
}

function mapMenuCategory(row, items) {
  return {
    id: Number(row.id),
    menuId: row.menu_id === null ? null : Number(row.menu_id),
    name: row.name,
    description: row.description ?? null,
    sortOrder: Number(row.sort_order),
    items
  };
}

function mapMenuItem(row, variants, toppingGroups, components = []) {
  const originalPrice = components.reduce((sum, part) => sum + part.unitPrice * part.quantity, 0);
  const savings = components.length ? Math.max(0, originalPrice - Number(row.effective_price)) : 0;
  return {
    id: Number(row.id),
    restaurantId: Number(row.restaurant_id),
    categoryId: row.category_id === null ? null : Number(row.category_id),
    name: row.name,
    description: row.description ?? null,
    imageUrl: row.image_url ?? null,
    basePrice: Number(row.base_price),
    discountPrice: row.discount_price === null ? null : Number(row.discount_price),
    effectivePrice: Number(row.effective_price),
    preparationTime: Number(row.preparation_time),
    isAvailable: Boolean(row.is_available),
    isFeatured: Boolean(row.is_featured),
    soldCount: Number(row.sold_count),
    rating: Number(row.rating),
    totalReviews: Number(row.total_reviews),
    itemType: row.item_type ?? 'DISH',
    isCombo: row.item_type === 'COMBO',
    components,
    originalPrice: components.length ? originalPrice : null,
    savings,
    variants,
    toppingGroups
  };
}

function mapVariant(row) {
  return {
    id: Number(row.id),
    menuItemId: Number(row.menu_item_id),
    name: row.name,
    priceAdjustment: Number(row.price_adjustment)
  };
}

function mapToppingGroup(row, toppings) {
  return {
    id: Number(row.id),
    name: row.name,
    minSelect: Number(row.min_select),
    maxSelect: Number(row.max_select),
    required: Boolean(row.required),
    toppings
  };
}

function mapTopping(row) {
  return {
    id: Number(row.id),
    groupId: Number(row.group_id),
    name: row.name,
    price: Number(row.price)
  };
}

function mapRestaurantReview(row) {
  return {
    id: Number(row.id),
    orderId: Number(row.order_id),
    customerId: Number(row.customer_id),
    restaurantId: Number(row.restaurant_id),
    rating: Number(row.rating),
    comment: row.comment ?? null,
    restaurantReply: row.restaurant_reply ?? null,
    repliedAt: row.replied_at ?? null,
    customerName: row.customer_name,
    createdAt: row.created_at
  };
}

function groupBy(items, key) {
  return groupByRaw(items, item => item[key]);
}

function groupByRaw(items, getKey) {
  const map = new Map();

  for (const item of items) {
    const key = getKey(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  return map;
}
