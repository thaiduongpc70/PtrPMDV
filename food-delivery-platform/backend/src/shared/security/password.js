import { pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const pbkdf2Async = promisify(pbkdf2);
const algorithm = 'pbkdf2_sha256';
const iterations = 310000;
const keyLength = 32;
const digest = 'sha256';

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const derivedKey = await pbkdf2Async(password, salt, iterations, keyLength, digest);

  return [
    algorithm,
    iterations,
    salt,
    derivedKey.toString('base64url')
  ].join('$');
}

export async function verifyPassword(password, storedHash) {
  const parts = String(storedHash ?? '').split('$');

  if (parts.length !== 4 || parts[0] !== algorithm) {
    return false;
  }

  const parsedIterations = Number(parts[1]);
  const salt = parts[2];
  const expectedHash = Buffer.from(parts[3], 'base64url');

  if (!Number.isInteger(parsedIterations) || parsedIterations <= 0 || expectedHash.length === 0) {
    return false;
  }

  const actualHash = await pbkdf2Async(
    password,
    salt,
    parsedIterations,
    expectedHash.length,
    digest
  );

  return actualHash.length === expectedHash.length
    && timingSafeEqual(actualHash, expectedHash);
}
