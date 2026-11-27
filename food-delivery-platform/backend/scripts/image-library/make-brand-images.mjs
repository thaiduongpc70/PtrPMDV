/*
 * Ảnh thương hiệu + ảnh combo, tạo từ DỮ LIỆU THẬT trong DB (không dùng ảnh giả):
 *   - LOGO quán: biểu trưng chữ cái đầu (monogram) trên nền màu riêng của quán — vẽ bằng sharp/SVG, là logo thiết kế chứ không phải ảnh món;
 *   - COVER quán: ghép tối đa 4 ảnh món ĐÃ DUYỆT của chính quán đó (bán chạy nhất) kèm tên quán;
 *   - ảnh combo: ghép ảnh các món bên trong combo (bố cục theo số món) — đúng nguyên liệu của combo.
 * Quán/combo chưa có ảnh món đã duyệt nào thì giữ nguyên (không tạo ảnh giả).
 * Chạy sau apply.mjs, khi server đang chạy:  API_BASE_URL=http://localhost:3001 node scripts/image-library/make-brand-images.mjs [--logos] [--covers] [--combos]
 */
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { connect } from '../lib/db.mjs';
import { api, tokenFor, pool } from '../lib/api-client.mjs';

import { comboTiles } from '../lib/combo-tiles.mjs';
const args = process.argv.slice(2);
const all = !args.some(arg => ['--logos', '--covers', '--combos'].includes(arg));
const want = flag => all || args.includes(flag);
const STORAGE = resolve(process.cwd(), '..', '..', 'storage');
const LIB = resolve(STORAGE, 'library');
const fileOf = url => resolve(STORAGE, String(url).replace(/^\/uploads\//, ''));

const hash = text => { let h = 2166136261; for (const ch of text) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
function hsl(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`;
}
const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const STOP = /^(quán|tiệm|nhà|&|và)$/i;
const initials = name => {
  const words = name.split(/\s+/).filter(word => word && !STOP.test(word));
  return (words[0]?.[0] ?? '?').toUpperCase() + (words[1]?.[0] ?? '').toUpperCase();
};

async function logoPng(name) {
  const hue = hash(name) % 360;
  const [c1, c2] = [hsl(hue, 70, 46), hsl((hue + 28) % 360, 74, 36)];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <rect width="512" height="512" rx="112" fill="url(#g)"/>
    <circle cx="256" cy="256" r="196" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="10"/>
    <circle cx="256" cy="256" r="172" fill="#fff" fill-opacity=".10"/>
    <text x="256" y="300" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${initials(name).length > 1 ? 150 : 190}" fill="#fff">${esc(initials(name))}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Ghép các ảnh (đường dẫn file) thành một ảnh width×height theo số lượng. */
async function collage(files, width, height, caption, quantities = []) {
  const gap = 6;
  const tiles = [];
  const cell = async (file, w, h) => sharp(file).resize(w, h, { fit: 'cover', position: 'attention' }).toBuffer();
  const n = files.length;
  if (n === 1) tiles.push({ input: await cell(files[0], width, height), left: 0, top: 0 });
  else if (n === 2) {
    const w = Math.floor((width - gap) / 2);
    tiles.push({ input: await cell(files[0], w, height), left: 0, top: 0 }, { input: await cell(files[1], width - w - gap, height), left: w + gap, top: 0 });
  } else if (n === 3) {
    const w = Math.floor((width - gap) * 0.6); const h = Math.floor((height - gap) / 2);
    tiles.push({ input: await cell(files[0], w, height), left: 0, top: 0 }, { input: await cell(files[1], width - w - gap, h), left: w + gap, top: 0 }, { input: await cell(files[2], width - w - gap, height - h - gap), left: w + gap, top: h + gap });
  } else {
    const w = Math.floor((width - gap) / 2); const h = Math.floor((height - gap) / 2);
    const spots = [[0, 0, w, h], [w + gap, 0, width - w - gap, h], [0, h + gap, w, height - h - gap], [w + gap, h + gap, width - w - gap, height - h - gap]];
    for (const [index, [left, top, cw, ch]] of spots.entries()) tiles.push({ input: await cell(files[index], cw, ch), left, top });
  }
  const badges = quantities.map((quantity, index) => ({ quantity, index })).filter(item => item.quantity > 1);
  if (badges.length) { // nhãn "×N" ở góc dưới phải của từng ô
    const spots = tiles.filter(tile => tile.input && tile.left !== undefined).slice(0, files.length);
    const layers = [];
    for (const { quantity, index } of badges) {
      const spot = spots[index]; if (!spot) continue;
      const meta = await sharp(spot.input).metadata();
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="110" height="64"><rect x="0" y="0" width="110" height="64" rx="18" fill="#e53935"/><text x="55" y="45" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="40" fill="#fff">×${quantity}</text></svg>`;
      layers.push({ input: Buffer.from(svg), left: spot.left + meta.width - 120, top: spot.top + meta.height - 74 });
    }
    tiles.push(...layers);
  }
  if (caption) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".72"/></linearGradient></defs>
      <rect width="${width}" height="${height}" fill="url(#s)"/><text x="36" y="${height - 34}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="54" fill="#fff">${esc(caption)}</text></svg>`;
    tiles.push({ input: Buffer.from(svg), left: 0, top: 0 });
  }
  return sharp({ create: { width, height, channels: 3, background: '#ffffff' } }).composite(tiles).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
}

