/*
 * Dựng thư viện ảnh từ các ảnh ĐÃ DUYỆT BẰNG MẮT (accept.json: { key: [số thứ tự ứng viên] }):
 *   - chuẩn hoá về 800×600 JPEG, lưu vào storage/library/<key>-<n>.jpg (phục vụ ở /uploads/library/…)
 *   - ghi scripts/data/image-library.json (nguồn, tác giả, giấy phép, đường dẫn gốc để tải lại) và docs/image-credits.md
 *   node scripts/image-library/build.mjs --cand <thư mục ứng viên> --accept <accept.json>
 */
import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = name => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const cand = opt('--cand'); const accept = JSON.parse(readFileSync(opt('--accept'), 'utf8'));
const out = resolve(process.cwd(), '..', '..', 'storage', 'library');
mkdirSync(out, { recursive: true });

// Gộp: giữ nguyên các loại món đã có trong image-library.json mà accept lần này không nhắc tới (ảnh cũ nằm sẵn ở storage/library);
// loại món có trong accept thì được dựng lại từ ứng viên. Dùng --no-merge để dựng lại hoàn toàn từ accept.
const libraryPath = resolve('scripts/data/image-library.json');
const previous = args.includes('--no-merge') ? [] : (() => { try { return JSON.parse(readFileSync(libraryPath, 'utf8')).items; } catch { return []; } })();
const items = previous.filter(item => !(item.key in accept));
for (const [key, indices] of Object.entries(accept)) {
  const meta = JSON.parse(readFileSync(join(cand, key, 'meta.json'), 'utf8'));
  let n = 0;
  for (const index of indices) {
    const info = meta.find(item => item.index === index);
    if (!info) throw new Error(`${key}: không có ứng viên ${index}`);
    n += 1;
    const file = `${key}-${n}.jpg`;
    await sharp(join(cand, key, `${index}.jpg`)).resize(800, 600, { fit: 'cover', position: 'attention' }).jpeg({ quality: 80, mozjpeg: true }).toFile(join(out, file));
    items.push({ key, file, url: `/uploads/library/${file}`, title: info.title, author: info.author, license: info.license, licenseUrl: info.licenseUrl, pageUrl: info.pageUrl, source: info.source, downloadUrl: info.downloadUrl });
  }
}
writeFileSync(resolve('scripts/data/image-library.json'), JSON.stringify({ generatedAt: new Date().toISOString(), items }, null, 1));

const rows = items.map(item => `| ${item.key} | ${item.file} | ${String(item.title).replace(/\|/g, '/')} | ${String(item.author).replace(/\|/g, '/')} | [${item.license}](${item.licenseUrl || item.pageUrl}) | [nguồn](${item.pageUrl}) |`);
writeFileSync(resolve('..', '..', 'docs', 'image-credits.md'), `# Nguồn và giấy phép ảnh minh hoạ món ăn

Ảnh món ăn trên giao diện là **ảnh minh hoạ đúng loại món**, lấy từ các nguồn có giấy phép tự do (Wikimedia Commons, Openverse) —
chỉ dùng giấy phép CC BY, CC BY-SA, CC0 hoặc phạm vi công cộng. Mỗi ảnh đã được **xem và đối chiếu bằng mắt** với tên món trước khi dùng;
món nào không có ảnh đúng thì để trống (không gắn ảnh gần giống).

Tệp ảnh nằm ở \`storage/library/\` (không đưa lên git). Dựng lại bằng \`scripts/image-library/build.mjs\` từ \`scripts/data/image-library.json\` (có đường dẫn gốc).
Khi hiển thị ảnh, vui lòng giữ ghi nhận tác giả theo giấy phép dưới đây.

Tổng: **${items.length}** ảnh cho **${new Set(items.map(item => item.key)).size}** loại món.

| Loại món | Tệp | Tiêu đề gốc | Tác giả | Giấy phép | Trang gốc |
|---|---|---|---|---|---|
${rows.join('\n')}
`);
console.log(`Thư viện: ${items.length} ảnh, ${new Set(items.map(item => item.key)).size} loại món (mới/dựng lại ${Object.keys(accept).length}) → ${out}`);
