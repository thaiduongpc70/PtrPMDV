/* Ô ảnh của ảnh ghép combo (thuần hàm, có test): mỗi ảnh món thành phần KHÁC NHAU là một ô (tối đa 4), thứ tự theo số lượng giảm dần;
   số lượng > 1 hiển thị thành nhãn "×N" trên ô — không nhân đôi ảnh giả. Combo chỉ có 1 ảnh thành phần thì chỉ 1 ô. */
export function comboTiles(parts, max = 4) {
  const byUrl = new Map();
  for (const part of parts) {
    if (!part.url) continue;
    const current = byUrl.get(part.url) ?? { url: part.url, quantity: 0, order: byUrl.size };
    current.quantity += Number(part.quantity ?? 1);
    byUrl.set(part.url, current);
  }
  return [...byUrl.values()].sort((a, b) => b.quantity - a.quantity || a.order - b.order).slice(0, max).map(({ url, quantity }) => ({ url, quantity }));
}
