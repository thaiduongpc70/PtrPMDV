import { query } from '../../shared/database/mysql.js';

export const catalogRepository = {
  async searchRestaurants(filters) {
    const where = [
      "r.status = 'ACTIVE'",
      'r.deleted_at IS NULL'
    ];
    const params = [];

    if (filters.city) {
      where.push('r.city = ?');
      params.push(filters.city);
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

    const whereSql = where.join(' AND ');

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
          r.total_orders
        FROM restaurants r
        LEFT JOIN restaurant_categories c
          ON c.id = r.category_id
          AND c.status = 'ACTIVE'
        WHERE ${whereSql}
        ORDER BY r.rating DESC, r.total_orders DESC, r.id DESC
        LIMIT ? OFFSET ?
      `,
      [...params, filters.pageSize, filters.offset]
    );

    return {
      items: rows.map(mapRestaurantSummary),
      totalItems: Number(totalRows[0]?.total ?? 0)
    };
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
      toppings
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
            sold_count
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
      )
    ]);

    return buildMenuResponse({
      menus,
      categories,
      items,
      variants,
      groupLinks,
      toppingGroups,
      toppings
    });
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

  const mappedItems = data.items.map(item => {
    const itemId = Number(item.id);
    const groupIds = groupIdsByItemId.get(itemId) ?? [];
    const itemGroups = groupIds
      .map(row => groupsById.get(Number(row.topping_group_id)))
      .filter(Boolean);

    return mapMenuItem(
      item,
      variantsByItemId.get(itemId) ?? [],
      itemGroups
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
    totalOrders: Number(row.total_orders)
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

function mapMenuItem(row, variants, toppingGroups) {
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
