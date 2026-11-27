/* Kiểm tra ngữ cảnh/số sao của một bình luận đánh giá (dùng cho script viết lại bình luận và test). */
/** Lỗi ngữ cảnh/số sao của một bình luận (dùng báo cáo trước/sau). */
export function violations(text, { rating, kind = 'food', temp = 'hot', drink = false } = {}) {
  const found = [];
  const stars = [...String(text ?? '').matchAll(/(?:Cho|Chấm|chấm|cho)\s+(\d)\s*sao/g)].map(match => Number(match[1]));
  if (stars.some(n => n !== Number(rating))) found.push('sao_khác_rating');
  if (/đúng kiểu/.test(text ?? '')) found.push('đúng_kiểu');
  if ((drink || kind === 'dessert' || temp === 'cold') && /nóng hổi|còn nóng|giao còn nguyên hình|Món nóng/.test(text ?? '')) found.push('nóng_sai_nhãn');
  if (drink && /phần ăn/i.test(text ?? '')) found.push('phần_ăn_đồ_uống');
  return found;
}
