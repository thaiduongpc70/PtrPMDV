/* Nguồn tên, địa chỉ và câu đánh giá tiếng Việt cho script mô phỏng. */

export const SURNAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Trương', 'Đinh', 'Lâm', 'Mai'];
export const MALE_MIDDLE = ['Văn', 'Minh', 'Quốc', 'Hoàng', 'Gia', 'Anh', 'Đức', 'Hữu', 'Tuấn', 'Thanh', 'Công', 'Xuân', 'Bảo', 'Trọng'];
export const FEMALE_MIDDLE = ['Thị', 'Ngọc', 'Thùy', 'Kim', 'Mỹ', 'Phương', 'Thu', 'Hoài', 'Khánh', 'Bích', 'Diệu', 'Hồng', 'Thanh', 'Mai'];
export const MALE_GIVEN = ['Nam', 'Huy', 'Khoa', 'Long', 'Phúc', 'Đạt', 'Hiếu', 'Tài', 'Bách', 'Khang', 'Minh', 'Tín', 'Vinh', 'Sơn', 'Hải', 'Quân', 'Thịnh', 'Trung', 'Việt', 'Kiệt', 'Duy', 'Nhân', 'Thành', 'Lộc', 'Hưng'];
export const FEMALE_GIVEN = ['Anh', 'Hà', 'Trang', 'Linh', 'Vy', 'Thảo', 'Nhung', 'Yến', 'Hân', 'Chi', 'My', 'Ngân', 'Quyên', 'Trinh', 'Uyên', 'Hương', 'Lan', 'Thư', 'Dung', 'Ly', 'Châu', 'Phượng', 'Tâm', 'Diệp', 'Nhi'];

export const DISTRICTS = [
  ['Quận 1', 10.7769, 106.7009], ['Quận 3', 10.7843, 106.6844], ['Quận 5', 10.7540, 106.6634], ['Quận 10', 10.7727, 106.6679],
  ['Bình Thạnh', 10.8106, 106.7091], ['Phú Nhuận', 10.7992, 106.6803], ['Tân Bình', 10.8014, 106.6527], ['Gò Vấp', 10.8386, 106.6652],
  ['Quận 4', 10.7578, 106.7013], ['Quận 7', 10.7340, 106.7218]
];
export const STREETS = ['Nguyễn Trãi', 'Lê Lợi', 'Hai Bà Trưng', 'Cách Mạng Tháng Tám', 'Điện Biên Phủ', 'Võ Văn Tần', 'Pasteur', 'Nam Kỳ Khởi Nghĩa', 'Trần Hưng Đạo', 'Lý Thường Kiệt',
  'Nguyễn Đình Chiểu', 'Phan Đăng Lưu', 'Xô Viết Nghệ Tĩnh', 'Nguyễn Thị Minh Khai', 'Lê Văn Sỹ', 'Hoàng Văn Thụ', 'Bạch Đằng', 'Nguyễn Văn Đậu'];
export const BUILDINGS = ['Chung cư Sunrise', 'Tòa nhà Vincom', 'Chung cư Masteri', 'Nhà trọ', 'Văn phòng Etown', 'Chung cư Hoàng Anh', 'Căn hộ The Manor', 'Nhà riêng'];

export const BANKS = [['Vietcombank', 'VCB'], ['Techcombank', 'TCB'], ['MB Bank', 'MB'], ['ACB', 'ACB'], ['BIDV', 'BIDV']];

/* Câu đánh giá món theo số sao. {dish} được thay bằng tên món. */
export const DISH_COMMENTS = {
  5: [
    '{dish} ngon xuất sắc, đúng vị mình thích, sẽ đặt lại.',
    'Ăn {dish} ở đây là mê luôn, phần đầy đặn, nóng hổi lúc nhận.',
    'Rất hài lòng, {dish} nêm nếm vừa miệng, đóng gói gọn gàng.',
    'Ngon hơn mong đợi! {dish} đáng tiền, cả nhà ai cũng khen.',
    '{dish} chuẩn vị, nguyên liệu tươi, giao tới vẫn còn nóng.',
    'Đã đặt {dish} nhiều lần, lần nào cũng ổn định, 5 sao.',
    'Món ngon, đóng gói kỹ, không bị đổ sốt. Quá tuyệt.',
    'Ăn một lần nhớ mãi, {dish} ở đây làm rất có tâm.'
  ],
  4: [
    '{dish} ngon, hơi nhiều dầu một chút nhưng nhìn chung ổn.',
    'Món ăn được, phần vừa đủ ăn, sẽ ủng hộ thêm.',
    '{dish} vị ổn, giao hơi lâu một xíu nhưng đồ vẫn còn ấm.',
    'Ngon, giá hợp lý. Mong quán cho thêm chút rau nữa là hoàn hảo.',
    'Khá ngon, đúng mô tả. Trừ một sao vì hơi mặn so với khẩu vị mình.',
    '{dish} tạm ổn, đáng để thử, đóng gói sạch sẽ.',
    'Món chuẩn, chỉ thiếu chút nước chấm thôi.'
  ],
  3: [
    '{dish} bình thường, không có gì đặc biệt so với giá.',
    'Ăn được nhưng chưa thấy ấn tượng, phần hơi ít.',
    'Vị nhạt hơn mình nghĩ, giao tới đồ đã nguội một ít.',
    'Tạm được, chắc lần sau thử món khác xem sao.',
    '{dish} hơi khô, nêm chưa đậm, nhưng vẫn ăn được.'
  ],
  2: [
    '{dish} nguội và hơi mặn, không như hình đăng.',
    'Phần ăn ít so với giá, vị chưa ngon, hơi thất vọng.',
    'Giao tới bị nguội ngắt, món cũng không được tươi.',
    'Đồ ăn có mùi hơi lạ, ăn không hết, mong quán cải thiện.'
  ],
  1: [
    '{dish} rất tệ, giao thiếu món và đồ đã nguội hoàn toàn.',
    'Không như mô tả, vị khó ăn, sẽ không đặt lại.',
    'Thất vọng, món bị đổ tràn và thiếu phần ăn kèm.',
    'Đồ ăn không tươi, ăn xong thấy khó chịu bụng. Rất không hài lòng.'
  ]
};

