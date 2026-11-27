/* Phí giao hàng theo khoảng cách: phí cơ bản gồm 3 km đầu, mỗi km tiếp theo (làm tròn lên) cộng `perKm`.
   Quá `maxKm` thì quán không giao tới địa chỉ đó. Thiếu toạ độ thì tính phí cơ bản. */
export const INCLUDED_KM = 3;
/** Quãng đường giao tối đa mặc định (km); admin đổi qua cấu hình `max_delivery_distance`. Trên mức này thì không giao. */
export const DEFAULT_MAX_KM = 15;

export function distanceKm(lat1, lon1, lat2, lon2) {
  const values = [lat1, lon1, lat2, lon2].map(value => (value == null ? NaN : Number(value)));
  if (values.some(Number.isNaN)) return null;
  const [a1, o1, a2, o2] = values.map(degree => degree * Math.PI / 180);
  const h = Math.sin((a2 - a1) / 2) ** 2 + Math.cos(a1) * Math.cos(a2) * Math.sin((o2 - o1) / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * 100) / 100;
}

export function deliveryFeeFor({ base = 15000, perKm = 5000, maxKm = DEFAULT_MAX_KM }, km) {
  if (km == null) return { fee: base, km: null, tooFar: false };
  if (km > maxKm) return { fee: base, km, tooFar: true };
  return { fee: base + Math.max(0, Math.ceil(km - INCLUDED_KM)) * perKm, km, tooFar: false };
}

export function feeSettings(map) {
  const number = (key, fallback) => (Number.isFinite(map[key]) ? map[key] : fallback);
  return { base: number('delivery_base_fee', 15000), perKm: number('delivery_price_per_km', 5000), maxKm: number('max_delivery_distance', DEFAULT_MAX_KM) };
}

/**
 * Bảng phí giao theo khoảng cách, sinh từ chính `deliveryFeeFor` (không có số cứng riêng):
 * [{ fromKm, toKm, fee }] — mốc đầu gồm `INCLUDED_KM` km đầu, các mốc sau mỗi km một bậc, dừng ở `maxKm`.
 */
export function deliveryFeeTable(options) {
  const { maxKm } = { maxKm: DEFAULT_MAX_KM, ...options };
  const rows = [{ fromKm: 0, toKm: Math.min(INCLUDED_KM, Math.floor(maxKm)), fee: deliveryFeeFor(options, 0).fee }];
  for (let km = INCLUDED_KM + 1; km <= Math.floor(maxKm); km += 1) {
    rows.push({ fromKm: km - 1, toKm: km, fee: deliveryFeeFor(options, km).fee });
  }
  return rows;
}
