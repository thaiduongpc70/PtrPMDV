import { Router } from 'express';
import {
  getRestaurant,
  getRestaurantMenu,
  searchRestaurants,
  searchMenuItems,
  listSearchHistory
} from './catalog.controller.js';
import { requireAuth, requireRole } from '../../shared/middlewares/require-auth.middleware.js';

export const catalogRoutes = Router();

catalogRoutes.get('/restaurants', searchRestaurants);
catalogRoutes.get('/menu-items', searchMenuItems);
catalogRoutes.get('/restaurants/:restaurantId/menu', getRestaurantMenu);
catalogRoutes.get('/restaurants/:restaurantId', getRestaurant);
catalogRoutes.get('/search-history', requireAuth, requireRole('CUSTOMER'), listSearchHistory);
