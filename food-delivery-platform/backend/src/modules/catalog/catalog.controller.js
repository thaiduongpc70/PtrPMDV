import { asyncHandler } from '../../shared/http/async-handler.js';
import { HttpError } from '../../shared/http/http-error.js';
import { catalogService } from './catalog.service.js';
import { M } from '../../shared/http/messages.js';

export const getStorefront = asyncHandler(async (req, res) => res.json(await catalogService.getStorefront(req.query)));
export const getDeliveryFees = asyncHandler(async (_req, res) => res.json(await catalogService.getDeliveryFees()));
export const listCollections = asyncHandler(async (req, res) => res.json(await catalogService.listCollections(req.query)));
export const listCities = asyncHandler(async (_req, res) => res.json(await catalogService.listCities()));
export const listDistricts = asyncHandler(async (req, res) => res.json(await catalogService.listDistricts(req.query)));
export const searchRestaurants = asyncHandler(async (req, res) => {
  const restaurants = await catalogService.searchRestaurants({ ...req.query, userId: req.user?.id });
  res.json(restaurants);
});

export const searchMenuItems = asyncHandler(async (req, res) => {
  const result = await catalogService.searchMenuItems({ ...req.query, userId: req.user?.id });
  res.json(result);
});

export const listSearchHistory = asyncHandler(async (req, res) => {
  const items = await catalogService.listSearchHistory(req.user.id);
  res.json({ items, totalItems: items.length });
});

export const getRestaurant = asyncHandler(async (req, res) => {
  const restaurantId = readId(req.params.restaurantId);
  const restaurant = await catalogService.getRestaurant(restaurantId);

  if (!restaurant) {
    throw new HttpError(404, M.restaurantNotFound);
  }

  res.json(restaurant);
});

export const getRestaurantMenu = asyncHandler(async (req, res) => {
  const restaurantId = readId(req.params.restaurantId);
  const menu = await catalogService.getRestaurantMenu(restaurantId);
  res.json(menu);
});

export const listRestaurantReviews = asyncHandler(async (req, res) => {
  const restaurantId = readId(req.params.restaurantId);
  const result = await catalogService.listRestaurantReviews(restaurantId, req.query);
  res.json(result);
});

export const listMenuItemReviews = asyncHandler(async (req, res) => {
  const result = await catalogService.listMenuItemReviews(readId(req.params.itemId), req.query);
  res.json(result);
});

function readId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, M.idInvalid);
  }

  return id;
}
