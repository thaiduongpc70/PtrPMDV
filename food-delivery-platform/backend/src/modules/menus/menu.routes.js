import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/middlewares/require-auth.middleware.js';
import { requirePermission } from '../../shared/middlewares/require-permission.middleware.js';
import * as controller from './menu.controller.js';

export const restaurantMenuRoutes = Router();
restaurantMenuRoutes.use(requireAuth, requireRole('RESTAURANT'));

restaurantMenuRoutes.get('/:restaurantId/menus', requirePermission('menu.view'), controller.listMenus);
restaurantMenuRoutes.post('/:restaurantId/menus', requirePermission('menu.create'), controller.createMenu);
restaurantMenuRoutes.patch('/:restaurantId/menus/:menuId', requirePermission('menu.update'), controller.updateMenu);
restaurantMenuRoutes.delete('/:restaurantId/menus/:menuId', requirePermission('menu.delete'), controller.deleteMenu);

restaurantMenuRoutes.get('/:restaurantId/menu-categories', requirePermission('menu.view'), controller.listCategories);
restaurantMenuRoutes.post('/:restaurantId/menu-categories', requirePermission('menu.create'), controller.createCategory);
restaurantMenuRoutes.patch('/:restaurantId/menu-categories/:categoryId', requirePermission('menu.update'), controller.updateCategory);
restaurantMenuRoutes.delete('/:restaurantId/menu-categories/:categoryId', requirePermission('menu.delete'), controller.deleteCategory);

restaurantMenuRoutes.get('/:restaurantId/menu-items', requirePermission('menu.view'), controller.listItems);
restaurantMenuRoutes.post('/:restaurantId/menu-items', requirePermission('menu.create'), controller.createItem);
restaurantMenuRoutes.patch('/:restaurantId/menu-items/:itemId', requirePermission('menu.update'), controller.updateItem);
restaurantMenuRoutes.delete('/:restaurantId/menu-items/:itemId', requirePermission('menu.delete'), controller.deleteItem);
restaurantMenuRoutes.get('/:restaurantId/menu-items/:itemId/variants', requirePermission('menu.view'), controller.listVariants);
restaurantMenuRoutes.post('/:restaurantId/menu-items/:itemId/variants', requirePermission('menu.create'), controller.createVariant);
restaurantMenuRoutes.patch('/:restaurantId/menu-items/:itemId/variants/:variantId', requirePermission('menu.update'), controller.updateVariant);
restaurantMenuRoutes.delete('/:restaurantId/menu-items/:itemId/variants/:variantId', requirePermission('menu.delete'), controller.deleteVariant);
restaurantMenuRoutes.put('/:restaurantId/menu-items/:itemId/topping-groups', requirePermission('menu.update'), controller.linkToppingGroups);

restaurantMenuRoutes.get('/:restaurantId/topping-groups', requirePermission('menu.view'), controller.listToppingGroups);
restaurantMenuRoutes.post('/:restaurantId/topping-groups', requirePermission('menu.create'), controller.createToppingGroup);
restaurantMenuRoutes.patch('/:restaurantId/topping-groups/:groupId', requirePermission('menu.update'), controller.updateToppingGroup);
restaurantMenuRoutes.delete('/:restaurantId/topping-groups/:groupId', requirePermission('menu.delete'), controller.deleteToppingGroup);
restaurantMenuRoutes.get('/:restaurantId/topping-groups/:groupId/toppings', requirePermission('menu.view'), controller.listToppings);
restaurantMenuRoutes.post('/:restaurantId/topping-groups/:groupId/toppings', requirePermission('menu.create'), controller.createTopping);
restaurantMenuRoutes.patch('/:restaurantId/topping-groups/:groupId/toppings/:toppingId', requirePermission('menu.update'), controller.updateTopping);
restaurantMenuRoutes.delete('/:restaurantId/topping-groups/:groupId/toppings/:toppingId', requirePermission('menu.delete'), controller.deleteTopping);
