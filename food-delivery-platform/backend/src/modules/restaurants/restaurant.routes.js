import { Router } from 'express';
import { requirePermission } from '../../shared/middlewares/require-permission.middleware.js';
import { requireAuth, requireRole } from '../../shared/middlewares/require-auth.middleware.js';
import {
  createOwnedRestaurantImage,
  createRestaurantCategory,
  createRestaurantForAdmin,
  deleteOwnedRestaurant,
  deleteOwnedRestaurantImage,
  deleteRestaurantCategory,
  deleteRestaurantForAdmin,
  getOwnedRestaurant,
  getRestaurantForAdmin,
  listOwnedRestaurants,
  listPublicRestaurantCategories,
  listRestaurantCategoriesForAdmin,
  listRestaurantsForAdmin,
  replaceOwnedOperatingHours,
  updateOwnedRestaurant,
  updateOwnedRestaurantImage,
  updateRestaurantCategory,
  updateRestaurantForAdmin,
  updateRestaurantStateForAdmin
} from './restaurant.controller.js';

export const restaurantPublicRoutes = Router();
export const restaurantOwnerRoutes = Router();
export const restaurantAdminRoutes = Router();
export const restaurantCategoryAdminRoutes = Router();

restaurantPublicRoutes.get('/restaurant-categories', listPublicRestaurantCategories);

restaurantOwnerRoutes.use(requireAuth, requireRole('RESTAURANT'));
restaurantOwnerRoutes.get(
  '/',
  requirePermission('restaurant.view'),
  listOwnedRestaurants
);
restaurantOwnerRoutes.get(
  '/:restaurantId',
  requirePermission('restaurant.view'),
  getOwnedRestaurant
);
restaurantOwnerRoutes.patch(
  '/:restaurantId',
  requirePermission('restaurant.update'),
  updateOwnedRestaurant
);
restaurantOwnerRoutes.delete(
  '/:restaurantId',
  requirePermission('restaurant.update'),
  deleteOwnedRestaurant
);
restaurantOwnerRoutes.put(
  '/:restaurantId/operating-hours',
  requirePermission('restaurant.update'),
  replaceOwnedOperatingHours
);
restaurantOwnerRoutes.post(
  '/:restaurantId/images',
  requirePermission('restaurant.update'),
  createOwnedRestaurantImage
);
restaurantOwnerRoutes.patch(
  '/:restaurantId/images/:imageId',
  requirePermission('restaurant.update'),
  updateOwnedRestaurantImage
);
restaurantOwnerRoutes.delete(
  '/:restaurantId/images/:imageId',
  requirePermission('restaurant.update'),
  deleteOwnedRestaurantImage
);

restaurantAdminRoutes.use(
  requireAuth,
  requireRole('ADMIN'),
  requirePermission('restaurant.manage')
);
restaurantAdminRoutes.get('/', listRestaurantsForAdmin);
restaurantAdminRoutes.post(
  '/',
  requirePermission('restaurant.create'),
  createRestaurantForAdmin
);
restaurantAdminRoutes.get('/:restaurantId', getRestaurantForAdmin);
restaurantAdminRoutes.patch('/:restaurantId', updateRestaurantForAdmin);
restaurantAdminRoutes.patch('/:restaurantId/state', updateRestaurantStateForAdmin);
restaurantAdminRoutes.delete('/:restaurantId', deleteRestaurantForAdmin);

restaurantCategoryAdminRoutes.use(
  requireAuth,
  requireRole('ADMIN'),
  requirePermission('restaurant.manage')
);
restaurantCategoryAdminRoutes.get('/', listRestaurantCategoriesForAdmin);
restaurantCategoryAdminRoutes.post('/', createRestaurantCategory);
restaurantCategoryAdminRoutes.patch('/:categoryId', updateRestaurantCategory);
restaurantCategoryAdminRoutes.delete('/:categoryId', deleteRestaurantCategory);
