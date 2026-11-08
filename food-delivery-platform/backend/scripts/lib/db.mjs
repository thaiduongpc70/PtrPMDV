/* Kết nối MySQL trực tiếp cho các script bảo trì dữ liệu (đọc cấu hình từ .env). */
import mysql from 'mysql2/promise';
import { readFileSync } from 'node:fs';

export function readEnv() {
  const text = readFileSync(new URL('../../.env', import.meta.url), 'utf8');
  return Object.fromEntries(text.split(/\r?\n/).filter(l => l.includes('=') && !l.trim().startsWith('#')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]));
}

export async function connect(options = {}) {
  const env = readEnv();
  return mysql.createConnection({ host: env.DB_HOST, port: Number(env.DB_PORT || 3306), user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME, charset: 'utf8mb4', ...options });
}
