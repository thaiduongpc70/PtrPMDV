import { readPagination, toPagedResponse } from '../../shared/http/pagination.js';
import { HttpError } from '../../shared/http/http-error.js';
import { menuRepository } from './menu.repository.js';
import { storeImageData } from '../restaurants/image.storage.js';
import {
  readId,
  validateCategoryCreate,
  validateCategoryPatch,
  validateItemCreate,
  validateItemPatch,
  validateMenuCreate,
  validateMenuPatch,
  validateTopping,
  validateToppingGroup,
  validateVariant
} from './menu.validation.js';

export const menuService = {
  async listMenus(userId, restaurantId) {
    await ensureRestaurant(userId, restaurantId);
    return menuRepository.listMenus(userId, restaurantId);
  },
  async createMenu(userId, restaurantId, input) {
    await ensureRestaurant(userId, restaurantId);
    const data = validateMenuCreate(input);
    const id = await menuRepository.createMenu(restaurantId, data);
    const menu = await menuRepository.findMenu(userId, restaurantId, id);
    return mutation(null, menu);
  },
  async updateMenu(userId, restaurantId, menuId, input) {
    const current = await getMenu(userId, restaurantId, menuId);
    const data = validateMenuPatch(current, input);
    await menuRepository.updateMenu(menuId, restaurantId, data);
    const menu = await getMenu(userId, restaurantId, menuId);
    return mutation(current, menu);
  },
  async deleteMenu(userId, restaurantId, menuId) {
    const current = await getMenu(userId, restaurantId, menuId);
    if (!await menuRepository.softDeleteMenu(menuId, restaurantId)) throw new HttpError(404, 'Menu not found');
    return mutation(current, { ...current, status: 'INACTIVE', deleted: true });
  },

  async listCategories(userId, restaurantId) {
    await ensureRestaurant(userId, restaurantId);
    return menuRepository.listCategories(userId, restaurantId);
  },
  async createCategory(userId, restaurantId, input) {
    await ensureRestaurant(userId, restaurantId);
    const data = validateCategoryCreate(input);
    await ensureOptionalMenu(userId, restaurantId, data.menuId);
    const id = await menuRepository.createCategory(restaurantId, data);
    const category = await menuRepository.findCategory(userId, restaurantId, id);
    return mutation(null, category);
  },
  async updateCategory(userId, restaurantId, categoryId, input) {
    const current = await getCategory(userId, restaurantId, categoryId);
    const data = validateCategoryPatch(current, input);
    await ensureOptionalMenu(userId, restaurantId, data.menuId);
    await menuRepository.updateCategory(categoryId, restaurantId, data);
    const category = await getCategory(userId, restaurantId, categoryId);
    return mutation(current, category);
  },
  async deleteCategory(userId, restaurantId, categoryId) {
    const current = await getCategory(userId, restaurantId, categoryId);
    if (!await menuRepository.softDeleteCategory(categoryId, restaurantId)) throw new HttpError(404, 'Menu category not found');
    return mutation(current, { ...current, status: 'INACTIVE' });
  },

  async listItems(userId, restaurantId, query) {
    await ensureRestaurant(userId, restaurantId);
    const pagination = readPagination(query, 100);
    const available = query.available === undefined ? null : readBooleanQuery(query.available);
    const result = await menuRepository.listItems(userId, restaurantId, {
      keyword: trim(query.keyword, 200), categoryId: query.categoryId ? readId(query.categoryId, 'category id') : null,
      available, pageSize: pagination.pageSize, offset: pagination.offset
    });
    return toPagedResponse(result.items, pagination.pageNumber, pagination.pageSize, result.totalItems);
  },
  async createItem(userId, restaurantId, input) {
    await ensureRestaurant(userId, restaurantId);
    const data = validateItemCreate(input?.imageData ? { ...input, imageUrl: await storeImageData(input.imageData, 'menu-items') } : input);
    await ensureOptionalCategory(userId, restaurantId, data.categoryId);
    const id = await menuRepository.createItem(restaurantId, data);
    const item = await menuRepository.findItem(userId, restaurantId, id);
    return mutation(null, item);
  },
  async updateItem(userId, restaurantId, itemId, input) {
    const current = await getItem(userId, restaurantId, itemId);
    const data = validateItemPatch(current, input?.imageData ? { ...input, imageUrl: await storeImageData(input.imageData, 'menu-items') } : input);
    await ensureOptionalCategory(userId, restaurantId, data.categoryId);
    await menuRepository.updateItem(itemId, restaurantId, data);
    const item = await getItem(userId, restaurantId, itemId);
    return mutation(current, item);
  },
  async deleteItem(userId, restaurantId, itemId) {
    const current = await getItem(userId, restaurantId, itemId);
    if (!await menuRepository.softDeleteItem(itemId, restaurantId)) throw new HttpError(404, 'Menu item not found');
    return mutation(current, { ...current, isAvailable: false, deleted: true });
  },

  async listVariants(userId, restaurantId, itemId) {
    await getItem(userId, restaurantId, itemId);
    return menuRepository.listVariants(userId, restaurantId, itemId);
  },
  async createVariant(userId, restaurantId, itemId, input) {
    await getItem(userId, restaurantId, itemId);
    const data = validateVariant(input);
    const id = await menuRepository.createVariant(itemId, data);
    const variants = await menuRepository.listVariants(userId, restaurantId, itemId);
    const variant = variants.find(value => value.id === id);
    return mutation(null, variant);
  },
  async updateVariant(userId, restaurantId, itemId, variantId, input) {
    const variants = await this.listVariants(userId, restaurantId, itemId);
    const current = variants.find(value => value.id === variantId);
    if (!current) throw new HttpError(404, 'Variant not found');
    const data = validateVariant(input);
    await menuRepository.updateVariant(variantId, itemId, data);
    const updated = (await this.listVariants(userId, restaurantId, itemId)).find(value => value.id === variantId);
    return mutation(current, updated);
  },
  async deleteVariant(userId, restaurantId, itemId, variantId) {
    const variants = await this.listVariants(userId, restaurantId, itemId);
    const current = variants.find(value => value.id === variantId);
    if (!current) throw new HttpError(404, 'Variant not found');
    await menuRepository.deleteVariant(variantId, itemId);
    return mutation(current, { ...current, status: 'INACTIVE' });
  },

  async listToppingGroups(userId, restaurantId) {
    await ensureRestaurant(userId, restaurantId);
    return menuRepository.listToppingGroups(userId, restaurantId);
  },
  async createToppingGroup(userId, restaurantId, input) {
    await ensureRestaurant(userId, restaurantId);
    const data = validateToppingGroup(input);
    const id = await menuRepository.createToppingGroup(restaurantId, data);
    const groups = await menuRepository.listToppingGroups(userId, restaurantId);
    return mutation(null, groups.find(group => group.id === id));
  },
  async updateToppingGroup(userId, restaurantId, groupId, input) {
    const current = await getGroup(userId, restaurantId, groupId);
    const data = validateToppingGroup(input);
    await menuRepository.updateToppingGroup(groupId, restaurantId, data);
    const updated = await getGroup(userId, restaurantId, groupId);
    return mutation(current, updated);
  },
  async deleteToppingGroup(userId, restaurantId, groupId) {
    const current = await getGroup(userId, restaurantId, groupId);
    if (!await menuRepository.deleteToppingGroup(groupId, restaurantId)) throw new HttpError(404, 'Topping group not found');
    return mutation(current, { ...current, deleted: true });
  },
  async listToppings(userId, restaurantId, groupId) {
    await getGroup(userId, restaurantId, groupId);
    return menuRepository.listToppings(userId, restaurantId, groupId);
  },
  async createTopping(userId, restaurantId, groupId, input) {
    await getGroup(userId, restaurantId, groupId);
    const data = validateTopping(input);
    const id = await menuRepository.createTopping(groupId, data);
    const toppings = await menuRepository.listToppings(userId, restaurantId, groupId);
    return mutation(null, toppings.find(topping => topping.id === id));
  },
  async updateTopping(userId, restaurantId, groupId, toppingId, input) {
    const toppings = await this.listToppings(userId, restaurantId, groupId);
    const current = toppings.find(topping => topping.id === toppingId);
    if (!current) throw new HttpError(404, 'Topping not found');
    const data = validateTopping(input);
    await menuRepository.updateTopping(toppingId, groupId, data);
    const updated = (await this.listToppings(userId, restaurantId, groupId)).find(topping => topping.id === toppingId);
    return mutation(current, updated);
  },
  async deleteTopping(userId, restaurantId, groupId, toppingId) {
    const toppings = await this.listToppings(userId, restaurantId, groupId);
    const current = toppings.find(topping => topping.id === toppingId);
    if (!current) throw new HttpError(404, 'Topping not found');
    await menuRepository.deleteTopping(toppingId, groupId);
    return mutation(current, { ...current, status: 'INACTIVE' });
  },
  async linkToppingGroups(userId, restaurantId, itemId, input) {
    await getItem(userId, restaurantId, itemId);
    const groupIds = Array.from(new Set((input?.groupIds ?? []).map(id => readId(id, 'topping group id'))));
    const groups = await menuRepository.listToppingGroups(userId, restaurantId);
    if (groupIds.some(id => !groups.some(group => group.id === id))) throw new HttpError(400, 'Topping group does not belong to restaurant');
    if (!await menuRepository.linkToppingGroups(itemId, restaurantId, groupIds)) throw new HttpError(404, 'Menu item not found');
    return { itemId, groupIds, audit: { oldValues: null, newValues: { itemId, groupIds } } };
  }
};

