import assert from 'node:assert/strict';

const baseUrl = process.env.SMOKE_URL || 'http://localhost:3000';
const username = process.env.SMOKE_USER || 'thaiduongpc7';
const password = process.env.SMOKE_PASSWORD || 'duong2k5';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) }
  });
  const body = await response.json().catch(() => ({}));
  assert.equal(response.ok, true, `${path} failed: ${response.status} ${body.message ?? ''}`);
  return body;
}

const ready = await request('/health/ready');
assert.equal(ready.status, 'ready');
const login = await request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ emailOrUsername: username, password })
});
assert.ok(login.accessToken);
const me = await request('/api/auth/me', { headers: { Authorization: `Bearer ${login.accessToken}` } });
assert.equal(me.username, username);
const catalog = await request('/api/catalog/restaurants?pageSize=2');
assert.ok(Array.isArray(catalog.items));
console.log(JSON.stringify({ ready: ready.status, user: me.username, restaurants: catalog.totalItems }));
