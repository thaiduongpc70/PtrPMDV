/*
 * Chuyển toàn bộ vị trí dữ liệu mẫu từ TP.HCM sang Hưng Yên (địa chỉ mặc định của hệ thống).
 *
 * - Toạ độ: phép biến đổi cứng (xoay + tịnh tiến) áp cho MỌI bảng có toạ độ, nên khoảng cách giữa
 *   quán – khách – GPS tài xế giữ nguyên (quãng đường và phí ship đã lưu vẫn khớp). Góc xoay và tâm được
 *   chọn tự động để tối đa số điểm nằm trong địa phận tỉnh Hưng Yên, quán nằm trong khu nội thành.
 * - Chữ địa chỉ: tên đường / thôn và phường-xã thật lấy từ OpenStreetMap (Overpass API) theo toạ độ mới;
 *   số nhà giữ số cũ (số nhà là dữ liệu hư cấu như khách hàng).
 *
 *   node scripts/relocate-to-hung-yen.mjs --dry-run      # chỉ tính toán + in mẫu, không ghi DB
 *   node scripts/relocate-to-hung-yen.mjs --apply        # ghi DB (một lần; tự dừng nếu đã chuyển)
 *   --cache <file.json>                                  # lưu kết quả Overpass để chạy lại không cần mạng
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { connect } from './lib/db.mjs';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const cachePath = args.includes('--cache') ? args[args.indexOf('--cache') + 1] : null;

const TARGET = { city: 'Hưng Yên', lat: 20.6464, lng: 106.0511 }; // trung tâm TP Hưng Yên
const CITY_WARDS = /Phố Hiến|Hồng Châu|Sơn Nam|Hưng Yên/;
const rad = deg => (deg * Math.PI) / 180;
const KM_LAT = 110.574;
const kmLng = lat => 111.32 * Math.cos(rad(lat));

async function overpass(query) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'User-Agent': 'FoodGoDemo/1.0 (educational project)', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query)
      });
      if (response.ok) return await response.json();
    } catch { /* thử lại */ }
    await new Promise(resolve => setTimeout(resolve, 6000 * (attempt + 1)));
  }
  throw new Error('Overpass không phản hồi');
}

function pointInSegments(lat, lng, segments) {
  let inside = false;
  for (const [a, b] of segments) {
    if ((a.lon > lng) !== (b.lon > lng)) {
      const crossLat = a.lat + ((lng - a.lon) * (b.lat - a.lat)) / (b.lon - a.lon);
      if (crossLat > lat) inside = !inside;
    }
  }
  return inside;
}

function distanceToSegmentM(lat, lng, a, b) {
  const kx = kmLng(lat) * 1000; const ky = KM_LAT * 1000;
  const px = (lng - a.lon) * kx; const py = (lat - a.lat) * ky;
  const dx = (b.lon - a.lon) * kx; const dy = (b.lat - a.lat) * ky;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / len2));
  return Math.hypot(px - t * dx, py - t * dy);
}

async function loadGeography(bbox) {
  if (cachePath && existsSync(cachePath)) return JSON.parse(readFileSync(cachePath, 'utf8'));
  const box = `${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng}`;
  const toSegments = element => element.members.filter(member => member.type === 'way' && member.geometry).flatMap(member => member.geometry.slice(1).map((point, index) => [member.geometry[index], point]));
  const provinceRaw = await overpass('[out:json][timeout:120];relation["boundary"="administrative"]["admin_level"="4"]["name"~"Hưng Yên"];out geom;');
  const province = provinceRaw.elements.map(toSegments).flat();
  const wardsRaw = await overpass(`[out:json][timeout:120];relation["boundary"="administrative"]["admin_level"="6"](${box});out geom;`);
  const wards = wardsRaw.elements.map(element => ({ name: element.tags.name, segments: toSegments(element) })).filter(ward => ward.name && ward.segments.length);
  const roadsRaw = await overpass(`[out:json][timeout:120];way["highway"~"^(primary|secondary|tertiary|unclassified|residential|living_street|service)$"]["name"](${box});out geom;`);
  const roads = roadsRaw.elements.filter(element => element.geometry).map(element => ({ name: element.tags.name, geometry: element.geometry }));
  const placesRaw = await overpass(`[out:json][timeout:120];node["place"~"^(village|hamlet|suburb|quarter|neighbourhood)$"]["name"](${box});out;`);
  const places = placesRaw.elements.map(element => ({ name: element.tags.name, kind: element.tags.place, lat: element.lat, lng: element.lon }));
  const result = { province, wards, roads, places };
  if (cachePath) writeFileSync(cachePath, JSON.stringify(result));
  return result;
}

