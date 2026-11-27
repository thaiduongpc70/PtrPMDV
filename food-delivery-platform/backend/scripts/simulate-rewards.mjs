/* Khách đổi điểm thưởng lấy voucher qua API thật (đổi quà rẻ nhiều hơn quà đắt, chỉ đổi khi đủ điểm).
   Chạy khi server đang chạy:  node scripts/simulate-rewards.mjs [--customers 70] */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { api, tokenFor, pool } from './lib/api-client.mjs';

const argIndex = process.argv.indexOf('--customers');
const WANT = argIndex >= 0 ? Number(process.argv[argIndex + 1]) : 70;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261019);

const db = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4'
});
const [customers] = await db.query(`SELECT u.username FROM users u INNER JOIN customer_profiles cp ON cp.user_id = u.id
  WHERE u.role_id = 4 AND u.status = 'ACTIVE' AND u.username LIKE '%.%' AND cp.loyalty_points >= 600 ORDER BY cp.id`);
await db.end();

const chosen = customers.filter(() => rnd() < Math.min(1, WANT / Math.max(1, customers.length)));
let redeemed = 0;
await pool(chosen, 4, async customer => {
  const token = await tokenFor(customer.username);
  const times = rnd() < 0.3 ? 2 : 1;
  for (let i = 0; i < times; i += 1) {
    const loyalty = await api('GET', '/api/customer/loyalty', { token });
    const affordable = loyalty.rewards.filter(reward => reward.canRedeem);
    if (!affordable.length) return;
    // quà càng rẻ càng nhiều người đổi
    const weights = affordable.map((reward, index) => 1 / (index + 1) ** 1.6);
    let roll = rnd() * weights.reduce((a, b) => a + b, 0);
    const reward = affordable.find((_, index) => (roll -= weights[index]) <= 0) ?? affordable[0];
    await api('POST', `/api/customer/loyalty/rewards/${reward.id}/redeem`, { token, body: {} });
    redeemed += 1;
  }
});
console.log(`Đã có ${redeemed} lượt đổi điểm từ ${chosen.length} khách.`);
