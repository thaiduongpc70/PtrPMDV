/* 16 quán mới: 11 ở Hà Nội + 5 ở Hưng Yên, nhiều loại hình khác nhau.
   Mọi thứ (hồ sơ đối tác, thực đơn, topping, combo, voucher) được nạp qua API thật bởi scripts/add-restaurants.mjs.
   Món: [nhóm, tên, giá, mô tả, { v: bộ size, f: nổi bật, d: giá giảm, t: phút chế biến, a: nhóm topping thêm, s: [nhóm chọn 1] }]
   Nhóm (cats): [tên, { a, s }] — a/s mặc định cho cả nhóm, từng món có thể ghi đè (a: null để bỏ). */

import { NEW_RESTAURANTS_HN2 } from './new-restaurants-hn2.mjs';

const D = ['sugar', 'ice']; // đồ uống lạnh
const H = ['sugar'];        // đồ uống nóng
const S = ['spicy'];

export const NEW_CATEGORIES = [
  ['Món Hàn', 'Tokbokki, cơm trộn, gà rán Hàn Quốc và đồ ăn kiểu Hàn'],
  ['Món Nhật', 'Sushi, ramen, udon, cơm cà ri và món chiên kiểu Nhật'],
  ['Dimsum & Món Hoa', 'Dimsum, xíu mại, há cảo và các món Hoa'],
  ['Bánh & Kem', 'Bánh ngọt, bánh kem, kem, chè và món tráng miệng'],
  ['Lẩu & Nướng', 'Lẩu, nướng than hoa và đồ nhắm']
];

