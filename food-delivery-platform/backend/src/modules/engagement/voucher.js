/* Voucher dùng chung cho checkout, báo giá và ví voucher.
   `exec(sql, params)` trả về mảng dòng (query() thường hoặc connection.execute trong giao dịch). */

export function roundMoney(value) { return Math.round(Number(value) * 100) / 100; }

/** Số tiền giảm của một voucher với giỏ hiện tại. Freeship chỉ giảm tối đa bằng phí giao thực tế. */
export function discountFor(promotion, subtotal, deliveryFee) {
  if (promotion.discountType === 'FREE_DELIVERY') {
    const cap = promotion.maxDiscount ?? promotion.discountValue ?? deliveryFee;
    return roundMoney(Math.min(deliveryFee, cap > 0 ? cap : deliveryFee));
  }
  const raw = promotion.discountType === 'PERCENT' ? subtotal * promotion.discountValue / 100 : promotion.discountValue;
  return roundMoney(Math.max(0, Math.min(subtotal, promotion.maxDiscount == null ? raw : Math.min(raw, promotion.maxDiscount))));
}

/** Tính tiền đơn: giảm món trừ vào tiền món, freeship trừ vào phí giao (phí giao vẫn ghi nhận để tài xế được trả đủ). */
export function priceOrder({ subtotal, deliveryFee, serviceFee = 0, taxRate = 0, promotion = null }) {
  const taxAmount = roundMoney(subtotal * (taxRate / 100));
  const discountAmount = promotion ? discountFor(promotion, subtotal, deliveryFee) : 0;
  const totalAmount = roundMoney(Math.max(0, subtotal + deliveryFee + serviceFee + taxAmount - discountAmount));
  return { subtotal: roundMoney(subtotal), deliveryFee, serviceFee, taxAmount, discountAmount, totalAmount };
}

/**
 * Các voucher khách có thể thấy cho một giỏ hàng. Mỗi voucher kèm: eligible (đủ điều kiện dùng ngay),
 * shortfall (cần mua thêm bao nhiêu để đạt đơn tối thiểu), discountAmount (tiết kiệm được nếu áp dụng).
 */
export async function listVouchers(exec, { customerId, restaurantId = null, subtotal = 0, deliveryFee = 0, code = null }) {
  const params = [customerId, customerId, customerId];
  let extra = '';
  if (restaurantId) { extra += ' AND (p.restaurant_id IS NULL OR p.restaurant_id = ?)'; params.push(restaurantId); }
  if (code) { extra += ' AND UPPER(p.code) = UPPER(?)'; params.push(code); }
  const rows = await exec(
    `SELECT p.*, r.name AS restaurant_name,
            (SELECT COUNT(*) FROM promotion_usage pu WHERE pu.promotion_id = p.id AND pu.customer_id = ?) AS customer_usage,
            EXISTS(SELECT 1 FROM orders o WHERE o.customer_id = ? AND o.order_status NOT IN ('CANCELLED', 'FAILED') AND o.deleted_at IS NULL) AS has_orders
     FROM promotions p LEFT JOIN restaurants r ON r.id = p.restaurant_id
     WHERE p.status = 'ACTIVE' AND p.deleted_at IS NULL AND p.start_at <= CURRENT_TIMESTAMP AND p.end_at >= CURRENT_TIMESTAMP
       AND (p.customer_id IS NULL OR p.customer_id = ?) AND (p.usage_limit IS NULL OR p.used_count < p.usage_limit)${extra}
     ORDER BY p.id`, params
  );
  return rows
    .filter(row => Number(row.customer_usage) < Number(row.usage_per_customer) && !(row.first_order_only && Number(row.has_orders)))
    .map(row => {
      const promotion = {
        id: Number(row.id), code: row.code, name: row.name, description: row.description ?? null,
        restaurantId: row.restaurant_id == null ? null : Number(row.restaurant_id), restaurantName: row.restaurant_name ?? null,
        scope: row.customer_id != null ? 'PERSONAL' : row.restaurant_id == null ? 'PLATFORM' : 'RESTAURANT',
        discountType: row.discount_type, discountValue: Number(row.discount_value),
        maxDiscount: row.max_discount == null ? null : Number(row.max_discount), minimumOrder: Number(row.minimum_order),
        firstOrderOnly: Boolean(row.first_order_only), endAt: row.end_at
      };
      const shortfall = Math.max(0, roundMoney(promotion.minimumOrder - subtotal));
      return { ...promotion, eligible: shortfall === 0, shortfall, discountAmount: discountFor(promotion, subtotal, deliveryFee) };
    });
}
