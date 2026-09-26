import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/middlewares/require-auth.middleware.js';
import { requirePermission } from '../../shared/middlewares/require-permission.middleware.js';
import * as controller from './order.controller.js';

export const customerOrderRoutes = Router();
customerOrderRoutes.use(requireAuth, requireRole('CUSTOMER'));
customerOrderRoutes.get('/cart', requirePermission('order.view'), controller.getCart);
customerOrderRoutes.post('/cart/items', requirePermission('order.create'), controller.addCartItem);
customerOrderRoutes.patch('/cart/items/:cartItemId', requirePermission('order.create'), controller.updateCartItem);
customerOrderRoutes.delete('/cart/items/:cartItemId', requirePermission('order.create'), controller.removeCartItem);
customerOrderRoutes.delete('/cart/:restaurantId', requirePermission('order.create'), controller.clearCart);
customerOrderRoutes.post('/orders/checkout', requirePermission('order.create'), controller.checkout);
customerOrderRoutes.get('/orders', requirePermission('order.view'), controller.listCustomerOrders);
customerOrderRoutes.get('/orders/:orderId', requirePermission('order.view'), controller.getCustomerOrder);

export const restaurantOrderRoutes = Router();
restaurantOrderRoutes.use(requireAuth, requireRole('RESTAURANT'), requirePermission('order.view'));
restaurantOrderRoutes.get('/orders', controller.listRestaurantOrders);
restaurantOrderRoutes.get('/orders/:orderId', controller.getRestaurantOrder);
restaurantOrderRoutes.post('/orders/:orderId/confirm', requirePermission('order.update'), controller.confirmOrder);
restaurantOrderRoutes.post('/orders/:orderId/prepare', requirePermission('order.update'), controller.startPreparing);
restaurantOrderRoutes.post('/orders/:orderId/ready', requirePermission('order.update'), controller.markReady);
restaurantOrderRoutes.post('/orders/:orderId/reject', requirePermission('order.update'), controller.rejectOrder);
