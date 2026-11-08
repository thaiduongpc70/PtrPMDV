import { readPagination, toPagedResponse } from '../../shared/http/pagination.js';
import { HttpError } from '../../shared/http/http-error.js';
import { catalogRepository } from './catalog.repository.js';
import { findProvince, PROVINCES } from '../../shared/data/vn-provinces.js';

const RESTAURANT_SORTS = new Set(['featured', 'nearest', 'popular', 'top_rated', 'fastest', 'promo']);

export const catalogService = {
  async searchRestaurants(query) {
    const pagination = readPagination(query, 50);
    const filters = {
      cities: citiesFor(query.city),
      district: trim(query.district),
      categoryId: readPositiveInteger(query.categoryId),
      keyword: trim(query.keyword),
      sort: readSort(query.sort),
      lat: readCoordinate(query.lat, -90, 90),
      lng: readCoordinate(query.lng, -180, 180),
      promoOnly: query.promo === '1' || query.promo === 'true',
      openNow: query.openNow === '1' || query.openNow === 'true',
      lateNight: query.late === '1',
      hasCombo: query.combo === '1',
      minRating: readCoordinate(query.minRating, 0, 5),
      maxPrepare: readPositiveInteger(query.maxPrepare),
      pageSize: pagination.pageSize,
      offset: pagination.offset
    };
    if (filters.sort === 'nearest' && (filters.lat === null || filters.lng === null)) throw new HttpError(400, 'Sắp xếp theo khoảng cách cần lat và lng');

    const result = await catalogRepository.searchRestaurants(filters);
    if (filters.keyword && query.userId) {
      await catalogRepository.addSearchHistory(query.userId, filters.keyword);
    }
    return toPagedResponse(
      result.items,
      pagination.pageNumber,
      pagination.pageSize,
      result.totalItems
    );
  },

  getStorefront() { return catalogRepository.getStorefront(); },
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
      pageSize: pagination.pageSize,
      offset: pagination.offset
    });
    return toPagedResponse(result.items, pagination.pageNumber, pagination.pageSize, result.totalItems);
  },

  async searchMenuItems(query) {
    const pagination = readPagination(query, 100);
    const sort = trim(query.sort);
    if (sort && !new Set(['price_asc', 'price_desc', 'popular', 'featured']).has(sort)) {
      throw new HttpError(400, 'Menu sort is invalid');
    }
    const filters = {
      restaurantId: readPositiveInteger(query.restaurantId),
      cities: citiesFor(query.city),
      categoryId: readPositiveInteger(query.categoryId),
      keyword: trim(query.keyword),
      sort: sort ?? 'featured',
      pageSize: pagination.pageSize,
      offset: pagination.offset
    };
    const result = await catalogRepository.searchMenuItems(filters);
    if (filters.keyword && query.userId) {
      await catalogRepository.addSearchHistory(query.userId, filters.keyword);
    }
    return toPagedResponse(result.items, pagination.pageNumber, pagination.pageSize, result.totalItems);
  },

  async listMenuItemReviews(menuItemId, query) {
    const pagination = readPagination(query, 50);
    const result = await catalogRepository.listMenuItemReviews({ menuItemId, pageSize: pagination.pageSize, offset: pagination.offset });
    return { ...toPagedResponse(result.items, pagination.pageNumber, pagination.pageSize, result.totalItems), summary: result.summary };
  },

  async listSearchHistory(userId) {
    return catalogRepository.listSearchHistory(userId);
  }
};

/** Tên tỉnh/thành người dùng chọn -> các cách viết trong cột city. Tên lạ vẫn lọc đúng theo chữ nhập. */
function citiesFor(value) {
  const text = trim(value);
  if (!text) return null;
  return findProvince(text)?.aliases ?? [text];
}
function readSort(value) {
  const sort = trim(value) ?? 'featured';
  if (!RESTAURANT_SORTS.has(sort)) throw new HttpError(400, 'Restaurant sort is invalid');
  return sort;
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
