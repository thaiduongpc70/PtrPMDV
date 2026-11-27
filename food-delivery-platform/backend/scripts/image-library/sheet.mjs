/*
 * Ghép ảnh ứng viên thành "contact sheet" có đánh số để DUYỆT BẰNG MẮT.
 *   node scripts/image-library/sheet.mjs --cand <thư mục ứng viên> --out <png> --keys pho-bo,pho-ga [--cell 190]
 */
import sharp from 'sharp';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = name => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const cand = opt('--cand'); const out = opt('--out'); const keys = (opt('--keys') ?? '').split(',').filter(Boolean);
const CELL = Number(opt('--cell') ?? 190); const COLS = Number(opt('--cols') ?? 8); const ONLY = opt('--idx') ? opt('--idx').split(',').map(Number) : null; const LABEL = 22; const GAP = 4;

const composites = []; let y = 0;
for (const key of keys) {
  const metaPath = join(cand, key, 'meta.json');
  const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : [];
  composites.push({ input: Buffer.from(`<svg width="${COLS * (CELL + GAP)}" height="${LABEL}"><rect width="100%" height="100%" fill="#222"/><text x="6" y="16" font-family="Arial" font-size="15" fill="#fff">${key}  (${meta.length})</text></svg>`), left: 0, top: y });
  y += LABEL;
  const shown = meta.filter(item => !ONLY || ONLY.includes(item.index));
  const rows = Math.ceil(shown.length / COLS) || 1;
  for (const [position, item] of shown.entries()) {
    const column = position % COLS; const rowOffset = Math.floor(position / COLS) * (CELL + GAP);
    const image = await sharp(join(cand, key, `${item.index}.jpg`)).resize(CELL, CELL, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer();
    composites.push({ input: image, left: column * (CELL + GAP), top: y + rowOffset });
    composites.push({ input: Buffer.from(`<svg width="34" height="26"><rect width="34" height="26" rx="4" fill="#e11"/><text x="17" y="19" text-anchor="middle" font-family="Arial" font-size="17" font-weight="bold" fill="#fff">${item.index}</text></svg>`), left: column * (CELL + GAP), top: y + rowOffset });
  }
  y += rows * (CELL + GAP);
}
await sharp({ create: { width: COLS * (CELL + GAP), height: y, channels: 3, background: '#fff' } }).composite(composites).jpeg({ quality: 82 }).toFile(out);
console.log(out, COLS * (CELL + GAP), 'x', y);
