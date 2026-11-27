/* Giờ mở cửa tính theo giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7, không có giờ mùa hè) — KHÔNG phụ thuộc múi giờ của máy chủ. */
export const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';
const VN_OFFSET_MS = 7 * 3600 * 1000;

/** Giờ hiện tại ở Việt Nam: phút trong ngày, thứ (1 = Thứ hai … 7 = Chủ nhật, khớp restaurant_operating_hours) và chuỗi HH:MM:SS. */
export function vietnamClock(at = new Date()) {
  const shifted = new Date(at.getTime() + VN_OFFSET_MS);
  const hours = shifted.getUTCHours();
  const minutes = shifted.getUTCMinutes();
  const day = shifted.getUTCDay();
  const pad = value => String(value).padStart(2, '0');
  return { minutes: hours * 60 + minutes, isoDay: day === 0 ? 7 : day, previousIsoDay: day === 0 ? 6 : day === 1 ? 7 : day - 1, time: `${pad(hours)}:${pad(minutes)}:${pad(shifted.getUTCSeconds())}` };
}

const toMinutes = value => Number(String(value).slice(0, 2)) * 60 + Number(String(value).slice(3, 5));

/** Khung giờ (mở, đóng) chứa phút `now`? Cho phép qua nửa đêm; mở = đóng nghĩa là cả ngày. */
function inWindow(open, close, now) {
  const from = toMinutes(open);
  const to = toMinutes(close);
  if (from === to) return true;
  return from < to ? now >= from && now < to : now >= from || now < to;
}

/**
 * Quán đang mở cửa theo giờ Việt Nam.
 * - `operatingHours` (restaurant_operating_hours: [{ dayOfWeek 1..7, openTime, closeTime, isClosed }]) có dữ liệu thì dùng theo thứ trong tuần
 *   (kể cả phần giờ khuya của ngày hôm trước nếu quán mở qua nửa đêm); ngày không có dòng thì dùng `opening`/`closing`.
 * - Không có giờ nào cả = mở cả ngày.
 */
export function isOpenNow(opening, closing, at = new Date(), operatingHours = null) {
  const clock = vietnamClock(at);
  const rows = Array.isArray(operatingHours) ? operatingHours : [];
  const today = rows.find(row => Number(row.dayOfWeek) === clock.isoDay);
  if (today) {
    if (!today.isClosed && today.openTime && today.closeTime && inWindow(today.openTime, today.closeTime, clock.minutes)) return true;
    // phần giờ khuya (sau 00:00) của ca mở qua nửa đêm hôm trước
    const yesterday = rows.find(row => Number(row.dayOfWeek) === clock.previousIsoDay);
    if (yesterday && !yesterday.isClosed && yesterday.openTime && yesterday.closeTime && toMinutes(yesterday.openTime) > toMinutes(yesterday.closeTime) && clock.minutes < toMinutes(yesterday.closeTime)) return true;
    return false;
  }
  if (!opening || !closing) return true;
  return inWindow(opening, closing, clock.minutes);
}

/** Script dựng dữ liệu cần đặt đơn ngoài giờ (ALLOW_ORDER_WHEN_CLOSED=1); môi trường thật để mặc định (chặn). */
export const ordersAllowedWhenClosed = () => process.env.ALLOW_ORDER_WHEN_CLOSED === '1';
