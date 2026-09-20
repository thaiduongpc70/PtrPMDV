import assert from 'node:assert/strict';
import test from 'node:test';
import { addressRepository } from '../src/modules/addresses/address.repository.js';
import { addressService } from '../src/modules/addresses/address.service.js';

test('creating the first customer address returns audit values', async t => {
  let createPayload;
  stubRepository(t, {
    async createForUser(userId, input) {
      createPayload = { userId, input };
      return { addressId: 31, customerId: 5, isDefault: true };
    },
    async findForUser(userId, addressId) {
      assert.equal(userId, 7);
      assert.equal(addressId, 31);
      return addressFixture({ id: addressId, isDefault: true });
    }
  });

  const result = await addressService.create(7, {
    label: 'Home',
    receiverName: 'Duong Nguyen',
    receiverPhone: '0901234567',
    addressLine: '12 Nguyen Trai',
    city: 'Ho Chi Minh',
    isDefault: true
  });

  assert.equal(createPayload.input.receiverName, 'Duong Nguyen');
  assert.equal(result.address.id, 31);
  assert.equal(result.audit.oldValues, null);
  assert.equal(result.audit.newValues.isDefault, true);
});

test('updating the only default address keeps it as default', async t => {
  let updatePayload;
  stubRepository(t, {
    async findForUser() {
      return addressFixture({ isDefault: true });
    },
    async updateForUser(userId, addressId, input) {
      updatePayload = { userId, addressId, input };
      return {
        before: addressFixture({ isDefault: true }),
        after: addressFixture({
          receiverName: 'Duong Nguyen 2',
          isDefault: true
        })
      };
    }
  });

  const result = await addressService.update(7, 31, {
    receiverName: 'Duong Nguyen 2',
    isDefault: false
  });

  assert.equal(updatePayload.input.isDefault, true);
  assert.equal(result.address.receiverName, 'Duong Nguyen 2');
  assert.equal(result.audit.oldValues.receiverName, 'Duong Nguyen');
  assert.equal(result.audit.newValues.receiverName, 'Duong Nguyen 2');
});

test('deleting a default address reports its replacement default id', async t => {
  stubRepository(t, {
    async deleteForUser(userId, addressId) {
      assert.equal(userId, 7);
      assert.equal(addressId, 31);
      return {
        before: addressFixture({ id: addressId, isDefault: true }),
        replacementDefaultAddressId: 32
      };
    }
  });

  const result = await addressService.remove(7, 31);

  assert.equal(result.audit.oldValues.id, 31);
  assert.deepEqual(result.audit.newValues, {
    deleted: true,
    replacementDefaultAddressId: 32
  });
});

function stubRepository(t, methods) {
  const originals = new Map();

  for (const [name, implementation] of Object.entries(methods)) {
    originals.set(name, addressRepository[name]);
    addressRepository[name] = implementation;
  }

  t.after(() => {
    for (const [name, original] of originals.entries()) {
      addressRepository[name] = original;
    }
  });
}

function addressFixture(overrides = {}) {
  return {
    id: 31,
    customerId: 5,
    label: 'Home',
    receiverName: 'Duong Nguyen',
    receiverPhone: '0901234567',
    addressLine: '12 Nguyen Trai',
    ward: null,
    district: null,
    city: 'Ho Chi Minh',
    latitude: null,
    longitude: null,
    isDefault: false,
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-09-15T00:00:00.000Z',
    ...overrides
  };
}
