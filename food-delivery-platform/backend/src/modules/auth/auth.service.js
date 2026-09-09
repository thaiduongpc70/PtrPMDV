import { env } from '../../shared/config/env.js';
import { HttpError } from '../../shared/http/http-error.js';
import { hashPassword, verifyPassword } from '../../shared/security/password.js';
import {
  createAccessToken,
  createRefreshToken,
  getRefreshTokenExpiresAt,
  hashRefreshToken
} from '../../shared/security/token.js';
import { authRepository } from './auth.repository.js';

const validGenders = new Set(['MALE', 'FEMALE', 'OTHER']);

export const authService = {
  async registerCustomer(input) {
    const data = validateRegisterCustomer(input);
    const existing = await authRepository.findExistingAccount(data);

    if (existing) {
      throw new HttpError(409, getDuplicateMessage(existing, data));
    }

    const role = await authRepository.findRoleByName('CUSTOMER');
    if (!role) {
      throw new HttpError(500, 'Customer role is missing');
    }

    const passwordHash = await hashPassword(data.password);

    let created;
    try {
      created = await authRepository.createCustomerUser({
        ...data,
        roleId: Number(role.id),
        passwordHash
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new HttpError(409, 'Username, email or phone already exists');
      }

      throw error;
    }

    const user = await authRepository.findUserById(created.userId);
    if (!user) {
      throw new HttpError(500, 'Customer account was not created correctly');
    }

    const tokens = await issueTokens(user);

    return {
      user: toPublicUser(user),
      ...tokens
    };
  },

  async login(input) {
    const identifier = trim(input.emailOrUsername ?? input.email ?? input.username, 150);
    const password = String(input.password ?? '');

    if (!identifier || !password) {
      throw new HttpError(400, 'Email/username and password are required');
    }

    const user = await authRepository.findUserByEmailOrUsername(identifier);
    const isValidPassword = user
      ? await verifyPassword(password, user.passwordHash)
      : false;
    const success = Boolean(user && isValidPassword && user.status === 'ACTIVE');

    await authRepository.addLoginHistory({
      userId: user?.id ?? null,
      emailAttempted: identifier,
      ipAddress: trim(input.ipAddress, 45),
      userAgent: trim(input.userAgent, 1000),
      success
    });

    if (!user || !isValidPassword) {
      throw new HttpError(401, 'Invalid email/username or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new HttpError(403, `Account is ${user.status}`);
    }

    await authRepository.updateLastLogin(user.id);
    const freshUser = await authRepository.findUserById(user.id);
    const tokens = await issueTokens(freshUser);

    return {
      user: toPublicUser(freshUser),
      ...tokens
    };
  },

  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new HttpError(400, 'Refresh token is required');
    }

    const tokenHash = hashRefreshToken(refreshToken);
    const storedToken = await authRepository.findRefreshToken(tokenHash);

    if (!storedToken || storedToken.revoked_at) {
      throw new HttpError(401, 'Invalid refresh token');
    }

    if (new Date(storedToken.expires_at).getTime() <= Date.now()) {
      throw new HttpError(401, 'Refresh token expired');
    }

    const user = await authRepository.findUserById(Number(storedToken.user_id));
    if (!user || user.status !== 'ACTIVE') {
      throw new HttpError(401, 'Invalid refresh token');
    }

    await authRepository.revokeRefreshToken(tokenHash);
    const tokens = await issueTokens(user);

    return {
      user: toPublicUser(user),
      ...tokens
    };
  },

  async logout(refreshToken) {
    if (!refreshToken) {
      return;
    }

    await authRepository.revokeRefreshToken(hashRefreshToken(refreshToken));
  },

  async getCurrentUser(userId) {
    const user = await authRepository.findUserById(userId);

    if (!user || user.status !== 'ACTIVE') {
      throw new HttpError(401, 'User is no longer active');
    }

    return toPublicUser(user);
  }
};

async function issueTokens(user) {
  if (!user) {
    throw new HttpError(500, 'Could not create authentication token');
  }

  const accessToken = createAccessToken({
    sub: String(user.id),
    username: user.username,
    role: user.role
  });
  const refreshToken = createRefreshToken();
  const refreshTokenExpiresAt = getRefreshTokenExpiresAt();

  await authRepository.addRefreshToken({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: refreshTokenExpiresAt
  });

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresInSeconds: env.auth.accessTokenTtlSeconds,
    refreshTokenExpiresAt
  };
}

function validateRegisterCustomer(input) {
  const username = trim(input?.username, 100);
  const email = trim(input?.email, 150)?.toLowerCase();
  const phone = trim(input?.phone, 20);
  const password = String(input?.password ?? '');
  const fullName = trim(input?.fullName, 150);
  const dateOfBirth = normalizeDate(input?.dateOfBirth);
  const gender = normalizeGender(input?.gender);

  if (!username || !/^[a-zA-Z0-9_.-]{3,100}$/.test(username)) {
    throw new HttpError(400, 'Username must be 3-100 characters');
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'Valid email is required');
  }

  if (phone && !/^[0-9+().\-\s]{8,20}$/.test(phone)) {
    throw new HttpError(400, 'Phone number is invalid');
  }

  if (password.length < 8 || password.length > 72) {
    throw new HttpError(400, 'Password must be 8-72 characters');
  }

  if (!fullName) {
    throw new HttpError(400, 'Full name is required');
  }

  return {
    username,
    email,
    phone,
    password,
    fullName,
    dateOfBirth,
    gender
  };
}

function getDuplicateMessage(existing, data) {
  if (existing.username === data.username) {
    return 'Username already exists';
  }

  if (existing.email === data.email) {
    return 'Email already exists';
  }

  return 'Phone already exists';
}

function trim(value, maxLength) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function normalizeDate(value) {
  const text = trim(value, 10);
  if (!text) {
    return null;
  }

  if (!isValidDateOnly(text)) {
    throw new HttpError(400, 'Date of birth must use YYYY-MM-DD');
  }

  return text;
}

function isValidDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function normalizeGender(value) {
  const text = trim(value, 10)?.toUpperCase();

  if (!text) {
    return null;
  }

  if (!validGenders.has(text)) {
    throw new HttpError(400, 'Gender must be MALE, FEMALE or OTHER');
  }

  return text;
}

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    phoneVerifiedAt: user.phoneVerifiedAt,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    customerProfile: user.customerProfile
  };
}
