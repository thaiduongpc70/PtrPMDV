import { createRequire } from 'node:module';
import { env } from '../config/env.js';

const require = createRequire(import.meta.url);
let mysql;
let pool;

export function getPool() {
  if (!pool) {
    pool = getMysqlClient().createPool({
      host: env.database.host,
      port: env.database.port,
      database: env.database.name,
      user: env.database.user,
      password: env.database.password,
      connectionLimit: env.database.connectionLimit,
      waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      charset: 'utf8mb4',
      timezone: '+07:00',
      decimalNumbers: true,
      supportBigNumbers: true
    });
  }

  return pool;
}

function getMysqlClient() {
  if (!mysql) {
    mysql = require('mysql2/promise');
  }

  return mysql;
}

const RETRYABLE_ERRORS = new Set(['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT']);
const MAX_TRANSACTION_ATTEMPTS = 4;

export async function query(sql, params = []) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const [rows] = await getPool().execute(sql, params);
      return rows;
    } catch (error) {
      // Câu lệnh đơn lẻ (autocommit) đã được MySQL rollback hoàn toàn nên an toàn để thử lại khi bị chọn làm nạn nhân deadlock.
      if (error?.code === 'ER_LOCK_DEADLOCK' && attempt < MAX_TRANSACTION_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 15 * attempt + Math.floor(Math.random() * 25)));
        continue;
      }
      throw error;
    }
  }
}

export async function checkDatabaseConnection() {
  const startedAt = process.hrtime.bigint();

  await getPool().query({
    sql: 'SELECT 1 AS ready',
    timeout: env.database.healthCheckTimeoutMs
  });

  return {
    latencyMs: Number(process.hrtime.bigint() - startedAt) / 1_000_000
  };
}

export async function closePool() {
  const currentPool = pool;
  pool = undefined;

  if (currentPool) {
    await currentPool.end();
  }
}

/** Chạy `work` trong một transaction; tự thử lại khi MySQL chọn nó làm nạn nhân của deadlock. */
export async function withTransaction(work) {
  for (let attempt = 1; ; attempt += 1) {
    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();

      const result = await work({
        execute: async (sql, params = []) => {
          const [rows] = await connection.execute(sql, params);
          return rows;
        }
      });

      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      if (RETRYABLE_ERRORS.has(error?.code) && attempt < MAX_TRANSACTION_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 15 * attempt + Math.floor(Math.random() * 25)));
        continue;
      }
      throw error;
    } finally {
      connection.release();
    }
  }
}
