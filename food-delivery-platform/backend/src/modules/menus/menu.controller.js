import { asyncHandler } from '../../shared/http/async-handler.js';
import { readId } from './menu.validation.js';
import { menuService } from './menu.service.js';

export const listMenus = asyncHandler(async (req, res) => { const items = await menuService.listMenus(req.user.id, id(req.params.restaurantId, 'restaurant')); res.json({ items, totalItems: items.length }); });
export const createMenu = asyncHandler(async (req, res) => respondMutation(req, res, await menuService.createMenu(req.user.id, id(req.params.restaurantId, 'restaurant'), req.body), 'MENU', 'MENU_CREATE', 201));
export const updateMenu = asyncHandler(async (req, res) => respondMutation(req, res, await menuService.updateMenu(req.user.id, id(req.params.restaurantId, 'restaurant'), id(req.params.menuId, 'menu'), req.body), 'MENU', 'MENU_UPDATE'));
export const deleteMenu = asyncHandler(async (req, res) => { const result = await menuService.deleteMenu(req.user.id, id(req.params.restaurantId, 'restaurant'), id(req.params.menuId, 'menu')); applyAudit(req, result, 'MENU', 'MENU_DELETE'); res.status(204).send(); });

export const listCategories = asyncHandler(async (req, res) => list(req, res, () => menuService.listCategories(req.user.id, id(req.params.restaurantId, 'restaurant')), 'MENU_CATEGORY_LIST'));
export const createCategory = asyncHandler(async (req, res) => respondMutation(req, res, await menuService.createCategory(req.user.id, id(req.params.restaurantId, 'restaurant'), req.body), 'MENU_CATEGORY', 'MENU_CATEGORY_CREATE', 201));
export const updateCategory = asyncHandler(async (req, res) => respondMutation(req, res, await menuService.updateCategory(req.user.id, id(req.params.restaurantId, 'restaurant'), id(req.params.categoryId, 'category'), req.body), 'MENU_CATEGORY', 'MENU_CATEGORY_UPDATE'));
export const deleteCategory = asyncHandler(async (req, res) => { const result = await menuService.deleteCategory(req.user.id, id(req.params.restaurantId, 'restaurant'), id(req.params.categoryId, 'category')); applyAudit(req, result, 'MENU_CATEGORY', 'MENU_CATEGORY_DELETE'); res.status(204).send(); });

export const listItems = asyncHandler(async (req, res) => { const restaurantId = id(req.params.restaurantId, 'restaurant'); const result = await menuService.listItems(req.user.id, restaurantId, req.query); setAudit(req, 'MENU_ITEM_LIST', 'MENU_ITEM', null); res.json(result); });
export const createItem = asyncHandler(async (req, res) => respondMutation(req, res, await menuService.createItem(req.user.id, id(req.params.restaurantId, 'restaurant'), req.body), 'MENU_ITEM', 'MENU_ITEM_CREATE', 201));
export const updateItem = asyncHandler(async (req, res) => respondMutation(req, res, await menuService.updateItem(req.user.id, id(req.params.restaurantId, 'restaurant'), id(req.params.itemId, 'menu item'), req.body), 'MENU_ITEM', 'MENU_ITEM_UPDATE'));
export const deleteItem = asyncHandler(async (req, res) => { const result = await menuService.deleteItem(req.user.id, id(req.params.restaurantId, 'restaurant'), id(req.params.itemId, 'menu item')); applyAudit(req, result, 'MENU_ITEM', 'MENU_ITEM_DELETE'); res.status(204).send(); });

