import { readPagination, toPagedResponse } from '../../shared/http/pagination.js';
import { HttpError } from '../../shared/http/http-error.js';
import { catalogRepository } from './catalog.repository.js';
import { findProvince, PROVINCES } from '../../shared/data/vn-provinces.js';
import { vietnamClock } from '../../shared/time/opening-hours.js';
import { parseSearchQuery } from './search-text.js';

/** Giá trị `sort` hợp lệ khi tìm quán (rating là tên gọi khác của top_rated). */
export const RESTAURANT_SORT_VALUES = ['featured', 'nearest', 'popular', 'rating', 'top_rated', 'fastest', 'promo', 'price_asc', 'price_desc'];
const RESTAURANT_SORTS = new Set(RESTAURANT_SORT_VALUES);
export const MENU_SORT_VALUES = ['featured', 'popular', 'price_asc', 'price_desc'];

export const catalogService = {
  async searchRestaurants(query) {
    const pagination = readPagination(query, 50);
    const filters = {
      cities: citiesFor(query.city),
      district: trim(query.district),
      categoryId: readPositiveInteger(query.categoryId),
      keyword: trim(query.keyword),
      search: parseSearchQuery(query.keyword),
      sort: readSort(query.sort),
      lat: readCoordinate(query.lat, -90, 90),
      lng: readCoordinate(query.lng, -180, 180),
      promoOnly: query.promo === '1' || query.promo === 'true',
      openNow: query.openNow === '1' || query.openNow === 'true',
      lateNight: query.late === '1',
      hasCombo: query.combo === '1',
      minRating: readCoordinate(query.minRating, 0, 5),
      maxPrepare: readPositiveInteger(query.maxPrepare),
      hasDiscount: isOn(query.discount),
      vegetarian: isOn(query.vegetarian),
      spicy: isOn(query.spicy),
      priceMin: readMoney(query.priceMin, 'priceMin'),
      priceMax: readMoney(query.priceMax, 'priceMax'),
      hideOutOfRange: isOn(query.hideOutOfRange),
      clock: vietnamClock(),
      pageSize: pagination.pageSize,
      offset: pagination.offset
    };
    // Khách đã đăng nhập mà không gửi lat/lng: lấy địa chỉ mặc định làm gốc tính khoảng cách (khách ẩn danh vẫn không có)
    if ((filters.lat === null || filters.lng === null) && query.userId) {
      const point = await catalogRepository.findDefaultAddressPoint(query.userId);
      if (point) { filters.lat = point.lat; filters.lng = point.lng; filters.originSource = 'DEFAULT_ADDRESS'; }
    }
    if (filters.sort === 'nearest' && (filters.lat === null || filters.lng === null)) throw new HttpError(400, 'Sắp xếp theo khoảng cách cần lat và lng');
    if (filters.priceMin != null && filters.priceMax != null && filters.priceMin > filters.priceMax) throw new HttpError(400, 'priceMin không được lớn hơn priceMax');

    const result = await catalogRepository.searchRestaurants(filters);
    if (filters.keyword && query.userId) {
      await catalogRepository.addSearchHistory(query.userId, filters.keyword);
    }
    const response = toPagedResponse(result.items, pagination.pageNumber, pagination.pageSize, result.totalItems);
    if (result.maxDeliveryKm != null) response.maxDeliveryKm = result.maxDeliveryKm;
    if (filters.originSource) response.originSource = filters.originSource;
    if (result.totalItems === 0 && filters.search) response.suggestions = await catalogRepository.suggestSearch(filters.search, filters.cities);
    return response;
  },

  /** Số liệu trang chủ; `city` (tên tỉnh/thành) giới hạn theo vùng đang chọn. */
  getStorefront(query = {}) { return catalogRepository.getStorefront(citiesFor(query.city)); },
  getDeliveryFees() { return catalogRepository.getDeliveryFees(); },
  async listCollections(query) { const items = await catalogRepository.listCollections(citiesFor(query.city)); return { items, totalItems: items.length }; },

  /** Danh sách tỉnh/thành kèm số quán đang hoạt động; tỉnh có quán xếp trước. */
  async listCities() {
    const counts = await catalogRepository.countRestaurantsByCity();
    const items = PROVINCES.map(province => ({
      name: province.name,
      center: province.center,
      restaurantCount: counts.filter(row => province.aliases.includes(row.city)).reduce((sum, row) => sum + row.total, 0)
    }));
    items.sort((a, b) => b.restaurantCount - a.restaurantCount || a.name.localeCompare(b.name, 'vi'));
    return { items, totalItems: items.length };
  },

  async listDistricts(query) {
    return { items: await catalogRepository.listDistricts(citiesFor(query.city)) };
  },

  getRestaurant(restaurantId) {
    return catalogRepository.getRestaurant(restaurantId);
  },

  getRestaurantMenu(restaurantId) {
    return catalogRepository.getRestaurantMenu(restaurantId);
  },

  async listRestaurantReviews(restaurantId, query) {
    const pagination = readPagination(query, 50);
    const result = await catalogRepository.listRestaurantReviews({
      restaurantId,
      rating: readStar(query.rating),
      pageSize: pagination.pageSize,
      offset: pagination.offset
    });
    return { ...toPagedResponse(result.items, pagination.pageNumber, pagination.pageSize, result.totalItems), summary: result.summary };
  },

  async searchMenuItems(query) {
    const pagination = readPagination(query, 100);
    const sort = trim(query.sort);
    if (sort && !MENU_SORT_VALUES.includes(sort)) {
      throw new HttpError(400, `Giá trị sort không hợp lệ: "${sort}". Các giá trị hợp lệ: ${MENU_SORT_VALUES.join(', ')}`);
    }
    const filters = {
      restaurantId: readPositiveInteger(query.restaurantId),
      cities: citiesFor(query.city),
      categoryId: readPositiveInteger(query.categoryId),
      keyword: trim(query.keyword),
      search: parseSearchQuery(query.keyword),
      sort: sort ?? 'featured',
      discountOnly: isOn(query.discount),
      vegetarian: isOn(query.vegetarian),
      spicy: isOn(query.spicy),
      priceMin: readMoney(query.priceMin, 'priceMin'),
      priceMax: readMoney(query.priceMax, 'priceMax'),
      pageSize: pagination.pageSize,
      offset: pagination.offset
    };
    if (filters.priceMin != null && filters.priceMax != null && filters.priceMin > filters.priceMax) throw new HttpError(400, 'priceMin không được lớn hơn priceMax');
    const result = await catalogRepository.searchMenuItems(filters);
    if (filters.keyword && query.userId) {
      await catalogRepository.addSearchHistory(query.userId, filters.keyword);
    }
    const response = toPagedResponse(result.items, pagination.pageNumber, pagination.pageSize, result.totalItems);
    if (result.totalItems === 0 && filters.search) response.suggestions = await catalogRepository.suggestSearch(filters.search, filters.cities);
    return response;
  },

  async listMenuItemReviews(menuItemId, query) {
    const pagination = readPagination(query, 50);
    const result = await catalogRepository.listMenuItemReviews({ menuItemId, rating: readStar(query.rating), pageSize: pagination.pageSize, offset: pagination.offset });
    return { ...toPagedResponse(result.items, pagination.pageNumber, pagination.pageSize, result.totalItems), summary: result.summary };
  },

  async listSearchHistory(userId) {
    return catalogRepository.listSearchHistory(userId);
  }
};

/** Lọc đánh giá theo số sao (1–5); giá trị khác = không lọc. */
function readStar(value) {
  const star = Number(value);
  return Number.isInteger(star) && star >= 1 && star <= 5 ? star : null;
}

/** Tên tỉnh/thành người dùng chọn -> các cách viết trong cột city. Tên lạ vẫn lọc đúng theo chữ nhập. */
function citiesFor(value) {
  const text = trim(value);
  if (!text) return null;
  return findProvince(text)?.aliases ?? [text];
}
function readSort(value) {
  const sort = trim(value) ?? 'featured';
  if (!RESTAURANT_SORTS.has(sort)) throw new HttpError(400, `Giá trị sort không hợp lệ: "${sort}". Các giá trị hợp lệ: ${RESTAURANT_SORT_VALUES.join(', ')}`);
  return sort === 'rating' ? 'top_rated' : sort;
}
function isOn(value) { return value === '1' || value === 'true'; }
function readMoney(value, name) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new HttpError(400, `${name} phải là số tiền không âm`);
  return number;
}
function readCoordinate(value, min, max) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw new HttpError(400, 'Toạ độ không hợp lệ');
  return number;
}
function trim(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function readPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
