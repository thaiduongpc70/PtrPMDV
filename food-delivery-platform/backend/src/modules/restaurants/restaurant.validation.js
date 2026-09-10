import { HttpError } from '../../shared/http/http-error.js';

const restaurantStatuses = new Set([
  'PENDING',
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED'
]);
const categoryStatuses = new Set(['ACTIVE', 'INACTIVE']);
const imageTypes = new Set(['LOGO', 'COVER', 'GALLERY']);
const restaurantProfileFields = [
  'categoryId',
  'name',
  'description',
  'phone',
  'email',
  'address',
  'ward',
  'district',
  'city',
  'latitude',
  'longitude',
  'openingTime',
  'closingTime',
  'minimumOrder',
  'averagePrepareTime'
];

export function validateRestaurantProfile(input) {
  const data = input ?? {};
  const openingTime = readTime(data.openingTime, 'Opening time');
  const closingTime = readTime(data.closingTime, 'Closing time');

  if ((openingTime === null) !== (closingTime === null)) {
    throw new HttpError(400, 'Opening time and closing time must be provided together');
  }

  if (openingTime !== null && openingTime === closingTime) {
    throw new HttpError(400, 'Opening time and closing time must be different');
  }

  return {
    categoryId: readNullablePositiveInteger(data.categoryId, 'Category id'),
    name: readText(data.name, 'Restaurant name', 200, true),
    description: readText(data.description, 'Description', 5000, false),
    phone: readPhone(data.phone),
    email: readEmail(data.email),
    address: readText(data.address, 'Address', 255, true),
    ward: readText(data.ward, 'Ward', 100, false),
    district: readText(data.district, 'District', 100, false),
    city: readText(data.city, 'City', 100, true),
    latitude: readCoordinate(data.latitude, 'Latitude', -90, 90),
    longitude: readCoordinate(data.longitude, 'Longitude', -180, 180),
    openingTime,
    closingTime,
    minimumOrder: readDecimal(data.minimumOrder, 'Minimum order', 0, 9999999999999.99, 0),
    averagePrepareTime: readInteger(
      data.averagePrepareTime,
      'Average prepare time',
      1,
      1440,
      20
    )
  };
}

export function validateRestaurantPatch(current, input) {
  assertObject(input, 'Request body');
  assertHasField(input, restaurantProfileFields, 'At least one restaurant field is required');

  return validateRestaurantProfile(Object.fromEntries(
    restaurantProfileFields.map(field => [
      field,
      Object.hasOwn(input, field) ? input[field] : current[field]
    ])
  ));
}

export function validateAdminRestaurantCreate(input) {
  assertObject(input, 'Request body');

  return {
    ownerUserId: readPositiveInteger(input.ownerUserId, 'Owner user id'),
    ...validateRestaurantProfile(input),
    status: readEnum(input.status, 'Status', restaurantStatuses, 'PENDING'),
    commissionRate: readDecimal(
      input.commissionRate,
      'Commission rate',
      0,
      100,
      0
    )
  };
}

export function validateAdminRestaurantState(current, input) {
  assertObject(input, 'Request body');
  assertHasField(
    input,
    ['status', 'commissionRate'],
    'Status or commission rate is required'
  );

  return {
    status: readEnum(
      Object.hasOwn(input, 'status') ? input.status : current.status,
      'Status',
      restaurantStatuses
    ),
    commissionRate: readDecimal(
      Object.hasOwn(input, 'commissionRate')
        ? input.commissionRate
        : current.commissionRate,
      'Commission rate',
      0,
      100
    )
  };
}

export function validateOperatingHours(input) {
  const hours = Array.isArray(input) ? input : input?.operatingHours;

  if (!Array.isArray(hours) || hours.length !== 7) {
    throw new HttpError(400, 'Operating hours must contain all 7 days');
  }

  const seenDays = new Set();
  const result = hours.map(entry => {
    assertObject(entry, 'Operating hour');
    const dayOfWeek = readInteger(entry.dayOfWeek, 'Day of week', 1, 7);

    if (seenDays.has(dayOfWeek)) {
      throw new HttpError(400, `Day of week ${dayOfWeek} is duplicated`);
    }
    seenDays.add(dayOfWeek);

    const isClosed = readBoolean(entry.isClosed, false, 'isClosed');
    const openTime = isClosed ? null : readTime(entry.openTime, 'Open time', true);
    const closeTime = isClosed ? null : readTime(entry.closeTime, 'Close time', true);

    if (!isClosed && openTime === closeTime) {
      throw new HttpError(400, `Open and close time must differ for day ${dayOfWeek}`);
    }

    return { dayOfWeek, openTime, closeTime, isClosed };
  });

  return result.sort((left, right) => left.dayOfWeek - right.dayOfWeek);
}

