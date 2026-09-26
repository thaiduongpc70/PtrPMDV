import { HttpError } from '../../shared/http/http-error.js';

const menuStatuses = new Set(['ACTIVE', 'INACTIVE']);
const itemStatuses = new Set(['ACTIVE', 'INACTIVE']);

export function readId(value, field = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, `${field} must be a positive integer`);
  }
  return id;
}

export function validateMenuCreate(input) {
  return {
    name: requiredText(input?.name, 'Menu name', 150),
    description: optionalText(input?.description, 'Menu description', 500),
    startTime: optionalTime(input?.startTime, 'Start time'),
    endTime: optionalTime(input?.endTime, 'End time'),
    status: readStatus(input?.status, menuStatuses, 'Menu status', 'ACTIVE')
  };
}

export function validateMenuPatch(current, input) {
  const data = input ?? {};
  return {
    name: data.name === undefined ? current.name : requiredText(data.name, 'Menu name', 150),
    description: data.description === undefined
      ? current.description
      : optionalText(data.description, 'Menu description', 500),
    startTime: data.startTime === undefined
      ? current.startTime
      : optionalTime(data.startTime, 'Start time'),
    endTime: data.endTime === undefined
      ? current.endTime
      : optionalTime(data.endTime, 'End time'),
    status: data.status === undefined
      ? current.status
      : readStatus(data.status, menuStatuses, 'Menu status')
  };
}

export function validateCategoryCreate(input) {
  return {
    menuId: nullableId(input?.menuId, 'Menu id'),
    name: requiredText(input?.name, 'Category name', 150),
    description: optionalText(input?.description, 'Category description', 500),
    sortOrder: readInteger(input?.sortOrder, 'Sort order', 0, 100000, 0),
    status: readStatus(input?.status, menuStatuses, 'Category status', 'ACTIVE')
  };
}

export function validateCategoryPatch(current, input) {
  const data = input ?? {};
  return {
    menuId: data.menuId === undefined ? current.menuId : nullableId(data.menuId, 'Menu id'),
    name: data.name === undefined ? current.name : requiredText(data.name, 'Category name', 150),
    description: data.description === undefined
      ? current.description
      : optionalText(data.description, 'Category description', 500),
    sortOrder: data.sortOrder === undefined
      ? current.sortOrder
      : readInteger(data.sortOrder, 'Sort order', 0, 100000, 0),
    status: data.status === undefined
      ? current.status
      : readStatus(data.status, menuStatuses, 'Category status')
  };
}

export function validateItemCreate(input) {
  const result = {
    categoryId: nullableId(input?.categoryId, 'Category id'),
    name: requiredText(input?.name, 'Item name', 200),
    description: optionalText(input?.description, 'Item description', 5000),
    imageUrl: optionalUrl(input?.imageUrl, 'Image URL', 500),
    basePrice: readMoney(input?.basePrice, 'Base price'),
    discountPrice: input?.discountPrice === undefined || input.discountPrice === null || input.discountPrice === ''
      ? null
      : readMoney(input.discountPrice, 'Discount price'),
    preparationTime: readInteger(input?.preparationTime, 'Preparation time', 1, 1440, 15),
    isAvailable: readBoolean(input?.isAvailable, true),
    isFeatured: readBoolean(input?.isFeatured, false)
  };
  if (result.discountPrice !== null && result.discountPrice > result.basePrice) {
    throw new HttpError(400, 'Discount price cannot exceed base price');
  }
  return result;
}

export function validateItemPatch(current, input) {
  const data = input ?? {};
  const result = {
    categoryId: data.categoryId === undefined ? current.categoryId : nullableId(data.categoryId, 'Category id'),
    name: data.name === undefined ? current.name : requiredText(data.name, 'Item name', 200),
    description: data.description === undefined
      ? current.description
      : optionalText(data.description, 'Item description', 5000),
    imageUrl: data.imageUrl === undefined
      ? current.imageUrl
      : optionalUrl(data.imageUrl, 'Image URL', 500),
    basePrice: data.basePrice === undefined ? current.basePrice : readMoney(data.basePrice, 'Base price'),
    discountPrice: data.discountPrice === undefined
      ? current.discountPrice
      : (data.discountPrice === null || data.discountPrice === '' ? null : readMoney(data.discountPrice, 'Discount price')),
    preparationTime: data.preparationTime === undefined
      ? current.preparationTime
      : readInteger(data.preparationTime, 'Preparation time', 1, 1440, 15),
    isAvailable: data.isAvailable === undefined ? current.isAvailable : readBoolean(data.isAvailable),
    isFeatured: data.isFeatured === undefined ? current.isFeatured : readBoolean(data.isFeatured)
  };

  if (result.discountPrice !== null && result.discountPrice > result.basePrice) {
    throw new HttpError(400, 'Discount price cannot exceed base price');
  }
  return result;
}

export function validateVariant(input) {
  return {
    name: requiredText(input?.name, 'Variant name', 100),
    priceAdjustment: readSignedMoney(input?.priceAdjustment ?? 0, 'Variant price adjustment'),
    status: readStatus(input?.status, itemStatuses, 'Variant status', 'ACTIVE')
  };
}

export function validateToppingGroup(input) {
  const minSelect = readInteger(input?.minSelect, 'Minimum selection', 0, 100, 0);
  const maxSelect = readInteger(input?.maxSelect, 'Maximum selection', minSelect, 100, 1);
  return {
    name: requiredText(input?.name, 'Topping group name', 150),
    minSelect,
    maxSelect,
    required: readBoolean(input?.required, false)
  };
}

export function validateTopping(input) {
  return {
    name: requiredText(input?.name, 'Topping name', 150),
    price: readMoney(input?.price ?? 0, 'Topping price'),
    status: readStatus(input?.status, itemStatuses, 'Topping status', 'ACTIVE')
  };
}

function requiredText(value, field, maxLength) {
  const text = optionalText(value, field, maxLength);
  if (!text) throw new HttpError(400, `${field} is required`);
  return text;
}

function optionalText(value, field, maxLength) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const text = String(value).trim();
  if (text.length > maxLength) throw new HttpError(400, `${field} must be at most ${maxLength} characters`);
  return text;
}

function optionalUrl(value, field, maxLength) {
  const text = optionalText(value, field, maxLength);
  if (!text) return null;
  if (!/^https?:\/\//i.test(text) && !text.startsWith('/')) {
    throw new HttpError(400, `${field} must be an absolute URL or an upload path`);
  }
  return text;
}

function readMoney(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 9999999999999.99) {
    throw new HttpError(400, `${field} is invalid`);
  }
  return Math.round(number * 100) / 100;
}

function readSignedMoney(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < -9999999999999.99 || number > 9999999999999.99) {
    throw new HttpError(400, `${field} is invalid`);
  }
  return Math.round(number * 100) / 100;
}

function readInteger(value, field, minimum, maximum, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new HttpError(400, `${field} must be between ${minimum} and ${maximum}`);
  }
  return number;
}

function readBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  throw new HttpError(400, 'Boolean value is invalid');
}

function readStatus(value, allowed, field, fallback) {
  const status = String(value ?? fallback ?? '').trim().toUpperCase();
  if (!allowed.has(status)) throw new HttpError(400, `${field} is invalid`);
  return status;
}

function optionalTime(value, field) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(text)) {
    throw new HttpError(400, `${field} must use HH:mm or HH:mm:ss`);
  }
  return text.length === 5 ? `${text}:00` : text;
}

function nullableId(value, field) {
  if (value === undefined || value === null || value === '') return null;
  return readId(value, field);
}
