/** Quán đang mở cửa theo giờ máy chủ; hỗ trợ quán mở qua nửa đêm. Thiếu giờ mở/đóng = mở cả ngày. */
export function isOpenNow(opening, closing, at = new Date()) {
  if (!opening || !closing) return true;
  const toMinutes = value => Number(String(value).slice(0, 2)) * 60 + Number(String(value).slice(3, 5));
  const now = at.getHours() * 60 + at.getMinutes();
  const open = toMinutes(opening);
  const close = toMinutes(closing);
  if (open === close) return true;
  return open < close ? now >= open && now < close : now >= open || now < close;
}

/** Script dựng dữ liệu cần đặt đơn ngoài giờ (ALLOW_ORDER_WHEN_CLOSED=1); môi trường thật để mặc định (chặn). */
export const ordersAllowedWhenClosed = () => process.env.ALLOW_ORDER_WHEN_CLOSED === '1';
