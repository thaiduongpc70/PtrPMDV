import { asyncHandler } from '../../shared/http/async-handler.js';
import { HttpError } from '../../shared/http/http-error.js';
import { addressService } from './address.service.js';

export const listAddresses = asyncHandler(async (req, res) => {
  const items = await addressService.list(req.user.id);
  res.json({
    items,
    totalItems: items.length
  });
});

export const getAddress = asyncHandler(async (req, res) => {
  const addressId = readAddressId(req.params.addressId);
  const address = await addressService.get(req.user.id, addressId);

  req.auditEntityId = address.id;
  res.json(address);
});

export const createAddress = asyncHandler(async (req, res) => {
  const result = await addressService.create(req.user.id, req.body);
  applyAudit(req, result);

  res.status(201).json(result.address);
});

export const updateAddress = asyncHandler(async (req, res) => {
  const addressId = readAddressId(req.params.addressId);
  const result = await addressService.update(req.user.id, addressId, req.body);
  applyAudit(req, result);

  res.json(result.address);
});

export const setDefaultAddress = asyncHandler(async (req, res) => {
  const addressId = readAddressId(req.params.addressId);
  const result = await addressService.setDefault(req.user.id, addressId);
  applyAudit(req, result);

  res.json(result.address);
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const addressId = readAddressId(req.params.addressId);
  const result = await addressService.remove(req.user.id, addressId);
  applyAudit(req, result, addressId);

  res.status(204).send();
});

function applyAudit(req, result, fallbackEntityId = null) {
  req.auditUserId = req.user.id;
  req.auditEntityId = result.address?.id ?? fallbackEntityId;
  req.auditOldValues = result.audit.oldValues;
  req.auditNewValues = result.audit.newValues;
}

function readAddressId(value) {
  const addressId = Number(value);

  if (!Number.isInteger(addressId) || addressId <= 0) {
    throw new HttpError(400, 'Invalid address id');
  }

  return addressId;
}
