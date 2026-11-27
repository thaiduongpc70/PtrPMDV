/* Thu ứng viên ảnh từ kết quả Bing Images (chạy từ máy này): trích URL ảnh gốc (murl) + trang nguồn (purl), tải về thư mục tạm.
 * ẢNH TÌM TRÊN WEB, CHƯA XÁC MINH GIẤY PHÉP (dùng cho đồ án). Phải xem bằng mắt (sheet.mjs) rồi mới ghi accept.json.
 *   node scripts/image-library/web-collect.mjs --out <thư mục> [--only key1,key2] [--per 8] */
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { WEB } from './web-spec.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const out = opt('--out'); const only = opt('--only') ? opt('--only').split(',') : null; const PER = Number(opt('--per', 8));
if (!out) throw new Error('Thiếu --out');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const decode = text => text.replace(/&quot;/g, '"').replace(/&amp;/g, '&');

async function bing(query) {
  const response = await fetch(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25000) });
  if (response.status !== 200) throw new Error(`Bing trả ${response.status}`);
  const html = await response.text();
  const results = [];
  for (const match of html.matchAll(/purl&quot;:&quot;(.*?)&quot;,&quot;murl&quot;:&quot;(.*?)&quot;/g)) results.push({ url: decode(match[2]), page: decode(match[1]), title: '' });
  if (!results.length && /captcha|unusual traffic/i.test(html)) throw new Error('Bing yêu cầu captcha');
  return results;
}

let blocked = 0;
for (const item of WEB) {
  if (only && !only.includes(item.key)) continue;
  const dir = join(out, item.key);
  if (existsSync(join(dir, 'meta.json'))) { console.log(item.key, '(đã có)'); continue; }
  mkdirSync(dir, { recursive: true });
  let list = [];
  try { list = await bing(item.q); } catch (error) { console.log(item.key, 'LỖI tìm kiếm:', error.message); blocked += 1; if (blocked >= 3) { console.log('Dừng: công cụ tìm kiếm chặn tự động.'); break; } continue; }
  const kept = []; const seen = new Set();
  for (const result of list) {
    if (kept.length >= PER) break;
    if (!/^https?:/.test(result.url) || seen.has(result.url)) continue;
    seen.add(result.url);
    try {
      const response = await fetch(result.url, { headers: { 'User-Agent': UA, Referer: result.page || 'https://www.bing.com/' }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 15000 || buffer.length > 8000000) continue;
      const meta = await sharp(buffer).metadata();
      if (!meta.width || meta.width < 400 || meta.height < 300) continue;
      const hash = createHash('md5').update(buffer).digest('hex');
      if (seen.has(hash)) continue;
      seen.add(hash);
      const index = kept.length + 1;
      await sharp(buffer).jpeg({ quality: 88 }).toFile(join(dir, `${index}.jpg`));
      kept.push({ index, source: 'Web (Bing Images)', title: item.q, pageUrl: result.page, downloadUrl: result.url, author: 'Không rõ (ảnh tìm trên web)', license: 'Chưa xác minh giấy phép (ảnh tìm trên web, dùng cho đồ án)', licenseUrl: '' });
    } catch { /* bỏ qua ảnh lỗi */ }
  }
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(kept, null, 1));
  console.log(item.key.padEnd(26), `${kept.length}/${list.length}`);
  await sleep(1500);
}
