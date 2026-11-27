/* 63 tỉnh/thành Việt Nam (tên hiển thị) + tên viết khác thường gặp trong dữ liệu địa chỉ để khớp cột `city`. */
const NAMES = [
  'Hà Nội', 'Hồ Chí Minh', 'Hải Phòng', 'Đà Nẵng', 'Cần Thơ', 'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu', 'Bắc Ninh',
  'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước', 'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông', 'Điện Biên', 'Đồng Nai',
  'Đồng Tháp', 'Gia Lai', 'Hà Giang', 'Hà Nam', 'Hà Tĩnh', 'Hải Dương', 'Hậu Giang', 'Hòa Bình', 'Hưng Yên', 'Khánh Hòa', 'Kiên Giang',
  'Kon Tum', 'Lai Châu', 'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định', 'Nghệ An', 'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên',
  'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên',
  'Thanh Hóa', 'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang', 'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái'
];

const EXTRA_ALIASES = {
  'Hồ Chí Minh': ['TP.HCM', 'TP. HCM', 'TPHCM', 'TP. Hồ Chí Minh', 'TP Hồ Chí Minh', 'Thành phố Hồ Chí Minh', 'Sài Gòn'],
  'Hà Nội': ['TP. Hà Nội', 'TP Hà Nội', 'Thành phố Hà Nội'],
  'Đà Nẵng': ['TP. Đà Nẵng', 'TP Đà Nẵng', 'Thành phố Đà Nẵng'],
  'Hải Phòng': ['TP. Hải Phòng', 'TP Hải Phòng', 'Thành phố Hải Phòng'],
  'Cần Thơ': ['TP. Cần Thơ', 'TP Cần Thơ', 'Thành phố Cần Thơ'],
  'Hưng Yên': ['TP. Hưng Yên', 'TP Hưng Yên', 'Thành phố Hưng Yên']
};

export const PROVINCES = NAMES.map(name => ({
  name,
  aliases: [name, `Tỉnh ${name}`, ...(EXTRA_ALIASES[name] ?? [])],
  // Trung tâm (dùng làm vị trí mặc định khi khách chưa cho biết vị trí)
  center: { 'Hồ Chí Minh': [10.7721, 106.698], 'Hà Nội': [21.0285, 105.8542], 'Đà Nẵng': [16.0544, 108.2022], 'Hải Phòng': [20.8449, 106.6881], 'Cần Thơ': [10.0452, 105.7469], 'Hưng Yên': [20.6464, 106.0511] }[name] ?? null
}));

/** Tìm tỉnh/thành theo tên người dùng chọn hoặc tên viết khác; trả về null nếu không có. */
export function findProvince(value) {
  if (!value) return null;
  const needle = String(value).trim().toLowerCase();
  return PROVINCES.find(province => province.aliases.some(alias => alias.toLowerCase() === needle)) ?? null;
}
