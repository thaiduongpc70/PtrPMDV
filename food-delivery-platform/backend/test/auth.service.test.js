import assert from 'node:assert/strict';
import test from 'node:test';
import { authRepository } from '../src/modules/auth/auth.repository.js';
import { authService } from '../src/modules/auth/auth.service.js';
import { verifyPassword } from '../src/shared/security/password.js';
import { hashRefreshToken } from '../src/shared/security/token.js';

test('password reset request creates a hashed token for an active account', async t => {
  let storedToken;
  stubRepository(t, {
    async findUserByEmail(email) {
      assert.equal(email, 'duong@example.com');
      return userFixture({ email });
    },
    async addPasswordResetToken(input) {
      storedToken = input;
    }
  });

  const result = await authService.requestPasswordReset({ email: ' DUONG@example.com ' });

  assert.equal(storedToken.userId, 7);
  assert.notEqual(storedToken.tokenHash, result.resetToken);
  assert.equal(storedToken.tokenHash, hashRefreshToken(result.resetToken));
  assert.ok(result.expiresAt instanceof Date);
});

test('password reset response stays generic when email is unknown', async t => {
  stubRepository(t, {
    async findUserByEmail() {
      return null;
    }
  });

  const result = await authService.requestPasswordReset({ email: 'none@example.com' });

  assert.deepEqual(result, {
    message: 'If the email exists, a password reset token has been created'
  });
});

test('password reset updates hash, marks token used, and revokes sessions', async t => {
  const token = 'reset-token';
  let passwordHash;
  let usedTokenHash;
  let revokedUserId;
  stubRepository(t, {
    async findPasswordResetToken(tokenHash) {
      assert.equal(tokenHash, hashRefreshToken(token));
      return {
        user_id: 7,
        expires_at: new Date(Date.now() + 60_000),
        used_at: null
      };
    },
    async findUserById(userId) {
      return userFixture({ id: userId });
    },
    async updatePasswordHash(userId, nextHash) {
      assert.equal(userId, 7);
      passwordHash = nextHash;
    },
    async markPasswordResetTokenUsed(tokenHash) {
      usedTokenHash = tokenHash;
      return true;
    },
    async revokeRefreshTokensForUser(userId) {
      revokedUserId = userId;
    }
  });

  const result = await authService.resetPassword({
    token,
    password: 'new-secure-password'
  });

  assert.equal(result.message, 'Password has been reset');
  assert.equal(usedTokenHash, hashRefreshToken(token));
  assert.equal(revokedUserId, 7);
  assert.equal(await verifyPassword('new-secure-password', passwordHash), true);
});

test('password reset rejects when token consumption loses a race', async t => {
  const token = 'reset-token';
  let updatedPassword = false;
  stubRepository(t, {
    async findPasswordResetToken() {
      return {
        user_id: 7,
        expires_at: new Date(Date.now() + 60_000),
        used_at: null
      };
    },
    async findUserById(userId) {
      return userFixture({ id: userId });
    },
    async markPasswordResetTokenUsed() {
      return false;
    },
    async updatePasswordHash() {
      updatedPassword = true;
    }
  });

  await assert.rejects(
    () => authService.resetPassword({ token, password: 'new-secure-password' }),
    error => {
      assert.equal(error.statusCode, 401);
      assert.equal(error.message, 'Invalid password reset token');
      return true;
    }
  );
  assert.equal(updatedPassword, false);
});

test('email verification request skips already verified accounts', async t => {
  stubRepository(t, {
    async findUserByEmail() {
      return userFixture({ emailVerifiedAt: new Date() });
    }
  });

  const result = await authService.requestEmailVerification({
    email: 'duong@example.com'
  });

  assert.deepEqual(result, {
    message: 'If the email exists, a verification token has been created'
  });
});

test('email verification confirms token and returns the public user', async t => {
  const token = 'verify-token';
  let verifiedTokenHash;
  let verifiedUserId;
  stubRepository(t, {
    async findEmailVerificationToken(tokenHash) {
      assert.equal(tokenHash, hashRefreshToken(token));
      return {
        user_id: 7,
        expires_at: new Date(Date.now() + 60_000),
        verified_at: null
      };
    },
    async markEmailVerificationTokenVerified(tokenHash) {
      verifiedTokenHash = tokenHash;
      return true;
    },
    async markUserEmailVerified(userId) {
      verifiedUserId = userId;
    },
    async findUserById(userId) {
      return userFixture({
        id: userId,
        emailVerifiedAt: new Date('2026-09-16T00:00:00.000Z')
      });
    }
  });

  const result = await authService.verifyEmail(token);

  assert.equal(verifiedTokenHash, hashRefreshToken(token));
  assert.equal(verifiedUserId, 7);
  assert.equal(result.message, 'Email has been verified');
  assert.equal(result.user.id, 7);
  assert.ok(result.user.emailVerifiedAt);
});

test('email verification rejects when token consumption loses a race', async t => {
  const token = 'verify-token';
  let markedUser = false;
  stubRepository(t, {
    async findEmailVerificationToken() {
      return {
        user_id: 7,
        expires_at: new Date(Date.now() + 60_000),
        verified_at: null
      };
    },
    async markEmailVerificationTokenVerified() {
      return false;
    },
    async markUserEmailVerified() {
      markedUser = true;
    }
  });

  await assert.rejects(
    () => authService.verifyEmail(token),
    error => {
      assert.equal(error.statusCode, 401);
      assert.equal(error.message, 'Invalid email verification token');
      return true;
    }
  );
  assert.equal(markedUser, false);
});

function stubRepository(t, methods) {
  const originals = new Map();

  for (const [name, implementation] of Object.entries(methods)) {
    originals.set(name, authRepository[name]);
    authRepository[name] = implementation;
  }

  t.after(() => {
    for (const [name, original] of originals.entries()) {
      authRepository[name] = original;
    }
  });
}

function userFixture(overrides = {}) {
  return {
    id: 7,
    roleId: 4,
    role: 'CUSTOMER',
    username: 'duong',
    email: 'duong@example.com',
    phone: '0901234567',
    passwordHash: 'old-hash',
    avatarUrl: null,
    status: 'ACTIVE',
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    lastLoginAt: null,
    createdAt: '2026-09-12T00:00:00.000Z',
    customerProfile: {
      id: 5,
      fullName: 'Duong Nguyen',
      dateOfBirth: null,
      gender: null,
      loyaltyPoints: 0,
      totalOrders: 0,
      totalSpent: 0
    },
    ...overrides
  };
}
