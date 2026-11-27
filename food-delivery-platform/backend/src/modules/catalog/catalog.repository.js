import { isOpenNow, vietnamClock } from '../../shared/time/opening-hours.js';
import { allTokensSql, matchItem, matchRestaurant, preferredForms, scoreItem, scoreRestaurant, selectAndRank, stripDiacritics, tokenLikeSql, withPreferredForms } from './search-text.js';
import { DEFAULT_MAX_KM, deliveryFeeTable, feeSettings, INCLUDED_KM } from '../../shared/pricing/delivery-fee.js';
import { query } from '../../shared/database/mysql.js';
import { env } from '../../shared/config/env.js';

export const catalogRepository = {
  async searchRestaurants(filters) {
    const where = [
      "r.status = 'ACTIVE'",
      'r.deleted_at IS NULL'
    ];
    const params = [];
    const search = filters.search ?? null;

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

    if (search) {
      // Mọi từ phải khớp tên quán, mô tả, danh mục hoặc tên một món của quán (AND giữa các từ, có dấu thì đúng dấu)
      const match = allTokensSql(['r.name', 'r.description', 'c.name', dishNameLike], search);
      where.push(`(${match.sql})`);
      params.push(...match.params);
    }

    const restaurantPromo = `EXISTS (SELECT 1 FROM promotions p WHERE p.restaurant_id = r.id AND p.customer_id IS NULL
      AND p.status = 'ACTIVE' AND p.deleted_at IS NULL AND p.start_at <= CURRENT_TIMESTAMP AND p.end_at >= CURRENT_TIMESTAMP
      AND (p.usage_limit IS NULL OR p.used_count < p.usage_limit))`;
    if (filters.promoOnly) where.push(restaurantPromo);
    if (filters.lateNight) where.push("(r.closing_time < r.opening_time OR r.closing_time >= '23:00:00')");
    if (filters.hasCombo) where.push("EXISTS (SELECT 1 FROM menu_items mi WHERE mi.restaurant_id = r.id AND mi.item_type = 'COMBO' AND mi.deleted_at IS NULL AND mi.is_available = TRUE)");
    if (filters.hasDiscount) where.push(`EXISTS (SELECT 1 FROM menu_items mi WHERE mi.restaurant_id = r.id AND mi.deleted_at IS NULL AND mi.is_available = TRUE AND ${DISCOUNTED_ITEM})`);
    if (filters.vegetarian) {
      // Quán chay = danh mục/tên quán chay, hoặc ≥ vegetarianMinShare số món thường có chữ "chay" (không còn chỉ cần 1 món chay)
      const parts = [wordStartLike('c.name', 'chay'), wordStartLike('r.name', 'chay'), wordStartLike('vm.name', 'chay')];
      const share = `(SELECT COALESCE(SUM(${parts[2].sql}) / NULLIF(COUNT(*), 0), 0) FROM menu_items vm WHERE vm.restaurant_id = r.id AND vm.item_type = 'DISH' AND vm.deleted_at IS NULL AND vm.is_available = TRUE)`;
      where.push(`(${parts[0].sql} OR ${parts[1].sql} OR ${share} >= ?)`);
      params.push(...parts[0].params, ...parts[1].params, ...parts[2].params, filters.vegetarianMinShare ?? env.catalog.vegetarianMinShare);
    }
    if (filters.spicy) {
      const like = wordStartLike('mi.name', 'cay');
      where.push(`EXISTS (SELECT 1 FROM menu_items mi WHERE mi.restaurant_id = r.id AND mi.deleted_at IS NULL AND mi.is_available = TRUE AND ${like.sql})`);
      params.push(...like.params);
    }
    if (filters.priceMin != null) { where.push(`${AVG_PRICE_SQL} >= ?`); params.push(filters.priceMin); }
    if (filters.priceMax != null) { where.push(`${AVG_PRICE_SQL} <= ?`); params.push(filters.priceMax); }
    if (filters.minRating) { where.push('r.rating >= ?'); params.push(filters.minRating); }
    if (filters.maxPrepare) { where.push('r.average_prepare_time <= ?'); params.push(filters.maxPrepare); }
    if (filters.openNow) {
      const open = openNowSql(filters.clock ?? vietnamClock());
      where.push(open.sql);
      params.push(...open.params);
    }

    const hasPoint = filters.lat !== null && filters.lat !== undefined && filters.lng !== null && filters.lng !== undefined;
    const maxKm = hasPoint ? await readMaxDeliveryKm() : null;
    const distanceExpr = 'ST_Distance_Sphere(POINT(r.longitude, r.latitude), POINT(?, ?)) / 1000';
    const distanceSql = hasPoint ? distanceExpr : 'NULL';
    if (hasPoint && filters.hideOutOfRange) { where.push(`${distanceExpr} <= ?`); params.push(filters.lng, filters.lat, maxKm); }
    const baseOrder = {
      nearest: 'distance_km ASC, r.rating DESC',
      popular: 'r.total_orders DESC, r.rating DESC',
      top_rated: 'r.rating DESC, r.total_reviews DESC, r.total_orders DESC',
      fastest: 'r.average_prepare_time ASC, r.rating DESC',
      price_asc: 'avg_price ASC, r.rating DESC',
      price_desc: 'avg_price DESC, r.rating DESC',
      promo: `${restaurantPromo} DESC, r.total_orders DESC`,
      featured: 'r.rating * LOG10(r.total_reviews + 10) DESC, r.total_orders DESC, r.id DESC'
    }[filters.sort ?? 'featured'];
    // Có toạ độ: quán ngoài vùng giao luôn xếp cuối (quán thiếu toạ độ không bị coi là ngoài vùng)
    const orderSql = hasPoint ? `COALESCE(distance_km > ${Number(maxKm)}, 0) ASC, ${baseOrder}` : baseOrder;
    const whereSql = where.join(' AND ');

    const totalRows = await query(
      `
        SELECT COUNT(*) AS total
        FROM restaurants r
        LEFT JOIN restaurant_categories c
          ON c.id = r.category_id
          AND c.status = 'ACTIVE'
        WHERE ${whereSql}
      `,
      params
    );

    // Có từ khoá: lấy toàn bộ kết quả khớp rồi xếp theo độ liên quan trong bộ nhớ; không thì phân trang bằng SQL
    const ranked = Boolean(search);
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
          ${AVG_PRICE_SQL} AS avg_price,
          ${distanceSql} AS distance_km
        FROM restaurants r
        LEFT JOIN restaurant_categories c
          ON c.id = r.category_id
          AND c.status = 'ACTIVE'
        WHERE ${whereSql}
        ORDER BY ${orderSql}
        LIMIT ? OFFSET ?
      `,
      [...(hasPoint ? [filters.lng, filters.lat] : []), ...params, ranked ? 1000 : filters.pageSize, ranked ? 0 : filters.offset]
    );

    let pageRows = rows;
    let rankedTotal = null;
    if (ranked) {
      // SQL chỉ lọc thô (chuỗi con); khớp TỪ TRỌN VẸN, trọng số tên quán > món > danh mục > mô tả làm ở đây
      const dishNames = await loadDishNames(rows.map(row => Number(row.id)));
      const shops = rows.map(row => ({ row, name: row.name, description: row.description, category: row.category_name, dishes: dishNames.get(Number(row.id)) ?? [] }));
      const scoring = await scoringQuery(search);
      const selected = selectAndRank(shops, search, { match: matchRestaurant, score: (shop) => scoreRestaurant(shop, scoring), textsOf: shop => [shop.name, shop.category, shop.description, ...shop.dishes] }).map(shop => shop.row);
      rankedTotal = selected.length;
      pageRows = selected.slice(filters.offset, filters.offset + filters.pageSize);
    }

    // Nhãn khuyến mãi của từng quán: voucher của quán còn hạn và còn lượt
    const ids = pageRows.map(row => Number(row.id));
    const [promoRows, hoursByRestaurant] = await Promise.all([ids.length === 0 ? [] : query(
      `SELECT p.restaurant_id, p.code, p.discount_type, p.discount_value, p.minimum_order
       FROM promotions p
       WHERE p.restaurant_id IN (${ids.map(() => '?').join(',')}) AND p.customer_id IS NULL AND p.status = 'ACTIVE' AND p.deleted_at IS NULL
         AND p.start_at <= CURRENT_TIMESTAMP AND p.end_at >= CURRENT_TIMESTAMP AND (p.usage_limit IS NULL OR p.used_count < p.usage_limit)
       ORDER BY p.discount_value DESC`, ids
    ), loadOperatingHours(ids)]);
    const promosByRestaurant = groupByRaw(promoRows, row => Number(row.restaurant_id));
    return {
      items: pageRows.map(row => {
        const km = row.distance_km == null ? null : Number(row.distance_km);
        return {
          ...mapRestaurantSummary(row, hoursByRestaurant.get(Number(row.id)) ?? []),
          averagePrice: row.avg_price == null ? null : Math.round(Number(row.avg_price)),
          distanceKm: km == null ? null : Math.round(km * 10) / 10,
          // so với giới hạn giao hàng thật (system_settings.max_delivery_distance); chỉ có khi truyền lat/lng
          outOfDeliveryRange: km == null ? null : km > maxKm,
          promotions: (promosByRestaurant.get(Number(row.id)) ?? []).slice(0, 2).map(promo => ({
            code: promo.code,
            label: promo.discount_type === 'PERCENT' ? `Giảm ${Number(promo.discount_value)}%` : `Giảm ${Math.round(Number(promo.discount_value) / 1000)}K`,
            minimumOrder: Number(promo.minimum_order)
          }))
        };
      }),
      totalItems: rankedTotal ?? Number(totalRows[0]?.total ?? 0),
      maxDeliveryKm: maxKm
    };
  },

  /** Số liệu thật cho trang chủ: thống kê, voucher toàn sàn đang chạy, danh mục bán chạy, combo tiết kiệm nhất, điểm thưởng, liên hệ. */
  /** `cities` (mảng cách viết cột city) giới hạn số liệu trang chủ theo vùng đang chọn; null = toàn hệ thống. */
  async getStorefront(cities = null) {
    const inCity = (alias, prefix = 'AND') => (cities ? ` ${prefix} ${alias}.city IN (${cities.map(() => '?').join(',')})` : '');
    const cityParams = cities ?? [];
    const [[stats], vouchers, categories, combos, rewards, contact, hours] = await Promise.all([
      query(`SELECT (SELECT COUNT(*) FROM restaurants r WHERE r.status = 'ACTIVE' AND r.deleted_at IS NULL${inCity('r')}) AS restaurants,
                    (SELECT COUNT(*) FROM menu_items mi INNER JOIN restaurants r ON r.id = mi.restaurant_id WHERE mi.deleted_at IS NULL AND mi.is_available = TRUE AND mi.item_type = 'DISH' AND r.status = 'ACTIVE' AND r.deleted_at IS NULL${inCity('r')}) AS dishes,
                    (SELECT COUNT(*) FROM orders o INNER JOIN restaurants r ON r.id = o.restaurant_id WHERE o.order_status = 'DELIVERED'${inCity('r')}) AS delivered_orders,
                    (SELECT MIN(o.created_at) FROM orders o INNER JOIN restaurants r ON r.id = o.restaurant_id WHERE o.order_status = 'DELIVERED'${inCity('r')}) AS stats_since,
                    (SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, o.created_at, d.delivered_at))) FROM deliveries d INNER JOIN orders o ON o.id = d.order_id INNER JOIN restaurants r ON r.id = o.restaurant_id
                      WHERE d.delivery_status = 'DELIVERED' AND d.delivered_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 DAY)${inCity('r')}) AS avg_delivery_minutes,
                    (SELECT COUNT(*) FROM menu_items mi INNER JOIN restaurants r ON r.id = mi.restaurant_id WHERE mi.item_type = 'COMBO' AND mi.deleted_at IS NULL AND mi.is_available = TRUE AND r.status = 'ACTIVE' AND r.deleted_at IS NULL${inCity('r')}) AS combos`, [...cityParams, ...cityParams, ...cityParams, ...cityParams, ...cityParams, ...cityParams]).then(rows => [rows[0]]),
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
      stats: { restaurants: Number(stats.restaurants), dishes: Number(stats.dishes), deliveredOrders: Number(stats.delivered_orders), since: stats.stats_since ?? null, avgDeliveryMinutes: stats.avg_delivery_minutes == null ? null : Number(stats.avg_delivery_minutes), combos: Number(stats.combos) },
      vouchers: vouchers.map(row => ({ code: row.code, name: row.name, discountType: row.discount_type, discountValue: Number(row.discount_value), maxDiscount: row.max_discount == null ? null : Number(row.max_discount), minimumOrder: Number(row.minimum_order), firstOrderOnly: Boolean(row.first_order_only), endAt: row.end_at })),
      categories: categories.map(row => ({ id: Number(row.id), name: row.name, orders: Number(row.orders), avgMinutes: Number(row.avg_minutes) })),
      topCombo: combo ? { id: Number(combo.id), name: combo.name, restaurantId: Number(combo.restaurant_id), restaurantName: combo.restaurant_name, price: Number(combo.price), originalPrice: Number(combo.original ?? 0), savings: Math.max(0, Number(combo.original ?? 0) - Number(combo.price)) } : null,
      loyalty: { pointsPerThousand: 1, cheapestReward: rewards[0] ? { name: rewards[0].name, pointsCost: Number(rewards[0].points_cost) } : null },
      delivery: deliveryInfo(setting),
      contact: { name: setting('app.owner.name'), email: setting('app.owner.email'), phone: setting('app.owner.phone'), opens: hours[0]?.opens ?? null, closes: hours[0]?.closes ?? null }
    };
  },

  /** Toạ độ địa chỉ mặc định (hoặc địa chỉ có toạ độ mới nhất) của khách; null nếu chưa có. */
  async findDefaultAddressPoint(userId) {
    const rows = await query(
      `SELECT a.latitude, a.longitude FROM customer_addresses a INNER JOIN customer_profiles cp ON cp.id = a.customer_id
       WHERE cp.user_id = ? AND a.deleted_at IS NULL AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
       ORDER BY a.is_default DESC, a.id DESC LIMIT 1`, [userId]
    );
    return rows[0] ? { lat: Number(rows[0].latitude), lng: Number(rows[0].longitude) } : null;
  },

  /** Bảng phí giao theo km từ cấu hình hệ thống + công thức thật. */
  async getDeliveryFees() {
    const rows = await query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('delivery_base_fee', 'delivery_price_per_km', 'max_delivery_distance')");
    return deliveryInfo(key => rows.find(row => row.setting_key === key)?.setting_value ?? null);
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
      ...mapRestaurantDetail(rows[0], operatingHours.map(mapOperatingHour)),
      // trang chi tiết quán cũng cần logo/ảnh bìa như danh sách (giao diện đọc logoUrl/coverUrl)
      logoUrl: images.find(image => image.image_type === 'LOGO')?.image_url ?? null,
      coverUrl: images.find(image => image.image_type === 'COVER')?.image_url ?? null,
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
    const search = filters.search ?? null;
    if (filters.restaurantId) { where.push('mi.restaurant_id = ?'); params.push(filters.restaurantId); }
    if (filters.cities) { where.push(`r.city IN (${filters.cities.map(() => '?').join(',')})`); params.push(...filters.cities); }
    if (filters.categoryId) { where.push('r.category_id = ?'); params.push(filters.categoryId); }
    if (search) {
      // Mọi từ phải khớp tên món, mô tả, tên quán hoặc nhóm món
      const match = allTokensSql(['mi.name', 'mi.description', 'r.name', 'mc.name'], search);
      where.push(`(${match.sql})`);
      params.push(...match.params);
    }
    if (filters.discountOnly) where.push(DISCOUNTED_ITEM);
    if (filters.priceMin != null) { where.push('COALESCE(mi.discount_price, mi.base_price) >= ?'); params.push(filters.priceMin); }
    if (filters.priceMax != null) { where.push('COALESCE(mi.discount_price, mi.base_price) <= ?'); params.push(filters.priceMax); }
    if (filters.vegetarian) {
      const parts = ['mi.name', 'mc.name', 'r.name'].map(expr => wordStartLike(expr, 'chay'));
      where.push(`(${parts.map(part => part.sql).join(' OR ')})`);
      for (const part of parts) params.push(...part.params);
    }
    if (filters.spicy) { const like = wordStartLike('mi.name', 'cay'); where.push(like.sql); params.push(...like.params); }
    const whereSql = where.join(' AND ');
    const orderBy = filters.sort === 'price_asc'
      ? 'effective_price ASC, mi.id DESC'
      : filters.sort === 'price_desc'
        ? 'effective_price DESC, mi.id DESC'
        : filters.sort === 'popular'
          ? 'mi.sold_count DESC, mi.id DESC'
          : 'mi.is_featured DESC, mi.sold_count DESC, mi.id DESC';
    const joins = `FROM menu_items mi INNER JOIN restaurants r ON r.id = mi.restaurant_id
       LEFT JOIN menu_categories mc ON mc.id = mi.category_id`;
    const totalRows = await query(`SELECT COUNT(*) AS total ${joins} WHERE ${whereSql}`, params);
    const ranked = Boolean(search);
    const rows = await query(
      `SELECT mi.id, mi.restaurant_id, r.name AS restaurant_name, mi.category_id, mc.name AS menu_category_name,
              mi.name, mi.description, mi.image_url, mi.base_price, mi.discount_price,
              COALESCE(mi.discount_price, mi.base_price) AS effective_price,
              mi.preparation_time, mi.is_available, mi.is_featured, mi.sold_count, mi.rating, mi.total_reviews, mi.item_type
       ${joins}
       WHERE ${whereSql}
       ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, ranked ? 3000 : filters.pageSize, ranked ? 0 : filters.offset]
    );
    let rankedItems = null;
    if (ranked) {
      const entries = rows.map(row => ({ row, name: row.name, description: row.description, restaurant: row.restaurant_name, category: row.menu_category_name }));
      const scoring = await scoringQuery(search);
      rankedItems = selectAndRank(entries, search, { match: matchItem, score: (entry) => scoreItem(entry, scoring), textsOf: entry => [entry.name, entry.restaurant, entry.category, entry.description] }).map(entry => entry.row);
    }
    const pageRows = ranked ? rankedItems.slice(filters.offset, filters.offset + filters.pageSize) : rows;
    return {
      items: pageRows.map(row => ({
        id: Number(row.id), restaurantId: Number(row.restaurant_id), restaurantName: row.restaurant_name,
        categoryId: row.category_id === null ? null : Number(row.category_id), name: row.name,
        description: row.description ?? null, imageUrl: row.image_url ?? null,
        basePrice: Number(row.base_price), discountPrice: row.discount_price === null ? null : Number(row.discount_price),
        effectivePrice: Number(row.effective_price), preparationTime: Number(row.preparation_time),
        isAvailable: Boolean(row.is_available), isFeatured: Boolean(row.is_featured), soldCount: Number(row.sold_count),
        rating: Number(row.rating), totalReviews: Number(row.total_reviews), itemType: row.item_type, isCombo: row.item_type === 'COMBO'
      })),
      totalItems: rankedItems ? rankedItems.length : Number(totalRows[0]?.total ?? 0)
    };
  },

  /**
   * Gợi ý khi tìm không ra: (1) bỏ bớt các từ không có trong dữ liệu, (2) danh mục quán khớp một từ nào đó,
   * (3) tên món khớp một từ, (4) danh mục nhiều quán nhất. Trả [{ type, text, categoryId? }].
   */
  async suggestSearch(parsed, cities) {
    const suggestions = [];
    const seen = new Set();
    const add = item => { const key = `${item.type}:${stripDiacritics(item.text)}`; if (!seen.has(key) && suggestions.length < 8) { seen.add(key); suggestions.push(item); } };
    const cityWhere = cities ? `AND r.city IN (${cities.map(() => '?').join(',')})` : '';
    const cityParams = cities ?? [];

    const known = [];
    for (const token of parsed.tokens) {
      const nameLike = tokenLikeSql('mi.name', token);
      const shopLike = tokenLikeSql('r.name', token);
      const [hit] = await query(
        `SELECT (SELECT COUNT(*) FROM menu_items mi INNER JOIN restaurants r ON r.id = mi.restaurant_id
                 WHERE mi.deleted_at IS NULL AND mi.is_available = TRUE AND r.status = 'ACTIVE' AND r.deleted_at IS NULL ${cityWhere} AND ${nameLike.sql})
              + (SELECT COUNT(*) FROM restaurants r WHERE r.status = 'ACTIVE' AND r.deleted_at IS NULL ${cityWhere} AND ${shopLike.sql}) AS total`,
        [...cityParams, nameLike.param, ...cityParams, shopLike.param]
      );
      if (Number(hit?.total) > 0) known.push(token);
    }
    if (known.length && known.length < parsed.tokens.length) add({ type: 'keyword', text: known.map(token => token.text).join(' ') });

    for (const token of parsed.tokens) {
      const like = tokenLikeSql('c.name', token);
      const categories = await query(
        `SELECT c.id, c.name FROM restaurant_categories c WHERE c.status = 'ACTIVE' AND ${like.sql} ORDER BY c.name LIMIT 3`, [like.param]
      );
      for (const category of categories) add({ type: 'category', text: category.name, categoryId: Number(category.id) });
    }
    for (const token of parsed.tokens) {
      const like = tokenLikeSql('mi.name', token);
      const dishes = await query(
        `SELECT mi.name, SUM(mi.sold_count) AS sold FROM menu_items mi INNER JOIN restaurants r ON r.id = mi.restaurant_id
         WHERE mi.deleted_at IS NULL AND mi.is_available = TRUE AND r.status = 'ACTIVE' AND r.deleted_at IS NULL ${cityWhere} AND ${like.sql}
         GROUP BY mi.name ORDER BY sold DESC LIMIT 3`, [...cityParams, like.param]
      );
      for (const dish of dishes) add({ type: 'dish', text: dish.name });
    }
    if (suggestions.length === 0) {
      const popular = await query(
        `SELECT c.id, c.name, COUNT(*) AS total FROM restaurants r INNER JOIN restaurant_categories c ON c.id = r.category_id AND c.status = 'ACTIVE'
         WHERE r.status = 'ACTIVE' AND r.deleted_at IS NULL ${cityWhere} GROUP BY c.id, c.name ORDER BY total DESC, c.name LIMIT 5`, cityParams
      );
      for (const category of popular) add({ type: 'popular', text: category.name, categoryId: Number(category.id) });
    }
    return suggestions;
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
       WHERE mr.menu_item_id = ? AND mr.deleted_at IS NULL ${filters.rating ? 'AND mr.rating = ?' : ''}
       ORDER BY mr.created_at DESC, mr.id DESC
       LIMIT ? OFFSET ?`,
      [filters.menuItemId, ...(filters.rating ? [filters.rating] : []), filters.pageSize, filters.offset]
    );
    return {
      items: rows.map(row => ({
        id: Number(row.id), orderId: Number(row.order_id), rating: Number(row.rating), comment: row.comment ?? null,
        customerName: row.customer_name, createdAt: row.created_at
      })),
      // totalItems = số đánh giá khớp bộ lọc sao; summary luôn là toàn bộ để thanh phân bố không đổi khi lọc
      totalItems: filters.rating ? Number(summary?.[`s${filters.rating}`] ?? 0) : Number(summary?.total ?? 0),
      summary: {
        average: Number(summary?.average ?? 0),
        total: Number(summary?.total ?? 0),
        distribution: { 1: Number(summary?.s1 ?? 0), 2: Number(summary?.s2 ?? 0), 3: Number(summary?.s3 ?? 0), 4: Number(summary?.s4 ?? 0), 5: Number(summary?.s5 ?? 0) }
      }
    };
  },

  async listRestaurantReviews(filters) {
    const [summary] = await query(
      `SELECT COUNT(*) AS total, COALESCE(ROUND(AVG(rating), 2), 0) AS average,
              SUM(rating = 1) AS s1, SUM(rating = 2) AS s2, SUM(rating = 3) AS s3, SUM(rating = 4) AS s4, SUM(rating = 5) AS s5
       FROM restaurant_reviews WHERE restaurant_id = ? AND deleted_at IS NULL`,
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
         AND rr.deleted_at IS NULL ${filters.rating ? 'AND rr.rating = ?' : ''}
       ORDER BY rr.created_at DESC, rr.id DESC
       LIMIT ? OFFSET ?`,
      [filters.restaurantId, ...(filters.rating ? [filters.rating] : []), filters.pageSize, filters.offset]
    );

    return {
      items: rows.map(mapRestaurantReview),
      totalItems: filters.rating ? Number(summary?.[`s${filters.rating}`] ?? 0) : Number(summary?.total ?? 0),
      summary: {
        average: Number(summary?.average ?? 0),
        total: Number(summary?.total ?? 0),
        distribution: { 1: Number(summary?.s1 ?? 0), 2: Number(summary?.s2 ?? 0), 3: Number(summary?.s3 ?? 0), 4: Number(summary?.s4 ?? 0), 5: Number(summary?.s5 ?? 0) }
      }
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

/** Cấu hình + bảng phí giao theo km, tính bằng đúng công thức checkout (shared/pricing/delivery-fee.js). */
function deliveryInfo(setting) {
  const read = key => (setting(key) == null ? NaN : Number(setting(key)));
  const options = feeSettings({ delivery_base_fee: read('delivery_base_fee'), delivery_price_per_km: read('delivery_price_per_km'), max_delivery_distance: read('max_delivery_distance') });
  return { maxKm: options.maxKm, baseFee: options.base, perKm: options.perKm, includedKm: INCLUDED_KM, tiers: deliveryFeeTable(options) };
}

/** Trung bình giá bán (đã trừ giảm giá) của các món thường đang bán của quán. */
const AVG_PRICE_SQL = `(SELECT AVG(COALESCE(pm.discount_price, pm.base_price)) FROM menu_items pm
  WHERE pm.restaurant_id = r.id AND pm.item_type = 'DISH' AND pm.deleted_at IS NULL AND pm.is_available = TRUE)`;
/** Món đang giảm giá thật: có giá khuyến mãi thấp hơn giá gốc (dùng trong truy vấn có alias mi). */
const DISCOUNTED_ITEM = 'mi.discount_price IS NOT NULL AND mi.discount_price < mi.base_price';

/** "chay"/"cay" ở đầu từ trong tên (phân biệt dấu: cay ≠ cây). */
function wordStartLike(expr, word) {
  return {
    sql: `(COALESCE(${expr}, '') COLLATE utf8mb4_0900_as_ci LIKE ? OR COALESCE(${expr}, '') COLLATE utf8mb4_0900_as_ci LIKE ?)`,
    params: [`${word}%`, `% ${word}%`]
  };
}

/** Một từ có nằm trong tên món nào đó của quán (alias r). */
function dishNameLike(token) {
  const like = tokenLikeSql('dm.name', token);
  return { sql: `EXISTS (SELECT 1 FROM menu_items dm WHERE dm.restaurant_id = r.id AND dm.deleted_at IS NULL AND dm.is_available = TRUE AND ${like.sql})`, param: like.param };
}

/** Bộ lọc "Đang mở" theo giờ Việt Nam: ưu tiên restaurant_operating_hours, không có thì dùng opening/closing_time. Tham số theo đúng thứ tự dấu ?. */
function openNowSql(clock) {
  const now = clock.time.slice(0, 5) + ':00';
  const window = 'h.open_time = h.close_time OR (h.open_time < h.close_time AND ? >= h.open_time AND ? < h.close_time) OR (h.open_time > h.close_time AND (? >= h.open_time OR ? < h.close_time))';
  return {
    sql: `(CASE WHEN EXISTS (SELECT 1 FROM restaurant_operating_hours h WHERE h.restaurant_id = r.id AND h.day_of_week = ?)
      THEN (EXISTS (SELECT 1 FROM restaurant_operating_hours h WHERE h.restaurant_id = r.id AND h.day_of_week = ? AND h.is_closed = FALSE AND h.open_time IS NOT NULL AND (${window}))
        OR EXISTS (SELECT 1 FROM restaurant_operating_hours h WHERE h.restaurant_id = r.id AND h.day_of_week = ? AND h.is_closed = FALSE AND h.open_time > h.close_time AND ? < h.close_time))
      ELSE (r.opening_time = r.closing_time OR (r.opening_time < r.closing_time AND ? >= r.opening_time AND ? < r.closing_time) OR (r.opening_time > r.closing_time AND (? >= r.opening_time OR ? < r.closing_time))) END)`,
    params: [clock.isoDay, clock.isoDay, now, now, now, now, clock.previousIsoDay, now, now, now, now, now]
  };
}

/** Truy vấn chấm điểm: từ không dấu được hiểu theo dạng có dấu phổ biến trong tên danh mục (pho -> phở). */
async function scoringQuery(parsed) {
  if (parsed.tokens.every(token => token.accented)) return parsed;
  const rows = await query("SELECT name FROM restaurant_categories WHERE status = 'ACTIVE'");
  return withPreferredForms(parsed, preferredForms(parsed, rows.map(row => row.name)));
}

async function readMaxDeliveryKm() {
  const rows = await query("SELECT setting_value FROM system_settings WHERE setting_key = 'max_delivery_distance' LIMIT 1");
  return feeSettings({ max_delivery_distance: rows[0] ? Number(rows[0].setting_value) : NaN }).maxKm ?? DEFAULT_MAX_KM;
}

/** Tên các món đang bán theo quán (dùng để xếp hạng liên quan khi tìm quán). */
async function loadDishNames(restaurantIds) {
  const map = new Map();
  if (restaurantIds.length === 0) return map;
  const rows = await query(
    `SELECT restaurant_id, name FROM menu_items WHERE restaurant_id IN (${restaurantIds.map(() => '?').join(',')}) AND deleted_at IS NULL AND is_available = TRUE`, restaurantIds
  );
  for (const row of rows) { const list = map.get(Number(row.restaurant_id)) ?? []; list.push(row.name); map.set(Number(row.restaurant_id), list); }
  return map;
}

/** Giờ mở cửa theo ngày của các quán -> Map(restaurantId -> [{ dayOfWeek, openTime, closeTime, isClosed }]). */
async function loadOperatingHours(restaurantIds) {
  const map = new Map();
  if (restaurantIds.length === 0) return map;
  const rows = await query(
    `SELECT restaurant_id, day_of_week, TIME_FORMAT(open_time, '%H:%i:%s') AS open_time, TIME_FORMAT(close_time, '%H:%i:%s') AS close_time, is_closed
     FROM restaurant_operating_hours WHERE restaurant_id IN (${restaurantIds.map(() => '?').join(',')})`, restaurantIds
  );
  for (const row of rows) {
    const list = map.get(Number(row.restaurant_id)) ?? [];
    list.push({ dayOfWeek: Number(row.day_of_week), openTime: row.open_time ?? null, closeTime: row.close_time ?? null, isClosed: Boolean(row.is_closed) });
    map.set(Number(row.restaurant_id), list);
  }
  return map;
}

function mapRestaurantSummary(row, hours = []) {
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
    isOpen: isOpenNow(row.opening_time, row.closing_time, new Date(), hours)
  };
}

function mapRestaurantDetail(row, hours = []) {
  return {
    ...mapRestaurantSummary(row, hours),
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
