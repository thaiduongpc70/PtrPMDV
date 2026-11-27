/* Client HTTP nhỏ cho các script chạy thật qua API (nạp thực đơn, mô phỏng hoạt động). */
export const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
export const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || 'duong2k5';

export class ApiError extends Error {
  constructor(method, path, status, body) {
    super(`${method} ${path} -> ${status} ${typeof body === 'string' ? body : JSON.stringify(body)}`.slice(0, 400));
    this.status = status;
    this.body = body;
  }
}

export async function api(method, path, { token, body, headers = {}, expect } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (response.status === 429 && attempt < 8) {
      await new Promise(resolve => setTimeout(resolve, 1000 + attempt * 500));
      continue;
    }
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    const ok = expect ? [].concat(expect).includes(response.status) : response.ok;
    if (!ok) throw new ApiError(method, path, response.status, data);
    return data;
  }
}

const sessions = new Map();

/** Đăng nhập và nhớ token; tự đăng nhập lại khi token sắp hết hạn (TTL mặc định 1 giờ). */
export async function tokenFor(username, password = DEFAULT_PASSWORD) {
  const cached = sessions.get(username);
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  const data = await api('POST', '/api/auth/login', { body: { username, password } });
  sessions.set(username, { token: data.accessToken, expiresAt: Date.now() + 45 * 60_000 });
  return data.accessToken;
}

export function forgetToken(username) {
  sessions.delete(username);
}

/** Chạy tối đa `limit` việc song song. */
export async function pool(items, limit, worker) {
  let index = 0;
  const results = new Array(items.length);
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  });
  await Promise.all(runners);
  return results;
}