const cleanRoad = name => name.replace(/^Đư[^\s]{2,4}\s+/i, '');
const houseNumber = line => String(line).match(/^\s*(\d+[A-Za-z]?(?:\/\d+)?)/)?.[1] ?? '1';

const db = await connect();
const q = async (sql, params) => (await db.query(sql, params))[0];

const done = await q(`SELECT COUNT(*) n FROM restaurants WHERE city = ?`, [TARGET.city]);
if (done[0].n > 0) { console.log('Dữ liệu đã ở Hưng Yên — bỏ qua.'); await db.end(); process.exit(0); }

const restaurants = await q(`SELECT id, name, address, latitude, longitude FROM restaurants`);
const addresses = await q(`SELECT id, address_line, latitude, longitude FROM customer_addresses`);
const ref = {
  lat: restaurants.reduce((sum, row) => sum + Number(row.latitude), 0) / restaurants.length,
  lng: restaurants.reduce((sum, row) => sum + Number(row.longitude), 0) / restaurants.length
};

const geo = await loadGeography({ minLat: TARGET.lat - 0.25, maxLat: TARGET.lat + 0.25, minLng: TARGET.lng - 0.25, maxLng: TARGET.lng + 0.25 });
// Chỉ giữ phường/xã nằm trong tỉnh Hưng Yên
const wards = geo.wards.filter(ward => {
  // Phường/xã thuộc tỉnh khi tâm của nó nằm trong tỉnh và đa số đỉnh viền nằm trong tỉnh (đỉnh sát biên bị bỏ qua)
  const vertices = ward.segments.map(segment => segment[0]);
  const centerLat = vertices.reduce((sum, v) => sum + v.lat, 0) / vertices.length;
  const centerLng = vertices.reduce((sum, v) => sum + v.lon, 0) / vertices.length;
  const sample = vertices.filter((_, index) => index % Math.max(1, Math.floor(vertices.length / 40)) === 0);
  const inside = sample.filter(v => pointInSegments(v.lat, v.lon, geo.province)).length / sample.length;
  return pointInSegments(centerLat, centerLng, geo.province) && inside >= 0.6;
});
console.log(`OSM: ${wards.length}/${geo.wards.length} phường/xã thuộc Hưng Yên, ${geo.roads.length} đoạn đường có tên, ${geo.places.length} địa danh`);

// Lưới 200 m: ô nào thuộc phường/xã nào của Hưng Yên
const GRID = { minLat: TARGET.lat - 0.25, minLng: TARGET.lng - 0.25, step: 0.002 };
const gridSize = Math.round(0.5 / GRID.step);
const wardBox = wards.map(ward => {
  const lats = ward.segments.map(s => s[0].lat); const lngs = ward.segments.map(s => s[0].lon);
  return { minLat: Math.min(...lats), maxLat: Math.max(...lats), minLng: Math.min(...lngs), maxLng: Math.max(...lngs) };
});
const wardAt = (lat, lng) => {
  for (let index = 0; index < wards.length; index += 1) {
    const box = wardBox[index];
    if (lat < box.minLat || lat > box.maxLat || lng < box.minLng || lng > box.maxLng) continue;
    if (pointInSegments(lat, lng, wards[index].segments)) return wards[index].name;
  }
  return null;
};
const grid = new Array(gridSize * gridSize);
for (let i = 0; i < gridSize; i += 1) for (let j = 0; j < gridSize; j += 1) grid[i * gridSize + j] = wardAt(GRID.minLat + (i + 0.5) * GRID.step, GRID.minLng + (j + 0.5) * GRID.step);
const wardFast = (lat, lng) => {
  const i = Math.floor((lat - GRID.minLat) / GRID.step); const j = Math.floor((lng - GRID.minLng) / GRID.step);
  return i < 0 || j < 0 || i >= gridSize || j >= gridSize ? null : grid[i * gridSize + j];
};

