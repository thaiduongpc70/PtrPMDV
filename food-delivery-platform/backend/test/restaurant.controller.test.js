import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createRestaurantCategory,
  deleteOwnedRestaurant,
  listPublicRestaurantCategories,
  updateOwnedRestaurant
} from '../src/modules/restaurants/restaurant.controller.js';
import { restaurantService } from '../src/modules/restaurants/restaurant.service.js';

test('public category endpoint returns items and records audit metadata', async t => {
  const category = {
    id: 3,
    name: 'Mon Viet',
    description: null,
    imageUrl: null,
    status: 'ACTIVE'
  };
  stubService(t, {
    async listPublicCategories() {
      return [category];
    }
  });

  const { req, res } = await invoke(listPublicRestaurantCategories);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { items: [category], totalItems: 1 });
  assert.equal(req.auditAction, 'RESTAURANT_CATEGORY_LIST');
  assert.equal(req.auditEntityType, 'RESTAURANT_CATEGORY');
});

test('owner update endpoint passes the authenticated owner and writes mutation audit fields', async t => {
  let updateArgs;
  const restaurant = {
    id: 11,
    name: 'Bep Nha Duong 2',
    status: 'ACTIVE'
  };
  stubService(t, {
    async updateOwned(userId, restaurantId, body) {
      updateArgs = { userId, restaurantId, body };
      return {
        restaurant,
        audit: {
          oldValues: { id: restaurantId, name: 'Bep Nha Duong' },
          newValues: { id: restaurantId, name: restaurant.name }
        }
      };
    }
  });

  const { req, res } = await invoke(updateOwnedRestaurant, {
    user: { id: 7 },
    params: { restaurantId: '11' },
    body: { name: 'Bep Nha Duong 2' }
  });

  assert.deepEqual(updateArgs, {
    userId: 7,
    restaurantId: 11,
    body: { name: 'Bep Nha Duong 2' }
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, restaurant);
  assert.equal(req.auditAction, 'RESTAURANT_UPDATE');
  assert.equal(req.auditEntityType, 'RESTAURANT');
  assert.equal(req.auditEntityId, 11);
  assert.equal(req.auditOldValues.name, 'Bep Nha Duong');
  assert.equal(req.auditNewValues.name, 'Bep Nha Duong 2');
});

test('owner delete endpoint responds 204 and records soft-delete audit', async t => {
  stubService(t, {
    async removeOwned(userId, restaurantId) {
      assert.equal(userId, 7);
      assert.equal(restaurantId, 11);
      return {
        audit: {
          oldValues: { id: restaurantId, status: 'ACTIVE' },
          newValues: { id: restaurantId, status: 'INACTIVE', deleted: true }
        }
      };
    }
  });

  const { req, res } = await invoke(deleteOwnedRestaurant, {
    user: { id: 7 },
    params: { restaurantId: '11' }
  });

  assert.equal(res.statusCode, 204);
  assert.equal(req.auditAction, 'RESTAURANT_DELETE');
  assert.equal(req.auditNewValues.deleted, true);
});

test('admin category creation responds 201 and records created category audit', async t => {
  const category = {
    id: 4,
    name: 'Mon Han',
    description: null,
    imageUrl: null,
    status: 'ACTIVE'
  };
  stubService(t, {
    async createCategory(body) {
      assert.deepEqual(body, { name: 'Mon Han' });
      return {
        category,
        audit: { oldValues: null, newValues: category }
      };
    }
  });

  const { req, res } = await invoke(createRestaurantCategory, {
    user: { id: 1 },
    body: { name: 'Mon Han' }
  });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body, category);
  assert.equal(req.auditAction, 'ADMIN_RESTAURANT_CATEGORY_CREATE');
  assert.equal(req.auditEntityType, 'RESTAURANT_CATEGORY');
  assert.equal(req.auditEntityId, 4);
  assert.equal(req.auditOldValues, null);
  assert.equal(req.auditNewValues.name, 'Mon Han');
});

function stubService(t, methods) {
  const originals = new Map();

  for (const [name, implementation] of Object.entries(methods)) {
    originals.set(name, restaurantService[name]);
    restaurantService[name] = implementation;
  }

  t.after(() => {
    for (const [name, original] of originals.entries()) {
      restaurantService[name] = original;
    }
  });
}

async function invoke(handler, request = {}) {
  const req = {
    params: {},
    query: {},
    body: {},
    user: null,
    ...request
  };

  let settle;
  const completed = new Promise((resolve, reject) => {
    settle = { resolve, reject };
  });

  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      settle.resolve();
      return this;
    },
    send(body) {
      this.body = body;
      settle.resolve();
      return this;
    }
  };

  handler(req, res, error => {
    if (error) {
      settle.reject(error);
      return;
    }
    settle.resolve();
  });

  await completed;
  return { req, res };
}
