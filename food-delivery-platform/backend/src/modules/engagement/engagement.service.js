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
    validateShopVoucherLimits(input);
    const id = await engagementRepository.createPromotion(restaurantId, normalizePromotion(input));
    const promotion = (await engagementRepository.listPromotionsForOwner(userId, restaurantId)).find(item => item.id === id);
    return change(null, promotion);
  },
  async updatePromotion(userId, restaurantId, promotionId, input) {
    const current = (await engagementRepository.listPromotionsForOwner(userId, restaurantId)).find(item => item.id === promotionId);
    if (!current) throw new HttpError(404, 'Promotion not found');
    const merged = { ...current, ...input };
    validatePromotion(merged);
    if (['discountType', 'usageLimit', 'startAt', 'endAt'].some(key => input?.[key] !== undefined)) validateShopVoucherLimits(merged);
    await engagementRepository.updatePromotion(userId, restaurantId, promotionId, normalizePromotion(merged));
    const updated = (await engagementRepository.listPromotionsForOwner(userId, restaurantId)).find(item => item.id === promotionId);
    return change(current, updated);
  },
  /** Gia hạn voucher của quán: cộng thêm ngày dùng và/hoặc hạn ngạch; voucher đã hết hạn được bật lại. */
  async extendPromotion(userId, restaurantId, promotionId, input) {
    const current = (await engagementRepository.listPromotionsForOwner(userId, restaurantId)).find(item => item.id === promotionId);
    if (!current) throw new HttpError(404, 'Promotion not found');
    const days = Number(input?.days ?? 0);
    const addQuota = Number(input?.addQuota ?? 0);
    if (!Number.isInteger(days) || days < 0 || days > SHOP_VOUCHER_MAX_DAYS || !Number.isInteger(addQuota) || addQuota < 0 || (days === 0 && addQuota === 0)) {
      throw new HttpError(400, `Cần gia hạn thêm 1-${SHOP_VOUCHER_MAX_DAYS} ngày và/hoặc thêm hạn ngạch`);
    }
    const base = Math.max(Date.now(), new Date(current.endAt).getTime());
    const endAt = new Date(base + days * 86400000);
    if (endAt.getTime() - Date.now() > SHOP_VOUCHER_MAX_DAYS * 86400000) throw new HttpError(400, `Voucher chỉ có hiệu lực tối đa ${SHOP_VOUCHER_MAX_DAYS} ngày kể từ hôm nay`);
    const usageLimit = current.usageLimit == null ? null : current.usageLimit + addQuota;
    const merged = { ...current, endAt: days > 0 ? endAt : current.endAt, usageLimit, status: 'ACTIVE' };
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

const SHOP_VOUCHER_MAX_DAYS = 90;
/** Quy định voucher của quán: chỉ giảm % hoặc trực tiếp (freeship do nền tảng cấp), phải có hạn ngạch và hạn dùng tối đa 90 ngày. */
function validateShopVoucherLimits(input) {
  const type = String(input?.discountType ?? '').toUpperCase();
  if (type === 'FREE_DELIVERY') throw new HttpError(400, 'Voucher freeship do nền tảng cấp; quán chỉ tạo voucher giảm % hoặc giảm trực tiếp');
  const quota = Number(input?.usageLimit);
  if (!Number.isInteger(quota) || quota < 1 || quota > 100000) throw new HttpError(400, 'Voucher của quán phải có hạn ngạch (số lượt dùng) từ 1 đến 100000');
  const span = new Date(input.endAt).getTime() - new Date(input.startAt).getTime();
  if (span > SHOP_VOUCHER_MAX_DAYS * 86400000) throw new HttpError(400, `Voucher của quán có hiệu lực tối đa ${SHOP_VOUCHER_MAX_DAYS} ngày`);
}
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
function normalizePromotion(input) { return { code: String(input.code).trim().toUpperCase(), name: String(input.name).trim(), description: input.description ? String(input.description).trim() : null, discountType: String(input.discountType).toUpperCase(), discountValue: Number(input.discountValue), maxDiscount: input.maxDiscount == null || input.maxDiscount === '' ? null : Number(input.maxDiscount), minimumOrder: Number(input.minimumOrder ?? 0), startAt: new Date(input.startAt), endAt: new Date(input.endAt), usageLimit: input.usageLimit == null || input.usageLimit === '' ? null : Number(input.usageLimit), usagePerCustomer: Number(input.usagePerCustomer ?? 1), status: String(input.status ?? 'ACTIVE').toUpperCase() }; }
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
