import { asyncHandler } from '../../shared/http/async-handler.js';
import { HttpError } from '../../shared/http/http-error.js';
import { orderService } from './order.service.js';

export const getCart = asyncHandler(async (req, res) => res.json(await orderService.getCart(req.user.id, optionalId(req.query.restaurantId))));
export const addCartItem = asyncHandler(async (req, res) => { const result = await orderService.addCartItem(req.user.id, req.body); setAudit(req, result, 'CART_ITEM', 'CART_ITEM_CREATE'); res.status(201).json(result.cart); });
export const updateCartItem = asyncHandler(async (req, res) => { const result = await orderService.updateCartItem(req.user.id, readId(req.params.cartItemId), req.body); setAudit(req, result, 'CART_ITEM', 'CART_ITEM_UPDATE'); res.json(result.cart); });
export const removeCartItem = asyncHandler(async (req, res) => { const result = await orderService.removeCartItem(req.user.id, readId(req.params.cartItemId)); setAudit(req, result, 'CART_ITEM', 'CART_ITEM_DELETE'); res.status(204).send(); });
export const clearCart = asyncHandler(async (req, res) => { const restaurantId = readId(req.params.restaurantId); const result = await orderService.clearCart(req.user.id, restaurantId); setAudit(req, result, 'CART', 'CART_CLEAR', restaurantId); res.status(204).send(); });
export const checkout = asyncHandler(async (req, res) => { const result = await orderService.checkout(req.user.id, req.body, req.get('Idempotency-Key')); setAudit(req, result, 'ORDER', result.alreadyProcessed ? 'ORDER_IDEMPOTENT_REPLAY' : 'ORDER_CREATE', result.order.id); res.status(result.alreadyProcessed ? 200 : 201).json(result.order); });
export const listCustomerOrders = asyncHandler(async (req, res) => { const items = await orderService.listCustomerOrders(req.user.id, req.query); res.json({ items, totalItems: items.length }); });
export const getCustomerOrder = asyncHandler(async (req, res) => res.json(await orderService.getCustomerOrder(req.user.id, readId(req.params.orderId))));
export const listRestaurantOrders = asyncHandler(async (req, res) => { const items = await orderService.listRestaurantOrders(req.user.id, req.query); res.json({ items, totalItems: items.length }); });
export const getRestaurantOrder = asyncHandler(async (req, res) => res.json(await orderService.getRestaurantOrder(req.user.id, readId(req.params.orderId))));
export const confirmOrder = transition('CONFIRMED', 'ORDER_CONFIRM');
export const startPreparing = transition('PREPARING', 'ORDER_PREPARE');
export const markReady = transition('READY_FOR_PICKUP', 'ORDER_READY');
export const rejectOrder = transition('CANCELLED', 'ORDER_REJECT');

function transition(targetStatus, action) { return asyncHandler(async (req, res) => { const result = await orderService.transitionRestaurantOrder(req.user.id, readId(req.params.orderId), targetStatus, req.body?.note); setAudit(req, result, 'ORDER', action, result.order.id); res.json(result.order); }); }
function setAudit(req, result, type, action, entityId = null) { req.auditUserId = req.user?.id ?? null; req.auditAction = action; req.auditEntityType = type; req.auditEntityId = entityId; req.auditOldValues = result.audit?.oldValues ?? null; req.auditNewValues = result.audit?.newValues ?? null; }
function readId(value) { const id = Number(value); if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Id must be a positive integer'); return id; }
function optionalId(value) { return value === undefined || value === '' ? null : readId(value); }
