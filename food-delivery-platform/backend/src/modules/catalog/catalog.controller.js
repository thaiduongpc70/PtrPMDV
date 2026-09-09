import { asyncHandler } from '../../shared/http/async-handler.js';
import { HttpError } from '../../shared/http/http-error.js';
import { catalogService } from './catalog.service.js';

export const searchRestaurants = asyncHandler(async (req, res) => {
  const restaurants = await catalogService.searchRestaurants(req.query);
  res.json(restaurants);
});

export const getRestaurant = asyncHandler(async (req, res) => {
  const restaurantId = readId(req.params.restaurantId);
  const restaurant = await catalogService.getRestaurant(restaurantId);

  if (!restaurant) {
    throw new HttpError(404, 'Restaurant not found');
  }

  res.json(restaurant);
});

export const getRestaurantMenu = asyncHandler(async (req, res) => {
  const restaurantId = readId(req.params.restaurantId);
  const menu = await catalogService.getRestaurantMenu(restaurantId);
  res.json(menu);
});

function readId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 'Invalid id');
  }

  return id;
}