export function validateImageCreate(input) {
  assertObject(input, 'Request body');

  return {
    imageUrl: readImageUrl(input.imageUrl),
    imageType: readEnum(input.imageType, 'Image type', imageTypes, 'GALLERY'),
    sortOrder: readInteger(input.sortOrder, 'Sort order', 0, 100000, 0)
  };
}

export function validateImagePatch(current, input) {
  assertObject(input, 'Request body');
  assertHasField(input, ['imageUrl', 'imageType', 'sortOrder'], 'At least one image field is required');

  return validateImageCreate({
    imageUrl: Object.hasOwn(input, 'imageUrl') ? input.imageUrl : current.imageUrl,
    imageType: Object.hasOwn(input, 'imageType') ? input.imageType : current.imageType,
    sortOrder: Object.hasOwn(input, 'sortOrder') ? input.sortOrder : current.sortOrder
  });
}

export function validateCategoryCreate(input) {
  assertObject(input, 'Request body');

  return {
    name: readText(input.name, 'Category name', 100, true),
    description: readText(input.description, 'Description', 500, false),
    imageUrl: readOptionalImageUrl(input.imageUrl),
    status: readEnum(input.status, 'Status', categoryStatuses, 'ACTIVE')
  };
}

export function validateCategoryPatch(current, input) {
  assertObject(input, 'Request body');
  assertHasField(
    input,
    ['name', 'description', 'imageUrl', 'status'],
    'At least one category field is required'
  );

  return validateCategoryCreate({
    name: Object.hasOwn(input, 'name') ? input.name : current.name,
    description: Object.hasOwn(input, 'description')
      ? input.description
      : current.description,
    imageUrl: Object.hasOwn(input, 'imageUrl') ? input.imageUrl : current.imageUrl,
    status: Object.hasOwn(input, 'status') ? input.status : current.status
  });
}

function assertObject(value, fieldName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, `${fieldName} must be an object`);
  }
}

function assertHasField(input, fields, message) {
  if (!fields.some(field => Object.hasOwn(input, field))) {
    throw new HttpError(400, message);
  }
}

function readText(value, fieldName, maxLength, required) {
  if (value === undefined || value === null) {
    if (required) {
      throw new HttpError(400, `${fieldName} is required`);
    }
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    if (required) {
      throw new HttpError(400, `${fieldName} is required`);
    }
    return null;
  }

  if (text.length > maxLength) {
    throw new HttpError(400, `${fieldName} must be at most ${maxLength} characters`);
  }

  return text;
}

function readPhone(value) {
  const phone = readText(value, 'Phone', 20, false);
  if (phone && !/^[0-9+().\-\s]{8,20}$/.test(phone)) {
    throw new HttpError(400, 'Phone is invalid');
  }
  return phone;
}

function readEmail(value) {
  const email = readText(value, 'Email', 150, false)?.toLowerCase() ?? null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'Email is invalid');
  }
  return email;
}

function readImageUrl(value) {
  const imageUrl = readText(value, 'Image URL', 500, true);
  if (!/^(https?:\/\/|\/)/i.test(imageUrl)) {
    throw new HttpError(400, 'Image URL must be an HTTP(S) URL or an absolute path');
  }
  return imageUrl;
}

function readOptionalImageUrl(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  return readImageUrl(value);
}

function readCoordinate(value, fieldName, minimum, maximum) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return readDecimal(value, fieldName, minimum, maximum);
}

function readDecimal(value, fieldName, minimum, maximum, fallback) {
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new HttpError(400, `${fieldName} is required`);
  }

  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw new HttpError(400, `${fieldName} must be between ${minimum} and ${maximum}`);
  }
  return number;
}

function readInteger(value, fieldName, minimum, maximum, fallback) {
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new HttpError(400, `${fieldName} is required`);
  }

  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new HttpError(400, `${fieldName} must be an integer from ${minimum} to ${maximum}`);
  }
  return number;
}

function readPositiveInteger(value, fieldName) {
  return readInteger(value, fieldName, 1, Number.MAX_SAFE_INTEGER);
}

function readNullablePositiveInteger(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return readPositiveInteger(value, fieldName);
}

function readTime(value, fieldName, required = false) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new HttpError(400, `${fieldName} is required`);
    }
    return null;
  }

  const match = String(value).trim().match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) {
    throw new HttpError(400, `${fieldName} must use HH:mm or HH:mm:ss`);
  }
  return `${match[1]}:${match[2]}:${match[3] ?? '00'}`;
}

function readEnum(value, fieldName, allowedValues, fallback) {
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new HttpError(400, `${fieldName} is required`);
  }

  const normalized = String(value).trim().toUpperCase();
  if (!allowedValues.has(normalized)) {
    throw new HttpError(400, `${fieldName} is invalid`);
  }
  return normalized;
}

function readBoolean(value, fallback, fieldName) {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 1 || value === '1' || value === 'true') {
    return true;
  }
  if (value === 0 || value === '0' || value === 'false') {
    return false;
  }
  throw new HttpError(400, `${fieldName} must be true or false`);
}
