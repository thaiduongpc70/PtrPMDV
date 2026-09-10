import { readPagination, toPagedResponse } from '../../shared/http/pagination.js';
import { HttpError } from '../../shared/http/http-error.js';
import { restaurantRepository } from './restaurant.repository.js';
import {
  validateAdminRestaurantCreate,
  validateAdminRestaurantState,
  validateCategoryCreate,
  validateCategoryPatch,
  validateImageCreate,
  validateImagePatch,
  validateOperatingHours,
  validateRestaurantPatch
} from './restaurant.validation.js';

const adminRestaurantStatuses = new Set([
  'PENDING',
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED'
]);

export const restaurantService = {
  async listPublicCategories() {
    return restaurantRepository.listPublicCategories();
  },

  async listOwned(userId) {
    return restaurantRepository.listForOwner(userId);
  },

  async getOwned(userId, restaurantId) {
    const restaurant = await restaurantRepository.findForOwner(userId, restaurantId);
    if (!restaurant) {
      throw new HttpError(404, 'Restaurant not found');
    }
    return restaurant;
  },

  async updateOwned(userId, restaurantId, input) {
    const current = await this.getOwned(userId, restaurantId);
    const data = validateRestaurantPatch(current, input);
    const result = await restaurantRepository.updateForOwner(userId, restaurantId, data);
    handleRestaurantMutationError(result);

    const updated = await this.getOwned(userId, restaurantId);
    return restaurantChange(current, updated);
  },

  async removeOwned(userId, restaurantId) {
    const current = await this.getOwned(userId, restaurantId);
    const deleted = await restaurantRepository.softDeleteForOwner(userId, restaurantId);
    if (!deleted) {
      throw new HttpError(404, 'Restaurant not found');
    }

    return {
      audit: {
        oldValues: toRestaurantAudit(current),
        newValues: { id: restaurantId, status: 'INACTIVE', deleted: true }
      }
    };
  },

  async replaceOperatingHours(userId, restaurantId, input) {
    await this.getOwned(userId, restaurantId);
    const operatingHours = validateOperatingHours(input);
    const result = await restaurantRepository.replaceOperatingHours(
      userId,
      restaurantId,
      operatingHours
    );
    if (!result) {
      throw new HttpError(404, 'Restaurant not found');
    }

    return {
      operatingHours: result.after,
      audit: {
        oldValues: { restaurantId, operatingHours: result.before },
        newValues: { restaurantId, operatingHours: result.after }
      }
    };
  },

  async addImage(userId, restaurantId, input) {
    await this.getOwned(userId, restaurantId);
    const data = validateImageCreate(input);
    const result = await restaurantRepository.addImage(userId, restaurantId, data);
    handleImageMutationError(result);

    const image = await restaurantRepository.findOwnedImage(
      userId,
      restaurantId,
      result.imageId
    );
    if (!image) {
      throw new HttpError(500, 'Restaurant image was not created correctly');
    }

    return {
      image,
      audit: { oldValues: null, newValues: image }
    };
  },

  async updateImage(userId, restaurantId, imageId, input) {
    const current = await restaurantRepository.findOwnedImage(
      userId,
      restaurantId,
      imageId
    );
    if (!current) {
      throw new HttpError(404, 'Restaurant image not found');
    }

    const data = validateImagePatch(current, input);
    const result = await restaurantRepository.updateImage(
      userId,
      restaurantId,
      imageId,
      data
    );
    handleImageMutationError(result);

    return {
      image: result.after,
      audit: { oldValues: result.before, newValues: result.after }
    };
  },

  async removeImage(userId, restaurantId, imageId) {
    const deleted = await restaurantRepository.deleteImage(
      userId,
      restaurantId,
      imageId
    );
    if (!deleted) {
      throw new HttpError(404, 'Restaurant image not found');
    }

    return {
      audit: {
        oldValues: deleted,
        newValues: { id: imageId, restaurantId, deleted: true }
      }
    };
  },

  async listForAdmin(query) {
    const pagination = readPagination(query, 100);
    const filters = {
      status: normalizeStatus(query.status),
      categoryId: normalizePositiveInteger(query.categoryId),
      ownerUserId: normalizePositiveInteger(query.ownerUserId),
      keyword: trim(query.keyword, 200),
      pageSize: pagination.pageSize,
      offset: pagination.offset
    };
    const result = await restaurantRepository.listForAdmin(filters);
    return toPagedResponse(
      result.items,
      pagination.pageNumber,
      pagination.pageSize,
      result.totalItems
    );
  },

  async getForAdmin(restaurantId) {
    const restaurant = await restaurantRepository.findForAdmin(restaurantId);
    if (!restaurant) {
      throw new HttpError(404, 'Restaurant not found');
    }
    return restaurant;
  },

  async createForAdmin(input) {
    const data = validateAdminRestaurantCreate(input);
    const result = await restaurantRepository.createForAdmin(data);

    if (result.error === 'OWNER_NOT_FOUND') {
      throw new HttpError(400, 'Active restaurant owner account not found');
    }
    if (result.error === 'CATEGORY_NOT_FOUND') {
      throw new HttpError(400, 'Active restaurant category not found');
    }

    const restaurant = await this.getForAdmin(result.restaurantId);
    return {
      restaurant,
      audit: { oldValues: null, newValues: toRestaurantAudit(restaurant) }
    };
  },

  async updateForAdmin(restaurantId, input) {
    const current = await this.getForAdmin(restaurantId);
    const data = validateRestaurantPatch(current, input);
    const result = await restaurantRepository.updateForAdmin(restaurantId, data);
    handleRestaurantMutationError(result);

    const updated = await this.getForAdmin(restaurantId);
    return restaurantChange(current, updated);
  },

  async updateStateForAdmin(restaurantId, input) {
    const current = await this.getForAdmin(restaurantId);
    const data = validateAdminRestaurantState(current, input);
    const updated = await restaurantRepository.updateStateForAdmin(restaurantId, data);
    if (!updated) {
      throw new HttpError(404, 'Restaurant not found');
    }

    const restaurant = await this.getForAdmin(restaurantId);
    return restaurantChange(current, restaurant);
  },

  async removeForAdmin(restaurantId) {
    const current = await this.getForAdmin(restaurantId);
    const deleted = await restaurantRepository.softDeleteForAdmin(restaurantId);
    if (!deleted) {
      throw new HttpError(404, 'Restaurant not found');
    }

    return {
      audit: {
        oldValues: toRestaurantAudit(current),
        newValues: { id: restaurantId, status: 'INACTIVE', deleted: true }
      }
    };
  },

  async listCategoriesForAdmin() {
    return restaurantRepository.listCategoriesForAdmin();
  },

  async createCategory(input) {
    const data = validateCategoryCreate(input);
    let categoryId;
    try {
      categoryId = await restaurantRepository.createCategory(data);
    } catch (error) {
      handleCategoryDatabaseError(error);
    }

    const category = await restaurantRepository.findCategoryById(categoryId);
    return {
      category,
      audit: { oldValues: null, newValues: category }
    };
  },

  async updateCategory(categoryId, input) {
    const current = await restaurantRepository.findCategoryById(categoryId);
    if (!current) {
      throw new HttpError(404, 'Restaurant category not found');
    }
    const data = validateCategoryPatch(current, input);

    try {
      await restaurantRepository.updateCategory(categoryId, data);
    } catch (error) {
      handleCategoryDatabaseError(error);
    }

    const category = await restaurantRepository.findCategoryById(categoryId);
    return {
      category,
      audit: { oldValues: current, newValues: category }
    };
  },

  async removeCategory(categoryId) {
    const current = await restaurantRepository.findCategoryById(categoryId);
    if (!current) {
      throw new HttpError(404, 'Restaurant category not found');
    }
    await restaurantRepository.deactivateCategory(categoryId);

    return {
      audit: {
        oldValues: current,
        newValues: { ...current, status: 'INACTIVE' }
      }
    };
  }
};

