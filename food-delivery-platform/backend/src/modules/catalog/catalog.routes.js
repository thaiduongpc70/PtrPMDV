import { Router } from 'express';
import {
  getRestaurant,
  getRestaurantMenu,
  listRestaurantReviews,
  listMenuItemReviews,
  searchRestaurants,
  listCities,
  getStorefront,
  getDeliveryFees,
  listCollections,
  listDistricts,
  searchMenuItems,
  listSearchHistory
} from './catalog.controller.js';
import { requireAuth, requireRole } from '../../shared/middlewares/require-auth.middleware.js';

export const catalogRoutes = Router();

catalogRoutes.get('/storefront', getStorefront);
catalogRoutes.get('/delivery-fees', getDeliveryFees);
catalogRoutes.get('/collections', listCollections);
catalogRoutes.get('/cities', listCities);
catalogRoutes.get('/districts', listDistricts);
catalogRoutes.get('/restaurants', searchRestaurants);
catalogRoutes.get('/menu-items', searchMenuItems);
catalogRoutes.get('/menu-items/:itemId/reviews', listMenuItemReviews);
catalogRoutes.get('/restaurants/:restaurantId/reviews', listRestaurantReviews);
catalogRoutes.get('/restaurants/:restaurantId/menu', getRestaurantMenu);
catalogRoutes.get('/restaurants/:restaurantId', getRestaurant);
catalogRoutes.get('/search-history', requireAuth, requireRole('CUSTOMER'), listSearchHistory);