async function ensureRestaurant(userId, restaurantId) {
  const restaurant = await menuRepository.findRestaurantForOwner(userId, restaurantId);
  if (!restaurant) throw new HttpError(404, 'Restaurant not found');
  return restaurant;
}
async function ensureOptionalMenu(userId, restaurantId, menuId) {
  if (menuId !== null && !await menuRepository.findMenu(userId, restaurantId, menuId)) throw new HttpError(400, 'Menu does not belong to restaurant');
}
async function ensureOptionalCategory(userId, restaurantId, categoryId) {
  if (categoryId !== null && !await menuRepository.findCategory(userId, restaurantId, categoryId)) throw new HttpError(400, 'Category does not belong to restaurant');
}
async function getMenu(userId, restaurantId, menuId) { const value = await menuRepository.findMenu(userId, restaurantId, menuId); if (!value) throw new HttpError(404, 'Menu not found'); return value; }
async function getCategory(userId, restaurantId, categoryId) { const value = await menuRepository.findCategory(userId, restaurantId, categoryId); if (!value) throw new HttpError(404, 'Menu category not found'); return value; }
async function getItem(userId, restaurantId, itemId) { const value = await menuRepository.findItem(userId, restaurantId, itemId); if (!value) throw new HttpError(404, 'Menu item not found'); return value; }
async function getGroup(userId, restaurantId, groupId) { const value = (await menuRepository.listToppingGroups(userId, restaurantId)).find(group => group.id === groupId); if (!value) throw new HttpError(404, 'Topping group not found'); return value; }
function mutation(oldValues, newValues) { return { value: newValues, audit: { oldValues, newValues } }; }
function trim(value, max) { if (value === undefined || value === null) return null; const text = String(value).trim(); return text ? text.slice(0, max) : null; }
function readBooleanQuery(value) { if (value === 'true' || value === '1' || value === true) return true; if (value === 'false' || value === '0' || value === false) return false; throw new HttpError(400, 'available must be true or false'); }
