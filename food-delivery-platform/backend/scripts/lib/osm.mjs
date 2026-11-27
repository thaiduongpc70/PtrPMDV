/* Tra cứu OpenStreetMap (Overpass) để lấy tên đường + phường/xã THẬT cho địa chỉ mẫu. Có cache file để chạy lại không cần mạng. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function overpass(query) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const response = await fetch(ENDPOINTS[attempt % ENDPOINTS.length], {
        method: 'POST', headers: { 'User-Agent': 'FoodGoDemo/1.0 (educational project)', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`
      });
      if (response.ok) return await response.json();
    } catch { /* thử lại */ }
    await sleep(4000 * (attempt + 1));
  }
  throw new Error('Overpass không phản hồi');
}

export function openCache(path) {
  const cache = path && existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  const save = () => path && writeFileSync(path, JSON.stringify(cache, null, 1));
  return { cache, save };
}

/** Các đường có tên quanh một điểm: [{ name, lat, lng }] (đường lớn nhỏ trong phố, bỏ cao tốc). */
export async function streetsAround(lat, lng, radius, store) {
  const key = `streets:${lat.toFixed(4)},${lng.toFixed(4)},${radius}`;
  if (store.cache[key]) return store.cache[key];
  const json = await overpass(`[out:json][timeout:40];way(around:${radius},${lat},${lng})["highway"~"^(residential|tertiary|secondary|primary|unclassified|living_street)$"]["name"];out geom 60;`);
  const seen = new Map();
  for (const way of json.elements ?? []) {
    const name = way.tags?.name;
    if (!name || /cao tốc|quốc lộ|^QL/i.test(name) || seen.has(name)) continue;
    const mid = way.geometry[Math.floor(way.geometry.length / 2)];
    seen.set(name, { name, lat: mid.lat, lng: mid.lon });
  }
  store.cache[key] = [...seen.values()];
  store.save();
  return store.cache[key];
}

/** Phường/xã chứa điểm (admin_level 6 sau sắp xếp 2025, rơi về 8 / 7 nếu thiếu). */
export async function wardAt(lat, lng, store) {
  const key = `ward:${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (store.cache[key]) return store.cache[key];
  const json = await overpass(`[out:json][timeout:40];is_in(${lat},${lng})->.a;rel(pivot.a)["boundary"="administrative"]["admin_level"~"^(5|6|7|8)$"];out tags;`);
  const rels = (json.elements ?? []).map(el => el.tags).filter(tags => tags?.name);
  const ward = rels.find(tags => /^(Phường|Xã|Thị trấn)\b/.test(tags.name)) ?? rels.find(tags => tags.admin_level === '6') ?? rels[0];
  store.cache[key] = ward?.name ?? null;
  store.save();
  return store.cache[key];
}
