/* Quy tắc đồ uống có cồn (thuần hàm): món có cồn phải được khách xác nhận đủ 18 tuổi khi đặt hàng.
   Nhận diện rõ ràng theo TÊN món: bắt đầu bằng bia/rượu/vodka/soju/whisky/sake/cocktail/vang hoặc tên nhãn bia phổ biến
   (không khớp "Bò bía", "Cơm rượu", "Hủ tiếu Nam Vang"). */
export const ADULT_AGE = 18;

const ALCOHOL_NAME = /^(bia|rượu|vodka|soju|whisky|whiskey|sake|cocktail|vang|chuhai|beer)(\s|$)|(^|\s)(tiger|heineken|saigon special|hennessy)(\s|$)/i;

export function isAlcoholic(name) {
  return ALCOHOL_NAME.test(String(name ?? '').normalize('NFC').trim());
}

export function alcoholicNames(names) {
  return [...new Set((names ?? []).filter(isAlcoholic))];
}

/** Tuổi tròn tại `now` từ ngày sinh (YYYY-MM-DD hoặc Date); null nếu chưa biết/không hợp lệ. */
export function ageOn(dateOfBirth, now = new Date()) {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

/** Kết quả: null (được đặt) | 'AGE_CONFIRMATION_REQUIRED' (thiếu xác nhận) | 'UNDER_AGE' (hồ sơ cho thấy chưa đủ 18 tuổi). */
export function checkAgeRule({ itemNames, ageConfirmed, dateOfBirth, now = new Date() }) {
  if (!alcoholicNames(itemNames).length) return null;
  const age = ageOn(dateOfBirth, now);
  if (age !== null && age < ADULT_AGE) return 'UNDER_AGE';
  return ageConfirmed === true ? null : 'AGE_CONFIRMATION_REQUIRED';
}
