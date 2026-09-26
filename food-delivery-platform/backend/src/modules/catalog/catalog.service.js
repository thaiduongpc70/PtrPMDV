import { readPagination, toPagedResponse } from '../../shared/http/pagination.js';
import { HttpError } from '../../shared/http/http-error.js';
import { catalogRepository } from './catalog.repository.js';

export const catalogService = {
  async searchRestaurants(query) {
    const pagination = readPagination(query, 50);
    const filters = {
      city: trim(query.city),
      district: trim(query.district),
      categoryId: readPositiveInteger(query.categoryId),
      keyword: trim(query.keyword),
      pageSize: pagination.pageSize,
      offset: pagination.offset
    };

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

  getRestaurant(restaurantId) {
    return catalogRepository.getRestaurant(restaurantId);
  },

  getRestaurantMenu(restaurantId) {
    return catalogRepository.getRestaurantMenu(restaurantId);
  },

  async searchMenuItems(query) {
    const pagination = readPagination(query, 100);
    const sort = trim(query.sort);
    if (sort && !new Set(['price_asc', 'price_desc', 'popular', 'featured']).has(sort)) {
      throw new HttpError(400, 'Menu sort is invalid');
    }
    const filters = {
      restaurantId: readPositiveInteger(query.restaurantId),
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

  async listSearchHistory(userId) {
    return catalogRepository.listSearchHistory(userId);
  }
};

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
