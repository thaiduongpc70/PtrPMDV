import net from 'node:net';
import { env } from '../config/env.js';
import { logger } from '../observability/logger.js';

const memoryCache = new Map();
let redisUnavailableLogged = false;

export function responseCache({ ttlMs = 30_000, prefix = '' } = {}) {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    const key = `${prefix}:${req.originalUrl}`;
    getCacheEntry(key)
      .then(existing => {
        if (existing) {
          res.status(existing.status);
          for (const [header, value] of Object.entries(existing.headers)) res.setHeader(header, value);
          res.setHeader('X-Cache', existing.source === 'redis' ? 'HIT-REDIS' : 'HIT');
          res.send(deserializeBody(existing));
          return;
        }

        const originalSend = res.send.bind(res);
        res.send = body => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const entry = {
              body: serializeBody(body),
              status: res.statusCode,
              headers: { 'Content-Type': res.get('Content-Type') ?? 'application/json; charset=utf-8' },
              expiresAt: Date.now() + ttlMs
            };
            setCacheEntry(key, entry, ttlMs).catch(error => logRedisFallback(error));
            res.setHeader('X-Cache', 'MISS');
          }
          return originalSend(body);
        };
        next();
      })
      .catch(error => {
        logRedisFallback(error);
        next();
      });
  };
}

export async function invalidateResponseCache(prefix = '') {
  for (const key of memoryCache.keys()) {
    if (!prefix || key.startsWith(prefix)) memoryCache.delete(key);
  }
  if (!env.redis.url) return;
  try {
    const keys = await redisCommand(['KEYS', redisKey(`${prefix}*`)]);
    if (Array.isArray(keys) && keys.length) await redisCommand(['DEL', ...keys]);
  } catch (error) {
    logRedisFallback(error);
  }
}

export async function clearResponseCache() {
  memoryCache.clear();
  if (!env.redis.url) return;
  try {
    const keys = await redisCommand(['KEYS', redisKey('*')]);
    if (Array.isArray(keys) && keys.length) await redisCommand(['DEL', ...keys]);
  } catch (error) {
    logRedisFallback(error);
  }
}

export async function cacheStats() {
  if (!env.redis.url) return { backend: 'memory', entries: memoryCache.size };
  try {
    const keys = await redisCommand(['KEYS', redisKey('*')]);
    return { backend: 'redis', entries: Array.isArray(keys) ? keys.length : 0, memoryFallbackEntries: memoryCache.size };
  } catch (error) {
    logRedisFallback(error);
    return { backend: 'memory', entries: memoryCache.size, redisAvailable: false };
  }
}

async function getCacheEntry(key) {
  const existing = memoryCache.get(key);
  if (existing && existing.expiresAt > Date.now()) return { ...existing, source: 'memory' };
  if (existing) memoryCache.delete(key);
  if (!env.redis.url) return null;

  try {
    const raw = await redisCommand(['GET', redisKey(key)]);
    return raw ? { ...JSON.parse(raw), source: 'redis' } : null;
  } catch (error) {
    logRedisFallback(error);
    return null;
  }
}

async function setCacheEntry(key, entry, ttlMs) {
  memoryCache.set(key, entry);
  if (!env.redis.url) return;
  await redisCommand(['SETEX', redisKey(key), String(Math.max(1, Math.ceil(ttlMs / 1000))), JSON.stringify(entry)]);
}

function redisKey(key) {
  return `fd:response-cache:${key}`;
}

function serializeBody(body) {
  if (Buffer.isBuffer(body)) return { type: 'buffer', value: body.toString('base64') };
  if (typeof body === 'string') return { type: 'string', value: body };
  return { type: 'json', value: JSON.stringify(body ?? null) };
}

function deserializeBody(entry) {
  if (!entry?.body) return '';
  if (entry.body.type === 'buffer') return Buffer.from(entry.body.value, 'base64');
  if (entry.body.type === 'json') {
    try { return JSON.parse(entry.body.value); } catch { return entry.body.value; }
  }
  return entry.body.value;
}

function logRedisFallback(error) {
  if (redisUnavailableLogged) return;
  redisUnavailableLogged = true;
  logger.warn('cache.redis.unavailable', { errorMessage: error.message || error.code || error.name || 'Redis unavailable' });
}

async function redisCommand(args) {
  const url = new URL(env.redis.url);
  const host = url.hostname || 'localhost';
  const port = Number(url.port || 6379);
  const password = decodeURIComponent(url.password || '');
  const database = url.pathname && url.pathname !== '/' ? url.pathname.slice(1) : '';
  const commands = [];
  if (password) commands.push(['AUTH', password]);
  if (database) commands.push(['SELECT', database]);
  commands.push(args);

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let buffer = Buffer.alloc(0);
    let commandIndex = 0;
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('Redis command timed out'));
    }, 500);

    socket.on('connect', () => socket.write(commands.map(encodeRespArray).join('')));
    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        while (commandIndex < commands.length) {
          const parsed = parseResp(buffer);
          if (!parsed) return;
          buffer = buffer.subarray(parsed.offset);
          commandIndex += 1;
          if (commandIndex === commands.length) {
            clearTimeout(timeout);
            socket.destroy();
            resolve(parsed.value);
            return;
          }
        }
      } catch (error) {
        clearTimeout(timeout);
        socket.destroy();
        reject(error);
      }
    });
    socket.on('error', error => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function encodeRespArray(values) {
  return `*${values.length}\r\n${values.map(value => {
    const text = String(value);
    return `$${Buffer.byteLength(text)}\r\n${text}\r\n`;
  }).join('')}`;
}

function parseResp(buffer, offset = 0) {
  if (offset >= buffer.length) return null;
  const type = String.fromCharCode(buffer[offset]);
  const lineEnd = buffer.indexOf('\r\n', offset);
  if (lineEnd === -1) return null;
  const line = buffer.subarray(offset + 1, lineEnd).toString('utf8');
  const next = lineEnd + 2;
  if (type === '+') return { value: line, offset: next };
  if (type === ':') return { value: Number(line), offset: next };
  if (type === '-') throw new Error(`Redis error: ${line}`);
  if (type === '$') {
    const length = Number(line);
    if (length === -1) return { value: null, offset: next };
    const end = next + length;
    if (buffer.length < end + 2) return null;
    return { value: buffer.subarray(next, end).toString('utf8'), offset: end + 2 };
  }
  if (type === '*') {
    const length = Number(line);
    if (length === -1) return { value: null, offset: next };
    const values = [];
    let cursor = next;
    for (let index = 0; index < length; index += 1) {
      const parsed = parseResp(buffer, cursor);
      if (!parsed) return null;
      values.push(parsed.value);
      cursor = parsed.offset;
    }
    return { value: values, offset: cursor };
  }
  throw new Error(`Unsupported Redis response type: ${type}`);
}
