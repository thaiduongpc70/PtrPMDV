import { readPagination, toPagedResponse } from '../../shared/http/pagination.js';
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