function handleRestaurantMutationError(result) {
  if (result?.error === 'NOT_FOUND') {
    throw new HttpError(404, 'Restaurant not found');
  }
  if (result?.error === 'CATEGORY_NOT_FOUND') {
    throw new HttpError(400, 'Active restaurant category not found');
  }
}

function handleImageMutationError(result) {
  if (result?.error === 'NOT_FOUND') {
    throw new HttpError(404, 'Restaurant image not found');
  }
  if (result?.error === 'IMAGE_TYPE_EXISTS') {
    throw new HttpError(409, `Restaurant already has a ${result.imageType ?? 'LOGO/COVER'} image`);
  }
}

function handleCategoryDatabaseError(error) {
  if (error?.code === 'ER_DUP_ENTRY') {
    throw new HttpError(409, 'Restaurant category name already exists');
  }
  throw error;
}

function restaurantChange(before, after) {
  return {
    restaurant: after,
    audit: {
      oldValues: toRestaurantAudit(before),
      newValues: toRestaurantAudit(after)
    }
  };
}

function toRestaurantAudit(restaurant) {
  return {
    id: restaurant.id,
    ownerUserId: restaurant.ownerUserId,
    categoryId: restaurant.categoryId,
    name: restaurant.name,
    description: restaurant.description,
    phone: restaurant.phone,
    email: restaurant.email,
    address: restaurant.address,
    ward: restaurant.ward,
    district: restaurant.district,
    city: restaurant.city,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    openingTime: restaurant.openingTime,
    closingTime: restaurant.closingTime,
    minimumOrder: restaurant.minimumOrder,
    averagePrepareTime: restaurant.averagePrepareTime,
    commissionRate: restaurant.commissionRate,
    status: restaurant.status
  };
}

function normalizeStatus(value) {
  const status = trim(value, 20)?.toUpperCase() ?? null;
  if (status && !adminRestaurantStatuses.has(status)) {
    throw new HttpError(400, 'Restaurant status is invalid');
  }
  return status;
}

function normalizePositiveInteger(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new HttpError(400, 'Filter id must be a positive integer');
  }
  return number;
}

function trim(value, maxLength) {
  if (value === undefined || value === null) {
    return null;
  }
  const text = String(value).trim();
  if (!text) {
    return null;
  }
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}
