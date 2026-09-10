import { asyncHandler } from '../../shared/http/async-handler.js';
import { HttpError } from '../../shared/http/http-error.js';
import { restaurantService } from './restaurant.service.js';

export const listPublicRestaurantCategories = asyncHandler(async (req, res) => {
  const items = await restaurantService.listPublicCategories();
  setAudit(req, 'RESTAURANT_CATEGORY_LIST', 'RESTAURANT_CATEGORY');
  res.json({ items, totalItems: items.length });
});

export const listOwnedRestaurants = asyncHandler(async (req, res) => {
  const items = await restaurantService.listOwned(req.user.id);
  setAudit(req, 'RESTAURANT_OWNED_LIST', 'RESTAURANT');
  res.json({ items, totalItems: items.length });
});

export const getOwnedRestaurant = asyncHandler(async (req, res) => {
  const restaurantId = readId(req.params.restaurantId, 'restaurant');
  const restaurant = await restaurantService.getOwned(req.user.id, restaurantId);
  setAudit(req, 'RESTAURANT_OWNED_VIEW', 'RESTAURANT', restaurantId);
  res.json(restaurant);
});

export const updateOwnedRestaurant = asyncHandler(async (req, res) => {
  const restaurantId = readId(req.params.restaurantId, 'restaurant');
  const result = await restaurantService.updateOwned(
    req.user.id,
    restaurantId,
    req.body
  );
  setMutationAudit(req, 'RESTAURANT_UPDATE', 'RESTAURANT', restaurantId, result);
  res.json(result.restaurant);
});

export const deleteOwnedRestaurant = asyncHandler(async (req, res) => {
  const restaurantId = readId(req.params.restaurantId, 'restaurant');
  const result = await restaurantService.removeOwned(req.user.id, restaurantId);
  setMutationAudit(req, 'RESTAURANT_DELETE', 'RESTAURANT', restaurantId, result);
  res.status(204).send();
});

export const replaceOwnedOperatingHours = asyncHandler(async (req, res) => {
  const restaurantId = readId(req.params.restaurantId, 'restaurant');
  const result = await restaurantService.replaceOperatingHours(
    req.user.id,
    restaurantId,
    req.body
  );
  setMutationAudit(
    req,
    'RESTAURANT_OPERATING_HOURS_REPLACE',
    'RESTAURANT',
    restaurantId,
    result
  );
  res.json({ items: result.operatingHours, totalItems: result.operatingHours.length });
});

export const createOwnedRestaurantImage = asyncHandler(async (req, res) => {
  const restaurantId = readId(req.params.restaurantId, 'restaurant');
  const result = await restaurantService.addImage(req.user.id, restaurantId, req.body);
  setMutationAudit(
    req,
    'RESTAURANT_IMAGE_CREATE',
    'RESTAURANT_IMAGE',
    result.image.id,
    result
  );
  res.status(201).json(result.image);
});

export const updateOwnedRestaurantImage = asyncHandler(async (req, res) => {
  const restaurantId = readId(req.params.restaurantId, 'restaurant');
  const imageId = readId(req.params.imageId, 'restaurant image');
  const result = await restaurantService.updateImage(
    req.user.id,
    restaurantId,
    imageId,
    req.body
  );
  setMutationAudit(
    req,
    'RESTAURANT_IMAGE_UPDATE',
    'RESTAURANT_IMAGE',
    imageId,
    result
  );
  res.json(result.image);
});

export const deleteOwnedRestaurantImage = asyncHandler(async (req, res) => {
  const restaurantId = readId(req.params.restaurantId, 'restaurant');
  const imageId = readId(req.params.imageId, 'restaurant image');
  const result = await restaurantService.removeImage(
    req.user.id,
    restaurantId,
    imageId
  );
  setMutationAudit(
    req,
    'RESTAURANT_IMAGE_DELETE',
    'RESTAURANT_IMAGE',
    imageId,
    result
  );
  res.status(204).send();
});

export const listRestaurantsForAdmin = asyncHandler(async (req, res) => {
  const result = await restaurantService.listForAdmin(req.query);
  setAudit(req, 'ADMIN_RESTAURANT_LIST', 'RESTAURANT');
  res.json(result);
});

