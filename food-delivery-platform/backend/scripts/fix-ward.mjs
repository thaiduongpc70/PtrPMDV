/* Sau khi chuyển sang Hưng Yên: cột ward cũ (Phường 11…) của HCM không còn đúng — phường/xã mới nằm ở cột district. */
import { connect } from './lib/db.mjs';
const c = await connect();
const [r] = await c.query(`UPDATE customer_addresses SET ward = NULL, updated_at = updated_at WHERE ward IS NOT NULL`);
console.log('xoá ward cũ:', r.affectedRows);
await c.end();
