/* Giờ đặt đơn thực tế theo từng quán (thuần hàm, có test):
   - đơn chỉ rơi vào giờ MỞ CỬA của quán (kể cả quán mở qua nửa đêm);
   - đường cong theo loại quán: ăn sáng (đỉnh ~7h), nhậu/lẩu đêm (đỉnh ~19–20h), trà sữa/cà phê/bánh ngọt (đỉnh ~15–16h), bữa chính (đỉnh trưa 12h và tối 19h).
   Phút trong "ngày kinh doanh": 0–1439 là trong ngày; ≥ 1440 là sau nửa đêm (thuộc ngày hôm sau). */

export const parseHM = value => {
  const [hour, minute] = String(value).split(':').map(Number);
  return (hour || 0) * 60 + (minute || 0);
};

/** Cửa sổ mở cửa { open, close, span } theo phút; close ≤ open nghĩa là qua nửa đêm; mở = đóng nghĩa là cả ngày. */
export function windowOf(opening, closing) {
  const open = parseHM(opening);
  let close = parseHM(closing);
  if (close <= open) close += 1440;
  return { open, close, span: close - open };
}

/** Phút trong ngày (0–1439) có nằm trong giờ mở cửa không (tính cả phần sau nửa đêm của ca qua đêm). */
export function inWindow(minuteOfDay, opening, closing) {
  const { open, close } = windowOf(opening, closing);
  return (minuteOfDay >= open && minuteOfDay < close) || (minuteOfDay + 1440 >= open && minuteOfDay + 1440 < close);
}

export const PROFILES = ['breakfast', 'night', 'drink', 'meal'];

/** Loại quán -> đường cong theo giờ (trọng số 0–23). */
const WEIGHTS = {
  breakfast: { 5: 2, 6: 8, 7: 14, 8: 12, 9: 7, 10: 4, 11: 3, 12: 2, 13: 2, 14: 1 },
  night: { 15: 1, 16: 2, 17: 5, 18: 9, 19: 14, 20: 14, 21: 12, 22: 9, 23: 6, 0: 3, 1: 2, 2: 1 },
  drink: { 8: 1, 9: 2, 10: 3, 11: 3, 12: 3, 13: 5, 14: 9, 15: 12, 16: 12, 17: 9, 18: 7, 19: 9, 20: 8, 21: 5, 22: 3, 23: 1 },
  meal: { 6: 1, 7: 2, 8: 4, 9: 3, 10: 4, 11: 10, 12: 14, 13: 9, 14: 4, 15: 4, 16: 5, 17: 8, 18: 13, 19: 14, 20: 9, 21: 3, 22: 1 }
};

/** Chọn loại đường cong theo giờ mở cửa, danh mục và tên quán. */
export function profileFor({ opening, closing, category = '', name = '' }) {
  const { open, close } = windowOf(opening, closing);
  const text = `${category} ${name}`.toLowerCase();
  if (/trà sữa|đồ uống|bánh & kem|cà phê|sinh tố|nước ép|chè/.test(text)) return 'drink';
  if (close > 1440 || open >= 15 * 60 || (/lẩu|nướng|nhậu|đêm|izakaya/.test(text) && close >= 21 * 60)) return 'night';
  if (open <= 6 * 60 + 30 && close <= 15 * 60) return 'breakfast';
  return 'meal';
}

/** Giờ cao điểm (giờ có trọng số lớn nhất trong cửa sổ mở cửa). */
export function peakHour(profile, opening, closing) {
  const { open, close } = windowOf(opening, closing);
  let best = null;
  for (let minute = open; minute < close; minute += 60) {
    const hour = Math.floor((minute % 1440) / 60);
    const weight = WEIGHTS[profile][hour] ?? 0.3;
    if (!best || weight > best.weight) best = { hour, weight };
  }
  return best?.hour ?? Math.floor(open / 60) % 24;
}

/** Bộ lấy mẫu: sample(rnd) trả phút trong ngày kinh doanh, luôn thuộc giờ mở cửa. Dùng rnd() ∈ [0,1). */
export function makeSampler({ opening, closing, category = '', name = '', profile = null }) {
  const win = windowOf(opening, closing);
  const kind = profile ?? profileFor({ opening, closing, category, name });
  const cumulative = [];
  let total = 0;
  for (let minute = win.open; minute < win.close; minute += 1) {
    const hour = Math.floor((minute % 1440) / 60);
    total += WEIGHTS[kind][hour] ?? 0.3; // ngoài đường cong vẫn có chút xác suất trong giờ mở cửa
    cumulative.push(total);
  }
  return {
    profile: kind,
    window: win,
    sample(rnd) {
      const target = rnd() * total;
      let low = 0; let high = cumulative.length - 1;
      while (low < high) { const mid = (low + high) >> 1; if (cumulative[mid] < target) low = mid + 1; else high = mid; }
      return win.open + low;
    }
  };
}
