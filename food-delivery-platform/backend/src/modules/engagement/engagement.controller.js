import { asyncHandler } from '../../shared/http/async-handler.js';
import { HttpError } from '../../shared/http/http-error.js';
import { engagementService } from './engagement.service.js';

export const listPromotions = asyncHandler(async (req, res) => { const items = await engagementService.listPromotions({ restaurantId: readOptionalId(req.query.restaurantId) }); res.json({ items, totalItems: items.length }); });
export const listBanners = asyncHandler(async (req, res) => { const items = await engagementService.listBanners(); res.json({ items, totalItems: items.length }); });
export const createBanner = asyncHandler(async (req, res) => respond(req, res, await engagementService.createBanner(req.body), 201, 'BANNER_CREATE', 'BANNER'));
export const updateBanner = asyncHandler(async (req, res) => respond(req, res, await engagementService.updateBanner(readId(req.params.bannerId), req.body), 200, 'BANNER_UPDATE', 'BANNER'));
export const deleteBanner = asyncHandler(async (req, res) => { const result = await engagementService.deleteBanner(readId(req.params.bannerId)); audit(req, result, 'BANNER', 'BANNER_DELETE'); res.status(204).send(); });
export const listOwnerPromotions = asyncHandler(async (req, res) => { const items = await engagementService.listOwnerPromotions(req.user.id, readId(req.params.restaurantId)); res.json({ items, totalItems: items.length }); });
export const createPromotion = asyncHandler(async (req, res) => respond(req, res, await engagementService.createPromotion(req.user.id, readId(req.params.restaurantId), req.body), 201, 'PROMOTION_CREATE'));
export const updatePromotion = asyncHandler(async (req, res) => respond(req, res, await engagementService.updatePromotion(req.user.id, readId(req.params.restaurantId), readId(req.params.promotionId), req.body), 200, 'PROMOTION_UPDATE'));
export const deletePromotion = asyncHandler(async (req, res) => { const result = await engagementService.deletePromotion(req.user.id, readId(req.params.restaurantId), readId(req.params.promotionId)); audit(req, result, 'PROMOTION', 'PROMOTION_DELETE'); res.status(204).send(); });
export const validatePromotion = asyncHandler(async (req, res) => res.json(await engagementService.validateCode(req.user.id, readId(req.params.restaurantId), req.body)));
export const listFavorites = asyncHandler(async (req, res) => res.json(await engagementService.listFavorites(req.user.id)));
export const toggleRestaurantFavorite = asyncHandler(async (req, res) => { const result = await engagementService.toggleRestaurant(req.user.id, readId(req.params.restaurantId)); res.json(result); });
export const toggleMenuFavorite = asyncHandler(async (req, res) => { const result = await engagementService.toggleMenuItem(req.user.id, readId(req.params.itemId)); res.json(result); });

async function respond(req, res, result, status, action, type = 'PROMOTION') { audit(req, result, type, action); res.status(status).json(result.value); }
function audit(req, result, type, action) { req.auditUserId = req.user?.id ?? null; req.auditAction = action; req.auditEntityType = type; req.auditEntityId = result.value?.id ?? null; req.auditOldValues = result.audit.oldValues; req.auditNewValues = result.audit.newValues; }
function readId(value) { const id = Number(value); if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Id must be a positive integer'); return id; }
function readOptionalId(value) { return value === undefined || value === '' ? null : readId(value); }
