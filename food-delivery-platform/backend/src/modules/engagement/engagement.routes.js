import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/middlewares/require-auth.middleware.js';
import { requirePermission } from '../../shared/middlewares/require-permission.middleware.js';
import * as controller from './engagement.controller.js';

export const engagementPublicRoutes = Router();
engagementPublicRoutes.get('/promotions', controller.listPromotions);
engagementPublicRoutes.get('/banners', controller.listBanners);

export const engagementCustomerRoutes = Router();
engagementCustomerRoutes.use(requireAuth, requireRole('CUSTOMER'));
engagementCustomerRoutes.get('/promotions', controller.listPromotions);
engagementCustomerRoutes.post('/promotions/:restaurantId/validate', requirePermission('promotion.view'), controller.validatePromotion);
engagementCustomerRoutes.get('/favorites', controller.listFavorites);
engagementCustomerRoutes.post('/favorites/restaurants/:restaurantId', controller.toggleRestaurantFavorite);
engagementCustomerRoutes.post('/favorites/menu-items/:itemId', controller.toggleMenuFavorite);

export const engagementRestaurantRoutes = Router();
engagementRestaurantRoutes.use(requireAuth, requireRole('RESTAURANT'), requirePermission('promotion.manage'));
engagementRestaurantRoutes.get('/:restaurantId/promotions', controller.listOwnerPromotions);
engagementRestaurantRoutes.post('/:restaurantId/promotions', controller.createPromotion);
engagementRestaurantRoutes.patch('/:restaurantId/promotions/:promotionId', controller.updatePromotion);
engagementRestaurantRoutes.delete('/:restaurantId/promotions/:promotionId', controller.deletePromotion);

export const engagementAdminRoutes = Router();
engagementAdminRoutes.use(requireAuth, requireRole('ADMIN'), requirePermission('promotion.manage'));
engagementAdminRoutes.post('/', controller.createBanner);
engagementAdminRoutes.patch('/:bannerId', controller.updateBanner);
engagementAdminRoutes.delete('/:bannerId', controller.deleteBanner);
