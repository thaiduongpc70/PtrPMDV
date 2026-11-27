/* Danh mục nhóm tuỳ chọn cho quán mới (tạo qua API chủ quán).
   ADDONS: topping thêm có giá, không giới hạn số lần chọn (maxSelect = số topping của nhóm).
   SINGLE: nhóm chọn 1 (Mức đường/Mức đá bắt buộc; Độ cay tuỳ chọn). */
export const ADDONS = {
  tea_milk: ['Topping trà sữa', [['Trân châu đen', 7000], ['Trân châu trắng', 7000], ['Thạch trái cây', 8000], ['Pudding trứng', 9000], ['Kem cheese', 10000], ['Sương sáo', 7000]]],
  tea_fruit: ['Topping trà trái cây', [['Thạch trái cây', 8000], ['Trân châu trắng', 7000], ['Hạt chia', 5000], ['Thạch dừa', 7000]]],
  tea_lemon: ['Thêm vào ly trà', [['Thêm chanh tươi', 3000], ['Thêm sả tắc', 3000], ['Thêm mật ong', 5000], ['Thêm hạt chia', 5000]]],
  coffee: ['Thêm vào ly cà phê', [['Thêm shot espresso', 10000], ['Thêm sữa đặc', 5000], ['Thêm kem muối', 9000], ['Thêm kem trứng', 12000], ['Sốt caramel', 5000]]],
  juice: ['Thêm vào nước ép', [['Hạt chia', 5000], ['Thạch dừa', 7000], ['Thạch trái cây', 8000]]],
  sweet: ['Thêm vào bánh', [['Kem tươi', 8000], ['Sốt caramel', 5000], ['Kem vani', 10000]]],
  cake_slice: ['Thêm cho phần bánh', [['Thêm nến + bảng chữ', 10000], ['Thêm kem tươi', 8000], ['Thêm dâu tươi', 15000]]],
  noodle_bowl: ['Thêm vào tô', [['Thêm thịt', 15000], ['Thêm trứng cút', 6000], ['Thêm rau sống', 3000], ['Thêm quẩy', 5000]]],
  pho_extra: ['Thêm vào tô phở', [['Thêm thịt bò tái', 20000], ['Thêm nạm gầu', 20000], ['Thêm trứng chần', 6000], ['Thêm quẩy giòn', 5000], ['Thêm hành chần', 3000]]],
  bun_cha: ['Thêm vào mẹt bún chả', [['Thêm chả nướng', 15000], ['Thêm nem cua bể', 12000], ['Thêm bún', 5000], ['Thêm rau sống', 4000]]],
  banh_cuon: ['Thêm vào đĩa bánh cuốn', [['Thêm chả quế', 10000], ['Thêm giò lụa', 8000], ['Thêm hành phi', 3000], ['Thêm bánh cuốn', 8000]]],
  xoi_extra: ['Thêm vào xôi', [['Thêm chà bông', 8000], ['Thêm trứng cút', 6000], ['Thêm chả', 8000], ['Thêm hành phi', 3000]]],
  rice_side: ['Ăn kèm', [['Thêm trứng ốp la', 7000], ['Thêm chả trứng', 10000], ['Thêm đồ chua', 4000], ['Thêm canh', 8000]]],
  claypot_side: ['Thêm vào phần cơm niêu', [['Thêm cơm cháy', 8000], ['Thêm canh', 8000], ['Thêm trứng ốp la', 7000], ['Thêm dưa góp', 4000]]],
  lau_extra: ['Thêm vào lẩu', [['Thêm bò viên', 8000], ['Thêm tôm viên', 10000], ['Thêm nấm', 8000], ['Thêm rau', 5000], ['Thêm mì', 5000]]],
  grill_extra: ['Thêm vào phần nướng', [['Thêm rau cuốn', 6000], ['Thêm kim chi', 8000], ['Thêm sốt chấm', 4000], ['Thêm cơm trắng', 5000]]],
  korean_extra: ['Thêm vào món Hàn', [['Thêm phô mai', 8000], ['Thêm trứng', 5000], ['Thêm chả cá', 6000], ['Thêm mì ăn liền', 8000]]],
  kimchi_side: ['Ăn kèm kiểu Hàn', [['Thêm kim chi', 8000], ['Thêm củ cải muối', 6000], ['Thêm rong biển', 8000]]],
  korean_chicken: ['Thêm vào gà rán Hàn', [['Thêm sốt cay ngọt', 4000], ['Thêm sốt phô mai', 9000], ['Thêm củ cải muối', 6000]]],
  ramen_extra: ['Thêm vào tô ramen', [['Thêm trứng lòng đào', 10000], ['Thêm thịt chashu', 20000], ['Thêm rong biển', 8000], ['Thêm ngô bơ', 8000], ['Thêm mì', 12000]]],
  sushi_extra: ['Thêm vào phần sushi', [['Thêm wasabi', 2000], ['Thêm gừng hồng', 2000], ['Thêm nước tương', 1000], ['Thêm sốt mayonnaise', 3000]]],
  dimsum_extra: ['Thêm nước chấm', [['Thêm tương ớt', 2000], ['Thêm giấm gừng', 2000], ['Thêm sốt XO', 8000]]],
  tempura: ['Thêm vào phần chiên', [['Thêm nước chấm tentsuyu', 3000], ['Thêm củ cải bào', 3000], ['Thêm cơm trắng', 5000]]],
  glass_extra: ['Thêm vào ly', [['Thêm chanh tươi', 3000], ['Thêm sả tắc', 3000], ['Thêm mật ong', 5000]]],
  side_extra: ['Thêm ăn kèm', [['Thêm nước chấm', 3000], ['Thêm ớt tươi', 2000], ['Thêm cơm trắng', 5000], ['Thêm đồ chua', 4000]]],
  che_extra: ['Thêm vào chè', [['Thêm thạch', 5000], ['Thêm nước cốt dừa', 5000], ['Thêm trân châu', 7000], ['Thêm nhãn tươi', 8000]]],
  chicken_set: ['Thêm vào phần gà', [['Thêm muối tiêu chanh', 2000], ['Thêm lá chanh', 2000], ['Thêm xôi nếp', 12000], ['Thêm gỏi', 15000]]],
  pizza_top: ['Thêm topping pizza', [['Thêm phô mai', 15000], ['Thêm nấm', 12000], ['Thêm xúc xích', 15000], ['Thêm ô liu', 10000]]]
};

export const SINGLE = {
  sugar: { name: 'Mức đường', min: 1, max: 1, required: true, items: [['100% đường', 0], ['70% đường', 0], ['50% đường', 0], ['30% đường', 0], ['Không đường', 0]] },
  ice: { name: 'Mức đá', min: 1, max: 1, required: true, items: [['Đá bình thường', 0], ['Ít đá', 0], ['Không đá', 0]] },
  spicy: { name: 'Độ cay', min: 0, max: 1, required: false, items: [['Không cay', 0], ['Cay vừa', 0], ['Cay nhiều', 0]] }
};

export const VARIANT_SETS = {
  portion: [['Phần thường', 0], ['Phần lớn', 10000]],
  bowl: [['Tô thường', 0], ['Tô đặc biệt', 15000]],
  drink: [['Size M', 0], ['Size L', 8000]],
  piece: [['Phần nhỏ', 0], ['Phần lớn', 25000]],
  cake: [['Cỡ 16cm', 0], ['Cỡ 20cm', 90000]]
};