const makeTransform = (theta, tLat, tLng) => {
  const cosT = Math.cos(theta); const sinT = Math.sin(theta); const cx = kmLng(ref.lat);
  const cy = kmLng(tLat);
  return {
    theta, tLat, tLng,
    // lat' = tLat + A1*(lng-refLng) + B1*(lat-refLat);  lng' = tLng + A2*(lng-refLng) + B2*(lat-refLat)
    A1: (cx * sinT) / KM_LAT, B1: cosT,
    A2: (cx * cosT) / cy, B2: -(KM_LAT * sinT) / cy,
    apply(lat, lng) {
      const u = Number(lng) - ref.lng; const v = Number(lat) - ref.lat;
      return [tLat + this.A1 * u + this.B1 * v, tLng + this.A2 * u + this.B2 * v];
    }
  };
};

let best = null;
for (let deg = 0; deg < 360; deg += 5) {
  for (let dy = -0.08; dy <= 0.0801; dy += 0.01) {
    for (let dx = -0.08; dx <= 0.1201; dx += 0.01) {
      const transform = makeTransform(rad(deg), TARGET.lat + dy, TARGET.lng + dx);
      let customersIn = 0; let restaurantsIn = 0; let restaurantsCity = 0;
      for (const row of addresses) if (wardFast(...transform.apply(row.latitude, row.longitude))) customersIn += 1;
      for (const row of restaurants) {
        const ward = wardFast(...transform.apply(row.latitude, row.longitude));
        if (ward) restaurantsIn += 1;
        if (ward && CITY_WARDS.test(ward)) restaurantsCity += 1;
      }
      const offsetKm = Math.hypot(dy * KM_LAT, dx * kmLng(TARGET.lat));
      const score = customersIn + restaurantsCity * 20 + restaurantsIn * 5 - offsetKm * 0.3;
      if (!best || score > best.score) best = { score, transform, customersIn, restaurantsIn, restaurantsCity, deg };
    }
  }
}
const T = best.transform;
console.log(`Chọn góc xoay ${best.deg}°, tâm (${T.tLat.toFixed(4)}, ${T.tLng.toFixed(4)}): khách trong tỉnh ${best.customersIn}/${addresses.length}, quán trong tỉnh ${best.restaurantsIn}/${restaurants.length}, quán nội thành ${best.restaurantsCity}/${restaurants.length}`);

function locate(lat, lng) {
  const ward = wardAt(lat, lng);
  let road = null;
  for (const item of geo.roads) {
    for (let index = 1; index < item.geometry.length; index += 1) {
      const d = distanceToSegmentM(lat, lng, item.geometry[index - 1], item.geometry[index]);
      if (d <= 300 && (!road || d < road.distance)) road = { name: cleanRoad(item.name), distance: d };
    }
  }
  if (road) return { ward, road: road.name };
  let place = null;
  for (const item of geo.places) {
    const d = Math.hypot((item.lat - lat) * KM_LAT, (item.lng - lng) * kmLng(lat)) * 1000;
    if (d <= 2000 && (!place || d < place.distance)) place = { name: item.name, kind: item.kind, distance: d };
  }
  return { ward, road: place ? (['village', 'hamlet'].includes(place.kind) ? `Thôn ${place.name}` : place.name) : null };
}