export const getRestaurantForAdmin = asyncHandler(async (req, res) => {
  const restaurantId = readId(req.params.restaurantId, 'restaurant');
  const restaurant = await restaurantService.getForAdmin(restaurantId);
  setAudit(req, 'ADMIN_RESTAURANT_VIEW', 'RESTAURANT', restaurantId);
  res.json(restaurant);
});

export const createRestaurantForAdmin = asyncHandler(async (req, res) => {
  const result = await restaurantService.createForAdmin(req.body);
  setMutationAudit(
    req,
    'ADMIN_RESTAURANT_CREATE',
    'RESTAURANT',
    result.restaurant.id,
    result
  );
  res.status(201).json(result.restaurant);
});

export const updateRestaurantForAdmin = asyncHandler(async (req, res) => {
  const restaurantId = readId(req.params.restaurantId, 'restaurant');
  const result = await restaurantService.updateForAdmin(restaurantId, req.body);
  setMutationAudit(
    req,
    'ADMIN_RESTAURANT_UPDATE',
    'RESTAURANT',
    restaurantId,
    result
  );
  res.json(result.restaurant);
});

export const updateRestaurantStateForAdmin = asyncHandler(async (req, res) => {
  const restaurantId = readId(req.params.restaurantId, 'restaurant');
  const result = await restaurantService.updateStateForAdmin(restaurantId, req.body);
  setMutationAudit(
    req,
    'ADMIN_RESTAURANT_STATE_UPDATE',
    'RESTAURANT',
    restaurantId,
    result
  );
  res.json(result.restaurant);
});

export const deleteRestaurantForAdmin = asyncHandler(async (req, res) => {
  const restaurantId = readId(req.params.restaurantId, 'restaurant');
  const result = await restaurantService.removeForAdmin(restaurantId);
  setMutationAudit(
    req,
    'ADMIN_RESTAURANT_DELETE',
    'RESTAURANT',
    restaurantId,
    result
  );
  res.status(204).send();
});

export const listRestaurantCategoriesForAdmin = asyncHandler(async (req, res) => {
  const items = await restaurantService.listCategoriesForAdmin();
  setAudit(req, 'ADMIN_RESTAURANT_CATEGORY_LIST', 'RESTAURANT_CATEGORY');
  res.json({ items, totalItems: items.length });
});

export const createRestaurantCategory = asyncHandler(async (req, res) => {
  const result = await restaurantService.createCategory(req.body);
  setMutationAudit(
    req,
    'ADMIN_RESTAURANT_CATEGORY_CREATE',
    'RESTAURANT_CATEGORY',
    result.category.id,
    result
  );
  res.status(201).json(result.category);
});

export const updateRestaurantCategory = asyncHandler(async (req, res) => {
  const categoryId = readId(req.params.categoryId, 'restaurant category');
  const result = await restaurantService.updateCategory(categoryId, req.body);
  setMutationAudit(
    req,
    'ADMIN_RESTAURANT_CATEGORY_UPDATE',
    'RESTAURANT_CATEGORY',
    categoryId,
    result
  );
  res.json(result.category);
});

export const deleteRestaurantCategory = asyncHandler(async (req, res) => {
  const categoryId = readId(req.params.categoryId, 'restaurant category');
  const result = await restaurantService.removeCategory(categoryId);
  setMutationAudit(
    req,
    'ADMIN_RESTAURANT_CATEGORY_DEACTIVATE',
    'RESTAURANT_CATEGORY',
    categoryId,
    result
  );
  res.status(204).send();
});

function setMutationAudit(req, action, entityType, entityId, result) {
  setAudit(req, action, entityType, entityId);
  req.auditOldValues = result.audit.oldValues;
  req.auditNewValues = result.audit.newValues;
}

function setAudit(req, action, entityType, entityId = null) {
  req.auditUserId = req.user?.id ?? null;
  req.auditAction = action;
  req.auditEntityType = entityType;
  req.auditEntityId = entityId;
}

function readId(value, entityName) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, `Invalid ${entityName} id`);
  }
  return id;
}