export const listVariants = asyncHandler(async (req, res) => list(req, res, () => menuService.listVariants(req.user.id, id(req.params.restaurantId, 'restaurant'), id(req.params.itemId, 'menu item')), 'MENU_VARIANT_LIST'));
export const createVariant = asyncHandler(async (req, res) => respondMutation(req, res, await menuService.createVariant(req.user.id, id(req.params.restaurantId, 'restaurant'), id(req.params.itemId, 'menu item'), req.body), 'MENU_VARIANT', 'MENU_VARIANT_CREATE', 201));
export const updateVariant = asyncHandler(async (req, res) => respondMutation(req, res, await menuService.updateVariant(req.user.id, id(req.params.restaurantId, 'restaurant'), id(req.params.itemId, 'menu item'), id(req.params.variantId, 'variant'), req.body), 'MENU_VARIANT', 'MENU_VARIANT_UPDATE'));
export const deleteVariant = asyncHandler(async (req, res) => { const result = await menuService.deleteVariant(req.user.id, id(req.params.restaurantId, 'restaurant'), id(req.params.itemId, 'menu item'), id(req.params.variantId, 'variant')); applyAudit(req, result, 'MENU_VARIANT', 'MENU_VARIANT_DELETE'); res.status(204).send(); });

export const listToppingGroups = asyncHandler(async (req, res) => list(req, res, () => menuService.listToppingGroups(req.user.id, id(req.params.restaurantId, 'restaurant')), 'TOPPING_GROUP_LIST'));
export const createToppingGroup = asyncHandler(async (req, res) => respondMutation(req, res, await menuService.createToppingGroup(req.user.id, id(req.params.restaurantId, 'restaurant'), req.body), 'TOPPING_GROUP', 'TOPPING_GROUP_CREATE', 201));
export const updateToppingGroup = asyncHandler(async (req, res) => respondMutation(req, res, await menuService.updateToppingGroup(req.user.id, id(req.params.restaurantId, 'restaurant'), id(req.params.groupId, 'topping group'), req.body), 'TOPPING_GROUP', 'TOPPING_GROUP_UPDATE'));
export const deleteToppingGroup = asyncHandler(async (req, res) => { const result = await menuService.deleteToppingGroup(req.user.id, id(req.params.restaurantId, 'restaurant'), id(req.params.groupId, 'topping group')); applyAudit(req, result, 'TOPPING_GROUP', 'TOPPING_GROUP_DELETE'); res.status(204).send(); });
export const listToppings = asyncHandler(async (req, res) => list(req, res, () => menuService.listToppings(req.user.id, id(req.params.restaurantId, 'restaurant'), id(req.params.groupId, 'topping group')), 'TOPPING_LIST'));
export const createTopping = asyncHandler(async (req, res) => respondMutation(req, res, await menuService.createTopping(req.user.id, id(req.params.restaurantId, 'restaurant'), id(req.params.groupId, 'topping group'), req.body), 'TOPPING', 'TOPPING_CREATE', 201));
export const updateTopping = asyncHandler(async (req, res) => respondMutation(req, res, await menuService.updateTopping(req.user.id, id(req.params.restaurantId, 'restaurant'), id(req.params.groupId, 'topping group'), id(req.params.toppingId, 'topping'), req.body), 'TOPPING', 'TOPPING_UPDATE'));
export const deleteTopping = asyncHandler(async (req, res) => { const result = await menuService.deleteTopping(req.user.id, id(req.params.restaurantId, 'restaurant'), id(req.params.groupId, 'topping group'), id(req.params.toppingId, 'topping')); applyAudit(req, result, 'TOPPING', 'TOPPING_DELETE'); res.status(204).send(); });
export const linkToppingGroups = asyncHandler(async (req, res) => respondMutation(req, res, await menuService.linkToppingGroups(req.user.id, id(req.params.restaurantId, 'restaurant'), id(req.params.itemId, 'menu item'), req.body), 'MENU_ITEM', 'MENU_ITEM_TOPPING_GROUPS_UPDATE'));

async function list(req, res, load, action) { const items = await load(); setAudit(req, action, 'MENU'); res.json({ items, totalItems: items.length }); }
async function respondMutation(req, res, result, entityType, action, status = 200) { applyAudit(req, result, entityType, action); res.status(status).json(result.value); }
function applyAudit(req, result, entityType, action) { setAudit(req, action, entityType, result.value?.id ?? result.value?.itemId ?? null); req.auditOldValues = result.audit.oldValues; req.auditNewValues = result.audit.newValues; }
function setAudit(req, action, entityType, entityId = null) { req.auditUserId = req.user?.id ?? null; req.auditAction = action; req.auditEntityType = entityType; req.auditEntityId = entityId; }
function id(value, field) { return readId(value, field); }
