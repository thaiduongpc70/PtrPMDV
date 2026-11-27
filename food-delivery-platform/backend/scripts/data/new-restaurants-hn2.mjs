/* Đợt 2 (22/11/2026): 22 quán Hà Nội bổ sung để mỗi phường đã có quán có ≥ 3 quán (mỗi phường thêm 2), nhiều loại hình.
   Cùng định dạng với new-restaurants.mjs. `sameAreaAs`: dùng phường + đường THẬT (OpenStreetMap) đã tra cứu cho quán gốc, lưu trong new-places.json,
   nên không cần gọi lại Overpass. Nạp bằng:  node scripts/add-restaurants.mjs --only <khoá,...> */

const D = ['sugar', 'ice'];
const H = ['sugar'];
const S = ['spicy'];

const owner = (username, ownerName, n) => ({ username, ownerName, phone: `09123402${String(n).padStart(2, '0')}` });
const at = (ref, anchor) => ({ sameAreaAs: ref, anchor });

export const NEW_RESTAURANTS_HN2 = [
  /* ===== Phường Hồng Hà ===== */
  {
    key: 'cha-ca-hang-duong', region: 'HN', city: 'Hà Nội', ...at('pho-pho-co', [21.0338, 105.8505]), kind: 'food', category: 'Món Việt', hours: ['09:00', '21:30'], minOrder: 70000,
    owner: owner('chaca.hangduong', 'Vũ Đình Khoa', 1), name: 'Chả Cá Hàng Đường', description: 'Chả cá nghệ rán nóng trên chảo mỡ, ăn cùng bún, thì là, hành và mắm tôm theo kiểu Hà Nội xưa.',
    cats: [['Chả cá', { a: 'bun_cha', s: S }], ['Món ăn kèm', { a: 'side_extra' }], ['Đồ uống', { a: 'glass_extra', s: D }]],
    dishes: [
      [0, 'Chả cá thì là', 120000, 'Cá lăng tẩm nghệ rán nóng với thì là, hành lá, ăn kèm bún và mắm tôm.', { v: 'portion', f: 1, t: 20 }],
      [0, 'Chả cá thập cẩm', 135000, 'Chả cá lăng kèm tôm và mực chiên giòn, rau thơm đầy đủ.', { v: 'portion', t: 22 }],
      [0, 'Bún chả cá', 55000, 'Bún nước dùng cá thanh ngọt, chả cá chiên, cà chua, thì là.', { v: 'bowl', t: 12 }],
      [0, 'Bánh đa chả cá', 52000, 'Bánh đa dai, chả cá chiên vàng, nước dùng ngọt xương.', { v: 'bowl', t: 12 }],
      [0, 'Chả cá chiên giòn', 75000, 'Chả cá viên chiên giòn chấm tương ớt chua ngọt.', { t: 12 }],
      [1, 'Nem rán Hà Nội', 40000, 'Nem rán nhân thịt, miến, mộc nhĩ chiên vàng giòn (3 cái).', { t: 12 }],
      [1, 'Giò chả thái lát', 45000, 'Giò lụa và chả quế thái mỏng ăn kèm nước chấm.', { t: 6 }],
      [1, 'Đậu hũ rán', 25000, 'Đậu hũ rán giòn chấm mắm tôm hoặc nước mắm.', { t: 8 }],
      [1, 'Gỏi ngó sen tôm thịt', 65000, 'Ngó sen giòn trộn tôm, thịt, rau răm và đậu phộng.', { t: 10 }],
      [1, 'Rau thơm thêm', 10000, 'Thì là, hành lá, rau thơm tươi gọi thêm.', { a: null, t: 3 }],
      [1, 'Mắm tôm pha chanh', 8000, 'Mắm tôm pha sẵn chanh, đường, ớt.', { a: null, t: 2 }],
      [2, 'Trà đá', 5000, 'Trà đá mát lạnh.', { t: 2, a: null, s: [] }],
      [2, 'Trà chanh', 20000, 'Trà đá vắt chanh tươi, đường vừa.', { t: 4, s: D }],
      [2, 'Trà gừng nóng', 22000, 'Trà gừng mật ong nóng giải ngấy sau bữa ăn.', { t: 4, a: 'tea_lemon', s: H }],
      [2, 'Nước sâm', 18000, 'Nước sâm mát nấu từ la hán quả và râu ngô.', { t: 3, a: null, s: [] }]
    ]
  },
  {
    key: 'banh-mi-pho-hang', region: 'HN', city: 'Hà Nội', ...at('pho-pho-co', [21.0338, 105.8505]), kind: 'food', category: 'Đồ ăn nhanh', hours: ['06:00', '21:00'], minOrder: 30000,
    owner: owner('banhmi.phohang', 'Lương Thị Mai', 2), name: 'Bánh Mì Phố Hàng', description: 'Bánh mì nóng giòn nhân pate, thịt nguội, chả và trứng ốp la — ăn sáng và ăn nhẹ cả ngày.',
    cats: [['Bánh mì', { a: 'side_extra', s: S }], ['Ăn sáng', { a: null }], ['Đồ uống', { a: 'glass_extra', s: D }]],
    dishes: [
      [0, 'Bánh mì thịt nguội', 25000, 'Bánh mì giòn, pate gan, thịt nguội, dưa leo, đồ chua và ngò.', { f: 1, t: 6 }],
      [0, 'Bánh mì chả lụa', 22000, 'Chả lụa thái lát, pate, bơ, dưa leo và rau mùi.', { t: 6 }],
      [0, 'Bánh mì thịt nướng', 28000, 'Thịt heo nướng sả mật ong, rau sống, đồ chua, sốt đặc biệt.', { f: 1, t: 8 }],
      [0, 'Bánh mì gà xé', 27000, 'Gà luộc xé phay trộn hành tím, rau răm, sốt mayonnaise.', { t: 7 }],
      [0, 'Bánh mì đặc biệt', 35000, 'Đủ pate, thịt nguội, chả lụa, trứng ốp la và dưa góp.', { t: 8 }],
      [0, 'Bánh mì xíu mại', 30000, 'Xíu mại sốt cà chua nóng ăn với ổ bánh mì giòn.', { t: 8 }],
      [0, 'Bánh mì chảo', 45000, 'Chảo gang nóng trứng ốp la, pate, xúc xích, thịt bò, bánh mì chấm.', { t: 12, a: 'rice_side' }],
      [0, 'Bánh mì que cay', 15000, 'Bánh mì que giòn nhân pate, ruốc và sốt cay.', { t: 5 }],
      [1, 'Trứng ốp la', 10000, 'Trứng gà ta ốp la lòng đào.', { t: 5 }],
      [1, 'Xôi xéo', 20000, 'Xôi nếp vàng, đậu xanh nghiền, hành phi, mỡ gà.', { t: 6, a: 'xoi_extra' }],
      [1, 'Xôi gà xé', 30000, 'Xôi nếp, gà xé, hành phi và nước mỡ thơm.', { t: 6, a: 'xoi_extra' }],
      [1, 'Pate thêm', 8000, 'Phần pate gan tự làm gọi thêm.', { t: 2 }],
      [2, 'Cà phê sữa đá', 22000, 'Cà phê phin sữa đặc, đá viên.', { t: 5, a: 'coffee', s: D }],
      [2, 'Trà đá', 5000, 'Trà đá mát lạnh.', { t: 2, a: null, s: [] }],
      [2, 'Trà tắc', 15000, 'Trà tắc mát lạnh, vị chua ngọt dễ uống.', { t: 4, a: 'tea_lemon', s: D }]
    ]
  },
  /* ===== Phường Ngọc Hà ===== */
  {
    key: 'bun-oc-ngoc-ha', region: 'HN', city: 'Hà Nội', ...at('bun-cha-lieu-giai', [21.0360, 105.8190]), kind: 'food', category: 'Bún - Phở', hours: ['08:00', '21:00'], minOrder: 40000,
    owner: owner('bunoc.ngocha', 'Hoàng Thị Lan', 3), name: 'Bún Ốc Nguội Ngọc Hà', description: 'Bún ốc nước dùng chua thanh, ốc nhồi lá lốt, giò chả và đồ ăn vặt kiểu Hà Nội.',
    cats: [['Bún ốc & bún riêu', { a: 'noodle_bowl', s: S }], ['Đồ ăn vặt', { a: 'side_extra' }], ['Đồ uống', { a: 'glass_extra', s: D }]],
    dishes: [
      [0, 'Bún ốc nguội', 45000, 'Bún sợi nhỏ, ốc luộc, giò sống, chuối xanh, nước dùng chua dịu.', { v: 'bowl', f: 1, t: 10 }],
      [0, 'Bún ốc nóng', 45000, 'Bún nước dùng nóng, ốc, đậu rán, cà chua, rau sống.', { v: 'bowl', t: 10 }],
      [0, 'Bún riêu cua', 48000, 'Riêu cua đồng, đậu hũ, cà chua, huyết, rau muống bào.', { v: 'bowl', f: 1, t: 10 }],
      [0, 'Bún riêu ốc', 52000, 'Riêu cua kết hợp ốc bươu, nước dùng đỏ cam thơm.', { v: 'bowl', t: 10 }],
      [0, 'Bún thang', 55000, 'Gà xé, trứng thái chỉ, giò lụa, tôm khô, nước dùng trong.', { v: 'bowl', t: 12 }],
      [0, 'Bún mọc', 48000, 'Mọc viên, sườn, giò, nước dùng ngọt xương heo.', { v: 'bowl', t: 10 }],
      [1, 'Ốc nhồi lá lốt', 55000, 'Ốc nhồi thịt hấp lá lốt, chấm gừng mắm (6 con).', { t: 12 }],
      [1, 'Nem chua rán', 40000, 'Nem chua rán giòn chấm tương ớt (6 cái).', { t: 10 }],
      [1, 'Chả giò hải sản', 45000, 'Chả giò nhân tôm mực chiên vàng giòn (4 cái).', { t: 10 }],
      [1, 'Đậu rán', 25000, 'Đậu hũ rán nóng giòn ăn với mắm tôm.', { t: 8 }],
      [1, 'Giò heo thêm', 30000, 'Phần giò heo hầm mềm gọi thêm.', { t: 6, a: null }],
      [1, 'Quẩy giòn', 10000, 'Quẩy nóng chấm nước dùng.', { t: 4, a: null }],
      [2, 'Trà đá', 5000, 'Trà đá mát lạnh.', { t: 2, a: null, s: [] }],
      [2, 'Trà chanh', 20000, 'Trà chanh tươi vắt tay.', { t: 4, s: D }],
      [2, 'Nước sâm bí đao', 18000, 'Nước sâm bí đao ngọt thanh, mát gan.', { t: 3, a: null, s: [] }]
    ]
  },
  {
    key: 'tra-sua-hoa-sua', region: 'HN', city: 'Hà Nội', ...at('bun-cha-lieu-giai', [21.0360, 105.8190]), kind: 'drink', category: 'Trà sữa', hours: ['09:00', '22:30'], minOrder: 35000,
    owner: owner('trasua.hoasua', 'Đặng Phương Anh', 4), name: 'Trà Sữa Hoa Sữa', description: 'Trà sữa trân châu nấu mới mỗi giờ, trà trái cây và kem cheese — chuẩn vị trẻ Hà Nội.',
    cats: [['Trà sữa', { a: 'tea_milk', s: D }], ['Trà trái cây', { a: 'tea_fruit', s: D }], ['Ăn vặt', { a: null }]],
    dishes: [
      [0, 'Trà sữa trân châu đường đen', 39000, 'Trà sữa đậm vị, trân châu đường đen nấu mềm dẻo.', { v: 'drink', f: 1, t: 6 }],
      [0, 'Trà sữa truyền thống', 32000, 'Trà đen thơm, sữa béo, vị cổ điển dễ uống.', { v: 'drink', t: 5 }],
      [0, 'Trà sữa matcha', 42000, 'Matcha Nhật pha sữa tươi, thơm nhẹ, béo vừa.', { v: 'drink', f: 1, t: 6 }],
      [0, 'Trà sữa khoai môn', 40000, 'Khoai môn nghiền mịn, trà sữa tím nhạt, béo bùi.', { v: 'drink', t: 6 }],
      [0, 'Trà sữa kem cheese', 45000, 'Trà sữa phủ lớp kem cheese mặn ngọt.', { v: 'drink', t: 7 }],
      [0, 'Trà sữa socola', 41000, 'Trà sữa socola đậm đà, topping thạch hoặc trân châu.', { v: 'drink', t: 6 }],
      [0, 'Trà sữa Thái xanh', 36000, 'Trà Thái xanh thơm lá dứa, sữa béo mát.', { v: 'drink', t: 5 }],
      [1, 'Trà đào cam sả', 42000, 'Trà đen, đào ngâm, cam vàng, sả đập dập.', { v: 'drink', f: 1, t: 6 }],
      [1, 'Trà vải hoa hồng', 40000, 'Trà lài, vải ngâm, hoa hồng sấy.', { v: 'drink', t: 6 }],
      [1, 'Trà xoài nhiệt đới', 42000, 'Trà xoài chín, thạch dừa, thơm mùi trái cây.', { v: 'drink', t: 6 }],
      [1, 'Trà dâu tằm', 38000, 'Dâu tằm chua ngọt, trà đen, đá bào.', { v: 'drink', t: 6 }],
      [1, 'Soda chanh dây', 35000, 'Soda chanh dây sảng khoái, hạt chanh dây thật.', { v: 'drink', t: 5, a: 'tea_lemon' }],
      [1, 'Trà tắc', 28000, 'Trà tắc chua ngọt giải khát.', { v: 'drink', t: 4, a: 'tea_lemon' }],
      [2, 'Bánh tráng trộn', 25000, 'Bánh tráng trộn xoài, trứng cút, khô bò, rau răm.', { t: 6 }],
      [2, 'Khoai tây lắc phô mai', 30000, 'Khoai chiên giòn lắc bột phô mai.', { t: 8 }]
    ]
  },
  /* ===== Phường Bạch Mai ===== */
  {
    key: 'xoi-che-co-lan', region: 'HN', city: 'Hà Nội', ...at('ca-phe-trung', [21.0100, 105.8500]), kind: 'food', category: 'Đồ ăn vặt', hours: ['06:00', '21:00'], minOrder: 30000,
    owner: owner('xoiche.colan', 'Nguyễn Thị Lan', 5), name: 'Xôi Chè Cô Lan', description: 'Xôi nóng buổi sáng, chè nấu tại quán buổi chiều — những món quen thuộc của phố phường Hà Nội.',
    cats: [['Xôi', { a: 'xoi_extra' }], ['Chè & tráng miệng', { a: 'che_extra' }], ['Đồ uống', { a: 'glass_extra', s: D }]],
    dishes: [
      [0, 'Xôi xéo', 20000, 'Xôi nếp vàng, đậu xanh nghiền, hành phi giòn, mỡ gà.', { f: 1, t: 6 }],
      [0, 'Xôi gà', 32000, 'Xôi nếp, gà ta xé, hành phi, nước mỡ thơm.', { f: 1, t: 6 }],
      [0, 'Xôi thịt kho', 32000, 'Xôi nếp ăn với thịt ba chỉ kho tộ và trứng.', { t: 6 }],
      [0, 'Xôi chả', 28000, 'Xôi nếp kèm chả lụa và chà bông.', { t: 6 }],
      [0, 'Xôi lạc', 20000, 'Xôi nếp dẻo với lạc rang giã và muối vừng.', { t: 5 }],
      [0, 'Xôi ngô', 20000, 'Xôi ngô vàng thơm, hành phi và dừa nạo.', { t: 5 }],
      [0, 'Xôi gấc', 25000, 'Xôi gấc đỏ óng, nếp dẻo thơm mùi gấc.', { t: 5 }],
      [1, 'Chè thái', 28000, 'Chè thái nhiều loại trái cây, thạch, nước cốt dừa.', { t: 6 }],
      [1, 'Chè đậu xanh', 20000, 'Chè đậu xanh nhuyễn, thơm mùi lá dứa.', { t: 5 }],
      [1, 'Chè khúc bạch', 30000, 'Khúc bạch mềm mịn, nhãn, hạnh nhân, thạch.', { t: 6 }],
      [1, 'Chè hạt sen', 28000, 'Chè hạt sen long nhãn nấu mềm, ăn nóng hoặc lạnh.', { t: 6 }],
      [1, 'Chè bà ba', 25000, 'Khoai lang, chuối, bột báng nấu nước cốt dừa.', { t: 6 }],
      [1, 'Sữa chua nếp cẩm', 25000, 'Sữa chua mịn, nếp cẩm dẻo thơm.', { t: 3 }],
      [2, 'Trà đá', 5000, 'Trà đá mát lạnh.', { t: 2, a: null, s: [] }],
      [2, 'Trà chanh', 18000, 'Trà đá vắt chanh tươi.', { t: 4, s: D }]
    ]
  },
  {
    key: 'pizza-cui-bach-mai', region: 'HN', city: 'Hà Nội', ...at('ca-phe-trung', [21.0100, 105.8500]), kind: 'food', category: 'Pizza', hours: ['10:00', '22:30'], minOrder: 90000,
    owner: owner('pizza.cuibachmai', 'Trịnh Quốc Bảo', 6), name: 'Pizza Củi Bạch Mai', description: 'Pizza đế mỏng nướng lò củi, mì Ý và salad tươi — hợp bữa tối nhóm bạn.',
    cats: [['Pizza', { a: 'pizza_top' }], ['Mì Ý & salad', { a: 'side_extra' }], ['Đồ uống', { a: 'glass_extra', s: D }]],
    dishes: [
      [0, 'Pizza margherita', 129000, 'Sốt cà chua, mozzarella và húng quế tươi trên đế mỏng.', { v: 'piece', f: 1, t: 18 }],
      [0, 'Pizza hải sản', 159000, 'Tôm, mực, nghêu, phô mai mozzarella, sốt cà chua.', { v: 'piece', t: 20 }],
      [0, 'Pizza pepperoni', 149000, 'Xúc xích pepperoni cay nhẹ, phô mai kéo sợi.', { v: 'piece', f: 1, t: 18 }],
      [0, 'Pizza bốn loại phô mai', 169000, 'Mozzarella, cheddar, parmesan và xanh blue cheese.', { v: 'piece', t: 20 }],
      [0, 'Pizza gà nướng nấm', 145000, 'Gà nướng, nấm tươi, hành tây, sốt BBQ.', { v: 'piece', t: 18 }],
      [0, 'Pizza rau củ', 135000, 'Ớt chuông, nấm, ô liu, cà chua, phô mai.', { v: 'piece', t: 18 }],
      [0, 'Pizza Hawaii', 139000, 'Giăm bông, dứa, phô mai mozzarella.', { v: 'piece', t: 18 }],
      [1, 'Mì Ý bò bằm', 85000, 'Spaghetti sốt bò bằm cà chua, phô mai bào.', { t: 14 }],
      [1, 'Mì Ý carbonara', 89000, 'Spaghetti sốt kem trứng, thịt xông khói, tiêu đen.', { t: 14 }],
      [1, 'Mì Ý sốt cà chua', 69000, 'Spaghetti sốt cà chua húng quế, dầu ô liu.', { t: 12 }],
      [1, 'Salad Caesar', 65000, 'Xà lách romaine, gà nướng, bánh mì giòn, sốt Caesar.', { t: 8 }],
      [1, 'Khoai tây chiên', 35000, 'Khoai tây chiên giòn rắc muối.', { t: 8 }],
      [1, 'Bánh mì bơ tỏi', 39000, 'Bánh mì nướng bơ tỏi nóng giòn (4 miếng).', { t: 8, a: null }],
      [2, 'Coca-Cola lon', 18000, 'Coca-Cola lon ướp lạnh.', { t: 2, a: null, s: [] }],
      [2, 'Trà đào cam sả', 38000, 'Trà đào cam sả thơm mát.', { t: 6, s: D }]
    ]
  },
  /* ===== Phường Ô Chợ Dừa ===== */
  {
    key: 'com-ga-xoi-mo', region: 'HN', city: 'Hà Nội', ...at('lau-nuong-tay-son', [21.0170, 105.8260]), kind: 'food', category: 'Cơm', hours: ['10:00', '21:30'], minOrder: 50000,
    owner: owner('comga.xoimo', 'Phan Văn Tùng', 7), name: 'Cơm Gà Xối Mỡ Chợ Dừa', description: 'Cơm gà xối mỡ da giòn rụm, cơm rang dưa bò và canh nóng — bữa trưa văn phòng no nê.',
    cats: [['Cơm gà', { a: 'rice_side' }], ['Cơm rang & món khác', { a: 'rice_side' }], ['Đồ uống', { a: 'glass_extra', s: D }]],
    dishes: [
      [0, 'Cơm gà xối mỡ', 49000, 'Đùi gà chiên xối mỡ giòn, cơm trắng, dưa chua, canh.', { f: 1, t: 12 }],
      [0, 'Cơm gà nướng mật ong', 52000, 'Gà nướng mật ong thơm lừng, cơm trắng, rau củ luộc.', { t: 14 }],
      [0, 'Cơm gà teriyaki', 55000, 'Gà sốt teriyaki đậm vị, cơm trắng, bông cải.', { t: 14 }],
      [0, 'Cơm gà luộc', 49000, 'Gà ta luộc xé, cơm chiên mỡ gà, nước chấm gừng.', { t: 12 }],
      [0, 'Cơm gà sốt cay', 55000, 'Gà chiên phủ sốt cay ngọt kiểu Hàn, cơm trắng.', { t: 14, s: S }],
      [0, 'Cơm cánh gà chiên nước mắm', 52000, 'Cánh gà chiên nước mắm tỏi ớt, cơm trắng.', { t: 14 }],
      [1, 'Cơm rang dưa bò', 55000, 'Cơm rang giòn hạt, dưa cải chua, bò xào hành tây.', { f: 1, t: 12 }],
      [1, 'Cơm rang thập cẩm', 50000, 'Cơm rang trứng, xúc xích, tôm khô, rau củ.', { t: 12 }],
      [1, 'Cơm chiên trứng', 40000, 'Cơm chiên trứng đơn giản, hành lá thơm.', { t: 10 }],
      [1, 'Cơm sườn nướng', 55000, 'Sườn heo nướng sả, cơm trắng, đồ chua, trứng ốp la.', { t: 14 }],
      [1, 'Canh rau củ thịt bằm', 25000, 'Canh rau củ nấu thịt bằm thanh ngọt.', { a: null, t: 8 }],
      [1, 'Rau muống xào tỏi', 30000, 'Rau muống xào tỏi xanh giòn.', { a: null, t: 8 }],
      [1, 'Trứng ốp la', 10000, 'Trứng ốp la gọi thêm.', { a: null, t: 4 }],
      [2, 'Trà đá', 5000, 'Trà đá mát lạnh.', { t: 2, a: null, s: [] }],
      [2, 'Trà chanh', 18000, 'Trà đá vắt chanh tươi.', { t: 4, s: D }]
    ]
  },
  {
    key: 'bun-bo-nam-bo', region: 'HN', city: 'Hà Nội', ...at('lau-nuong-tay-son', [21.0170, 105.8260]), kind: 'food', category: 'Bún - Phở', hours: ['07:00', '21:00'], minOrder: 45000,
    owner: owner('bunbo.nambo', 'Lâm Thị Hạnh', 8), name: 'Bún Bò Nam Bộ Tây Sơn', description: 'Bún bò Nam Bộ trộn nước mắm, bún bò Huế cay nồng và các món bún trộn mát cho ngày nóng.',
    cats: [['Bún bò', { a: 'noodle_bowl', s: S }], ['Ăn kèm', { a: 'side_extra' }], ['Đồ uống', { a: 'glass_extra', s: D }]],
    dishes: [
      [0, 'Bún bò Nam Bộ', 55000, 'Bún trộn bò xào sả, đậu phộng, giá, rau thơm, nước mắm pha.', { v: 'bowl', f: 1, t: 10 }],
      [0, 'Bún bò Huế', 55000, 'Nước dùng sả ớt đậm đà, bò nạm, giò heo, chả Huế.', { v: 'bowl', f: 1, t: 12 }],
      [0, 'Bún bò giò heo', 62000, 'Bún bò Huế thêm giò heo hầm mềm.', { v: 'bowl', t: 12 }],
      [0, 'Bún thịt nướng chả giò', 55000, 'Thịt nướng sả, chả giò chiên, bún, rau, nước mắm.', { v: 'bowl', t: 10 }],
      [0, 'Bún mắm', 58000, 'Nước dùng mắm cá linh, tôm, mực, thịt heo quay.', { v: 'bowl', t: 12 }],
      [0, 'Bún riêu cua', 50000, 'Riêu cua, đậu hũ, cà chua, rau sống.', { v: 'bowl', t: 10 }],
      [0, 'Hủ tiếu bò kho', 58000, 'Hủ tiếu mềm, bò kho đậm vị, bánh mì chấm.', { v: 'bowl', t: 12 }],
      [0, 'Bún bò chay', 48000, 'Nước dùng rau củ, đậu hũ, nấm, giả bò.', { v: 'bowl', t: 10 }],
      [1, 'Chả giò chiên', 35000, 'Chả giò nhân thịt chiên giòn (4 cái).', { t: 10 }],
      [1, 'Bò viên gọi thêm', 20000, 'Bò viên dai giòn (5 viên).', { t: 4, a: null }],
      [1, 'Giò heo thêm', 30000, 'Giò heo hầm mềm gọi thêm.', { t: 4, a: null }],
      [1, 'Rau sống thêm', 8000, 'Rau sống, bắp chuối bào, giá.', { t: 3, a: null }],
      [2, 'Trà đá', 5000, 'Trà đá mát lạnh.', { t: 2, a: null, s: [] }],
      [2, 'Nước sâm lá dứa', 20000, 'Nước sâm lá dứa thơm mát.', { t: 3, a: null, s: [] }],
      [2, 'Trà tắc', 15000, 'Trà tắc chua ngọt.', { t: 4, a: 'tea_lemon', s: D }]
    ]
  },
  /* ===== Phường Nghĩa Đô ===== */
  {
    key: 'burger-nghia-do', region: 'HN', city: 'Hà Nội', ...at('seoul-bep-han', [21.0335, 105.7940]), kind: 'food', category: 'Đồ ăn nhanh', hours: ['10:00', '22:30'], minOrder: 60000,
    owner: owner('burger.nghiado', 'Bùi Anh Tuấn', 9), name: 'Burger Bò Nướng Nghĩa Đô', description: 'Burger bò nướng than, gà giòn, khoai chiên và hotdog kiểu Mỹ cho bữa nhanh gọn.',
    cats: [['Burger', { a: 'side_extra', s: S }], ['Ăn kèm', { a: 'side_extra' }], ['Đồ uống', { a: 'glass_extra', s: D }]],
    dishes: [
      [0, 'Burger bò phô mai', 69000, 'Bò nướng, phô mai cheddar, dưa chuột, xà lách, sốt đặc biệt.', { f: 1, t: 12 }],
      [0, 'Burger bò đôi', 95000, 'Hai lớp bò nướng, phô mai, bacon, hành tây.', { f: 1, t: 14 }],
      [0, 'Burger gà giòn', 62000, 'Gà chiên giòn, xà lách, mayonnaise.', { t: 12 }],
      [0, 'Burger cá', 65000, 'Cá phi lê chiên giòn, sốt tartar, rau xanh.', { t: 12 }],
      [0, 'Burger trứng ốp la', 72000, 'Bò nướng, trứng ốp la, phô mai, cà chua.', { t: 12 }],
      [0, 'Burger chay', 62000, 'Patty đậu và nấm, rau củ, sốt mayonnaise chay.', { t: 12 }],
      [0, 'Hotdog xúc xích', 45000, 'Xúc xích nướng, bánh mì mềm, hành chiên, sốt mù tạt.', { t: 8 }],
      [0, 'Sandwich gà nướng', 52000, 'Bánh sandwich nướng, gà nướng, phô mai, rau.', { t: 10 }],
      [1, 'Khoai tây chiên', 30000, 'Khoai tây chiên giòn rắc muối.', { t: 8 }],
      [1, 'Khoai wedges', 38000, 'Khoai múi cau nướng giòn, sốt kem chua.', { t: 10 }],
      [1, 'Gà viên chiên', 45000, 'Gà viên chiên vàng giòn (8 viên).', { t: 8 }],
      [1, 'Hành tây chiên', 35000, 'Hành tây chiên giòn xù (8 khoanh).', { t: 8 }],
      [1, 'Salad bắp cải', 25000, 'Bắp cải tím trộn sốt mayonnaise.', { t: 4, a: null }],
      [2, 'Coca-Cola lon', 18000, 'Coca-Cola lon ướp lạnh.', { t: 2, a: null, s: [] }],
      [2, 'Trà đào', 32000, 'Trà đào mát lạnh, miếng đào ngâm.', { t: 5, a: 'tea_fruit', s: D }]
    ]
  },
  {
    key: 'chao-suon-nghia-do', region: 'HN', city: 'Hà Nội', ...at('seoul-bep-han', [21.0335, 105.7940]), kind: 'food', category: 'Món Việt', hours: ['06:00', '22:00'], minOrder: 35000,
    owner: owner('chao.suonnghiado', 'Kiều Thị Nga', 10), name: 'Cháo Sườn Sụn Nghĩa Đô', description: 'Cháo sườn sụn nấu nhừ, cháo trai, cháo lòng và quẩy nóng — ấm bụng những ngày se lạnh.',
    cats: [['Các loại cháo', { a: 'noodle_bowl' }], ['Ăn kèm', { a: 'side_extra' }], ['Đồ uống', { a: 'glass_extra', s: D }]],
    dishes: [
      [0, 'Cháo sườn sụn', 40000, 'Cháo gạo nấu nhừ, sườn sụn giòn, hành lá, tiêu.', { v: 'bowl', f: 1, t: 10 }],
      [0, 'Cháo lòng', 40000, 'Cháo ăn kèm lòng, dồi, tim, gừng thái sợi.', { v: 'bowl', t: 10 }],
      [0, 'Cháo trai', 42000, 'Cháo nấu thịt trai tươi, gừng, rau răm.', { v: 'bowl', t: 10 }],
      [0, 'Cháo gà', 38000, 'Cháo gà xé, hành phi, rau răm.', { v: 'bowl', t: 10 }],
      [0, 'Cháo cá lóc', 45000, 'Cháo cá lóc nấu nghệ, thì là, hành.', { v: 'bowl', t: 12 }],
      [0, 'Cháo trắng hột vịt muối', 22000, 'Cháo trắng ăn kèm trứng vịt muối, ruốc.', { v: 'bowl', t: 8 }],
      [0, 'Cháo thịt bằm', 32000, 'Cháo thịt heo bằm nhuyễn, hành phi.', { v: 'bowl', t: 8 }],
      [0, 'Cháo yến mạch thịt gà', 42000, 'Yến mạch nấu cùng gà xé, bổ dưỡng nhẹ bụng.', { v: 'bowl', t: 10 }],
      [1, 'Quẩy giòn', 10000, 'Quẩy nóng giòn chấm cháo.', { t: 4, a: null }],
      [1, 'Trứng chần', 8000, 'Trứng gà chần lòng đào.', { t: 4, a: null }],
      [1, 'Dồi sụn nướng', 35000, 'Dồi sụn nướng giòn, chấm tương ớt.', { t: 10 }],
      [1, 'Nem chua rán', 40000, 'Nem chua rán chấm tương ớt (6 cái).', { t: 10 }],
      [1, 'Gỏi gà', 55000, 'Gỏi gà xé phay, hành tây, rau răm, lạc rang.', { t: 8 }],
      [2, 'Trà đá', 5000, 'Trà đá mát lạnh.', { t: 2, a: null, s: [] }],
      [2, 'Trà gừng', 20000, 'Trà gừng nóng giữ ấm.', { t: 4, a: 'tea_lemon', s: H }]
    ]
  },
  /* ===== Phường Khương Đình ===== */
  {
    key: 'ramen-khuong-dinh', region: 'HN', city: 'Hà Nội', ...at('sushi-sakura', [20.9930, 105.8100]), kind: 'food', category: 'Món Nhật', hours: ['11:00', '21:30'], minOrder: 80000,
    owner: owner('ramen.khuongdinh', 'Ngô Minh Quân', 11), name: 'Ramen Ichi Khương Đình', description: 'Ramen nước dùng xương heo ninh 12 giờ, udon, cơm cà ri katsu và gyoza chiên giòn.',
    cats: [['Ramen & udon', { a: 'ramen_extra', s: S }], ['Cơm & món chiên', { a: 'tempura' }], ['Đồ uống', { a: 'glass_extra', s: D }]],
    dishes: [
      [0, 'Ramen tonkotsu', 89000, 'Nước dùng xương heo béo, mì ramen, chashu, trứng lòng đào.', { f: 1, t: 15 }],
      [0, 'Ramen shoyu', 85000, 'Nước dùng nước tương trong, chashu, măng, rong biển.', { t: 15 }],
      [0, 'Ramen miso cay', 92000, 'Nước dùng miso cay, ngô bơ, thịt bằm.', { f: 1, t: 15 }],
      [0, 'Ramen gà', 82000, 'Nước dùng gà thanh, gà nướng, hành lá.', { t: 15 }],
      [0, 'Udon tempura', 89000, 'Mì udon nước dashi, tôm tempura giòn.', { t: 15 }],
      [0, 'Udon bò', 92000, 'Mì udon, bò thái mỏng, hành lá, nước dashi.', { t: 15 }],
      [0, 'Soba lạnh', 75000, 'Mì kiều mạch ăn lạnh với nước chấm tsuyu.', { t: 10 }],
      [1, 'Cơm cà ri katsu', 89000, 'Thịt heo chiên xù, cà ri Nhật, cơm trắng.', { f: 1, t: 15 }],
      [1, 'Cơm gà teriyaki', 75000, 'Gà nướng sốt teriyaki, cơm Nhật, rau luộc.', { t: 14 }],
      [1, 'Cơm bò sốt tiêu đen', 89000, 'Bò xào sốt tiêu đen, hành tây, cơm trắng.', { t: 14 }],
      [1, 'Gyoza chiên', 49000, 'Há cảo Nhật áp chảo vàng giòn (6 cái).', { t: 10 }],
      [1, 'Karaage gà', 59000, 'Gà chiên kiểu Nhật chấm sốt mayonnaise chanh.', { t: 10 }],
      [1, 'Tempura tôm', 79000, 'Tôm chiên bột mỏng giòn, nước chấm tentsuyu (5 con).', { t: 12 }],
      [1, 'Trứng cuộn tamagoyaki', 45000, 'Trứng cuộn Nhật ngọt nhẹ.', { t: 8, a: null }],
      [2, 'Trà xanh matcha đá', 42000, 'Matcha Nhật pha đá, vị đắng nhẹ hậu ngọt.', { t: 5, a: 'tea_lemon', s: D }]
    ]
  },
  {
    key: 'bun-dau-co-tam', region: 'HN', city: 'Hà Nội', ...at('sushi-sakura', [20.9930, 105.8100]), kind: 'food', category: 'Món Việt', hours: ['09:00', '21:30'], minOrder: 50000,
    owner: owner('bundau.cotam', 'Mạc Thị Tâm', 12), name: 'Bún Đậu Cô Tâm', description: 'Mẹt bún đậu mắm tôm đầy đặn, đậu rán nóng giòn, chả cốm, lòng dồi và nem chua rán.',
    cats: [['Mẹt bún đậu', { a: 'bun_cha', s: S }], ['Món chiên & ăn kèm', { a: 'side_extra' }], ['Đồ uống', { a: 'glass_extra', s: D }]],
    dishes: [
      [0, 'Mẹt bún đậu cơ bản', 59000, 'Đậu rán, bún lá, chả cốm, thịt luộc, mắm tôm.', { v: 'portion', f: 1, t: 12 }],
      [0, 'Mẹt bún đậu đầy đủ', 89000, 'Đậu rán, chả cốm, dồi sụn, lòng, thịt chân giò, nem chua.', { v: 'portion', f: 1, t: 14 }],
      [0, 'Mẹt bún đậu chả cốm', 69000, 'Nhiều chả cốm thơm mùi lá cốm, đậu rán, bún.', { v: 'portion', t: 12 }],
      [0, 'Mẹt bún đậu thịt chân giò', 79000, 'Chân giò luộc giòn kèm đậu rán và bún lá.', { v: 'portion', t: 14 }],
      [0, 'Bún đậu chả giò', 65000, 'Chả giò chiên giòn, đậu rán, bún, mắm tôm.', { v: 'portion', t: 12 }],
      [0, 'Bún chả nướng', 58000, 'Chả nướng than hoa, bún, nước chấm chua ngọt.', { v: 'portion', t: 12 }],
      [0, 'Bún đậu chay', 52000, 'Đậu rán, nấm chiên, rau thơm, tương chấm.', { v: 'portion', t: 10 }],
      [1, 'Đậu rán nóng', 25000, 'Đậu hũ rán nóng giòn (6 miếng).', { t: 8 }],
      [1, 'Chả cốm chiên', 40000, 'Chả cốm chiên vàng thơm mùi cốm (6 viên).', { t: 10 }],
      [1, 'Nem chua rán', 40000, 'Nem chua rán giòn chấm tương ớt.', { t: 10 }],
      [1, 'Lòng dồi chiên', 45000, 'Dồi sụn và lòng non chiên giòn.', { t: 10 }],
      [1, 'Dưa leo cà chua trộn', 25000, 'Dưa leo, cà chua trộn chua ngọt giải ngấy.', { t: 4, a: null }],
      [1, 'Rau sống thêm', 10000, 'Rau sống, kinh giới, tía tô.', { t: 3, a: null }],
      [2, 'Trà đá', 5000, 'Trà đá mát lạnh.', { t: 2, a: null, s: [] }],
      [2, 'Nước sâm', 18000, 'Nước sâm giải nhiệt.', { t: 3, a: null, s: [] }]
    ]
  },
  /* ===== Phường Tây Hồ ===== */
  {
    key: 'banh-tom-ho-tay', region: 'HN', city: 'Hà Nội', ...at('dimsum-ho-tay', [21.0690, 105.8190]), kind: 'food', category: 'Đồ ăn vặt', hours: ['14:00', '21:30'], minOrder: 40000,
    owner: owner('banhtom.hotay', 'Cao Văn Đạt', 13), name: 'Bánh Tôm Hồ Tây', description: 'Bánh tôm Hồ Tây vàng giòn, bánh rán mặn, nem chua rán và các món ăn vặt chiều gió hồ.',
    cats: [['Bánh tôm & món chiên', { a: 'side_extra' }], ['Ăn vặt', { a: 'side_extra' }], ['Đồ uống', { a: 'glass_extra', s: D }]],
    dishes: [
      [0, 'Bánh tôm Hồ Tây', 45000, 'Tôm tươi, khoai lang cắt sợi chiên vàng giòn (4 cái).', { f: 1, t: 12 }],
      [0, 'Bánh tôm khoai lang', 40000, 'Khoai lang sợi, tôm nhỏ chiên giòn rụm.', { t: 12 }],
      [0, 'Bánh rán mặn', 30000, 'Bánh rán nhân thịt, miến, mộc nhĩ (2 cái).', { t: 10 }],
      [0, 'Nem rán', 40000, 'Nem rán Hà Nội nhân thịt chiên giòn (4 cái).', { t: 12 }],
      [0, 'Chả giò hải sản', 48000, 'Chả giò nhân tôm mực chiên vàng giòn (4 cái).', { t: 12 }],
      [0, 'Nem chua rán', 40000, 'Nem chua rán chấm tương ớt (6 cái).', { t: 10 }],
      [0, 'Khoai lang chiên', 30000, 'Khoai lang chiên giòn rắc muối.', { t: 8 }],
      [1, 'Bánh tráng trộn', 28000, 'Bánh tráng trộn xoài, trứng cút, khô bò, rau răm.', { t: 6 }],
      [1, 'Bánh tráng nướng', 25000, 'Bánh tráng nướng trứng, hành phi, xúc xích.', { t: 8 }],
      [1, 'Xoài lắc', 30000, 'Xoài xanh lắc muối tôm, ớt.', { t: 4 }],
      [1, 'Cá viên chiên', 30000, 'Cá viên chiên giòn chấm tương ớt (10 viên).', { t: 8 }],
      [1, 'Trứng cút nướng', 28000, 'Xiên trứng cút nướng mỡ hành (10 trứng).', { t: 8 }],
      [1, 'Ốc len xào dừa', 55000, 'Ốc len xào nước cốt dừa béo thơm.', { t: 12 }],
      [2, 'Trà chanh', 20000, 'Trà chanh vắt tay mát lạnh.', { t: 4, s: D }],
      [2, 'Trà tắc', 15000, 'Trà tắc chua ngọt.', { t: 4, a: 'tea_lemon', s: D }]
    ]
  },
  {
    key: 'ca-phe-gio-ho-tay', region: 'HN', city: 'Hà Nội', ...at('dimsum-ho-tay', [21.0690, 105.8190]), kind: 'drink', category: 'Đồ uống', hours: ['07:00', '22:00'], minOrder: 40000,
    owner: owner('caphe.giohotay', 'Đinh Thu Trang', 14), name: 'Cà Phê Gió Hồ Tây', description: 'Cà phê rang xay, cà phê muối, trà trái cây và bánh ngọt — view hồ thoáng mát.',
    cats: [['Cà phê', { a: 'coffee', s: D }], ['Trà & nước ép', { a: 'tea_fruit', s: D }], ['Bánh ngọt', { a: 'sweet' }]],
    dishes: [
      [0, 'Cà phê muối', 35000, 'Cà phê sữa phủ kem muối mặn nhẹ, hậu vị béo.', { v: 'drink', f: 1, t: 6 }],
      [0, 'Cà phê sữa đá', 29000, 'Cà phê phin sữa đặc, đá viên.', { v: 'drink', t: 6 }],
      [0, 'Cà phê đen đá', 25000, 'Cà phê phin nguyên chất không đường.', { v: 'drink', t: 5 }],
      [0, 'Bạc xỉu', 32000, 'Nhiều sữa ít cà phê, dịu ngọt.', { v: 'drink', t: 6 }],
      [0, 'Cà phê dừa', 42000, 'Cà phê xay cùng cốt dừa béo mát.', { v: 'drink', f: 1, t: 8 }],
      [0, 'Cà phê trứng', 39000, 'Kem trứng đánh tay trên nền cà phê đậm.', { v: 'drink', t: 8, s: H }],
      [0, 'Cacao đá', 38000, 'Cacao đá xay mịn, phủ kem tươi.', { v: 'drink', t: 6 }],
      [0, 'Cà phê cold brew', 45000, 'Cà phê ủ lạnh 18 giờ, vị trong và ít đắng.', { v: 'drink', t: 4 }],
      [1, 'Trà đào cam sả', 38000, 'Trà đen, đào ngâm, cam vàng, sả đập dập.', { v: 'drink', t: 6 }],
      [1, 'Trà vải', 35000, 'Trà lài, vải ngâm, đá bào.', { v: 'drink', t: 6 }],
      [1, 'Trà sen vàng', 36000, 'Trà sen thơm nhẹ, hạt sen, đá.', { v: 'drink', t: 6 }],
      [1, 'Nước ép cam', 38000, 'Cam vàng ép tươi nguyên chất.', { t: 6, a: 'juice', s: [] }],
      [2, 'Bánh flan caramel', 25000, 'Bánh flan mịn, caramel cháy nhẹ.', { t: 3 }],
      [2, 'Bánh tiramisu', 45000, 'Tiramisu cà phê, phủ bột cacao.', { t: 3 }],
      [2, 'Croissant bơ', 32000, 'Croissant bơ nướng giòn, ăn nóng.', { t: 8, a: 'sweet' }]
    ]
  },
  /* ===== Phường Định Công ===== */
  {
    key: 'mien-luon-dinh-cong', region: 'HN', city: 'Hà Nội', ...at('banh-cuon-linh-dam', [20.9760, 105.8450]), kind: 'food', category: 'Bún - Phở', hours: ['07:00', '21:00'], minOrder: 45000,
    owner: owner('mienluon.dinhcong', 'Tạ Văn Sơn', 15), name: 'Miến Lươn Định Công', description: 'Miến lươn nước, miến lươn trộn, cháo lươn và lươn chiên giòn kiểu Nghệ An.',
    cats: [['Miến & bún', { a: 'noodle_bowl', s: S }], ['Món ăn kèm', { a: 'side_extra' }], ['Đồ uống', { a: 'glass_extra', s: D }]],
    dishes: [
      [0, 'Miến lươn nước', 55000, 'Miến dong, lươn đồng xào xả, nước dùng ngọt, hành rau.', { v: 'bowl', f: 1, t: 12 }],
      [0, 'Miến lươn trộn', 58000, 'Miến trộn lươn xào, hành phi, rau răm, đậu phộng.', { v: 'bowl', f: 1, t: 12 }],
      [0, 'Miến gà', 45000, 'Miến dong, gà ta xé, nấm hương, nước dùng gà.', { v: 'bowl', t: 10 }],
      [0, 'Miến trộn thập cẩm', 55000, 'Miến trộn tôm, thịt, trứng cút, rau củ.', { v: 'bowl', t: 12 }],
      [0, 'Bún lươn', 55000, 'Bún sợi nhỏ, lươn chiên, nước dùng chua nhẹ.', { v: 'bowl', t: 12 }],
      [0, 'Cháo lươn', 52000, 'Cháo gạo nấu nhừ, lươn xào nghệ, hành lá.', { v: 'bowl', t: 12 }],
      [0, 'Bún măng vịt', 55000, 'Vịt ta luộc, măng chua, nước dùng thanh ngọt.', { v: 'bowl', t: 12 }],
      [0, 'Mì vịt tiềm', 62000, 'Mì trứng, đùi vịt hầm thuốc bắc, rau cải.', { v: 'bowl', t: 14 }],
      [1, 'Lươn chiên giòn', 65000, 'Lươn tẩm bột chiên giòn, chấm tương ớt.', { t: 12 }],
      [1, 'Nem rán', 35000, 'Nem rán nhân thịt chiên giòn (3 cái).', { t: 10 }],
      [1, 'Quẩy giòn', 10000, 'Quẩy nóng giòn ăn kèm cháo.', { t: 4, a: null }],
      [1, 'Trứng chần', 8000, 'Trứng gà chần lòng đào.', { t: 4, a: null }],
      [1, 'Rau sống thêm', 8000, 'Rau sống, kinh giới, tía tô.', { t: 3, a: null }],
      [2, 'Trà đá', 5000, 'Trà đá mát lạnh.', { t: 2, a: null, s: [] }],
      [2, 'Trà chanh', 18000, 'Trà chanh tươi vắt tay.', { t: 4, s: D }]
    ]
  },
  {
    key: 'ga-nuong-linh-dam', region: 'HN', city: 'Hà Nội', ...at('banh-cuon-linh-dam', [20.9760, 105.8450]), kind: 'food', category: 'Gà rán', hours: ['10:00', '22:00'], minOrder: 70000,
    owner: owner('ganuong.linhdam', 'Chu Văn Hiếu', 16), name: 'Gà Nướng Muối Ớt Linh Đàm', description: 'Gà nướng muối ớt, gà rán giòn, cánh gà BBQ và khoai chiên — hợp ăn nhóm buổi tối.',
    cats: [['Gà nướng', { a: 'chicken_set', s: S }], ['Gà rán', { a: 'chicken_set' }], ['Ăn kèm & đồ uống', { a: 'side_extra' }]],
    dishes: [
      [0, 'Gà nướng muối ớt nửa con', 129000, 'Nửa con gà ta tẩm muối ớt nướng than, da vàng giòn.', { f: 1, t: 25 }],
      [0, 'Gà nướng mật ong nửa con', 135000, 'Gà nướng mật ong tỏi, ăn kèm rau sống.', { t: 25 }],
      [0, 'Cánh gà nướng BBQ', 69000, 'Cánh gà tẩm sốt BBQ nướng bóng (6 cái).', { f: 1, t: 18 }],
      [0, 'Cánh gà nướng mật ong', 69000, 'Cánh gà tẩm mật ong tỏi nướng giòn (6 cái).', { t: 18 }],
      [0, 'Đùi gà nướng sả', 59000, 'Đùi gà góc tư tẩm sả ớt nướng thơm.', { t: 18 }],
      [0, 'Gà nướng nguyên con', 249000, 'Cả con gà nướng lu, cho 3–4 người.', { t: 35 }],
      [1, 'Gà rán giòn 2 miếng', 59000, 'Hai miếng gà rán giòn tẩm bột cay nhẹ.', { t: 12 }],
      [1, 'Gà rán sốt cay Hàn Quốc', 79000, 'Gà rán phủ sốt cay ngọt kiểu Hàn, mè rang.', { t: 14 }],
      [1, 'Gà viên chiên', 45000, 'Gà viên chiên vàng giòn (8 viên).', { t: 8 }],
      [1, 'Phần gà sốt kèm khoai', 79000, 'Gà sốt, khoai tây chiên, salad bắp cải.', { t: 14 }],
      [2, 'Khoai tây chiên', 30000, 'Khoai tây chiên giòn rắc muối.', { t: 8 }],
      [2, 'Gỏi bắp cải', 25000, 'Bắp cải trộn sốt chua ngọt giải ngấy.', { t: 4, a: null }],
      [2, 'Cơm trắng', 8000, 'Cơm trắng nóng.', { t: 2, a: null }],
      [2, 'Pepsi lon', 18000, 'Pepsi lon ướp lạnh.', { t: 2, a: null }],
      [2, 'Trà đá', 5000, 'Trà đá mát lạnh.', { t: 2, a: null, s: [] }]
    ]
  },
  /* ===== Phường Long Biên ===== */
  {
    key: 'pho-cuon-long-bien', region: 'HN', city: 'Hà Nội', ...at('tra-chanh-long-bien', [21.0390, 105.8800]), kind: 'food', category: 'Bún - Phở', hours: ['08:00', '21:30'], minOrder: 50000,
    owner: owner('phocuon.longbien', 'Đoàn Thị Hoa', 17), name: 'Phở Cuốn Long Biên', description: 'Phở cuốn bò xào, phở cuốn chay, phở trộn và các món chiên ăn kèm kiểu Hà Nội.',
    cats: [['Phở cuốn & phở trộn', { a: 'side_extra' }], ['Món chiên', { a: 'side_extra' }], ['Đồ uống', { a: 'glass_extra', s: D }]],
    dishes: [
      [0, 'Phở cuốn bò', 58000, 'Lá phở cuốn bò xào hành tây, rau thơm, chấm mắm chua ngọt.', { f: 1, t: 12 }],
      [0, 'Phở cuốn chay', 48000, 'Lá phở cuốn nấm, đậu hũ, rau củ, chấm mắm chay.', { t: 12 }],
      [0, 'Phở cuốn tôm', 62000, 'Phở cuốn tôm tươi, rau thơm, chấm mắm tôm chua.', { t: 12 }],
      [0, 'Phở cuốn thập cẩm', 69000, 'Phở cuốn bò, tôm, trứng, rau thơm, hai loại nước chấm.', { f: 1, t: 14 }],
      [0, 'Phở trộn', 58000, 'Phở khô trộn bò tái, hành phi, đậu phộng, sốt đặc biệt.', { v: 'bowl', t: 12 }],
      [0, 'Phở bò tái', 55000, 'Phở nước bò tái nước dùng xương ninh.', { v: 'bowl', t: 10 }],
      [0, 'Phở gà', 50000, 'Phở nước gà ta xé, hành lá.', { v: 'bowl', t: 10 }],
      [0, 'Phở chay nấm', 48000, 'Phở nước dùng rau củ, nấm và đậu hũ chiên.', { v: 'bowl', t: 10 }],
      [1, 'Phở chiên phồng', 45000, 'Phở chiên giòn, thịt bò xào rau cải.', { t: 12 }],
      [1, 'Nem rán', 35000, 'Nem rán Hà Nội nhân thịt (3 cái).', { t: 10 }],
      [1, 'Quẩy giòn', 10000, 'Quẩy nóng giòn.', { t: 4, a: null }],
      [1, 'Trứng chần', 8000, 'Trứng gà chần lòng đào.', { t: 4, a: null }],
      [1, 'Giò lụa', 30000, 'Giò lụa thái lát mỏng.', { t: 4 }],
      [2, 'Trà đá', 5000, 'Trà đá mát lạnh.', { t: 2, a: null, s: [] }],
      [2, 'Trà chanh', 18000, 'Trà chanh tươi vắt tay.', { t: 4, s: D }]
    ]
  },
  {
    key: 'ga-ran-gio-cau', region: 'HN', city: 'Hà Nội', ...at('tra-chanh-long-bien', [21.0390, 105.8800]), kind: 'food', category: 'Gà rán', hours: ['10:00', '22:30'], minOrder: 60000,
    owner: owner('garan.giocau', 'Quách Minh Đức', 18), name: 'Gà Rán Gió Cầu Long Biên', description: 'Gà rán giòn kiểu Mỹ, burger gà, khoai chiên và kem tươi — combo cho cả nhóm.',
    cats: [['Gà rán', { a: 'chicken_set' }], ['Burger & khoai', { a: 'side_extra' }], ['Đồ uống & kem', { a: 'glass_extra', s: D }]],
    dishes: [
      [0, 'Gà rán 1 miếng', 35000, 'Một miếng gà rán tẩm bột giòn.', { t: 10 }],
      [0, 'Gà rán 2 miếng', 65000, 'Hai miếng gà rán giòn thơm.', { f: 1, t: 12 }],
      [0, 'Gà rán 4 miếng', 125000, 'Bốn miếng gà rán cho hai người.', { t: 14 }],
      [0, 'Cánh gà chiên giòn', 59000, 'Cánh gà chiên giòn sốt nước mắm (6 cái).', { f: 1, t: 12 }],
      [0, 'Gà sốt cay', 75000, 'Gà rán phủ sốt cay ngọt, mè rang.', { t: 14, s: S }],
      [0, 'Gà sốt phô mai', 79000, 'Gà rán phủ sốt phô mai béo mịn.', { t: 14 }],
      [0, 'Gà popcorn', 45000, 'Gà viên nhỏ chiên giòn ăn vặt.', { t: 8 }],
      [0, 'Gà không xương', 69000, 'Phi lê gà không xương chiên giòn.', { t: 12 }],
      [1, 'Burger gà giòn', 55000, 'Gà chiên giòn, xà lách, sốt mayonnaise.', { t: 10 }],
      [1, 'Burger tôm', 62000, 'Chả tôm chiên giòn, rau xanh, sốt tartar.', { t: 10 }],
      [1, 'Khoai tây chiên', 30000, 'Khoai tây chiên giòn.', { t: 8 }],
      [1, 'Khoai lắc phô mai', 35000, 'Khoai chiên lắc bột phô mai.', { t: 8 }],
      [1, 'Salad bắp cải', 22000, 'Bắp cải trộn sốt mayonnaise.', { t: 4, a: null }],
      [2, 'Pepsi lon', 18000, 'Pepsi lon ướp lạnh.', { t: 2, a: null }],
      [2, 'Kem ốc quế', 15000, 'Kem vani ốc quế.', { t: 3, a: null, s: [] }]
    ]
  },
  /* ===== Phường Từ Liêm ===== */
  {
    key: 'com-tam-my-dinh', region: 'HN', city: 'Hà Nội', ...at('banh-ngot-my-dinh', [21.0300, 105.7650]), kind: 'food', category: 'Cơm', hours: ['10:00', '21:30'], minOrder: 50000,
    owner: owner('comtam.mydinh', 'Lý Hoàng Nam', 19), name: 'Cơm Tấm Sài Gòn Mỹ Đình', description: 'Cơm tấm sườn bì chả kiểu Sài Gòn: sườn nướng thơm mật ong, bì dai giòn, chả trứng béo.',
    cats: [['Cơm tấm', { a: 'rice_side' }], ['Món thêm', { a: null }], ['Đồ uống', { a: 'glass_extra', s: D }]],
    dishes: [
      [0, 'Cơm tấm sườn', 55000, 'Sườn heo nướng mật ong, cơm tấm, dưa leo, nước mắm.', { f: 1, t: 14 }],
      [0, 'Cơm tấm sườn bì chả', 65000, 'Sườn nướng, bì thính, chả trứng hấp, đồ chua.', { f: 1, t: 15 }],
      [0, 'Cơm tấm sườn ốp la', 62000, 'Sườn nướng kèm trứng ốp la lòng đào.', { t: 14 }],
      [0, 'Cơm tấm gà nướng', 58000, 'Gà nướng sả ớt, cơm tấm, đồ chua.', { t: 14 }],
      [0, 'Cơm tấm chả cua', 60000, 'Chả cua hấp, cơm tấm, bì, đồ chua.', { t: 12 }],
      [0, 'Cơm tấm lạp xưởng trứng', 58000, 'Lạp xưởng chiên, trứng ốp la, cơm tấm, dưa leo.', { t: 12 }],
      [0, 'Cơm tấm thịt kho trứng', 58000, 'Thịt kho tàu, trứng, cơm tấm, canh.', { t: 14 }],
      [0, 'Cơm tấm đặc biệt', 79000, 'Sườn, bì, chả, trứng, lạp xưởng đầy đủ.', { t: 16 }],
      [1, 'Bì thêm', 15000, 'Phần bì thính gọi thêm.', { t: 3 }],
      [1, 'Chả trứng thêm', 15000, 'Chả trứng hấp gọi thêm.', { t: 3 }],
      [1, 'Trứng ốp la', 10000, 'Trứng ốp la lòng đào.', { t: 4 }],
      [1, 'Canh khổ qua', 25000, 'Canh khổ qua nhồi thịt thanh mát.', { t: 8 }],
      [1, 'Đồ chua thêm', 6000, 'Dưa leo, cà rốt, củ cải ngâm chua ngọt.', { t: 2 }],
      [2, 'Trà đá', 5000, 'Trà đá mát lạnh.', { t: 2, a: null, s: [] }],
      [2, 'Trà tắc', 15000, 'Trà tắc chua ngọt.', { t: 4, a: 'tea_lemon', s: D }]
    ]
  },
  {
    key: 'sinh-to-tu-liem', region: 'HN', city: 'Hà Nội', ...at('banh-ngot-my-dinh', [21.0300, 105.7650]), kind: 'drink', category: 'Đồ uống', hours: ['08:00', '22:00'], minOrder: 35000,
    owner: owner('sinhto.tuliem', 'Nguyễn Thanh Hà', 20), name: 'Sinh Tố & Nước Ép Từ Liêm', description: 'Sinh tố bơ, xoài, dâu; nước ép cam, ổi, cần tây táo và sữa chua trái cây tươi mỗi ngày.',
    cats: [['Sinh tố', { a: 'juice' }], ['Nước ép & detox', { a: 'juice' }], ['Sữa chua & tráng miệng', { a: null }]],
    dishes: [
      [0, 'Sinh tố bơ', 40000, 'Bơ sáp xay cùng sữa đặc, béo mịn.', { v: 'drink', f: 1, t: 6 }],
      [0, 'Sinh tố xoài', 38000, 'Xoài chín xay lạnh ngọt thơm.', { v: 'drink', t: 6 }],
      [0, 'Sinh tố dâu', 40000, 'Dâu tươi xay cùng sữa chua.', { v: 'drink', t: 6 }],
      [0, 'Sinh tố mãng cầu', 38000, 'Mãng cầu xiêm xay lạnh, vị chua ngọt.', { v: 'drink', t: 6 }],
      [0, 'Sinh tố sapoche', 38000, 'Sapoche chín xay sữa, thơm mùi mật.', { v: 'drink', t: 6 }],
      [0, 'Sinh tố chuối', 35000, 'Chuối chín xay sữa tươi.', { v: 'drink', t: 6 }],
      [0, 'Sinh tố thập cẩm', 42000, 'Xoài, chuối, dâu, thanh long xay chung.', { v: 'drink', t: 6 }],
      [1, 'Nước ép cam', 38000, 'Cam vàng ép tươi nguyên chất.', { t: 6, s: [] }],
      [1, 'Nước ép ổi', 36000, 'Ổi hồng ép tươi, chua ngọt, nhiều vitamin.', { t: 6, s: [] }],
      [1, 'Nước ép dưa hấu', 32000, 'Dưa hấu ép lạnh giải nhiệt.', { t: 5, s: [] }],
      [1, 'Nước ép cần tây táo', 42000, 'Cần tây, táo xanh ép tươi, ít đường.', { t: 6, s: [] }],
      [1, 'Nước ép cà rốt', 35000, 'Cà rốt ép tươi, ngọt tự nhiên.', { t: 6, s: [] }],
      [1, 'Nước detox dưa leo', 38000, 'Dưa leo, chanh, bạc hà ép thanh mát.', { t: 6, s: [] }],
      [2, 'Sữa chua trái cây', 35000, 'Sữa chua mịn với trái cây tươi theo mùa.', { t: 5 }],
      [2, 'Sữa chua nếp cẩm', 28000, 'Sữa chua dẻo, nếp cẩm ngọt dẻo.', { t: 4 }]
    ]
  },
  /* ===== Phường Hà Đông ===== */
  {
    key: 'lau-nam-ha-dong', region: 'HN', city: 'Hà Nội', ...at('com-nieu-ha-dong', [20.9690, 105.7770]), kind: 'food', category: 'Lẩu & Nướng', hours: ['16:00', '22:30'], minOrder: 100000,
    owner: owner('launam.hadong', 'Văn Công Lực', 21), name: 'Lẩu Nấm Hà Đông', description: 'Lẩu nấm thanh ngọt, lẩu gà ớt hiểm, lẩu cá và đồ nướng — bữa tối ấm cúng cho gia đình.',
    cats: [['Lẩu', { a: 'lau_extra', s: S }], ['Món nướng', { a: 'grill_extra', s: S }], ['Món nhắm & đồ uống', { a: 'side_extra' }]],
    dishes: [
      [0, 'Lẩu nấm thập cẩm', 219000, 'Nước dùng xương ngọt, nhiều loại nấm tươi, rau củ (2–3 người).', { f: 1, t: 22 }],
      [0, 'Lẩu gà ớt hiểm', 239000, 'Gà ta ninh ớt hiểm cay nồng, lá chanh, nấm.', { f: 1, t: 25 }],
      [0, 'Lẩu cá lăng', 269000, 'Cá lăng, măng chua, cà chua, rau nhúng.', { t: 25 }],
      [0, 'Lẩu riêu cua sườn sụn', 249000, 'Riêu cua đồng, sườn sụn, đậu hũ, huyết.', { t: 25 }],
      [0, 'Lẩu bò nhúng dấm', 269000, 'Bò Mỹ nhúng nước dấm, rau thơm, bún.', { t: 25 }],
      [0, 'Lẩu chay', 189000, 'Nước dùng rau củ, nấm, đậu hũ non.', { t: 20 }],
      [1, 'Ba chỉ nướng', 85000, 'Ba chỉ heo tẩm nướng than, cuốn rau.', { f: 1, t: 15 }],
      [1, 'Sườn nướng mật ong', 99000, 'Sườn non nướng mật ong, tỏi.', { t: 18 }],
      [1, 'Nấm nướng mỡ hành', 59000, 'Nấm đùi gà nướng mỡ hành, đậu phộng.', { t: 12 }],
      [1, 'Bò nướng lá lốt', 79000, 'Bò cuốn lá lốt nướng thơm (6 cuốn).', { t: 15 }],
      [1, 'Cá nướng muối ớt', 119000, 'Cá nướng muối ớt, rau sống, bún.', { t: 20 }],
      [2, 'Gỏi ngó sen tôm thịt', 65000, 'Ngó sen giòn, tôm, thịt, rau răm.', { t: 10 }],
      [2, 'Rau muống xào tỏi', 35000, 'Rau muống xào tỏi xanh giòn.', { t: 8 }],
      [2, 'Bia lon Tiger', 22000, 'Bia lon Tiger ướp lạnh.', { t: 2, a: null }],
      [2, 'Trà đá', 5000, 'Trà đá mát lạnh.', { t: 2, a: null, s: [] }]
    ]
  },
  {
    key: 'quan-chay-thien-tam', region: 'HN', city: 'Hà Nội', ...at('com-nieu-ha-dong', [20.9690, 105.7770]), kind: 'food', category: 'Đồ chay', hours: ['09:00', '20:30'], minOrder: 40000,
    owner: owner('quanchay.thientam', 'Trương Thị Thanh', 22), name: 'Quán Chay Thiện Tâm', description: 'Cơm chay, bún chay, phở chay và các món đậu hũ nấm thanh đạm, nấu từ rau củ tươi.',
    cats: [['Cơm & bún chay', { a: 'rice_side' }], ['Món chay xào & kho', { a: 'side_extra' }], ['Đồ uống', { a: 'glass_extra', s: D }]],
    dishes: [
      [0, 'Cơm chay thập cẩm', 45000, 'Cơm trắng, đậu hũ chiên, nấm xào, rau củ luộc, canh.', { f: 1, t: 12 }],
      [0, 'Cơm gạo lứt đậu hũ sốt nấm', 52000, 'Cơm gạo lứt, đậu hũ sốt nấm, rau củ hấp.', { f: 1, t: 12 }],
      [0, 'Bún chay riêu', 45000, 'Nước dùng riêu chay cà chua, đậu hũ, nấm.', { v: 'bowl', t: 10 }],
      [0, 'Bún Huế chay', 48000, 'Nước dùng sả ớt chay, giò chay, rau sống.', { v: 'bowl', t: 12 }],
      [0, 'Phở chay nấm', 45000, 'Phở nước dùng rau củ, nấm đùi gà, đậu hũ.', { v: 'bowl', t: 10 }],
      [0, 'Mì Quảng chay', 48000, 'Mì Quảng nước dùng nghệ, đậu hũ, bánh tráng.', { v: 'bowl', t: 12 }],
      [0, 'Cơm chiên nấm', 42000, 'Cơm chiên nấm, đậu que, cà rốt.', { t: 10 }],
      [1, 'Đậu hũ sốt cà chua', 38000, 'Đậu hũ chiên sốt cà chua, hành lá.', { t: 10 }],
      [1, 'Đậu hũ chiên sả ớt', 38000, 'Đậu hũ chiên giòn tẩm sả ớt.', { t: 10 }],
      [1, 'Nấm xào sả ớt', 42000, 'Nấm đùi gà xào sả ớt thơm.', { t: 10 }],
      [1, 'Gỏi cuốn chay', 35000, 'Gỏi cuốn rau củ, đậu hũ, bún, chấm tương đậu.', { t: 8 }],
      [1, 'Canh nấm rau củ', 30000, 'Canh nấm rau củ thanh ngọt.', { t: 8, a: null }],
      [1, 'Nấm đùi gà kho tiêu', 48000, 'Nấm đùi gà kho tiêu đậm đà ăn với cơm.', { t: 12 }],
      [2, 'Trà gạo lứt', 22000, 'Trà gạo lứt rang thơm mát.', { t: 4, a: null, s: [] }],
      [2, 'Trà đá', 5000, 'Trà đá mát lạnh.', { t: 2, a: null, s: [] }]
    ]
  }
];
