import { HttpError } from '../../shared/http/http-error.js';
import { engagementRepository } from './engagement.repository.js';
import { storeImageData } from '../restaurants/image.storage.js';

const discountTypes = new Set(['PERCENT', 'FIXED_AMOUNT', 'FREE_DELIVERY']);

export const engagementService = {
  listPromotions: filters => engagementRepository.listPromotions(filters),
  listBanners: () => engagementRepository.listBanners(),
  async createBanner(input) {
    const data = await normalizeBanner(input);
    const id = await engagementRepository.createBanner(data);
    const value = await engagementRepository.findBanner(id);
    return change(null, value);
  },
  async updateBanner(bannerId, input) {
    const current = await engagementRepository.findBanner(bannerId);
    if (!current) throw new HttpError(404, 'Banner not found');
    const data = await normalizeBanner(input, current);
    await engagementRepository.updateBanner(bannerId, data);
    return change(current, await engagementRepository.findBanner(bannerId));
  },
  async deleteBanner(bannerId) {
    const current = await engagementRepository.findBanner(bannerId);
    if (!current || !await engagementRepository.deleteBanner(bannerId)) throw new HttpError(404, 'Banner not found');
    return change(current, { ...current, status: 'INACTIVE' });
  },
  async listOwnerPromotions(userId, restaurantId) { return engagementRepository.listPromotionsForOwner(userId, restaurantId); },
  async createPromotion(userId, restaurantId, input) {
    if (!await engagementRepository.ownsRestaurant(userId, restaurantId)) throw new HttpError(404, 'Restaurant not found');
    validatePromotion(input);
    const id = await engagementRepository.createPromotion(restaurantId, normalizePromotion(input));
    const promotion = (await engagementRepository.listPromotionsForOwner(userId, restaurantId)).find(item => item.id === id);
    return change(null, promotion);
  },
  async updatePromotion(userId, restaurantId, promotionId, input) {
    const current = (await engagementRepository.listPromotionsForOwner(userId, restaurantId)).find(item => item.id === promotionId);
    if (!current) throw new HttpError(404, 'Promotion not found');
    const merged = { ...current, ...input };
    validatePromotion(merged);
    await engagementRepository.updatePromotion(userId, restaurantId, promotionId, normalizePromotion(merged));
    const updated = (await engagementRepository.listPromotionsForOwner(userId, restaurantId)).find(item => item.id === promotionId);
    return change(current, updated);
  },
  async deletePromotion(userId, restaurantId, promotionId) {
    const current = (await engagementRepository.listPromotionsForOwner(userId, restaurantId)).find(item => item.id === promotionId);
    if (!current || !await engagementRepository.deletePromotion(userId, restaurantId, promotionId)) throw new HttpError(404, 'Promotion not found');
    return change(current, { ...current, status: 'INACTIVE', deleted: true });
  },
  async validateCode(userId, restaurantId, input) {
    const subtotal = Number(input?.subtotal);
    if (!Number.isFinite(subtotal) || subtotal < 0) throw new HttpError(400, 'Subtotal is invalid');
    const promotion = await engagementRepository.findApplicable(userId, restaurantId, String(input?.code ?? '').trim(), subtotal);
    if (!promotion) throw new HttpError(400, 'Promotion is invalid or no longer available');
    return promotion;
  },
  async toggleRestaurant(userId, restaurantId) { const value = await engagementRepository.toggleFavoriteRestaurant(userId, restaurantId); if (value === null) throw new HttpError(404, 'Customer profile not found'); return { isFavorite: value }; },
  async toggleMenuItem(userId, itemId) { const value = await engagementRepository.toggleFavoriteMenuItem(userId, itemId); if (value === null) throw new HttpError(404, 'Customer profile not found'); return { isFavorite: value }; },
  listFavorites: userId => engagementRepository.listFavorites(userId)
};

function validatePromotion(input) {
  if (!/^[A-Z0-9_-]{3,50}$/.test(String(input?.code ?? '').trim().toUpperCase())) throw new HttpError(400, 'Promotion code must be 3-50 letters, digits, _ or -');
  if (!String(input?.name ?? '').trim()) throw new HttpError(400, 'Promotion name is required');
  if (!discountTypes.has(String(input?.discountType ?? '').toUpperCase())) throw new HttpError(400, 'Discount type is invalid');
  const value = Number(input.discountValue);
  if (!Number.isFinite(value) || value < 0 || (String(input.discountType).toUpperCase() === 'PERCENT' && value > 100)) throw new HttpError(400, 'Discount value is invalid');
  if (!input.startAt || !input.endAt || new Date(input.endAt) <= new Date(input.startAt)) throw new HttpError(400, 'Promotion dates are invalid');
  const status = String(input.status ?? 'ACTIVE').toUpperCase();
  if (!new Set(['ACTIVE', 'INACTIVE', 'EXPIRED']).has(status)) throw new HttpError(400, 'Promotion status is invalid');
  if (Number(input.minimumOrder ?? 0) < 0 || Number(input.usagePerCustomer ?? 1) < 1) throw new HttpError(400, 'Promotion limits are invalid');
}
function normalizePromotion(input) { return { code: String(input.code).trim().toUpperCase(), name: String(input.name).trim(), description: input.description ? String(input.description).trim() : null, discountType: String(input.discountType).toUpperCase(), discountValue: Number(input.discountValue), maxDiscount: input.maxDiscount == null || input.maxDiscount === '' ? null : Number(input.maxDiscount), minimumOrder: Number(input.minimumOrder ?? 0), startAt: input.startAt, endAt: input.endAt, usageLimit: input.usageLimit == null || input.usageLimit === '' ? null : Number(input.usageLimit), usagePerCustomer: Number(input.usagePerCustomer ?? 1), status: String(input.status ?? 'ACTIVE').toUpperCase() }; }
async function normalizeBanner(input, current = {}) {
  const title = String(input?.title ?? current.title ?? '').trim();
  if (!title || title.length > 255) throw new HttpError(400, 'Banner title is required and must be at most 255 characters');
  const imageUrl = input?.imageData ? await storeImageData(input.imageData, 'banners') : String(input?.imageUrl ?? current.imageUrl ?? '').trim();
  if (!imageUrl || (!/^https?:\/\//i.test(imageUrl) && !imageUrl.startsWith('/'))) throw new HttpError(400, 'Banner image URL is invalid');
  const status = String(input?.status ?? current.status ?? 'ACTIVE').toUpperCase();
  if (!new Set(['ACTIVE', 'INACTIVE']).has(status)) throw new HttpError(400, 'Banner status is invalid');
  return { title, imageUrl, targetUrl: input?.targetUrl ?? current.targetUrl ?? null, startAt: input?.startAt ?? current.startAt ?? null, endAt: input?.endAt ?? current.endAt ?? null, sortOrder: Number(input?.sortOrder ?? current.sortOrder ?? 0), status };
}
function change(oldValues, value) { return { value, audit: { oldValues, newValues: value } }; }