const db = await connect();
const q = async (sql, params) => (await db.query(sql, params))[0];

/* ---------- LOGO + COVER ---------- */
if (want('--logos') || want('--covers')) {
  const restaurants = await q(`SELECT r.id, r.name, u.username FROM restaurants r JOIN users u ON u.id = r.owner_user_id WHERE r.deleted_at IS NULL ORDER BY r.id`);
  const photos = await q(`SELECT restaurant_id, image_url, sold_count FROM menu_items WHERE deleted_at IS NULL AND item_type = 'DISH' AND image_url LIKE '/uploads/library/%' ORDER BY sold_count DESC, id`);
  const images = await q('SELECT id, restaurant_id, image_type FROM restaurant_images');
  let logos = 0; let covers = 0;
  await pool(restaurants, 4, async restaurant => {
    const token = await tokenFor(restaurant.username);
    const base = `/api/restaurant/restaurants/${restaurant.id}/images`;
    const replace = async (type, url) => {
      for (const old of images.filter(item => item.restaurant_id === restaurant.id && item.image_type === type)) await api('DELETE', `${base}/${old.id}`, { token });
      await api('POST', base, { token, body: { imageUrl: url, imageType: type, sortOrder: 0 } });
    };
    if (want('--logos')) {
      const file = `logo-${restaurant.id}.png`;
      await sharp(await logoPng(restaurant.name)).toFile(resolve(LIB, file));
      await replace('LOGO', `/uploads/library/${file}`);
      logos += 1;
    }
    if (want('--covers')) {
      const distinct = [...new Set(photos.filter(row => row.restaurant_id === restaurant.id).map(row => row.image_url))].slice(0, 4).filter(url => existsSync(fileOf(url)));
      if (distinct.length) {
        const file = `cover-${restaurant.id}.jpg`;
        await sharp(await collage(distinct.map(fileOf), 1200, 480, restaurant.name)).toFile(resolve(LIB, file));
        await replace('COVER', `/uploads/library/${file}`);
        covers += 1;
      }
    }
  });
  console.log(`Logo: ${logos} quán · ảnh bìa ghép từ ảnh món: ${covers} quán`);
}

/* ---------- ảnh combo ---------- */
if (want('--combos')) {
  const combos = await q(`SELECT mi.id, mi.restaurant_id, mi.name, mi.image_url, u.username FROM menu_items mi JOIN restaurants r ON r.id = mi.restaurant_id JOIN users u ON u.id = r.owner_user_id WHERE mi.item_type = 'COMBO' AND mi.deleted_at IS NULL ORDER BY mi.id`);
  const parts = await q(`SELECT c.combo_item_id, c.quantity, d.image_url FROM menu_item_combo_components c JOIN menu_items d ON d.id = c.component_item_id WHERE d.image_url LIKE '/uploads/library/%' ORDER BY c.combo_item_id, c.quantity DESC, d.id`);
  let done = 0; let skipped = 0;
  await pool(combos, 6, async combo => {
    const tilesOf = comboTiles(parts.filter(part => part.combo_item_id === combo.id && existsSync(fileOf(part.image_url))).map(part => ({ url: part.image_url, quantity: part.quantity })));
    if (!tilesOf.length) { skipped += 1; return; }
    const file = `combo-${combo.id}.jpg`;
    await sharp(await collage(tilesOf.map(tile => fileOf(tile.url)), 800, 600, null, tilesOf.map(tile => tile.quantity))).toFile(resolve(LIB, file));
    await api('PATCH', `/api/restaurant/restaurants/${combo.restaurant_id}/menu-items/${combo.id}`, { token: await tokenFor(combo.username), body: { imageUrl: `/uploads/library/${file}` } });
    done += 1;
  });
  console.log(`Ảnh combo ghép từ ảnh món bên trong: ${done} combo · chưa có ảnh món nào để ghép: ${skipped} combo`);
}
await db.end();
