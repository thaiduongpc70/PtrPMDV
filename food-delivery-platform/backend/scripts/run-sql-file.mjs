/* Chạy file .sql chỉ gồm các câu UPDATE/INSERT đơn giản (mỗi câu kết thúc bằng ;). Với trigger/DDL dùng mysql client. */
import { readFileSync } from 'node:fs';
import { connect } from './lib/db.mjs';
const db = await connect();
const statements = readFileSync(process.argv[2], 'utf8').split(/\r?\n/).filter(line => !line.trim().startsWith('--')).join('\n').split(';').map(part => part.trim()).filter(Boolean);
for (const statement of statements) { const [result] = await db.query(statement); console.log(String(result.affectedRows ?? 0).padStart(4), statement.slice(0, 80)); }
await db.end();