const place = row => {
  const [lat, lng] = T.apply(row.latitude, row.longitude);
  const found = locate(lat, lng);
  const house = houseNumber(row.address ?? row.address_line);
  return { lat, lng, ward: found.ward, road: found.road, line: found.road ? `${house} ${found.road}` : `Số ${house}` };
};
const restaurantPlaces = restaurants.map(row => ({ id: row.id, ...place(row) }));
const addressPlaces = addresses.map(row => ({ id: row.id, ...place(row) }));

const outside = [...restaurantPlaces, ...addressPlaces].filter(p => !p.ward);
console.log('Điểm nằm ngoài các phường/xã Hưng Yên:', outside.length);
console.log('Quán mẫu:', restaurantPlaces.slice(0, 5).map(p => `${p.line}, ${p.ward}`));
console.log('Khách mẫu:', addressPlaces.slice(0, 6).map(p => `${p.line}, ${p.ward}`));
const wardCount = new Map();
for (const p of [...restaurantPlaces, ...addressPlaces]) wardCount.set(p.ward, (wardCount.get(p.ward) ?? 0) + 1);
console.log('Phân bố phường/xã:', Object.fromEntries(wardCount));
console.log('Không có tên đường/thôn:', [...restaurantPlaces, ...addressPlaces].filter(p => !p.road).length);

if (!apply) { console.log('--dry-run: chưa ghi DB'); await db.end(); process.exit(0); }
if (outside.length > 0) {
  // Điểm lọt ra ngoài tỉnh: gán phường/xã gần nhất để địa chỉ không sai tỉnh
  console.log('Cảnh báo: có điểm ngoài địa phận tỉnh — dùng phường/xã gần nhất.');
}
const nearestWard = (lat, lng) => {
  let bestWard = null;
  for (const ward of wards) {
    for (const [a] of ward.segments) {
      const d = Math.hypot((a.lat - lat) * KM_LAT, (a.lon - lng) * kmLng(lat));
      if (!bestWard || d < bestWard.d) bestWard = { name: ward.name, d };
    }
  }
  return bestWard?.name;
};
const gaps = [];
for (const p of [...restaurantPlaces, ...addressPlaces]) if (!p.ward) { p.ward = nearestWard(p.lat, p.lng); gaps.push(p); }
console.log('Điểm gán phường/xã gần nhất:', gaps.length, gaps.map(g => g.ward).join(' | '));