export const NEW_RESTAURANTS = [
  /* ================= HÀ NỘI ================= */
  {
    key: 'pho-pho-co', region: 'HN', city: 'Hà Nội', anchor: [21.0338, 105.8505], kind: 'food', category: 'Bún - Phở', hours: ['06:00', '22:00'], minOrder: 50000,
    owner: { username: 'pho.phoco', ownerName: 'Nguyễn Văn Hải', phone: '0912340101' },
    name: 'Phở Bò Phố Cổ', description: 'Phở bò Hà Nội nước trong, thịt tái nạm gầu, hành chần và quẩy nóng — mở cửa từ tờ mờ sáng.',
    cats: [['Phở', { a: 'pho_extra', s: S }], ['Món ăn kèm', { a: null }], ['Đồ uống', { a: 'glass_extra', s: D }]],
    dishes: [
      [0, 'Phở bò tái', 60000, 'Bánh phở mềm, bò tái thái mỏng chần nước dùng xương hầm 10 giờ, hành lá ngò.', { v: 'bowl', f: 1 }],
      [0, 'Phở bò chín', 60000, 'Nạm gầu chín mềm, nước dùng ngọt thanh, ăn kèm giá và chanh ớt.', { v: 'bowl' }],
      [0, 'Phở bò tái nạm', 65000, 'Kết hợp bò tái và nạm chín, nước dùng đậm vị gừng nướng, hồi quế.', { v: 'bowl', f: 1 }],
      [0, 'Phở bò viên', 58000, 'Bò viên dai giòn, bánh phở, nước dùng trong, ăn kèm hành tây ngâm giấm.', { v: 'bowl' }],
      [0, 'Phở gà', 55000, 'Thịt gà ta xé phay, nước dùng gà ngọt, lá chanh thái sợi.', { v: 'bowl' }],
      [0, 'Phở trộn', 62000, 'Phở khô trộn bò tái, hành phi, đậu phộng rang, nước sốt đặc biệt.', { v: 'bowl' }],
      [0, 'Phở cuốn', 58000, 'Lá phở tươi cuốn bò xào hành tây, rau thơm, chấm mắm chua ngọt.', { t: 12, a: 'side_extra', s: [] }],
      [1, 'Quẩy giòn', 10000, 'Quẩy chiên giòn nóng, chấm nước phở.', { t: 5, a: null }],
      [1, 'Trứng chần', 8000, 'Trứng gà ta chần lòng đào ăn kèm phở.', { t: 5, a: null }],
      [1, 'Giò lụa', 30000, 'Giò lụa Ước Lễ thái lát mỏng.', { a: 'side_extra' }],
      [1, 'Nem rán Hà Nội', 45000, 'Nem rán vỏ giòn nhân thịt, mộc nhĩ, miến; chấm nước mắm chua ngọt.', { a: 'side_extra' }],
      [2, 'Trà đá', 5000, 'Trà đá mát lạnh miễn phí đá.', { t: 2, a: null, s: [] }],
      [2, 'Trà chanh', 20000, 'Trà đá vắt chanh tươi, đường vừa.', { t: 4, s: D }],
      [2, 'Nước sâm', 18000, 'Nước sâm mát, nấu từ la hán quả, râu ngô, mía.', { t: 3, a: null, s: [] }]
    ]
  },
  {
    key: 'bun-cha-lieu-giai', region: 'HN', city: 'Hà Nội', anchor: [21.0360, 105.8190], kind: 'food', category: 'Món Việt', hours: ['07:00', '21:30'], minOrder: 55000,
    owner: { username: 'buncha.lieugiai', ownerName: 'Trần Quang Minh', phone: '0912340102' },
    name: 'Bún Chả Liễu Giai', description: 'Bún chả nướng than hoa kiểu Hà Nội, nem cua bể giòn rụm, nước chấm pha theo công thức gia truyền.',
    cats: [['Bún chả & bún đậu', { a: 'bun_cha', s: S }], ['Nem & món ăn kèm', { a: 'side_extra' }], ['Đồ uống', { a: 'glass_extra', s: D }]],
    dishes: [
      [0, 'Bún chả', 58000, 'Chả viên và chả miếng nướng than hoa, bún lá, nước chấm chua ngọt, rau sống.', { v: 'portion', f: 1 }],
      [0, 'Bún chả nem cua bể', 75000, 'Bún chả kèm nem cua bể chiên giòn, đầy đủ rau thơm.', { v: 'portion', f: 1 }],
      [0, 'Bún chả thập cẩm', 85000, 'Chả viên, chả miếng, nem rán, thịt ba chỉ nướng cho người ăn khoẻ.', { v: 'portion' }],
      [0, 'Bún đậu mắm tôm', 65000, 'Đậu rán giòn, bún lá, chả cốm, thịt luộc, mắm tôm chanh ớt.', { v: 'portion', f: 1 }],
      [0, 'Bún đậu thịt chân giò', 79000, 'Bún đậu kèm chân giò luộc giòn, dồi sụn, chả cốm.', { v: 'portion' }],
      [0, 'Bún thịt nướng', 55000, 'Thịt heo nướng sả, bún tươi, rau sống, đậu phộng, nước mắm pha.', { v: 'portion' }],
      [1, 'Nem cua bể', 35000, 'Nem cua bể chiên giòn nhân cua, thịt, nấm mèo (2 cái).', { t: 12 }],
      [1, 'Nem rán', 30000, 'Nem rán Hà Nội nhân thịt heo, miến, cà rốt (3 cái).', { t: 12 }],
      [1, 'Chả nướng thêm', 30000, 'Phần chả nướng riêng, thơm mùi hành tỏi.', { t: 10 }],
      [1, 'Đậu rán', 20000, 'Đậu hũ rán giòn, chấm mắm tôm hoặc nước mắm.', { t: 8 }],
      [1, 'Rau sống thêm', 10000, 'Rau sống, kinh giới, tía tô, húng quế.', { a: null }],
      [2, 'Trà đá', 5000, 'Trà đá mát lạnh.', { t: 2, a: null, s: [] }],
      [2, 'Nước sâm', 18000, 'Nước sâm giải nhiệt kiểu Hà Nội.', { t: 3, a: null, s: [] }],
      [2, 'Trà chanh', 20000, 'Trà chanh tươi vắt tay.', { t: 4, s: D }]
    ]
  },
  {
    key: 'ca-phe-trung', region: 'HN', city: 'Hà Nội', anchor: [21.0100, 105.8500], kind: 'drink', category: 'Đồ uống', hours: ['07:00', '22:30'], minOrder: 40000,
    owner: { username: 'caphe.trung', ownerName: 'Phạm Thu Hà', phone: '0912340103' },
    name: 'Cà Phê Trứng Bạch Mai', description: 'Cà phê trứng đánh tay, cà phê muối, cacao nóng và bánh ngọt nhỏ cho buổi chiều Hà Nội se lạnh.',
    cats: [['Cà phê', { a: 'coffee', s: D }], ['Trà & nước ép', { a: 'tea_lemon', s: D }], ['Bánh ăn kèm', { a: 'sweet' }]],
    dishes: [
      [0, 'Cà phê trứng', 39000, 'Lớp kem trứng béo mịn đánh tay trên nền cà phê phin đậm.', { v: 'drink', f: 1, t: 8, s: H }],
      [0, 'Cà phê muối', 35000, 'Cà phê sữa với lớp kem muối mặn nhẹ, hậu vị béo.', { v: 'drink', f: 1, t: 6 }],
      [0, 'Cà phê sữa đá', 29000, 'Cà phê phin pha sữa đặc, đá viên.', { v: 'drink', t: 6 }],
      [0, 'Bạc xỉu', 32000, 'Nhiều sữa ít cà phê, dịu ngọt dễ uống.', { v: 'drink', t: 6 }],
      [0, 'Cà phê đen đá', 25000, 'Cà phê phin nguyên chất không đường.', { v: 'drink', t: 5 }],
      [0, 'Cacao nóng', 38000, 'Cacao nóng béo ngậy, phủ kem tươi.', { t: 6, a: 'sweet', s: H }],
      [0, 'Cà phê sữa nóng', 29000, 'Cà phê sữa phin nóng, ăn sáng cùng bánh mì.', { t: 6, s: H }],
      [1, 'Trà gừng mật ong', 32000, 'Trà gừng nấu mật ong nóng, ấm bụng.', { t: 5, a: 'tea_lemon', s: H }],
      [1, 'Trà đào cam sả', 38000, 'Trà đen đào ngâm, cam vàng, sả đập dập.', { v: 'drink', t: 6, a: 'tea_fruit' }],
      [1, 'Trà vải', 35000, 'Trà lài, vải ngâm, đá bào.', { v: 'drink', t: 6, a: 'tea_fruit' }],
      [1, 'Nước ép cam', 38000, 'Cam vàng ép tươi nguyên chất không đường.', { t: 6, a: 'juice' }],
      [2, 'Bánh flan caramel', 25000, 'Bánh flan mịn, caramel cháy nhẹ.', { t: 3 }],
      [2, 'Bánh tiramisu', 45000, 'Tiramisu vị cà phê, phủ bột cacao.', { t: 3 }],
      [2, 'Croissant bơ', 32000, 'Croissant bơ nướng giòn, ăn nóng.', { t: 8, a: 'sweet' }]
    ]
  },
  {
    key: 'lau-nuong-tay-son', region: 'HN', city: 'Hà Nội', anchor: [21.0170, 105.8260], kind: 'food', category: 'Lẩu & Nướng', hours: ['16:00', '23:30'], minOrder: 120000,
    owner: { username: 'launuong.tayson', ownerName: 'Lê Đức Thắng', phone: '0912340104' },
    name: 'Lẩu Nướng Tây Sơn', description: 'Lẩu thái, lẩu bò nhúng dấm, thịt nướng than hoa và đồ nhắm cho nhóm bạn buổi tối.',
    cats: [['Lẩu', { a: 'lau_extra', s: S }], ['Món nướng', { a: 'grill_extra', s: S }], ['Món nhắm & đồ uống', { a: 'side_extra' }]],
    dishes: [
      [0, 'Lẩu thái hải sản', 249000, 'Nước lẩu chua cay kiểu Thái, tôm mực nghêu, nấm, rau (2–3 người).', { f: 1, t: 25 }],
      [0, 'Lẩu bò nhúng dấm', 269000, 'Bò Mỹ thái mỏng nhúng nước dấm, ăn cùng rau thơm và bún.', { f: 1, t: 25 }],
      [0, 'Lẩu gà lá é', 229000, 'Gà ta ninh xương, lá é thơm, nước dùng ngọt đậm.', { t: 25 }],
      [0, 'Lẩu kim chi', 239000, 'Kim chi lên men, thịt ba chỉ, đậu hũ, nấm.', { t: 25 }],
      [0, 'Lẩu nấm chay', 199000, 'Nước dùng rau củ ngọt, nhiều loại nấm tươi.', { t: 20 }],
      [1, 'Ba chỉ nướng sả', 89000, 'Ba chỉ heo tẩm sả, nướng than hoa, ăn cùng rau cuốn.', { f: 1, t: 15 }],
      [1, 'Sườn nướng mật ong', 99000, 'Sườn non tẩm mật ong tỏi, nướng vàng bóng.', { t: 18 }],
      [1, 'Bò nướng lá lốt', 79000, 'Bò xay cuốn lá lốt nướng thơm (6 cuốn).', { t: 15 }],
      [1, 'Cánh gà nướng mật ong', 69000, 'Cánh gà ướp mật ong, nướng giòn (6 cái).', { t: 15 }],
      [1, 'Tôm nướng muối ớt', 119000, 'Tôm sú nướng muối ớt Tây Ninh (6 con).', { t: 15 }],
      [1, 'Bạch tuộc nướng sa tế', 109000, 'Bạch tuộc nướng sa tế cay, phủ hành lá.', { t: 15 }],
      [2, 'Trứng cút nướng', 35000, 'Xiên trứng cút nướng mỡ hành (10 trứng).', { t: 8 }],
      [2, 'Khoai tây chiên', 35000, 'Khoai tây chiên giòn, rắc muối.', { t: 8 }],
      [2, 'Bia lon Tiger', 22000, 'Bia lon Tiger ướp lạnh.', { t: 2, a: null }]
    ]
  },
  {
    key: 'seoul-bep-han', region: 'HN', city: 'Hà Nội', anchor: [21.0335, 105.7940], kind: 'food', category: 'Món Hàn', hours: ['10:00', '22:00'], minOrder: 70000,
    owner: { username: 'seoul.bephan', ownerName: 'Đỗ Thanh Hương', phone: '0912340105' },
    name: 'Seoul Bếp Hàn', description: 'Tokbokki sốt cay, cơm trộn bibimbap, gà rán sốt Hàn Quốc và canh kimchi nóng hổi.',
    cats: [['Món chính', { a: 'korean_extra', s: S }], ['Gà rán Hàn', { a: 'korean_chicken', s: S }], ['Ăn vặt & đồ uống', { a: 'kimchi_side' }]],
    dishes: [
      [0, 'Tokbokki phô mai', 59000, 'Bánh gạo dẻo sốt gochujang cay ngọt, phủ phô mai kéo sợi.', { f: 1, t: 12, v: 'portion' }],
      [0, 'Tokbokki hải sản', 69000, 'Tokbokki với tôm, mực, chả cá, sốt cay đậm đà.', { t: 12, v: 'portion' }],
      [0, 'Cơm trộn bibimbap bò', 79000, 'Cơm trộn thịt bò xào, rau củ, trứng ốp la, sốt gochujang.', { f: 1, t: 12 }],
      [0, 'Cơm trộn kim chi', 69000, 'Cơm trộn kim chi xào, trứng, rong biển rắc mè.', { t: 12 }],
      [0, 'Mì lạnh Hàn Quốc', 65000, 'Mì lạnh nước dùng chua ngọt, dưa leo, trứng luộc.', { t: 10, a: 'side_extra' }],
      [0, 'Canh kim chi thịt ba chỉ', 69000, 'Canh kim chi nấu thịt ba chỉ, đậu hũ non, ăn kèm cơm.', { t: 15 }],
      [0, 'Canh rong biển', 55000, 'Canh rong biển nấu thịt bò, vị thanh nhẹ.', { t: 12, a: 'side_extra', s: [] }],
      [1, 'Gà sốt cay Hàn Quốc', 89000, 'Gà rán phủ sốt cay ngọt đỏ bóng, rắc mè (8 miếng).', { f: 1, t: 18 }],
      [1, 'Gà sốt mật ong', 89000, 'Gà rán sốt mật ong tỏi giòn thơm (8 miếng).', { t: 18 }],
      [1, 'Gà sốt phô mai', 95000, 'Gà rán bọc bột phô mai vàng ruộm (8 miếng).', { t: 18 }],
      [1, 'Cánh gà chiên nước mắm', 69000, 'Cánh gà chiên giòn tẩm nước mắm tỏi (6 cái).', { t: 15 }],
      [2, 'Kimbap chiên', 45000, 'Cơm cuộn rong biển nhân trứng, giăm bông, chiên giòn.', { t: 10 }],
      [2, 'Chả cá Hàn Quốc', 40000, 'Chả cá chiên nhúng sốt cay.', { t: 10 }],
      [2, 'Trà đào Hàn Quốc', 35000, 'Trà đào ngọt thanh, đá lạnh.', { v: 'drink', t: 5, a: 'tea_fruit', s: D }]
    ]
  },
  {
    key: 'sushi-sakura', region: 'HN', city: 'Hà Nội', anchor: [20.9930, 105.8100], kind: 'food', category: 'Món Nhật', hours: ['10:30', '21:30'], minOrder: 90000,
    owner: { username: 'sushi.sakura', ownerName: 'Vũ Hoàng Long', phone: '0912340106' },
    name: 'Sushi Sakura Thanh Xuân', description: 'Sushi cá hồi, sashimi, ramen tonkotsu, cơm cà ri và tempura giòn kiểu Nhật.',
    cats: [['Sushi & sashimi', { a: 'sushi_extra' }], ['Mì & cơm Nhật', { a: 'ramen_extra', s: S }], ['Món chiên & đồ uống', { a: 'tempura' }]],
    dishes: [
      [0, 'Sushi cá hồi', 89000, 'Sáu miếng nigiri cá hồi Na Uy tươi trên cơm giấm.', { f: 1, t: 15 }],
      [0, 'Sushi tôm', 79000, 'Sáu miếng nigiri tôm luộc ngọt thịt.', { t: 15 }],
      [0, 'Sashimi cá hồi', 159000, 'Mười miếng cá hồi cắt dày, ăn cùng wasabi, gừng hồng.', { f: 1, t: 12 }],
      [0, 'Sashimi tổng hợp', 229000, 'Cá hồi, cá ngừ, bạch tuộc, tôm ngọt.', { t: 12 }],
      [0, 'Maki cuộn cá hồi bơ', 99000, 'Tám miếng cuộn cá hồi, bơ, dưa leo.', { t: 15 }],
      [0, 'California roll', 95000, 'Cuộn thanh cua, bơ, dưa leo, phủ trứng cá.', { t: 15 }],
      [1, 'Ramen tonkotsu', 109000, 'Nước dùng xương heo hầm 12 giờ, thịt chashu, trứng lòng đào.', { v: 'bowl', f: 1, t: 15 }],
      [1, 'Ramen miso', 105000, 'Nước dùng miso đậm vị, ngô bơ, giá, hành.', { v: 'bowl', t: 15 }],
      [1, 'Udon tempura', 99000, 'Mì udon dai, nước dùng dashi, tôm tempura.', { v: 'bowl', t: 15, a: 'tempura' }],
      [1, 'Cơm cà ri katsu', 99000, 'Cơm cà ri Nhật, thịt heo chiên xù giòn.', { t: 15, a: 'tempura' }],
      [1, 'Cơm bò teriyaki', 95000, 'Bò xào sốt teriyaki, rau củ, cơm Nhật.', { t: 15, a: 'tempura' }],
      [2, 'Tempura tôm', 79000, 'Tôm tempura chiên bột mỏng giòn (5 con).', { t: 12 }],
      [2, 'Gà karaage', 69000, 'Gà chiên kiểu Nhật tẩm gừng tỏi, giòn xốp.', { t: 12 }],
      [2, 'Trà xanh matcha đá', 39000, 'Trà matcha lạnh, ít ngọt.', { t: 5, a: 'tea_fruit', s: D }]
    ]
  },
  {
    key: 'dimsum-ho-tay', region: 'HN', city: 'Hà Nội', anchor: [21.0690, 105.8190], kind: 'food', category: 'Dimsum & Món Hoa', hours: ['08:00', '22:00'], minOrder: 80000,
    owner: { username: 'dimsum.hotay', ownerName: 'Lâm Mỹ Linh', phone: '0912340107' },
    name: 'Dimsum Hồ Tây', description: 'Dimsum hấp nóng, há cảo tôm, xíu mại, bánh bao, mì vịt tiềm — món Hoa chuẩn vị cho cả nhà.',
    cats: [['Dimsum', { a: 'dimsum_extra' }], ['Mì & cơm', { a: 'side_extra', s: S }], ['Tráng miệng & trà', { a: null }]],
    dishes: [
      [0, 'Há cảo tôm', 59000, 'Vỏ bột trong, nhân tôm tươi giòn ngọt (4 cái).', { f: 1, t: 12 }],
      [0, 'Xíu mại', 55000, 'Xíu mại thịt heo, nấm hương, tôm khô (4 cái).', { f: 1, t: 12 }],
      [0, 'Bánh bao nhân thịt', 45000, 'Bánh bao hấp mềm, nhân thịt trứng cút (2 cái).', { t: 10 }],
      [0, 'Bánh bao chiên', 49000, 'Bánh bao chiên vàng đáy giòn, nhân thịt (3 cái).', { t: 12 }],
      [0, 'Chân gà hấp tàu xì', 59000, 'Chân gà hấp sốt tàu xì mềm rục.', { t: 15 }],
      [0, 'Bánh cuốn hấp tôm', 55000, 'Bánh cuốn hấp nhân tôm, rưới xì dầu.', { t: 12 }],
      [0, 'Sườn hấp tương đen', 59000, 'Sườn non hấp tương đen, tỏi, ớt.', { t: 15 }],
      [1, 'Mì vịt tiềm', 85000, 'Mì trứng, vịt hầm thuốc bắc, nước dùng thơm.', { v: 'bowl', t: 18 }],
      [1, 'Mì xá xíu', 69000, 'Mì trứng, thịt xá xíu đỏ bóng, cải ngọt.', { v: 'bowl', t: 15 }],
      [1, 'Mì hoành thánh', 69000, 'Mì mỏng, hoành thánh tôm thịt, nước dùng trong.', { v: 'bowl', t: 15 }],
      [1, 'Cơm chiên dương châu', 59000, 'Cơm chiên trứng, lạp xưởng, tôm, đậu Hà Lan.', { t: 12 }],
      [2, 'Chè hạt sen', 35000, 'Chè hạt sen long nhãn thanh mát.', { t: 3 }],
      [2, 'Bánh trứng nướng', 39000, 'Bánh trứng nướng vỏ giòn, nhân sữa trứng (3 cái).', { t: 12 }],
      [2, 'Trà hoa cúc', 25000, 'Trà hoa cúc nóng, thanh nhẹ.', { t: 4, a: 'tea_lemon', s: H }]
    ]
  },
  {
    key: 'banh-cuon-linh-dam', region: 'HN', city: 'Hà Nội', anchor: [20.9760, 105.8450], kind: 'food', category: 'Món Việt', hours: ['06:00', '21:00'], minOrder: 45000,
    owner: { username: 'banhcuon.linhdam', ownerName: 'Nguyễn Thị Lan', phone: '0912340108' },
    name: 'Bánh Cuốn Nóng Linh Đàm', description: 'Bánh cuốn tráng mỏng mỗi sáng, nhân thịt mộc nhĩ, chả quế, xôi và bánh giò ăn sáng kiểu Hà Nội.',
    cats: [['Bánh cuốn', { a: 'banh_cuon' }], ['Xôi & bánh', { a: 'xoi_extra' }], ['Đồ uống', { a: 'glass_extra', s: H }]],
    dishes: [
      [0, 'Bánh cuốn nhân thịt', 40000, 'Bánh cuốn tráng mỏng nhân thịt heo, mộc nhĩ, hành phi, chấm nước mắm.', { v: 'portion', f: 1, t: 10 }],
      [0, 'Bánh cuốn chả quế', 50000, 'Bánh cuốn kèm chả quế thơm, giò lụa.', { v: 'portion', f: 1, t: 10 }],
      [0, 'Bánh cuốn trứng', 45000, 'Bánh cuốn tráng trứng gà, nhân thịt.', { t: 10 }],
      [0, 'Bánh cuốn thập cẩm', 60000, 'Bánh cuốn, chả quế, giò lụa, chả cốm, nem rán.', { t: 12 }],
      [0, 'Bánh cuốn chay', 40000, 'Bánh cuốn nhân nấm, mộc nhĩ, cà rốt.', { t: 10 }],
      [1, 'Xôi gà', 45000, 'Xôi nếp dẻo, gà xé, hành phi, nước mỡ gà.', { f: 1, t: 8 }],
      [1, 'Xôi xéo', 25000, 'Xôi xéo đậu xanh, hành phi vàng thơm.', { t: 8 }],
      [1, 'Xôi thịt kho', 40000, 'Xôi trắng, thịt ba chỉ kho tộ, trứng cút.', { t: 8 }],
      [1, 'Xôi ruốc', 30000, 'Xôi trắng rắc ruốc bông, lạp xưởng.', { t: 8 }],
      [1, 'Bánh giò', 20000, 'Bánh giò nhân thịt nấm hấp nóng.', { t: 5, a: null }],
      [1, 'Bánh khúc', 15000, 'Bánh khúc nhân đậu xanh thịt ba chỉ.', { t: 5, a: null }],
      [1, 'Giò chả thêm', 25000, 'Giò lụa, chả quế thái lát.', { a: null }],
      [2, 'Trà đá', 5000, 'Trà đá mát lạnh.', { t: 2, a: null, s: [] }],
      [2, 'Trà gừng mật ong', 25000, 'Trà gừng mật ong nóng.', { t: 5, s: H }]
    ]
  },
  {
    key: 'tra-chanh-long-bien', region: 'HN', city: 'Hà Nội', anchor: [21.0390, 105.8800], kind: 'drink', category: 'Trà sữa', hours: ['09:00', '23:00'], minOrder: 40000,
    owner: { username: 'trachanh.longbien', ownerName: 'Hoàng Gia Bảo', phone: '0912340109' },
    name: 'Trà Chanh Bờ Sông', description: 'Trà chanh giã tay, trà sữa, trà trái cây và đồ ăn vặt ngồi hóng gió cuối chiều bên sông Hồng.',
    cats: [['Trà chanh & trà trái cây', { a: 'tea_fruit', s: D }], ['Trà sữa', { a: 'tea_milk', s: D }], ['Ăn vặt', { a: 'side_extra' }]],
    dishes: [
      [0, 'Trà chanh giã tay', 25000, 'Chanh tươi giã tay, trà đá, vị chua thanh.', { v: 'drink', f: 1, t: 5, a: 'tea_lemon' }],
      [0, 'Trà chanh sả', 28000, 'Trà chanh nấu cùng sả, thơm mát.', { v: 'drink', t: 5, a: 'tea_lemon' }],
      [0, 'Trà tắc', 25000, 'Trà đá vắt tắc, đường ít.', { v: 'drink', t: 5, a: 'tea_lemon' }],
      [0, 'Trà đào cam sả', 38000, 'Trà đen, đào ngâm, cam vàng, sả.', { v: 'drink', f: 1, t: 6 }],
      [0, 'Trà vải', 35000, 'Trà lài vải ngâm, đá bào.', { v: 'drink', t: 6 }],
      [0, 'Soda chanh dây', 35000, 'Soda chanh dây chua ngọt, hạt chanh dây.', { v: 'drink', t: 5 }],
      [0, 'Trà dâu tằm', 35000, 'Dâu tằm tươi xay cùng trà.', { v: 'drink', t: 6 }],
      [1, 'Trà sữa trân châu đường đen', 38000, 'Trà sữa đậm vị, trân châu đường đen nấu mỗi ngày.', { v: 'drink', f: 1, t: 7 }],
      [1, 'Trà sữa matcha', 42000, 'Matcha Nhật pha sữa tươi béo nhẹ.', { v: 'drink', t: 7 }],
      [1, 'Trà sữa khoai môn', 40000, 'Khoai môn nghiền mịn, trà sữa, thạch.', { v: 'drink', t: 7 }],
      [1, 'Trà sữa thái xanh', 38000, 'Trà thái xanh, sữa đặc, kem cheese.', { v: 'drink', t: 7 }],
      [2, 'Hướng dương', 20000, 'Hướng dương rang vị dừa.', { a: null, t: 2 }],
      [2, 'Nem chua rán', 40000, 'Nem chua rán giòn, chấm tương ớt (8 cái).', { t: 12 }],
      [2, 'Khoai tây chiên lắc phô mai', 35000, 'Khoai chiên giòn lắc bột phô mai.', { t: 8 }]
    ]
  },
  {
    key: 'banh-ngot-my-dinh', region: 'HN', city: 'Hà Nội', anchor: [21.0300, 105.7650], kind: 'food', category: 'Bánh & Kem', hours: ['08:00', '21:30'], minOrder: 60000,
    owner: { username: 'banhngot.mydinh', ownerName: 'Trịnh Ngọc Anh', phone: '0912340110' },
    name: 'Tiệm Bánh Ngọt Mỹ Đình', description: 'Bánh kem sinh nhật, tiramisu, panna cotta, croissant bơ, kem và trà chiều nhỏ xinh.',
    cats: [['Bánh kem & bánh ngọt', { a: 'cake_slice' }], ['Kem & tráng miệng', { a: 'sweet' }], ['Đồ uống', { a: 'tea_lemon', s: D }]],
    dishes: [
      [0, 'Bánh kem dâu tươi', 189000, 'Bông lan mềm, kem tươi, dâu tây Mộc Châu.', { v: 'cake', f: 1, t: 20 }],
      [0, 'Bánh kem socola', 199000, 'Bánh cốt socola ba lớp, ganache đắng nhẹ.', { v: 'cake', f: 1, t: 20 }],
      [0, 'Bánh mousse xoài', 59000, 'Mousse xoài mềm mịn, đế bánh quy.', { t: 5 }],
      [0, 'Bánh tiramisu', 55000, 'Tiramisu cà phê mascarpone, phủ bột cacao.', { t: 5 }],
      [0, 'Bánh su kem', 35000, 'Vỏ su giòn nhẹ, nhân kem custard (3 cái).', { t: 5 }],
      [0, 'Cookie socola chip', 25000, 'Cookie giòn ngoài mềm trong, nhiều socola.', { t: 5, a: null }],
      [0, 'Croissant bơ', 32000, 'Croissant bơ Pháp nướng mới.', { t: 8, a: 'sweet' }],
      [1, 'Bánh flan caramel', 25000, 'Flan mịn, caramel cháy nhẹ.', { t: 3 }],
      [1, 'Panna cotta dâu', 45000, 'Panna cotta kem sữa, sốt dâu.', { t: 3 }],
      [1, 'Kem dừa', 40000, 'Kem dừa béo ngậy, dừa nạo, đậu phộng.', { t: 3 }],
      [1, 'Kem vani sốt caramel', 38000, 'Hai viên kem vani, sốt caramel muối.', { t: 3 }],
      [1, 'Chè khúc bạch', 39000, 'Khúc bạch mềm, hạnh nhân, nhãn, vải.', { t: 3 }],
      [2, 'Trà đào cam sả', 38000, 'Trà đen, đào ngâm, cam vàng.', { v: 'drink', t: 6, a: 'tea_fruit' }],
      [2, 'Cà phê sữa đá', 29000, 'Cà phê phin sữa đặc.', { v: 'drink', t: 6, a: 'coffee' }]
    ]
  },
  {
    key: 'com-nieu-ha-dong', region: 'HN', city: 'Hà Nội', anchor: [20.9690, 105.7770], kind: 'food', category: 'Cơm', hours: ['10:00', '21:30'], minOrder: 60000,
    owner: { username: 'comnieu.hadong', ownerName: 'Phan Văn Tuấn', phone: '0912340111' },
    name: 'Cơm Niêu Hà Đông', description: 'Cơm niêu cháy giòn, thịt kho tàu, cá kho, canh chua và các món cơm nhà làm theo mâm.',
    cats: [['Cơm niêu', { a: 'claypot_side', s: S }], ['Món mặn gọi thêm', { a: 'side_extra' }], ['Canh & rau', { a: null }]],
    dishes: [
      [0, 'Cơm niêu thịt kho tàu', 69000, 'Thịt ba chỉ kho tàu, trứng, cơm niêu cháy.', { v: 'portion', f: 1, t: 15 }],
      [0, 'Cơm niêu cá kho tộ', 69000, 'Cá basa kho tộ đậm vị, ăn cùng cơm niêu.', { v: 'portion', f: 1, t: 15 }],
      [0, 'Cơm niêu sườn rim', 75000, 'Sườn non rim mặn ngọt, dưa góp.', { v: 'portion', t: 15 }],
      [0, 'Cơm niêu gà nướng', 79000, 'Đùi gà nướng mật ong, cơm niêu, rau luộc.', { v: 'portion', t: 18 }],
      [0, 'Cơm niêu bò xào', 85000, 'Bò xào lúc lắc, hành tây, ớt chuông.', { v: 'portion', t: 15 }],
      [0, 'Cơm rang dưa bò', 65000, 'Cơm rang dưa cải với bò xào, hành phi.', { v: 'portion', t: 12 }],
      [1, 'Cá chiên sả ớt', 59000, 'Cá thu chiên giòn tẩm sả ớt.', { t: 15 }],
      [1, 'Đậu hũ sốt cà chua', 35000, 'Đậu hũ non rán, sốt cà chua nấu hành.', { t: 10 }],
      [1, 'Thịt rim mắm ruốc', 49000, 'Thịt ba chỉ rim mắm ruốc Huế.', { t: 12 }],
      [1, 'Trứng chiên thịt', 29000, 'Trứng gà chiên thịt băm, hành lá.', { t: 8 }],
      [2, 'Canh chua cá lóc', 55000, 'Canh chua me, cá lóc, bạc hà, đậu bắp.', { t: 15, a: null }],
      [2, 'Canh rau củ thịt bằm', 30000, 'Canh bí đỏ, cà rốt, su su, thịt bằm.', { t: 10 }],
      [2, 'Rau muống xào tỏi', 30000, 'Rau muống xào tỏi lửa lớn.', { t: 8 }],
      [2, 'Dưa leo cà chua trộn', 20000, 'Salad dưa leo, cà chua trộn giấm đường.', { t: 5 }]
    ]
  },

  /* ================= HƯNG YÊN ================= */
  {
    key: 'ga-dong-tao', region: 'HY', city: 'Hưng Yên', anchor: [20.6560, 106.0870], kind: 'food', category: 'Món Việt', hours: ['08:00', '21:30'], minOrder: 60000,
    owner: { username: 'ga.dongtao', ownerName: 'Bùi Văn Chiến', phone: '0912340112' },
    name: 'Gà Đông Tảo Phố Hiến', description: 'Gà Đông Tảo chân to nuôi thả vườn, luộc, nướng, xôi gà và chả gà Tiên Lữ đặc sản Hưng Yên.',
    cats: [['Gà Đông Tảo', { a: 'chicken_set' }], ['Xôi & cơm', { a: 'xoi_extra' }], ['Canh & đồ uống', { a: null }]],
    dishes: [
      [0, 'Gà Đông Tảo luộc', 249000, 'Gà Đông Tảo luộc nguyên con, da vàng giòn, chấm muối tiêu chanh (nửa con).', { f: 1, t: 30 }],
      [0, 'Gà Đông Tảo nướng muối ớt', 269000, 'Gà tẩm muối ớt nướng than, thịt dai ngọt (nửa con).', { f: 1, t: 30 }],
      [0, 'Gà ta rang gừng', 129000, 'Gà ta rang gừng sả, thơm nồng, ăn với cơm nóng.', { t: 20 }],
      [0, 'Gà ta hấp lá chanh', 139000, 'Gà ta hấp lá chanh, ăn kèm muối tiêu.', { t: 25 }],
      [0, 'Chả gà Tiên Lữ', 89000, 'Chả gà nướng lá chuối đặc sản Tiên Lữ.', { t: 15 }],
      [0, 'Gỏi gà', 79000, 'Gỏi gà xé phay, hành tây, rau răm, lạc rang.', { t: 12 }],
      [1, 'Xôi gà', 45000, 'Xôi nếp dẻo, gà xé, hành phi.', { t: 8 }],
      [1, 'Cơm gà xé', 59000, 'Cơm trắng, gà xé phay, nước mắm gừng.', { v: 'portion', t: 10 }],
      [1, 'Cơm gà nướng', 65000, 'Đùi gà nướng mật ong, cơm trắng, dưa góp.', { v: 'portion', t: 15 }],
      [1, 'Cháo gà', 40000, 'Cháo gà ta ninh xương, gà xé, hành ngò.', { t: 12, a: 'noodle_bowl' }],
      [2, 'Canh gà lá giang', 79000, 'Gà ta nấu lá giang chua thanh.', { t: 20 }],
      [2, 'Rau muống xào tỏi', 30000, 'Rau muống xào tỏi.', { t: 8, a: null }],
      [2, 'Trà đá', 5000, 'Trà đá mát lạnh.', { t: 2, a: null, s: [] }],
      [2, 'Nước sâm', 18000, 'Nước sâm giải nhiệt.', { t: 3, a: null, s: [] }]
    ]
  },
  {
    key: 'che-nhan-long', region: 'HY', city: 'Hưng Yên', anchor: [20.6200, 106.0600], kind: 'drink', category: 'Bánh & Kem', hours: ['09:00', '22:30'], minOrder: 35000,
    owner: { username: 'che.nhanlong', ownerName: 'Đinh Thị Mai', phone: '0912340113' },
    name: 'Chè & Kem Nhãn Lồng', description: 'Chè nhãn lồng Hưng Yên, chè thái, kem dừa, sữa chua nếp cẩm và rau câu mát lạnh ngày hè.',
    cats: [['Chè', { a: 'che_extra' }], ['Kem & sữa chua', { a: 'sweet' }], ['Nước giải khát', { a: 'tea_lemon', s: D }]],
    dishes: [
      [0, 'Chè nhãn nước cốt dừa', 30000, 'Nhãn lồng Hưng Yên tươi, chè hạt sen, nước cốt dừa.', { f: 1, t: 4 }],
      [0, 'Chè thái', 30000, 'Trái cây, thạch, nước cốt dừa, đá bào.', { f: 1, t: 4 }],
      [0, 'Chè bắp', 25000, 'Chè bắp nếp, nước cốt dừa béo.', { t: 4 }],
      [0, 'Chè đậu xanh', 25000, 'Chè đậu xanh nấu nhừ, nước cốt dừa.', { t: 4 }],
      [0, 'Chè hạt sen', 30000, 'Hạt sen bùi, long nhãn, nước đường phèn.', { t: 4 }],
      [0, 'Chè khúc bạch', 35000, 'Khúc bạch, hạnh nhân, nhãn, vải.', { t: 4 }],
      [1, 'Kem dừa', 35000, 'Kem dừa béo, dừa nạo, đậu phộng.', { t: 3 }],
      [1, 'Sữa chua nếp cẩm', 28000, 'Sữa chua ủ nhà, nếp cẩm dẻo.', { t: 3 }],
      [1, 'Sữa chua trái cây', 32000, 'Sữa chua, trái cây tươi theo mùa.', { t: 4 }],
      [1, 'Rau câu dừa', 20000, 'Rau câu dừa trong trái dừa non.', { t: 3, a: null }],
      [1, 'Bánh flan caramel', 20000, 'Bánh flan mềm mịn.', { t: 3 }],
      [2, 'Trà tắc mật ong', 20000, 'Trà tắc mật ong ngọt dịu.', { t: 4 }],
      [2, 'Trà đào cam sả', 35000, 'Trà đào cam sả tươi mát.', { v: 'drink', t: 6, a: 'tea_fruit' }],
      [2, 'Nước ép cam', 35000, 'Cam vàng ép tươi.', { t: 6, a: 'juice' }]
    ]
  },
  {
    key: 'izakaya-pho-hien', region: 'HY', city: 'Hưng Yên', anchor: [20.6850, 106.0900], kind: 'food', category: 'Món Nhật', hours: ['10:30', '21:30'], minOrder: 80000,
    owner: { username: 'izakaya.phohien', ownerName: 'Nguyễn Hữu Phước', phone: '0912340114' },
    name: 'Izakaya Nhật Phố Hiến', description: 'Quán kiểu Nhật dành cho người làm việc ở khu công nghiệp: cơm cà ri, udon, ramen, gà karaage, sushi cuốn.',
    cats: [['Cơm & mì Nhật', { a: 'tempura', s: S }], ['Sushi & món nhỏ', { a: 'sushi_extra' }], ['Đồ uống', { a: null }]],
    dishes: [
      [0, 'Cơm cà ri katsu', 79000, 'Cơm cà ri Nhật, thịt heo chiên xù giòn.', { f: 1, t: 15 }],
      [0, 'Cơm bò teriyaki', 85000, 'Bò xào sốt teriyaki, rau củ.', { t: 15 }],
      [0, 'Cơm gà teriyaki', 75000, 'Gà nướng sốt teriyaki ngọt mặn, cơm Nhật.', { t: 15 }],
      [0, 'Udon tempura', 85000, 'Mì udon, nước dùng dashi, tôm tempura.', { v: 'bowl', f: 1, t: 15 }],
      [0, 'Ramen tonkotsu', 95000, 'Nước dùng xương heo, thịt chashu, trứng.', { v: 'bowl', t: 15, a: 'ramen_extra' }],
      [0, 'Mì lạnh soba', 69000, 'Mì soba lạnh, nước chấm tsuyu, rong biển.', { t: 12, a: null, s: [] }],
      [1, 'Sushi cá hồi', 79000, 'Sáu miếng sushi cá hồi.', { t: 15 }],
      [1, 'Maki cuộn dưa leo', 59000, 'Tám miếng maki dưa leo, mè rang.', { t: 12 }],
      [1, 'California roll', 85000, 'Cuộn thanh cua, bơ, dưa leo.', { t: 15 }],
      [1, 'Tempura tôm', 69000, 'Tôm tempura giòn (5 con).', { t: 12, a: 'tempura' }],
      [1, 'Gà karaage', 59000, 'Gà chiên kiểu Nhật giòn xốp.', { t: 12, a: 'tempura' }],
      [1, 'Trứng cuộn tamagoyaki', 45000, 'Trứng cuộn ngọt mềm kiểu Nhật.', { t: 10 }],
      [2, 'Trà xanh matcha đá', 35000, 'Matcha lạnh ít ngọt.', { t: 5, a: 'tea_fruit', s: D }],
      [2, 'Trà gạo lứt', 20000, 'Trà gạo lứt rang nóng.', { t: 3, s: H }]
    ]
  },
  {
    key: 'ga-ran-han-hy', region: 'HY', city: 'Hưng Yên', anchor: [20.6700, 106.0300], kind: 'food', category: 'Món Hàn', hours: ['10:00', '22:00'], minOrder: 70000,
    owner: { username: 'garan.hanquoc', ownerName: 'Kim Anh Tuấn', phone: '0912340115' },
    name: 'Gà Rán Hàn Quốc Phố Hiến', description: 'Gà rán sốt Hàn Quốc, tokbokki, mì cay và cơm trộn — món Hàn cho học sinh sinh viên.',
    cats: [['Gà rán Hàn', { a: 'korean_chicken', s: S }], ['Tokbokki & mì', { a: 'korean_extra', s: S }], ['Đồ uống & ăn kèm', { a: null }]],
    dishes: [
      [0, 'Gà sốt cay Hàn Quốc', 89000, 'Gà rán phủ sốt cay ngọt, rắc mè (8 miếng).', { f: 1, t: 18 }],
      [0, 'Gà sốt mật ong', 89000, 'Gà rán sốt mật ong tỏi (8 miếng).', { t: 18 }],
      [0, 'Gà sốt phô mai', 95000, 'Gà rán bột phô mai (8 miếng).', { f: 1, t: 18 }],
      [0, 'Cánh gà nướng BBQ', 69000, 'Cánh gà nướng sốt BBQ (6 cái).', { t: 15 }],
      [0, 'Phần gà sốt kèm khoai', 129000, 'Gà sốt cay, khoai chiên và nước ngọt.', { t: 20, a: null }],
      [1, 'Tokbokki phô mai', 59000, 'Bánh gạo sốt cay phủ phô mai.', { v: 'portion', f: 1, t: 12 }],
      [1, 'Tokbokki hải sản', 69000, 'Bánh gạo sốt cay với tôm, mực, chả cá.', { t: 12 }],
      [1, 'Mì cay Hàn Quốc', 55000, 'Mì cay 7 cấp độ, xúc xích, rau.', { t: 12, a: 'korean_extra' }],
      [1, 'Cơm trộn kim chi', 65000, 'Cơm trộn kim chi xào, trứng.', { t: 12 }],
      [1, 'Kimbap chiên', 45000, 'Kimbap chiên giòn.', { t: 10, a: null }],
      [2, 'Khoai tây chiên', 30000, 'Khoai chiên giòn.', { t: 8, a: 'korean_chicken', s: [] }],
      [2, 'Trà đào Hàn Quốc', 35000, 'Trà đào lạnh.', { v: 'drink', t: 5, a: 'tea_fruit', s: D }],
      [2, 'Pepsi lon', 15000, 'Pepsi lon ướp lạnh.', { t: 2, a: null, s: [] }],
      [2, 'Soda chanh dây', 30000, 'Soda chanh dây mát lạnh.', { t: 5, a: 'tea_lemon', s: D }]
    ]
  },
  {
    key: 'chao-bun-rieu-sang', region: 'HY', city: 'Hưng Yên', anchor: [20.6400, 106.0700], kind: 'food', category: 'Bún - Phở', hours: ['05:30', '14:00'], minOrder: 35000,
    owner: { username: 'bunrieu.sang', ownerName: 'Vương Thị Hoa', phone: '0912340116' },
    name: 'Bún Riêu Cháo Sườn Buổi Sáng', description: 'Quán sáng: bún riêu cua đồng, bún ốc, cháo sườn, cháo lòng, bánh mì ốp la — mở từ 5h30.',
    cats: [['Bún & riêu', { a: 'noodle_bowl', s: S }], ['Cháo', { a: 'noodle_bowl' }], ['Ăn sáng & đồ uống', { a: null }]],
    dishes: [
      [0, 'Bún riêu cua', 40000, 'Riêu cua đồng, đậu rán, cà chua, huyết, rau sống.', { v: 'bowl', f: 1, t: 10 }],
      [0, 'Bún riêu sườn sụn', 50000, 'Riêu cua kèm sườn sụn mềm rục.', { v: 'bowl', t: 10 }],
      [0, 'Bún ốc', 45000, 'Ốc bươu, nước dùng chua thanh, cà chua, rau thơm.', { v: 'bowl', f: 1, t: 10 }],
      [0, 'Bún thang', 55000, 'Bún thang trứng thái chỉ, giò, gà xé.', { v: 'bowl', t: 12 }],
      [0, 'Bún giò heo', 50000, 'Bún nước giò heo hầm mềm, rau sống.', { v: 'bowl', t: 10 }],
      [0, 'Miến gà', 40000, 'Miến dong, gà ta xé, hành ngò.', { v: 'bowl', t: 10 }],
      [1, 'Cháo sườn', 30000, 'Cháo sườn sụn ninh nhừ, hành phi.', { t: 8, f: 1 }],
      [1, 'Cháo lòng', 35000, 'Cháo lòng heo, dồi, tim, gan, quẩy.', { t: 8 }],
      [1, 'Cháo gà', 35000, 'Cháo gà ta xé, hành.', { t: 8 }],
      [1, 'Cháo trắng hột vịt muối', 25000, 'Cháo trắng dẻo, trứng vịt muối.', { t: 6 }],
      [2, 'Bánh mì ốp la', 25000, 'Bánh mì giòn, trứng ốp la, pate.', { t: 6, a: 'side_extra' }],
      [2, 'Bánh giò', 15000, 'Bánh giò nóng nhân thịt.', { t: 4 }],
      [2, 'Cà phê sữa nóng', 20000, 'Cà phê phin sữa nóng.', { t: 5, a: 'coffee', s: H }],
      [2, 'Trà đá', 5000, 'Trà đá mát lạnh.', { t: 2, a: null, s: [] }]
    ]
  }
];

// Đợt 2: 22 quán Hà Nội bổ sung (mỗi phường đã có quán thêm 2) — xem new-restaurants-hn2.mjs
NEW_RESTAURANTS.push(...NEW_RESTAURANTS_HN2);
