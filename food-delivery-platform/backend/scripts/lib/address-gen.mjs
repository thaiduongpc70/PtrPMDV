/* Sinh địa chỉ giao cho khách mô phỏng MỚI (thuần hàm, có test): chỉ dùng tên đường THẬT (OSM, data/new-places.json),
   loại tên chung chung ("Đường chung cư", "Đường trục phía Bắc", "Đường số 5"…); mọi địa chỉ đều có số nhà + tên đường. */

const GENERIC = /(chung cư|trục|nội bộ|khu |ngõ |ngách |đường số|không tên|đường chính|đường nhánh)/i;

/** Tên đường có phải tên riêng thật (không chung chung, tối thiểu 2 từ/ký tự có nghĩa)? */
export function isRealStreet(name) {
  const text = String(name ?? '').trim();
  if (text.length < 5 || GENERIC.test(text)) return false;
  const stripped = text.replace(/^(Đường|Phố|Đê|Quốc lộ|Tỉnh lộ)\s+/i, '');
  return /^[A-ZÀ-Ỵ]/.test(stripped) && stripped.split(/\s+/).length >= 1 && !/^\d+$/.test(stripped);
}

/** Các khu vực (HN và HY) còn ít nhất một đường thật; mỗi khu vực chỉ giữ đường thật. */
export function usablePlaces(places, regions = ['HN', 'HY']) {
  return places
    .filter(place => regions.includes(place.region))
    .map(place => ({ ...place, streets: place.streets.filter(street => isRealStreet(street.name)) }))
    .filter(place => place.streets.length > 0);
}

/** Một địa chỉ: { addressLine, district, city, latitude, longitude }; rnd() ∈ [0,1). */
export function buildAddress(rnd, place, buildings = []) {
  const between = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const street = place.streets[Math.floor(rnd() * place.streets.length)];
  const building = buildings.length && rnd() < 0.25 ? `, ${buildings[Math.floor(rnd() * buildings.length)]}` : '';
  return {
    addressLine: `${between(1, 240)} ${street.name}${building}`,
    district: place.ward, city: place.city,
    latitude: Number((street.lat + (rnd() - 0.5) * 0.004).toFixed(7)),
    longitude: Number((street.lng + (rnd() - 0.5) * 0.004).toFixed(7))
  };
}
