/* Phần chữ còn sót sau relocate-to-hung-yen.mjs: mã voucher mang tên Sài Gòn, biển số xe (59 → 89), hồ sơ đối tác. Chạy lại an toàn. */
import { connect } from './lib/db.mjs';
const db = await connect();
const run = async (label, sql) => { const [r] = await db.query(sql); console.log(label, r.affectedRows ?? r); };
await run('voucher SAIGON → PHOHIEN', `UPDATE promotions SET code = REPLACE(code, 'SAIGON', 'PHOHIEN') WHERE code LIKE 'SAIGON%'`);
await run('biển số tài xế 59 → 89', `UPDATE shipper_profiles SET vehicle_plate = CONCAT('89', SUBSTRING(vehicle_plate, 3)), updated_at = updated_at WHERE vehicle_plate LIKE '59%'`);
await run('hồ sơ đối tác', `UPDATE partner_applications SET payload = JSON_SET(payload, '$.city', 'Hưng Yên') WHERE JSON_UNQUOTE(JSON_EXTRACT(payload, '$.city')) IN ('TP.HCM', 'Hồ Chí Minh')`);
await run('biển số trong hồ sơ', `UPDATE partner_applications SET payload = JSON_SET(payload, '$.vehiclePlate', CONCAT('89', SUBSTRING(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.vehiclePlate')), 3))) WHERE JSON_UNQUOTE(JSON_EXTRACT(payload, '$.vehiclePlate')) LIKE '59%'`);
await db.end();
