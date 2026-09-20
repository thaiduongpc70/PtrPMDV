import assert from 'node:assert/strict';
import test from 'node:test';
import { customerRepository } from '../src/modules/customers/customer.repository.js';
import { customerService } from '../src/modules/customers/customer.service.js';

test('customer profile update preserves omitted fields and records audit delta', async t => {
  let updatePayload;
  stubRepository(t, {
    async findProfileByUserId(userId) {
      assert.equal(userId, 7);
      return profileFixture();
    },
    async updateProfileForUser(userId, input) {
      updatePayload = { userId, input };
      return {
        before: profileFixture(),
        after: profileFixture({
          fullName: 'Duong Nguyen 2',
          avatarUrl: '/avatars/duong.png'
        })
      };
    }
  });

  const result = await customerService.updateProfile(7, {
    fullName: 'Duong Nguyen 2',
    avatarUrl: '/avatars/duong.png'
  });

  assert.equal(updatePayload.input.phone, '0901234567');
  assert.equal(updatePayload.input.gender, 'MALE');
  assert.equal(result.profile.fullName, 'Duong Nguyen 2');
  assert.equal(result.audit.oldValues.fullName, 'Duong Nguyen');
  assert.equal(result.audit.newValues.avatarUrl, '/avatars/duong.png');
});

test('customer profile update validates phone, gender, and avatar URL', async t => {
  stubRepository(t, {
    async findProfileByUserId() {
      return profileFixture();
    }
  });

  await assertHttpError(
    () => customerService.updateProfile(7, { phone: 'abc' }),
    400,
    'Phone'
  );
  await assertHttpError(
    () => customerService.updateProfile(7, { gender: 'UNKNOWN' }),
    400,
    'Gender'
  );
  await assertHttpError(
    () => customerService.updateProfile(7, { avatarUrl: 'avatars/a.png' }),
    400,
    'Avatar URL'
  );
});

test('customer profile update maps duplicate phone to conflict', async t => {
  stubRepository(t, {
    async findProfileByUserId() {
      return profileFixture();
    },
    async updateProfileForUser() {
      const error = new Error('duplicate');
      error.code = 'ER_DUP_ENTRY';
      throw error;
    }
  });

  await assertHttpError(
    () => customerService.updateProfile(7, { phone: '0909999999' }),
    409,
    'Phone'
  );
});

function stubRepository(t, methods) {
  const originals = new Map();

  for (const [name, implementation] of Object.entries(methods)) {
    originals.set(name, customerRepository[name]);
    customerRepository[name] = implementation;
  }

  t.after(() => {
    for (const [name, original] of originals.entries()) {
      customerRepository[name] = original;
    }
  });
}

function profileFixture(overrides = {}) {
  return {
    userId: 7,
    username: 'duong',
    email: 'duong@example.com',
    phone: '0901234567',
    avatarUrl: null,
    status: 'ACTIVE',
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    customerId: 5,
    fullName: 'Duong Nguyen',
    dateOfBirth: '2000-01-01',
    gender: 'MALE',
    loyaltyPoints: 0,
    totalOrders: 0,
    totalSpent: 0,
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-09-15T00:00:00.000Z',
    ...overrides
  };
}

async function assertHttpError(work, statusCode, messagePart) {
  await assert.rejects(work, error => {
    assert.equal(error.statusCode, statusCode);
    assert.match(error.message, new RegExp(messagePart, 'i'));
    return true;
  });
}
