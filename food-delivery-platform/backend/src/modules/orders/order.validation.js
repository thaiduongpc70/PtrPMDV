import { HttpError } from '../../shared/http/http-error.js';

export const paymentMethods = new Set(['COD', 'BANK_TRANSFER', 'MOMO', 'VNPAY', 'ZALOPAY', 'CARD', 'WALLET']);
export const restaurantOrderTransitions = {
  PENDING: new Set(['CONFIRMED', 'CANCELLED']),
  CONFIRMED: new Set(['PREPARING', 'CANCELLED']),
  PREPARING: new Set(['READY_FOR_PICKUP'])
};

export function validateCartItem(input) {
  const restaurantId = readId(input?.restaurantId, 'Restaurant id');
  const menuItemId = readId(input?.menuItemId, 'Menu item id');
  const variantId = input?.variantId === undefined || input.variantId === null || input.variantId === '' ? null : readId(input.variantId, 'Variant id');
  const quantity = readInteger(input?.quantity, 'Quantity', 1, 99, 1);
  const toppingIds = Array.from(new Set((input?.toppingIds ?? []).map(value => readId(value, 'Topping id'))));
  const note = optionalText(input?.note, 'Item note', 500);
  return { restaurantId, menuItemId, variantId, quantity, toppingIds, note };
}

export function validateCartItemPatch(input) {
  const quantity = readInteger(input?.quantity, 'Quantity', 1, 99, null);
  const toppingIds = input?.toppingIds === undefined ? undefined : Array.from(new Set(input.toppingIds.map(value => readId(value, 'Topping id'))));
  return { quantity, toppingIds, note: input?.note === undefined ? undefined : optionalText(input.note, 'Item note', 500) };
}

export function validateCheckout(input, headerIdempotencyKey) {
  const restaurantId = readId(input?.restaurantId, 'Restaurant id');
  const addressId = readId(input?.addressId, 'Address id');
  const paymentMethod = String(input?.paymentMethod ?? 'COD').trim().toUpperCase();
  if (!paymentMethods.has(paymentMethod)) throw new HttpError(400, 'Payment method is invalid');
  const idempotencyKey = optionalText(headerIdempotencyKey ?? input?.idempotencyKey, 'Idempotency key', 100) ?? createIdempotencyKey();
  const promotionCode = optionalText(input?.promotionCode, 'Promotion code', 50)?.toUpperCase() ?? null;
  return { restaurantId, addressId, paymentMethod, customerNote: optionalText(input?.customerNote, 'Customer note', 1000), idempotencyKey, promotionCode };
}

export function readId(value, field) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, `${field} must be a positive integer`);
  return id;
}

function readInteger(value, field, minimum, maximum, fallback) {
  if (value === undefined || value === null || value === '') { if (fallback !== null) return fallback; throw new HttpError(400, `${field} is required`); }
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) throw new HttpError(400, `${field} must be between ${minimum} and ${maximum}`);
  return number;
}
function optionalText(value, field, max) { if (value === undefined || value === null || String(value).trim() === '') return null; const text = String(value).trim(); if (text.length > max) throw new HttpError(400, `${field} must be at most ${max} characters`); return text; }
function createIdempotencyKey() { return `auto-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`; }
