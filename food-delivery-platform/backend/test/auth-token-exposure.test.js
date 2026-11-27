import assert from 'node:assert/strict';
import test from 'node:test';

delete process.env.AUTH_EXPOSE_TOKENS;
const { env } = await import('../src/shared/config/env.js');
const { authRepository } = await import('../src/modules/auth/auth.repository.js');
const { authService } = await import('../src/modules/auth/auth.service.js');

const account = { id: 7, email: 'a@example.com', status: 'ACTIVE', emailVerifiedAt: null };

test('mặc định không trả mã đặt lại hay mã xác minh trong phản hồi', async t => {
  assert.equal(env.auth.exposeAuthTokens, false);
  t.mock.method(authRepository, 'findUserByEmail', async () => account);
  const saved = [];
  t.mock.method(authRepository, 'addPasswordResetToken', async input => saved.push(input));
  t.mock.method(authRepository, 'addEmailVerificationToken', async input => saved.push(input));

  const reset = await authService.requestPasswordReset({ email: account.email });
  const verify = await authService.requestEmailVerification({ email: account.email });

  assert.equal(saved.length, 2);
  assert.deepEqual(Object.keys(reset), ['message']);
  assert.deepEqual(Object.keys(verify), ['message']);
});