export const RESTAURANT_COMMENTS = {
  5: ['Quán làm món rất có tâm, đóng gói đẹp.', 'Nhà hàng chuẩn bị nhanh, món ngon, sẽ quay lại.', 'Dịch vụ tuyệt vời, đồ ăn luôn ổn định.', 'Quán uy tín, đặt nhiều lần không lần nào thất vọng.'],
  4: ['Quán ổn, món ngon, thời gian chuẩn bị hơi lâu giờ cao điểm.', 'Đồ ăn tốt, giá hợp lý, đóng gói ổn.', 'Nhìn chung hài lòng, mong quán chuẩn bị nhanh hơn một chút.'],
  3: ['Quán trung bình, món có lúc ngon có lúc nhạt.', 'Đóng gói chưa kỹ, món ăn ở mức chấp nhận được.'],
  2: ['Chờ quán chuẩn bị khá lâu, đồ ăn không như kỳ vọng.', 'Phục vụ chưa tốt, thiếu món nhưng không báo.'],
  1: ['Quán làm sai đơn và chuẩn bị rất chậm, không hài lòng.', 'Rất thất vọng về chất lượng, sẽ không quay lại.']
};

export const SHIPPER_COMMENTS = {
  5: ['Tài xế thân thiện, giao nhanh, gọi điện trước khi đến.', 'Anh shipper nhiệt tình, đồ còn nóng khi nhận.', 'Giao đúng giờ, lịch sự, cảm ơn anh.', 'Chị shipper rất lịch sự, giao tận cửa.'],
  4: ['Giao hơi chậm một chút nhưng thái độ tốt.', 'Tài xế ổn, đồ không bị đổ.', 'Giao nhanh, chỉ hơi khó tìm địa chỉ.'],
  3: ['Giao bình thường, hơi lâu so với dự kiến.', 'Tài xế gọi mình hơi trễ nên phải chờ.'],
  2: ['Tài xế giao trễ gần 20 phút, không báo trước.', 'Thái độ chưa thân thiện lắm.'],
  1: ['Giao rất trễ và đồ bị nghiêng đổ, không xin lỗi.', 'Tài xế để đồ trước cửa, không liên lạc.']
};

export const CANCEL_REASONS = ['Tôi đặt nhầm món', 'Đổi ý, không muốn đặt nữa', 'Đặt trùng đơn', 'Thời gian chờ quá lâu', 'Nhập sai địa chỉ giao hàng'];
export const REJECT_REASONS = ['Hết nguyên liệu món này', 'Quán sắp đóng cửa', 'Quá tải đơn, không kịp chuẩn bị'];
export const TICKET_SUBJECTS = [
  ['Đơn giao thiếu món', 'Đơn của tôi thiếu một món so với đặt, nhờ hỗ trợ xử lý.', 'ORDER'],
  ['Đồ ăn bị nguội khi nhận', 'Món giao tới đã nguội, tôi muốn phản hồi về thời gian giao.', 'ORDER'],
  ['Hỏi về hoá đơn', 'Tôi cần xuất hoá đơn cho đơn hàng này.', 'PAYMENT'],
  ['Thanh toán online bị trừ tiền hai lần', 'Tôi thấy ngân hàng trừ tiền hai lần cho một đơn.', 'PAYMENT']
];
export const CHAT_LINES = {
  customer: ['Quán ơi cho mình ít cay nhé.', 'Mình ở tầng 5, shipper gọi giúp mình khi tới.', 'Cho mình xin thêm đũa và tương ớt nhé.', 'Quán làm giúp mình chín kỹ một chút.'],
  restaurant: ['Dạ quán đã ghi chú, cảm ơn bạn.', 'Dạ đơn của bạn đang được chuẩn bị ạ.', 'Quán sẽ gửi thêm theo yêu cầu, cảm ơn bạn đã đặt.']
};
