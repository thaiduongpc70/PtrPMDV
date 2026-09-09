import { HttpError } from '../../shared/http/http-error.js';
import { addressRepository } from './address.repository.js';

export const addressService = {
  async list(userId) {
    return addressRepository.listForUser(userId);
  },

  async get(userId, addressId) {
    const address = await addressRepository.findForUser(userId, addressId);

    if (!address) {
      throw new HttpError(404, 'Address not found');
    }

    return address;
  },

  async create(userId, input) {
    const data = validateAddressInput(input, false);
    const created = await addressRepository.createForUser(userId, data);

    if (!created) {
      throw new HttpError(404, 'Customer profile not found');
    }

    const address = await addressRepository.findForUser(userId, created.addressId);
    if (!address) {
      throw new HttpError(500, 'Address was not created correctly');
    }

    return {
      address,
      audit: {
        oldValues: null,
        newValues: toAuditAddress(address)
      }
    };
  },

  async update(userId, addressId, input) {
    const current = await addressRepository.findForUser(userId, addressId);

    if (!current) {
      throw new HttpError(404, 'Address not found');
    }

    const requestedIsDefault = input?.isDefault === undefined
      ? current.isDefault
      : input.isDefault;
    const nextIsDefault = current.isDefault && requestedIsDefault === false
      ? true
      : requestedIsDefault;
    const data = validateAddressInput({
      label: input?.label === undefined ? current.label : input.label,
      receiverName: input?.receiverName === undefined
        ? current.receiverName
        : input.receiverName,
      receiverPhone: input?.receiverPhone === undefined
        ? current.receiverPhone
        : input.receiverPhone,
      addressLine: input?.addressLine === undefined
        ? current.addressLine
        : input.addressLine,
      ward: input?.ward === undefined ? current.ward : input.ward,
      district: input?.district === undefined ? current.district : input.district,
      city: input?.city === undefined ? current.city : input.city,
      latitude: input?.latitude === undefined ? current.latitude : input.latitude,
      longitude: input?.longitude === undefined ? current.longitude : input.longitude,
      isDefault: nextIsDefault
    }, false);
    const updated = await addressRepository.updateForUser(userId, addressId, data);

    if (!updated?.after) {
      throw new HttpError(404, 'Address not found');
    }

    return {
      address: updated.after,
      audit: {
        oldValues: toAuditAddress(updated.before),
        newValues: toAuditAddress(updated.after)
      }
    };
  },

  async setDefault(userId, addressId) {
    const updated = await addressRepository.setDefaultForUser(userId, addressId);

    if (!updated?.after) {
      throw new HttpError(404, 'Address not found');
    }

    return {
      address: updated.after,
      audit: {
        oldValues: {
          address: toAuditAddress(updated.before),
          previousDefaultAddressId: updated.previousDefaultId
        },
        newValues: {
          address: toAuditAddress(updated.after),
          previousDefaultAddressId: updated.previousDefaultId
        }
      }
    };
  },

  async remove(userId, addressId) {
    const deleted = await addressRepository.deleteForUser(userId, addressId);

    if (!deleted) {
      throw new HttpError(404, 'Address not found');
    }

    return {
      audit: {
        oldValues: toAuditAddress(deleted.before),
        newValues: {
          deleted: true,
          replacementDefaultAddressId: deleted.replacementDefaultAddressId
        }
      }
    };
  }
};

function validateAddressInput(input, allowPartial) {
  const data = input ?? {};
  const result = {
    label: readText(data.label, 'Label', 50, false),
    receiverName: readText(data.receiverName, 'Receiver name', 150, true),
    receiverPhone: readPhone(data.receiverPhone),
    addressLine: readText(data.addressLine, 'Address line', 255, true),
    ward: readText(data.ward, 'Ward', 100, false),
    district: readText(data.district, 'District', 100, false),
    city: readText(data.city, 'City', 100, true),
    latitude: readCoordinate(data.latitude, 'Latitude', -90, 90),
    longitude: readCoordinate(data.longitude, 'Longitude', -180, 180),
    isDefault: readBoolean(data.isDefault, false)
  };

  if (allowPartial) {
    return result;
  }

  return result;
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
  const phone = readText(value, 'Receiver phone', 20, true);

  if (!/^[0-9+().\-\s]{8,20}$/.test(phone)) {
    throw new HttpError(400, 'Receiver phone is invalid');
  }

  return phone;
}

function readCoordinate(value, fieldName, minimum, maximum) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const coordinate = Number(value);

  if (!Number.isFinite(coordinate) || coordinate < minimum || coordinate > maximum) {
    throw new HttpError(400, `${fieldName} is invalid`);
  }

  return coordinate;
}

function readBoolean(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true' || value === 1 || value === '1') {
    return true;
  }

  if (value === 'false' || value === 0 || value === '0') {
    return false;
  }

  throw new HttpError(400, 'isDefault must be true or false');
}

function toAuditAddress(address) {
  return {
    id: address.id,
    customerId: address.customerId,
    label: address.label,
    receiverName: address.receiverName,
    receiverPhone: address.receiverPhone,
    addressLine: address.addressLine,
    ward: address.ward,
    district: address.district,
    city: address.city,
    latitude: address.latitude,
    longitude: address.longitude,
    isDefault: address.isDefault
  };
}
