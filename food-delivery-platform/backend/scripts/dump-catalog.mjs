import mysql from 'mysql2/promise';
import { readFileSync, writeFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const c = await mysql.createConnection({ host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME, charset: 'utf8mb4' });
const [rs] = await c.query(`SELECT r.id, r.name, rc.name AS category FROM restaurants r LEFT JOIN restaurant_categories rc ON rc.id=r.category_id WHERE r.deleted_at IS NULL ORDER BY r.id`);
const [it] = await c.query(`SELECT mi.id, mi.restaurant_id, mi.name, mi.item_type, mi.image_url FROM menu_items mi WHERE mi.deleted_at IS NULL ORDER BY mi.restaurant_id, mi.id`);
writeFileSync(process.argv[2], JSON.stringify({ restaurants: rs, items: it }, null, 1));
console.log(rs.length, it.length, it.filter(i => i.image_url).length);
await c.end();
