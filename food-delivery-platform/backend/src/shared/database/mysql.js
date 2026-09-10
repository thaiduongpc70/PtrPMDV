import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
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

export async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
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

export async function withTransaction(work) {
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
    throw error;
  } finally {
    connection.release();
  }
}
