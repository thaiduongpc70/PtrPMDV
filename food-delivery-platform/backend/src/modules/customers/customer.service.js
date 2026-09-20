import { HttpError } from '../../shared/http/http-error.js';
import { customerRepository } from './customer.repository.js';

const profileFields = [
  'fullName',
  'dateOfBirth',
  'gender',
  'phone',
  'avatarUrl'
];
const genders = new Set(['MALE', 'FEMALE', 'OTHER']);

export const customerService = {
  async getProfile(userId) {
    const profile = await customerRepository.findProfileByUserId(userId);

    if (!profile) {
      throw new HttpError(404, 'Customer profile not found');
    }

    return profile;
  },

  async updateProfile(userId, input) {
    const current = await this.getProfile(userId);
    const data = validateProfilePatch(current, input);

    let result;
    try {
      result = await customerRepository.updateProfileForUser(userId, data);
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new HttpError(409, 'Phone number already exists');
      }
      throw error;
    }

    if (!result?.after) {
      throw new HttpError(404, 'Customer profile not found');
    }

    return {
      profile: result.after,
      audit: {
        oldValues: toAuditProfile(result.before),
        newValues: toAuditProfile(result.after)
      }
    };
  }
};

function validateProfilePatch(current, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(400, 'Request body must be an object');
  }

  if (!profileFields.some(field => Object.hasOwn(input, field))) {
    throw new HttpError(400, 'At least one profile field is required');
  }

  return {
    fullName: Object.hasOwn(input, 'fullName')
      ? readText(input.fullName, 'Full name', 150, true)
      : current.fullName,
    dateOfBirth: Object.hasOwn(input, 'dateOfBirth')
      ? readDate(input.dateOfBirth)
      : current.dateOfBirth,
    gender: Object.hasOwn(input, 'gender')
      ? readGender(input.gender)
      : current.gender,
    phone: Object.hasOwn(input, 'phone')
      ? readPhone(input.phone)
      : current.phone,
    avatarUrl: Object.hasOwn(input, 'avatarUrl')
      ? readAvatarUrl(input.avatarUrl)
      : current.avatarUrl
  };
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

function readDate(value) {
  const text = readText(value, 'Date of birth', 10, false);
  if (!text) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new HttpError(400, 'Date of birth must use YYYY-MM-DD');
  }

  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new HttpError(400, 'Date of birth must use YYYY-MM-DD');
  }

  return text;
}

function readGender(value) {
  const gender = readText(value, 'Gender', 10, false)?.toUpperCase() ?? null;
  if (!gender) {
    return null;
  }

  if (!genders.has(gender)) {
    throw new HttpError(400, 'Gender must be MALE, FEMALE or OTHER');
  }

  return gender;
}

function readPhone(value) {
  const phone = readText(value, 'Phone', 20, false);
  if (phone && !/^[0-9+().\-\s]{8,20}$/.test(phone)) {
    throw new HttpError(400, 'Phone is invalid');
  }

  return phone;
}

function readAvatarUrl(value) {
  const avatarUrl = readText(value, 'Avatar URL', 500, false);
  if (!avatarUrl) {
    return null;
  }

  if (!/^(https?:\/\/|\/)/i.test(avatarUrl)) {
    throw new HttpError(400, 'Avatar URL must be an HTTP(S) URL or an absolute path');
  }

  return avatarUrl;
}

function toAuditProfile(profile) {
  return {
    userId: profile.userId,
    customerId: profile.customerId,
    fullName: profile.fullName,
    dateOfBirth: profile.dateOfBirth,
    gender: profile.gender,
    phone: profile.phone,
    avatarUrl: profile.avatarUrl
  };
}
