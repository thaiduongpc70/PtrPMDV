import { Router } from 'express';
import {
  getRestaurant,
  getRestaurantMenu,
  searchRestaurants
} from './catalog.controller.js';

export const catalogRoutes = Router();

catalogRoutes.get('/restaurants', searchRestaurants);
catalogRoutes.get('/restaurants/:restaurantId/menu', getRestaurantMenu);
catalogRoutes.get('/restaurants/:restaurantId', getRestaurant);
