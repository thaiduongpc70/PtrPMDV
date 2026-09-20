import assert from 'node:assert/strict';
import test from 'node:test';
import { createPermissionMiddleware } from '../src/shared/middlewares/require-permission.middleware.js';

test('permission middleware grants access only when all required codes are present', async () => {
  const middleware = createPermissionMiddleware(
    async (sql, params) => {
      assert.match(sql, /COUNT\(DISTINCT p\.code\)/);
      assert.deepEqual(params, [7, 'restaurant.view', 'restaurant.update']);
      return [{ granted_count: 2 }];
    },
    'restaurant.view',
    'restaurant.update',
    'restaurant.view'
  );
  const next = createNext();

  await middleware({ user: { id: 7 } }, {}, next);

  assert.equal(next.error, null);
});

test('permission middleware denies authenticated users missing a permission', async () => {
  const middleware = createPermissionMiddleware(
    async () => [{ granted_count: 1 }],
    'restaurant.view',
    'restaurant.update'
  );
  const next = createNext();

  await middleware({ user: { id: 7 } }, {}, next);

  assert.equal(next.error.statusCode, 403);
  assert.equal(next.error.message, 'Permission denied');
});

test('permission middleware requires authentication before querying permissions', async () => {
  let queried = false;
  const middleware = createPermissionMiddleware(
    async () => {
      queried = true;
      return [];
    },
    'restaurant.view'
  );
  const next = createNext();

  await middleware({ user: null }, {}, next);

  assert.equal(queried, false);
  assert.equal(next.error.statusCode, 401);
});

test('permission middleware bypasses lookup when no permission code is required', async () => {
  let queried = false;
  const middleware = createPermissionMiddleware(async () => {
    queried = true;
    return [];
  });
  const next = createNext();

  await middleware({ user: { id: 7 } }, {}, next);

  assert.equal(queried, false);
  assert.equal(next.error, null);
});

function createNext() {
  function next(error = null) {
    next.error = error;
  }
  next.error = null;
  return next;
}
