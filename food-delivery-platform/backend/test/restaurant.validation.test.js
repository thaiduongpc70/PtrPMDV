import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateAdminRestaurantCreate,
  validateAdminRestaurantState,
  validateCategoryCreate,
  validateCategoryPatch,
  validateImageCreate,
  validateImagePatch,
  validateOperatingHours,
  validateRestaurantPatch,
  validateRestaurantProfile
} from '../src/modules/restaurants/restaurant.validation.js';

const validProfile = {
  categoryId: 1,
  name: 'Bep Nha Duong',
  description: 'Mon Viet moi ngay',
  phone: '0901 234 567',
  email: 'BEP@example.com',
  address: '12 Nguyen Trai',
  ward: 'Phuong 1',
  district: 'Quan 1',
  city: 'Ho Chi Minh',
  latitude: 10.762622,
  longitude: 106.660172,
  openingTime: '07:00',
  closingTime: '22:30',
  minimumOrder: 30000,
  averagePrepareTime: 25
};

test('restaurant profile normalizes values for SQL', () => {
  const result = validateRestaurantProfile(validProfile);

  assert.equal(result.name, 'Bep Nha Duong');
  assert.equal(result.email, 'bep@example.com');
  assert.equal(result.openingTime, '07:00:00');
  assert.equal(result.closingTime, '22:30:00');
  assert.equal(result.minimumOrder, 30000);
});

test('restaurant profile accepts a schedule that crosses midnight', () => {
  const result = validateRestaurantProfile({
    ...validProfile,
    openingTime: '18:00',
    closingTime: '02:00'
  });

  assert.equal(result.openingTime, '18:00:00');
  assert.equal(result.closingTime, '02:00:00');
});

test('restaurant profile requires opening and closing time together', () => {
  assertBadRequest(
    () => validateRestaurantProfile({
      ...validProfile,
      closingTime: null
    }),
    'provided together'
  );
});

test('restaurant profile validates coordinates and money', () => {
  assertBadRequest(
    () => validateRestaurantProfile({ ...validProfile, latitude: 91 }),
    'Latitude'
  );
  assertBadRequest(
    () => validateRestaurantProfile({ ...validProfile, minimumOrder: -1 }),
    'Minimum order'
  );
});

test('restaurant patch preserves fields that were not sent', () => {
  const current = validateRestaurantProfile(validProfile);
  const result = validateRestaurantPatch(current, { name: 'Bep Nha Duong 2' });

  assert.equal(result.name, 'Bep Nha Duong 2');
  assert.equal(result.address, current.address);
  assert.equal(result.minimumOrder, current.minimumOrder);
});

test('restaurant patch rejects an empty body', () => {
  const current = validateRestaurantProfile(validProfile);
  assertBadRequest(
    () => validateRestaurantPatch(current, {}),
    'At least one restaurant field'
  );
});

test('admin restaurant create requires a positive restaurant owner id', () => {
  const result = validateAdminRestaurantCreate({
    ...validProfile,
    ownerUserId: 8,
    status: 'active',
    commissionRate: 15
  });
  assert.equal(result.ownerUserId, 8);
  assert.equal(result.status, 'ACTIVE');
  assert.equal(result.commissionRate, 15);

  assertBadRequest(
    () => validateAdminRestaurantCreate({ ...validProfile, ownerUserId: 0 }),
    'Owner user id'
  );
});

test('admin state update preserves an omitted field', () => {
  const result = validateAdminRestaurantState(
    { status: 'PENDING', commissionRate: 10 },
    { status: 'ACTIVE' }
  );
  assert.deepEqual(result, { status: 'ACTIVE', commissionRate: 10 });
});

test('admin state update validates commission range', () => {
  assertBadRequest(
    () => validateAdminRestaurantState(
      { status: 'ACTIVE', commissionRate: 10 },
      { commissionRate: 101 }
    ),
    'Commission rate'
  );
});

test('operating hours require every day exactly once', () => {
  const result = validateOperatingHours({
    operatingHours: createWeek()
  });

  assert.equal(result.length, 7);
  assert.equal(result[0].dayOfWeek, 1);
  assert.equal(result[6].dayOfWeek, 7);
  assert.equal(result[6].isClosed, true);
  assert.equal(result[6].openTime, null);
});

test('operating hours reject duplicated days', () => {
  const week = createWeek();
  week[6] = { ...week[5] };
  assertBadRequest(
    () => validateOperatingHours({ operatingHours: week }),
    'duplicated'
  );
});

test('operating hours reject an incomplete week', () => {
  assertBadRequest(
    () => validateOperatingHours({ operatingHours: createWeek().slice(0, 6) }),
    'all 7 days'
  );
});

test('open operating day requires valid times', () => {
  const week = createWeek();
  week[0] = { dayOfWeek: 1, isClosed: false, openTime: '25:00', closeTime: '22:00' };
  assertBadRequest(
    () => validateOperatingHours({ operatingHours: week }),
    'Open time'
  );
});

test('image validation accepts HTTPS URLs and upload paths', () => {
  assert.deepEqual(
    validateImageCreate({ imageUrl: 'https://cdn.example.com/a.jpg', imageType: 'logo' }),
    {
      imageUrl: 'https://cdn.example.com/a.jpg',
      imageType: 'LOGO',
      sortOrder: 0
    }
  );
  assert.equal(
    validateImageCreate({ imageUrl: '/uploads/restaurants/a.jpg' }).imageType,
    'GALLERY'
  );
});

test('image validation rejects unsupported paths and types', () => {
  assertBadRequest(
    () => validateImageCreate({ imageUrl: 'images/a.jpg' }),
    'HTTP\\(S\\) URL'
  );
  assertBadRequest(
    () => validateImageCreate({ imageUrl: '/a.jpg', imageType: 'AVATAR' }),
    'Image type'
  );
});

test('image patch keeps existing image values', () => {
  const result = validateImagePatch(
    {
      imageUrl: '/uploads/restaurants/old.jpg',
      imageType: 'GALLERY',
      sortOrder: 2
    },
    { sortOrder: 3 }
  );
  assert.equal(result.imageUrl, '/uploads/restaurants/old.jpg');
  assert.equal(result.sortOrder, 3);
});

test('category create normalizes status and nullable fields', () => {
  const result = validateCategoryCreate({ name: 'Mon Han', status: 'inactive' });
  assert.deepEqual(result, {
    name: 'Mon Han',
    description: null,
    imageUrl: null,
    status: 'INACTIVE'
  });
});

test('category patch preserves values and rejects empty requests', () => {
  const current = {
    name: 'Mon Viet',
    description: 'Com va bun',
    imageUrl: '/categories/viet.jpg',
    status: 'ACTIVE'
  };
  const result = validateCategoryPatch(current, { description: null });
  assert.equal(result.name, current.name);
  assert.equal(result.description, null);

  assertBadRequest(() => validateCategoryPatch(current, {}), 'At least one category field');
});

function createWeek() {
  return Array.from({ length: 7 }, (_, index) => ({
    dayOfWeek: index + 1,
    isClosed: index === 6,
    openTime: index === 6 ? null : '07:00',
    closeTime: index === 6 ? null : '22:00'
  }));
}

function assertBadRequest(work, messagePart) {
  assert.throws(work, error => {
    assert.equal(error.statusCode, 400);
    assert.match(error.message, new RegExp(messagePart, 'i'));
    return true;
  });
}
