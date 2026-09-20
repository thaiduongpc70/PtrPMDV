import assert from 'node:assert/strict';
import test from 'node:test';
import { restaurantRepository } from '../src/modules/restaurants/restaurant.repository.js';
import { restaurantService } from '../src/modules/restaurants/restaurant.service.js';

const validProfileInput = {
  ownerUserId: 7,
  categoryId: 3,
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
  averagePrepareTime: 25,
  commissionRate: 15,
  status: 'active'
};

test('admin restaurant creation validates input, reloads detail, and returns audit values', async t => {
  let createPayload;
  stubRepository(t, {
    async createForAdmin(input) {
      createPayload = input;
      return { restaurantId: 11 };
    },
    async findForAdmin(restaurantId) {
      assert.equal(restaurantId, 11);
      return restaurantFixture({ id: restaurantId, status: 'ACTIVE' });
    }
  });

  const result = await restaurantService.createForAdmin(validProfileInput);

  assert.equal(createPayload.email, 'bep@example.com');
  assert.equal(createPayload.openingTime, '07:00:00');
  assert.equal(createPayload.status, 'ACTIVE');
  assert.equal(result.restaurant.id, 11);
  assert.equal(result.audit.oldValues, null);
  assert.equal(result.audit.newValues.name, 'Bep Nha Duong');
});

test('admin restaurant creation maps owner and category failures to bad requests', async t => {
  let response = { error: 'OWNER_NOT_FOUND' };
  stubRepository(t, {
    async createForAdmin() {
      return response;
    }
  });

  await assertHttpError(
    () => restaurantService.createForAdmin(validProfileInput),
    400,
    'owner account'
  );

  response = { error: 'CATEGORY_NOT_FOUND' };
  await assertHttpError(
    () => restaurantService.createForAdmin(validProfileInput),
    400,
    'category'
  );
});

test('restaurant owner replaces operating hours with ownership check and audit delta', async t => {
  const before = [
    { dayOfWeek: 1, openTime: '08:00:00', closeTime: '20:00:00', isClosed: false }
  ];
  let replacePayload;
  stubRepository(t, {
    async findForOwner(userId, restaurantId) {
      assert.equal(userId, 7);
      assert.equal(restaurantId, 11);
      return restaurantFixture({ id: restaurantId, ownerUserId: userId });
    },
    async replaceOperatingHours(userId, restaurantId, operatingHours) {
      replacePayload = { userId, restaurantId, operatingHours };
      return { before, after: operatingHours };
    }
  });

  const result = await restaurantService.replaceOperatingHours(
    7,
    11,
    { operatingHours: createWeek() }
  );

  assert.equal(replacePayload.operatingHours.length, 7);
  assert.equal(replacePayload.operatingHours[0].openTime, '07:00:00');
  assert.deepEqual(result.audit.oldValues, { restaurantId: 11, operatingHours: before });
  assert.equal(result.audit.newValues.operatingHours[6].isClosed, true);
});

test('restaurant image creation rejects duplicate logo/cover images', async t => {
  stubRepository(t, {
    async findForOwner() {
      return restaurantFixture({ id: 11, ownerUserId: 7 });
    },
    async addImage() {
      return { error: 'IMAGE_TYPE_EXISTS', imageType: 'LOGO' };
    }
  });

  await assertHttpError(
    () => restaurantService.addImage(7, 11, {
      imageUrl: '/uploads/restaurants/logo.png',
      imageType: 'LOGO'
    }),
    409,
    'LOGO'
  );
});

test('category removal deactivates the category instead of deleting source data', async t => {
  let deactivatedId;
  const category = {
    id: 3,
    name: 'Mon Viet',
    description: 'Com va bun',
    imageUrl: '/categories/viet.png',
    status: 'ACTIVE',
    createdAt: '2026-09-20T00:00:00.000Z',
    updatedAt: '2026-09-20T00:00:00.000Z'
  };
  stubRepository(t, {
    async findCategoryById(categoryId) {
      assert.equal(categoryId, 3);
      return category;
    },
    async deactivateCategory(categoryId) {
      deactivatedId = categoryId;
      return true;
    }
  });

  const result = await restaurantService.removeCategory(3);

  assert.equal(deactivatedId, 3);
  assert.equal(result.audit.oldValues.status, 'ACTIVE');
  assert.equal(result.audit.newValues.status, 'INACTIVE');
});

function stubRepository(t, methods) {
  const originals = new Map();

  for (const [name, implementation] of Object.entries(methods)) {
    originals.set(name, restaurantRepository[name]);
    restaurantRepository[name] = implementation;
  }

  t.after(() => {
    for (const [name, original] of originals.entries()) {
      restaurantRepository[name] = original;
    }
  });
}

function restaurantFixture(overrides = {}) {
  return {
    id: 11,
    ownerUserId: 7,
    ownerUsername: 'restaurant_owner',
    ownerEmail: 'owner@example.com',
    categoryId: 3,
    categoryName: 'Mon Viet',
    name: 'Bep Nha Duong',
    description: 'Mon Viet moi ngay',
    phone: '0901 234 567',
    email: 'bep@example.com',
    address: '12 Nguyen Trai',
    ward: 'Phuong 1',
    district: 'Quan 1',
    city: 'Ho Chi Minh',
    latitude: 10.762622,
    longitude: 106.660172,
    openingTime: '07:00:00',
    closingTime: '22:30:00',
    minimumOrder: 30000,
    averagePrepareTime: 25,
    rating: 0,
    totalReviews: 0,
    totalOrders: 0,
    totalRevenue: 0,
    commissionRate: 15,
    status: 'ACTIVE',
    createdAt: '2026-09-20T00:00:00.000Z',
    updatedAt: '2026-09-20T00:00:00.000Z',
    operatingHours: [],
    images: [],
    ...overrides
  };
}

function createWeek() {
  return Array.from({ length: 7 }, (_, index) => ({
    dayOfWeek: index + 1,
    isClosed: index === 6,
    openTime: index === 6 ? null : '07:00',
    closeTime: index === 6 ? null : '22:00'
  }));
}

async function assertHttpError(work, statusCode, messagePart) {
  await assert.rejects(work, error => {
    assert.equal(error.statusCode, statusCode);
    assert.match(error.message, new RegExp(messagePart, 'i'));
    return true;
  });
}
