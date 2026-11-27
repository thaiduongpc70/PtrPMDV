/*
 * Thu thập ẢNH ỨNG VIÊN cho từng loại món từ nguồn có giấy phép tự do:
 *   - Wikimedia Commons (thư mục chuyên đề + tìm kiếm tệp)
 *   - Openverse (Flickr, Wikimedia… — chỉ giấy phép CC BY / CC BY-SA / CC0 / PDM, không NC/ND)
 * Ảnh chỉ là ỨNG VIÊN: phải xem bằng mắt (contact sheet) rồi ghi vào accept.json mới được dùng.
 *
 *   node scripts/image-library/collect.mjs --out <thư mục> [--only key1,key2] [--per 8]
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TYPES } from './spec.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const outDir = opt('--out');
const only = opt('--only', '') ? opt('--only').split(',') : null;
const PER = Number(opt('--per', 8));
if (!outDir) throw new Error('Thiếu --out');

const UA = { 'User-Agent': 'FoodGoDemo/1.0 (educational project; image research)' };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let lastCall = 0;

async function getJson(url) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const wait = 1100 - (Date.now() - lastCall);
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    try {
      const response = await fetch(url, { headers: UA });
      const text = await response.text();
      return JSON.parse(text);
    } catch { await sleep(3000 * (attempt + 1)); }
  }
  return null;
}

const FREE = /^(CC BY(?!-N)(?!-ND)(-SA)? [0-9.]+|CC0|Public domain|PD)/i;
const stripHtml = value => String(value ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

function fromCommonsPages(pages) {
  const result = [];
  for (const page of Object.values(pages ?? {})) {
    const info = page.imageinfo?.[0];
    if (!info || info.mime !== 'image/jpeg' || info.width < 700 || info.height < 450) continue;
    const meta = info.extmetadata ?? {};
    const license = stripHtml(meta.LicenseShortName?.value);
    if (!FREE.test(license) || /NC|ND/.test(license.replace(/^CC0/, ''))) continue;
    result.push({
      source: 'Wikimedia Commons', title: page.title.replace(/^File:/, ''), pageUrl: info.descriptionurl,
      downloadUrl: info.thumburl || info.url, author: stripHtml(meta.Artist?.value).slice(0, 120) || 'Không rõ',
      license, licenseUrl: meta.LicenseUrl?.value ?? '', width: info.width, height: info.height
    });
  }
  return result;
}

const INFO = 'prop=imageinfo&iiprop=url|mime|size|extmetadata&iiurlwidth=800';
async function commonsCategory(category) {
  const json = await getJson(`https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=${encodeURIComponent('Category:' + category)}&gcmtype=file&gcmlimit=40&${INFO}&format=json`);
  return fromCommonsPages(json?.query?.pages);
}
async function commonsSearch(query) {
  const json = await getJson(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query + ' filetype:bitmap')}&gsrnamespace=6&gsrlimit=30&${INFO}&format=json`);
  return fromCommonsPages(json?.query?.pages);
}
// Ảnh trong bài Wikipedia (vi/en): tìm bài theo từ khoá rồi lấy ảnh của bài đó — giấy phép đọc từ Commons
async function wikiImages(lang, query) {
  const found = await getJson(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=2&format=json`);
  const out = [];
  for (const hit of found?.query?.search ?? []) {
    const json = await getJson(`https://${lang}.wikipedia.org/w/api.php?action=query&generator=images&titles=${encodeURIComponent(hit.title)}&gimlimit=30&${INFO}&format=json`);
    out.push(...fromCommonsPages(json?.query?.pages).map(item => ({ ...item, source: `Wikipedia ${lang}: ${hit.title}` })));
  }
  return out;
}
async function openverse(query) {
  const json = await getJson(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license=by,by-sa,cc0,pdm&extension=jpg&size=medium,large&page_size=20&mature=false`);
  return (json?.results ?? []).filter(item => item.url && item.width >= 700).map(item => ({
    source: `Openverse/${item.provider}`, title: stripHtml(item.title).slice(0, 120) || query, pageUrl: item.foreign_landing_url,
    downloadUrl: item.url, author: stripHtml(item.creator) || 'Không rõ',
    license: `CC ${String(item.license).toUpperCase()} ${item.license_version ?? ''}`.trim(), licenseUrl: item.license_url ?? '',
    width: item.width, height: item.height
  }));
}

async function download(url, file) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, { headers: UA });
      if (response.status === 429) { await sleep(4000 * (attempt + 1)); continue; }
      if (!response.ok) return false;
      writeFileSync(file, Buffer.from(await response.arrayBuffer()));
      return true;
    } catch { await sleep(2000); }
  }
  return false;
}

for (const type of TYPES) {
  if (only && !only.includes(type.key)) continue;
  const dir = join(outDir, type.key);
  if (existsSync(join(dir, 'meta.json'))) { console.log(type.key, '(đã có)'); continue; }
  mkdirSync(dir, { recursive: true });
  const seen = new Set(); const candidates = [];
  const add = list => { for (const item of list) { if (!seen.has(item.downloadUrl) && candidates.length < PER) { seen.add(item.downloadUrl); candidates.push(item); } } };
  const ovOnly = args.includes('--ov-only'); // chỉ Openverse (dùng khi tìm kiếm Commons trả ảnh không liên quan)
  // Mỗi nguồn tối đa PER/3 ứng viên để không nguồn nào chiếm hết chỗ; phần còn lại dồn cho tìm tệp Commons
  const cap = Math.ceil(PER / 3);
  const addCapped = (list, limit) => add(list.slice(0, limit));
  if (!ovOnly) for (const category of type.cats ?? []) addCapped(await commonsCategory(category), cap);
  if (args.includes('--wiki')) for (const [lang, query] of type.wiki ?? []) if (candidates.length < PER) addCapped(await wikiImages(lang, query), cap);
  for (const query of type.ov ?? []) if (candidates.length < PER) addCapped(await openverse(query), cap);
  if (!ovOnly) for (const query of type.search ?? []) if (candidates.length < PER) add(await commonsSearch(query));
  const kept = [];
  for (const item of candidates) {
    const index = kept.length + 1;
    if (await download(item.downloadUrl, join(dir, `${index}.jpg`))) kept.push({ index, ...item });
    await sleep(400);
  }
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(kept, null, 1));
  console.log(type.key.padEnd(24), kept.length, kept.map(item => item.source.split('/')[0].slice(0, 4)).join(','));
}
