/** Định dạng tiền VND kiểu Việt Nam: 49000 -> "49.000đ" (không phụ thuộc ICU của Node). */
export function formatVnd(value) {
  const number = Math.round(Number(value) || 0);
  const sign = number < 0 ? '-' : '';
  return `${sign}${String(Math.abs(number)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
}