await db.beginTransaction();
try {
  // Đổi toạ độ của một bảng (dùng bảng dẫn xuất để các phép tính đều dùng toạ độ cũ)
  const move = async (table, latCol, lngCol, keepUpdatedAt) => {
    const [[meta]] = await db.query(`SELECT COUNT(*) n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = 'id'`, [table]);
    if (!meta.n) throw new Error(`${table} không có cột id`);
    await db.query(
      `UPDATE ${table} t JOIN (SELECT id, ? + ? * (${lngCol} - ?) + ? * (${latCol} - ?) AS nlat, ? + ? * (${lngCol} - ?) + ? * (${latCol} - ?) AS nlng FROM ${table} WHERE ${latCol} IS NOT NULL) x ON x.id = t.id
       SET t.${latCol} = x.nlat, t.${lngCol} = x.nlng ${keepUpdatedAt ? ', t.updated_at = t.updated_at' : ''}`,
      [T.tLat, T.A1, ref.lng, T.B1, ref.lat, T.tLng, T.A2, ref.lng, T.B2, ref.lat]
    );
  };
  await move('shipper_locations', 'latitude', 'longitude', false);
  await move('delivery_status_history', 'latitude', 'longitude', false);
  await move('shipper_profiles', 'current_latitude', 'current_longitude', true);
  await move('orders', 'delivery_latitude', 'delivery_longitude', true);
  await move('deliveries', 'delivery_latitude', 'delivery_longitude', true);
  // pickup: dùng riêng vì cùng bảng deliveries
  await db.query(
    `UPDATE deliveries t JOIN (SELECT id, ? + ? * (pickup_longitude - ?) + ? * (pickup_latitude - ?) AS nlat, ? + ? * (pickup_longitude - ?) + ? * (pickup_latitude - ?) AS nlng FROM deliveries WHERE pickup_latitude IS NOT NULL) x ON x.id = t.id
     SET t.pickup_latitude = x.nlat, t.pickup_longitude = x.nlng, t.updated_at = t.updated_at`,
    [T.tLat, T.A1, ref.lng, T.B1, ref.lat, T.tLng, T.A2, ref.lng, T.B2, ref.lat]
  );
  await db.query(`CREATE TEMPORARY TABLE tmp_places (kind VARCHAR(12), id BIGINT, lat DECIMAL(10,7), lng DECIMAL(10,7), line VARCHAR(255), ward VARCHAR(100), PRIMARY KEY (kind, id))`);
  const rows = [...restaurantPlaces.map(p => ['R', p]), ...addressPlaces.map(p => ['A', p])];
  await db.query(`INSERT INTO tmp_places VALUES ?`, [rows.map(([kind, p]) => [kind, p.id, p.lat.toFixed(7), p.lng.toFixed(7), p.line, p.ward])]);
  await db.query(`UPDATE restaurants r JOIN tmp_places t ON t.kind='R' AND t.id=r.id SET r.address=t.line, r.district=t.ward, r.city=?, r.latitude=t.lat, r.longitude=t.lng, r.updated_at=r.updated_at`, [TARGET.city]);
  await db.query(`UPDATE customer_addresses a JOIN tmp_places t ON t.kind='A' AND t.id=a.id SET a.address_line=t.line, a.district=t.ward, a.city=?, a.latitude=t.lat, a.longitude=t.lng, a.updated_at=a.updated_at`, [TARGET.city]);
  await db.query(`UPDATE orders o JOIN tmp_places t ON t.kind='A' AND t.id=o.delivery_address_id SET o.delivery_address=CONCAT(t.line, ', ', t.ward, ', ', ?), o.delivery_latitude=t.lat, o.delivery_longitude=t.lng, o.updated_at=o.updated_at`, [TARGET.city]);
  await db.query(`UPDATE deliveries d JOIN orders o ON o.id=d.order_id JOIN restaurants r ON r.id=o.restaurant_id SET d.delivery_address=o.delivery_address, d.delivery_latitude=o.delivery_latitude, d.delivery_longitude=o.delivery_longitude, d.pickup_address=r.address, d.pickup_latitude=r.latitude, d.pickup_longitude=r.longitude, d.updated_at=d.updated_at`);
  // Khu vực giao: bỏ khu thử nghiệm Postman, đưa khu mặc định về Hưng Yên
  await db.query(`DELETE FROM delivery_zones WHERE name = 'Postman zone'`);
  await db.query(`UPDATE delivery_zones SET city = ?, district = NULL, updated_at = updated_at WHERE name = 'Khu vực mặc định'`, [TARGET.city]);
  // Tên thương hiệu có chữ Sài Gòn
  await db.query(`UPDATE restaurants SET name = REPLACE(name, 'Sài Gòn', 'Phố Hiến'), updated_at = updated_at WHERE name LIKE '%Sài Gòn%'`);
  await db.query(`UPDATE promotions SET description = REPLACE(description, 'Sài Gòn', 'Phố Hiến') WHERE description LIKE '%Sài Gòn%'`);
  await db.query(`UPDATE menus SET description = REPLACE(description, 'Sài Gòn', 'Phố Hiến') WHERE description LIKE '%Sài Gòn%'`);
  await db.query(`UPDATE invoices SET restaurant_name = REPLACE(restaurant_name, 'Sài Gòn', 'Phố Hiến') WHERE restaurant_name LIKE '%Sài Gòn%'`);
  await db.commit();
  console.log('Đã ghi DB.');
} catch (error) {
  await db.rollback();
  throw error;
}
await db.end();
