/* Thực đơn thật cho 20 quán. Mỗi món: [nhóm, tên, giá, mô tả, tuỳ chọn].
   Tuỳ chọn: v = bộ biến thể (size), f = món nổi bật, d = giá giảm, t = phút chế biến. */

export const VARIANT_SETS = {
  portion: [['Phần thường', 0], ['Phần lớn', 10000]],
  bowl: [['Tô thường', 0], ['Tô đặc biệt', 12000]],
  drink: [['Size M', 0], ['Size L', 8000]],
  pizza: [['7 inch', 0], ['9 inch', 45000], ['12 inch', 95000]],
  chicken: [['1 miếng', 0], ['2 miếng', 32000], ['4 miếng', 92000]]
};

export const TOPPING_SETS = {
  rice: { name: 'Ăn kèm', max: 3, items: [['Thêm trứng ốp la', 7000], ['Thêm chả trứng', 10000], ['Thêm đồ chua', 4000], ['Thêm canh', 8000]] },
  noodle: { name: 'Thêm vào tô', max: 3, items: [['Thêm thịt', 15000], ['Thêm trứng cút', 6000], ['Thêm rau sống', 3000], ['Thêm quẩy', 5000]] },
  drink: { name: 'Topping', max: 3, items: [['Trân châu đen', 7000], ['Kem cheese', 10000], ['Thạch trái cây', 8000], ['Pudding trứng', 9000]] },
  coffee: { name: 'Tuỳ chỉnh', max: 2, items: [['Thêm shot espresso', 10000], ['Thêm sữa đặc', 5000], ['Thêm kem muối', 9000]] },
  fastfood: { name: 'Thêm vào phần ăn', max: 3, items: [['Thêm phô mai', 9000], ['Thêm khoai chiên', 18000], ['Thêm sốt', 4000], ['Thêm bacon', 14000]] },
  pizza: { name: 'Thêm topping', max: 3, items: [['Thêm phô mai', 15000], ['Thêm nấm', 12000], ['Thêm xúc xích', 15000], ['Viền phô mai', 25000]] },
  snack: { name: 'Thêm sốt', max: 2, items: [['Sốt phô mai', 6000], ['Sốt me', 4000], ['Sa tế', 3000]] },
  veg: { name: 'Thêm món', max: 3, items: [['Thêm đậu hũ', 8000], ['Thêm nấm', 10000], ['Thêm rau củ', 7000], ['Thêm cơm', 5000]] }
};

export const MENUS = {
  /* 22 - Bếp Nhà An Nhiên (cơm) */
  22: {
    toppings: 'rice',
    cats: ['Cơm phần', 'Món mặn gọi thêm', 'Canh & món phụ'],
    dishes: [
      [0, 'Cơm sườn nướng', 45000, 'Sườn cốt lết ướp sả mật ong nướng than, kèm đồ chua và nước mắm tỏi ớt.', { v: 'portion', f: 1 }],
      [0, 'Cơm gà xối mỡ', 49000, 'Đùi gà chiên giòn da, cơm chiên mỡ hành, dưa leo, nước mắm gừng.', { v: 'portion', f: 1 }],
      [0, 'Cơm bò lúc lắc', 59000, 'Bò Úc xào lúc lắc với hành tây, ớt chuông, cơm nóng và rau xà lách.', { v: 'portion' }],
      [0, 'Cơm cá kho tộ', 47000, 'Cá basa kho tộ thấm vị, kèm canh chua và rau luộc.', { v: 'portion' }],
      [0, 'Cơm thịt kho trứng', 43000, 'Thịt ba chỉ kho nước dừa với trứng, ăn cùng dưa cải.', { v: 'portion' }],
      [0, 'Cơm rang dưa bò', 46000, 'Cơm rang dưa cải với thịt bò xào, hành phi thơm.', { v: 'portion' }],
      [0, 'Cơm gà sốt tiêu đen', 52000, 'Ức gà áp chảo sốt tiêu đen, khoai tây nghiền và rau củ.', { v: 'portion' }],
      [0, 'Cơm heo quay giòn bì', 50000, 'Heo quay da giòn rụm, nước mắm chua ngọt, dưa món.', { v: 'portion', d: 45000 }],
      [0, 'Cơm tôm rim thịt ba chỉ', 55000, 'Tôm sú rim mặn ngọt cùng ba chỉ, kèm canh bầu.', { v: 'portion' }],
      [0, 'Cơm văn phòng 3 món', 55000, 'Set cơm trưa gồm 1 món mặn, 1 món xào, 1 canh theo ngày.', { f: 1 }],
      [1, 'Trứng chiên thịt', 22000, 'Trứng gà chiên với thịt băm, hành lá.', { t: 8 }],
      [1, 'Đậu hũ sốt cà chua', 25000, 'Đậu hũ non chiên vàng, sốt cà chua nấu hành.', {}],
      [1, 'Cá chiên sả ớt', 38000, 'Cá thu chiên giòn tẩm sả ớt.', {}],
      [1, 'Thịt rim mắm ruốc', 32000, 'Thịt ba chỉ rim mắm ruốc Huế đậm đà.', {}],
      [1, 'Mực xào chua ngọt', 45000, 'Mực ống xào dứa cà chua kiểu chua ngọt.', {}],
      [1, 'Chả trứng hấp', 25000, 'Chả trứng hấp thịt băm, nấm mèo, miến.', {}],
      [2, 'Canh chua cá lóc', 38000, 'Cá lóc nấu canh chua me, bạc hà, đậu bắp, thơm.', { v: 'portion' }],
      [2, 'Canh rau củ thịt bằm', 25000, 'Canh bí đỏ, cà rốt, su su nấu thịt bằm.', {}],
      [2, 'Canh khổ qua nhồi thịt', 35000, 'Khổ qua nhồi thịt hầm mềm, thanh mát.', {}],
      [2, 'Rau muống xào tỏi', 25000, 'Rau muống xào lửa lớn với tỏi phi.', { t: 8 }],
      [2, 'Dưa leo cà chua trộn', 18000, 'Salad dưa leo cà chua trộn giấm đường.', { t: 5 }],
      [2, 'Trà đá chanh sả', 15000, 'Trà đá chanh sả nấu tươi mỗi ngày.', { t: 3 }]
    ]
  },

  /* 23 - Phở Gánh Ba Mươi Sáu */
  23: {
    toppings: 'noodle',
    cats: ['Phở', 'Bún & hủ tiếu', 'Ăn kèm'],
    dishes: [
      [0, 'Phở bò tái', 55000, 'Nước dùng xương bò hầm 12 giờ, bò tái mềm, hành ngò.', { v: 'bowl', f: 1 }],
      [0, 'Phở bò chín', 55000, 'Bò gầu nạm chín mềm, nước dùng ngọt thanh.', { v: 'bowl' }],
      [0, 'Phở bò tái nạm gầu', 62000, 'Đầy đủ tái, nạm, gầu cho người ăn nhiều.', { v: 'bowl', f: 1 }],
      [0, 'Phở gà ta', 52000, 'Gà ta xé phay, nước dùng trong, lá chanh.', { v: 'bowl' }],
      [0, 'Phở bò viên', 52000, 'Bò viên dai giòn, nước dùng bò truyền thống.', { v: 'bowl' }],
      [0, 'Phở đặc biệt', 72000, 'Tái, chín, nạm, gầu, gân, bò viên trong một tô.', { v: 'bowl' }],
      [0, 'Phở cuốn', 58000, 'Bánh phở cuốn thịt bò xào, rau thơm, chấm mắm chua ngọt.', {}],
      [0, 'Phở trộn', 55000, 'Phở khô trộn bò tái, hành phi, đậu phộng, nước sốt đặc biệt.', {}],
      [1, 'Bún bò Huế', 58000, 'Giò heo, chả cua, bò nạm, sa tế nhà làm.', { v: 'bowl' }],
      [1, 'Bún chả Hà Nội', 60000, 'Chả viên và chả miếng nướng than, bún tươi, rau sống.', { v: 'portion', f: 1 }],
      [1, 'Bún riêu cua', 52000, 'Riêu cua đồng, đậu hũ chiên, huyết, cà chua.', { v: 'bowl' }],
      [1, 'Hủ tiếu Nam Vang', 56000, 'Tôm, thịt bằm, trứng cút, gan, nước dùng xương.', { v: 'bowl' }],
      [1, 'Miến gà', 48000, 'Miến dai, gà xé, nấm hương, hành lá.', { v: 'bowl' }],
      [1, 'Bún thịt nướng', 50000, 'Thịt heo nướng sả, chả giò, rau thơm, nước mắm.', {}],
      [1, 'Mì vịt tiềm', 65000, 'Đùi vịt tiềm thuốc bắc, mì trứng, cải thìa.', {}],
      [2, 'Quẩy giòn (2 cái)', 8000, 'Quẩy chiên nóng ăn kèm phở.', { t: 5 }],
      [2, 'Trứng gà chần', 7000, 'Trứng gà chần lòng đào.', { t: 3 }],
      [2, 'Gân bò thêm', 20000, 'Gân bò hầm mềm gọi thêm.', { t: 5 }],
      [2, 'Chả giò chiên (3 cái)', 30000, 'Chả giò nhân thịt, mộc nhĩ, miến.', {}],
      [2, 'Bò viên gọi thêm', 18000, 'Phần bò viên gọi thêm.', { t: 5 }],
      [2, 'Nước sâm lá dứa', 15000, 'Nước sâm lá dứa mát lạnh.', { t: 3 }]
    ]
  },

  /* 24 - Cơm Tấm Sườn Mộc */
  24: {
    toppings: 'rice',
    cats: ['Cơm tấm', 'Gọi thêm', 'Nước giải khát'],
    dishes: [
      [0, 'Cơm tấm sườn bì chả', 52000, 'Sườn nướng, bì, chả trứng, mỡ hành, nước mắm tỏi ớt.', { v: 'portion', f: 1 }],
      [0, 'Cơm tấm sườn nướng', 45000, 'Sườn cọng nướng mật ong thơm lừng, đồ chua.', { v: 'portion', f: 1 }],
      [0, 'Cơm tấm sườn trứng', 50000, 'Sườn nướng, trứng ốp la, mỡ hành.', { v: 'portion' }],
      [0, 'Cơm tấm bì chả', 38000, 'Bì heo thính, chả trứng hấp, dưa leo.', {}],
      [0, 'Cơm tấm gà nướng', 48000, 'Đùi gà nướng sả, đồ chua, nước mắm.', { v: 'portion' }],
      [0, 'Cơm tấm sườn ốp la đặc biệt', 62000, 'Sườn to, bì, chả, trứng, lạp xưởng.', { v: 'portion', f: 1 }],
      [0, 'Cơm tấm thịt nướng', 44000, 'Thịt cổ heo nướng than hoa.', { v: 'portion' }],
      [0, 'Cơm tấm lạp xưởng trứng', 40000, 'Lạp xưởng tươi chiên, trứng ốp la.', {}],
      [0, 'Cơm tấm cánh gà chiên nước mắm', 46000, 'Cánh gà chiên nước mắm tỏi ớt.', {}],
      [0, 'Cơm tấm chả cua', 47000, 'Chả cua hấp, bì, trứng muối.', {}],
      [1, 'Trứng ốp la', 8000, 'Trứng gà ốp la lòng đào.', { t: 5 }],
      [1, 'Chả trứng thêm', 12000, 'Phần chả trứng hấp thêm.', { t: 5 }],
      [1, 'Bì thêm', 10000, 'Bì heo thính gọi thêm.', { t: 3 }],
      [1, 'Sườn nướng thêm', 22000, 'Một miếng sườn nướng thêm.', { t: 8 }],
      [1, 'Canh khổ qua', 15000, 'Chén canh khổ qua dồn thịt.', { t: 5 }],
      [1, 'Đồ chua thêm', 5000, 'Dưa leo cà rốt ngâm chua ngọt.', { t: 2 }],
      [2, 'Trà đá', 5000, 'Trà đá miễn phí khi dùng tại chỗ, mang đi tính phí ly.', { t: 2 }],
      [2, 'Sữa đậu nành', 12000, 'Sữa đậu nành nấu thủ công, ít đường.', { t: 3 }],
      [2, 'Nước mía', 15000, 'Nước mía ép tươi, thêm tắc.', { t: 5 }],
      [2, 'Nước sâm bí đao', 12000, 'Bí đao nấu sâm thanh nhiệt.', { t: 3 }]
    ]
  },

  /* 25 - Gà Giòn Bếp Đỏ */
  25: {
    toppings: 'fastfood',
    cats: ['Gà rán', 'Gà sốt', 'Combo', 'Ăn kèm & nước'],
    dishes: [
      [0, 'Gà rán giòn cay', 45000, 'Gà ướp bột cay chiên giòn, giữ nước bên trong.', { v: 'chicken', f: 1 }],
      [0, 'Gà rán truyền thống', 42000, 'Vị mặn ngọt vừa phải, vỏ giòn vàng.', { v: 'chicken' }],
      [0, 'Cánh gà chiên nước mắm', 48000, 'Cánh gà chiên tẩm nước mắm tỏi, lên màu cánh gián.', { f: 1 }],
      [0, 'Đùi gà góc tư chiên', 55000, 'Đùi gà góc tư chiên nguyên miếng.', {}],
      [0, 'Gà viên popcorn', 38000, 'Gà viên nhỏ chiên giòn, ăn vặt lai rai.', {}],
      [0, 'Phi lê gà giòn', 46000, 'Phi lê ức gà tẩm bột, ăn kèm sốt mayonnaise.', {}],
      [1, 'Gà sốt mật ong', 58000, 'Gà chiên phủ sốt mật ong tỏi.', { f: 1 }],
      [1, 'Gà sốt phô mai', 62000, 'Gà chiên phủ sốt phô mai Cheddar béo.', {}],
      [1, 'Gà sốt BBQ Hàn', 60000, 'Gà chiên sốt BBQ kiểu Hàn, rắc mè rang.', {}],
      [1, 'Gà sốt cay Sichuan', 60000, 'Gà chiên sốt cay tê nhẹ, ớt khô.', {}],
      [1, 'Gà nướng muối ớt', 65000, 'Gà nướng lò muối ớt xanh, lá chanh.', {}],
      [1, 'Gà sốt trứng muối', 64000, 'Gà chiên sốt trứng muối bùi béo.', {}],
      [2, 'Combo 1 người', 69000, '2 miếng gà, khoai chiên nhỏ, 1 nước ngọt.', { f: 1 }],
      [2, 'Combo 2 người', 129000, '4 miếng gà, khoai chiên vừa, 2 nước ngọt.', {}],
      [2, 'Combo nhóm 4 người', 245000, '8 miếng gà, 2 khoai chiên lớn, salad, 4 nước ngọt.', { f: 1 }],
      [2, 'Combo cánh gà 8 cái', 135000, '8 cánh gà chiên mix 2 vị, khoai chiên.', {}],
      [3, 'Khoai tây chiên', 22000, 'Khoai chiên giòn rắc muối.', { t: 6 }],
      [3, 'Salad bắp cải', 15000, 'Salad bắp cải trộn sốt kem.', { t: 3 }],
      [3, 'Bánh mì bơ tỏi', 18000, 'Bánh mì nướng bơ tỏi giòn thơm.', { t: 6 }],
      [3, 'Pepsi lon', 15000, 'Nước ngọt Pepsi lon 330ml.', { t: 2 }],
      [3, 'Trà chanh', 16000, 'Trà chanh tươi mát lạnh.', { t: 3 }]
    ]
  },

  /* 26 - Pizza Lò Gạch */
  26: {
    toppings: 'pizza',
    cats: ['Pizza', 'Mì Ý', 'Khai vị & salad'],
    dishes: [
      [0, 'Pizza Margherita', 89000, 'Sốt cà chua San Marzano, mozzarella, húng quế tươi.', { v: 'pizza', f: 1, t: 20 }],
      [0, 'Pizza Pepperoni', 99000, 'Xúc xích Pepperoni cay nhẹ, phô mai kéo sợi.', { v: 'pizza', f: 1, t: 20 }],
      [0, 'Pizza hải sản', 119000, 'Tôm, mực, nghêu trên nền sốt kem tỏi.', { v: 'pizza', t: 22 }],
      [0, 'Pizza bò BBQ', 109000, 'Bò xay, hành tây, ớt chuông, sốt BBQ khói.', { v: 'pizza', t: 22 }],
      [0, 'Pizza 4 loại phô mai', 115000, 'Mozzarella, cheddar, parmesan và gorgonzola.', { v: 'pizza', t: 20 }],
      [0, 'Pizza gà nướng nấm', 105000, 'Gà nướng, nấm mỡ, hành tím, sốt kem.', { v: 'pizza', t: 20 }],
      [0, 'Pizza Hawaii', 95000, 'Dăm bông, dứa, phô mai mozzarella.', { v: 'pizza', t: 20 }],
      [0, 'Pizza rau củ', 92000, 'Ớt chuông, nấm, ô liu, cà chua bi.', { v: 'pizza', t: 20 }],
      [0, 'Pizza Diavola', 109000, 'Salami cay, ớt tươi, mozzarella.', { v: 'pizza', t: 20 }],
      [1, 'Mì Ý sốt bò bằm', 79000, 'Spaghetti sốt cà chua bò bằm hầm 3 giờ.', { f: 1 }],
      [1, 'Mì Ý Carbonara', 85000, 'Sốt trứng, thịt xông khói, phô mai parmesan.', { f: 1 }],
      [1, 'Mì Ý hải sản sốt kem', 99000, 'Tôm, mực, sò điệp sốt kem tươi.', {}],
      [1, 'Mì Ý sốt pesto gà', 89000, 'Sốt húng quế, hạt thông, ức gà áp chảo.', {}],
      [1, 'Lasagna bò', 95000, 'Lasagna nhiều lớp bò bằm, béchamel và phô mai.', { t: 25 }],
      [1, 'Mì Ý aglio e olio', 69000, 'Tỏi, ớt khô, dầu olive, rau mùi tây.', {}],
      [2, 'Salad Caesar', 65000, 'Xà lách romaine, gà nướng, bánh mì giòn, parmesan.', {}],
      [2, 'Bánh mì bơ tỏi phô mai', 39000, 'Bánh mì nướng bơ tỏi phủ mozzarella.', { t: 10 }],
      [2, 'Khoai wedges', 45000, 'Khoai tây múi cau nướng, sốt chua ngọt.', {}],
      [2, 'Súp kem nấm', 42000, 'Súp nấm mỡ nấu kem tươi, ăn kèm bánh mì.', {}],
      [2, 'Gà cánh nướng BBQ (6 cái)', 79000, 'Cánh gà nướng sốt BBQ.', {}]
    ]
  },

  /* 27 - Trà Sữa Lá Non */
  27: {
    toppings: 'drink',
    cats: ['Trà sữa', 'Trà trái cây', 'Đá xay & Latte'],
    dishes: [
      [0, 'Trà sữa trân châu đường đen', 38000, 'Trà đen sữa tươi, trân châu đường đen nấu mỗi ngày.', { v: 'drink', f: 1, t: 6 }],
      [0, 'Trà sữa Thái xanh', 33000, 'Trà Thái xanh thơm lá dứa, sữa béo.', { v: 'drink', t: 6 }],
      [0, 'Trà sữa matcha Nhật', 42000, 'Matcha Uji pha cùng sữa tươi.', { v: 'drink', f: 1, t: 6 }],
      [0, 'Trà sữa ô long nướng', 40000, 'Ô long rang củi, hậu vị ngọt hậu.', { v: 'drink', t: 6 }],
      [0, 'Trà sữa khoai môn', 40000, 'Khoai môn nghiền mịn, sữa tươi.', { v: 'drink', t: 6 }],
      [0, 'Trà sữa kem cheese', 45000, 'Trà sữa phủ lớp kem cheese mặn ngọt.', { v: 'drink', f: 1, t: 7 }],
      [0, 'Trà sữa hồng trà truyền thống', 30000, 'Hồng trà đậm vị, sữa béo, ít ngọt.', { v: 'drink', t: 5 }],
      [0, 'Trà sữa socola', 38000, 'Socola Bỉ đậm đà, sữa tươi.', { v: 'drink', t: 6 }],
      [0, 'Sữa tươi trân châu đường đen', 42000, 'Sữa tươi không trà, trân châu đường đen.', { v: 'drink', t: 6 }],
      [0, 'Trà sữa nhài', 35000, 'Trà nhài thơm dịu, sữa tươi.', { v: 'drink', t: 6 }],
      [1, 'Trà đào cam sả', 42000, 'Trà đen, đào miếng, cam vàng, sả đập dập.', { v: 'drink', f: 1, t: 6 }],
      [1, 'Trà vải hoa hồng', 42000, 'Trà hoa hồng, vải thiều, thạch.', { v: 'drink', t: 6 }],
      [1, 'Trà dâu tằm', 40000, 'Trà xanh, siro dâu tằm tươi.', { v: 'drink', t: 6 }],
      [1, 'Trà chanh dây', 38000, 'Chanh dây tươi, trà xanh, hạt é.', { v: 'drink', t: 6 }],
      [1, 'Trà xoài nhiệt đới', 42000, 'Xoài chín, trà ô long, thạch dừa.', { v: 'drink', t: 6 }],
      [1, 'Trà tắc mật ong', 28000, 'Tắc tươi, mật ong rừng, trà đen.', { v: 'drink', t: 5 }],
      [2, 'Matcha đá xay', 48000, 'Matcha xay cùng kem sữa, phủ whipping cream.', { v: 'drink', t: 8 }],
      [2, 'Socola đá xay', 48000, 'Socola đá xay mát lạnh, phủ whipping cream.', { v: 'drink', t: 8 }],
      [2, 'Cookie đá xay', 50000, 'Bánh Oreo xay nhuyễn cùng sữa tươi.', { v: 'drink', f: 1, t: 8 }],
      [2, 'Latte caramel', 45000, 'Cà phê espresso, sữa nóng, sốt caramel.', { v: 'drink', t: 7 }],
      [2, 'Sữa chua trái cây', 40000, 'Sữa chua dẻo, dâu, kiwi, xoài.', { v: 'drink', t: 6 }]
    ]
  },

  /* 28 - Bún Bò Cố Đô */
  28: {
    toppings: 'noodle',
    cats: ['Bún Huế', 'Đặc sản miền Trung', 'Ăn kèm & nước'],
    dishes: [
      [0, 'Bún bò Huế giò heo', 58000, 'Bún bò giò heo móng giò, chả cua, nước lèo sả ớt.', { v: 'bowl', f: 1 }],
      [0, 'Bún bò Huế đặc biệt', 68000, 'Đủ bò nạm, giò, chả cua, huyết, tiết.', { v: 'bowl', f: 1 }],
      [0, 'Bún bò tái nạm', 56000, 'Bò tái nạm mềm, nước lèo cay vừa.', { v: 'bowl' }],
      [0, 'Bún bò chả cua', 55000, 'Chả cua Huế, bò nạm, sa tế.', { v: 'bowl' }],
      [0, 'Bún giò heo', 52000, 'Giò heo hầm mềm, nước lèo đậm.', { v: 'bowl' }],
      [0, 'Bún bò không cay', 55000, 'Dành cho trẻ nhỏ, nước lèo không sa tế.', { v: 'bowl' }],
      [1, 'Bánh bèo chén', 35000, 'Bánh bèo tôm chấy, mỡ hành, nước mắm ngọt (6 chén).', {}],
      [1, 'Bánh nậm', 32000, 'Bánh nậm hấp lá chuối nhân tôm thịt (4 cái).', {}],
      [1, 'Bánh bột lọc', 36000, 'Bánh bột lọc nhân tôm thịt gói lá chuối (6 cái).', {}],
      [1, 'Bánh ram ít', 40000, 'Bánh ram giòn bánh ít dẻo nhân tôm.', {}],
      [1, 'Cơm hến', 38000, 'Cơm nguội trộn hến xào, rau sống, bún tươi.', { f: 1 }],
      [1, 'Mì Quảng gà', 52000, 'Mì Quảng nước lèo xâm xấp, gà ta, đậu phộng.', {}],
      [1, 'Bún thịt nướng Huế', 50000, 'Thịt nướng sả, nem lụi, rau thơm.', {}],
      [1, 'Nem lụi nướng', 48000, 'Nem lụi nướng sả kèm rau sống, nước chấm tương.', {}],
      [2, 'Chả cua thêm', 20000, 'Phần chả cua gọi thêm.', { t: 4 }],
      [2, 'Giò heo thêm', 25000, 'Phần giò heo gọi thêm.', { t: 4 }],
      [2, 'Rau sống bắp chuối', 8000, 'Rau sống, bắp chuối bào, giá.', { t: 3 }],
      [2, 'Trà gừng', 15000, 'Trà gừng nóng giữ ấm bụng.', { t: 4 }],
      [2, 'Chè bắp', 18000, 'Chè bắp Huế nước cốt dừa.', { t: 4 }],
      [2, 'Nước sâm', 12000, 'Nước sâm thanh nhiệt.', { t: 3 }]
    ]
  },

  /* 29 - Bếp Chay Sen Vàng */
  29: {
    toppings: 'veg',
    cats: ['Cơm & bún chay', 'Món mặn chay', 'Món nhẹ & canh'],
    dishes: [
      [0, 'Cơm gạo lứt đậu hũ sốt nấm', 48000, 'Gạo lứt dẻo, đậu hũ chiên, sốt nấm đông cô.', { v: 'portion', f: 1 }],
      [0, 'Cơm chay thập cẩm', 45000, 'Cơm trắng, đậu hũ, nấm xào, rau củ, canh.', { v: 'portion', f: 1 }],
      [0, 'Bún chay riêu', 45000, 'Nước riêu cà chua, đậu hũ, nấm rơm, chả chay.', { v: 'bowl' }],
      [0, 'Phở chay nấm', 48000, 'Nước dùng nấm hầm rau củ, phở tươi.', { v: 'bowl' }],
      [0, 'Cơm chiên dương châu chay', 42000, 'Cơm chiên với đậu, bắp, cà rốt, nấm.', { v: 'portion' }],
      [0, 'Bún Huế chay', 48000, 'Nước lèo sả ớt chay, chả chay, nấm.', { v: 'bowl' }],
      [0, 'Mì xào rau củ chay', 42000, 'Mì trứng chay xào cải thìa, nấm, cà rốt.', {}],
      [1, 'Đậu hũ chiên sả ớt', 38000, 'Đậu hũ chiên vàng lăn sả ớt.', {}],
      [1, 'Nấm đùi gà kho tiêu', 48000, 'Nấm đùi gà kho tiêu xanh kiểu kho quẹt.', { f: 1 }],
      [1, 'Cá chay kho tộ', 42000, 'Cá chay từ đậu hũ ki kho tộ.', {}],
      [1, 'Đậu hũ sốt cà', 36000, 'Đậu hũ non sốt cà chua.', {}],
      [1, 'Nấm xào sả ớt', 40000, 'Nấm bào ngư xào sả ớt thơm.', {}],
      [1, 'Chả giò chay (4 cái)', 36000, 'Chả giò nhân củ sắn, nấm mèo, miến.', {}],
      [1, 'Bò lúc lắc chay', 52000, 'Đạm thực vật xào lúc lắc kiểu bò.', {}],
      [2, 'Gỏi cuốn chay', 35000, 'Gỏi cuốn rau thơm, đậu hũ, bún, chấm tương đậu phộng.', { f: 1 }],
      [2, 'Gỏi ngó sen', 48000, 'Ngó sen, cà rốt, rau răm, đậu phộng.', {}],
      [2, 'Canh nấm rau củ', 30000, 'Canh nấm, cải thìa, cà rốt, ngô non.', {}],
      [2, 'Súp bắp nấm', 28000, 'Súp bắp non nấu nấm tuyết.', {}],
      [2, 'Rau xào thập cẩm', 30000, 'Rau củ theo mùa xào tỏi.', { t: 8 }],
      [2, 'Trà hoa cúc', 18000, 'Trà hoa cúc táo đỏ, thanh nhiệt.', { t: 4 }]
    ]
  },

  /* 30 - Burger Phố Nướng */
  30: {
    toppings: 'fastfood',
    cats: ['Burger', 'Món ăn kèm', 'Combo & nước'],
    dishes: [
      [0, 'Burger bò phô mai', 59000, 'Bò xay nướng, phô mai Cheddar, dưa chua, sốt đặc biệt.', { f: 1 }],
      [0, 'Burger bò đôi', 79000, 'Hai lớp bò nướng, hai lớp phô mai, bacon.', { f: 1 }],
      [0, 'Burger gà giòn', 52000, 'Phi lê gà chiên giòn, xà lách, mayonnaise.', {}],
      [0, 'Burger tôm', 62000, 'Chả tôm chiên giòn, sốt tartar.', {}],
      [0, 'Burger cá phi lê', 55000, 'Phi lê cá tẩm bột chiên, sốt tartar, phô mai lát.', {}],
      [0, 'Burger BBQ bacon', 72000, 'Bò nướng, bacon giòn, hành chiên, sốt BBQ.', {}],
      [0, 'Burger nấm chay', 55000, 'Nấm portobello nướng, phô mai, rau tươi.', {}],
      [0, 'Hotdog xúc xích Đức', 48000, 'Xúc xích Đức nướng, bắp cải muối, mù tạt.', {}],
      [0, 'Sandwich gà nướng', 49000, 'Gà nướng, trứng, xà lách, cà chua.', {}],
      [1, 'Khoai tây chiên', 25000, 'Khoai chiên giòn rắc muối.', { t: 6 }],
      [1, 'Khoai chiên phô mai', 38000, 'Khoai chiên phủ sốt phô mai nóng.', {}],
      [1, 'Hành tây chiên giòn', 28000, 'Vòng hành tây chiên xù.', {}],
      [1, 'Gà viên chiên (6 viên)', 35000, 'Gà viên chiên kèm sốt.', {}],
      [1, 'Salad bắp cải', 18000, 'Salad bắp cải cà rốt.', { t: 3 }],
      [1, 'Phô mai que (4 que)', 32000, 'Phô mai mozzarella chiên xù.', {}],
      [2, 'Combo burger bò', 85000, 'Burger bò phô mai, khoai chiên, nước ngọt.', { f: 1 }],
      [2, 'Combo burger gà', 78000, 'Burger gà giòn, khoai chiên, nước ngọt.', {}],
      [2, 'Combo 2 người', 165000, '2 burger, 2 khoai chiên, 2 nước ngọt.', {}],
      [2, 'Coca-Cola lon', 15000, 'Nước ngọt Coca-Cola 330ml.', { t: 2 }],
      [2, 'Trà đào', 28000, 'Trà đào cam sả giải khát.', { t: 5 }]
    ]
  },

  /* 31 - Quán Vặt Cô Ba */
  31: {
    toppings: 'snack',
    cats: ['Ăn vặt chiên nướng', 'Món nước & hấp', 'Chè & tráng miệng'],
    dishes: [
      [0, 'Bánh tráng trộn', 25000, 'Bánh tráng, xoài, trứng cút, khô bò, rau răm, sa tế.', { f: 1, t: 8 }],
      [0, 'Bánh tráng nướng', 22000, 'Bánh tráng nướng than, trứng, hành, tôm khô.', { t: 8 }],
      [0, 'Cá viên chiên', 28000, 'Cá viên chiên giòn chấm tương ớt.', {}],
      [0, 'Xiên que nướng (5 que)', 35000, 'Xúc xích, bò viên, phô mai que, nướng than.', { f: 1 }],
      [0, 'Khoai lang kén', 25000, 'Khoai lang chiên giòn rắc đường.', {}],
      [0, 'Nem chua rán', 30000, 'Nem chua rán nóng giòn, tương ớt.', {}],
      [0, 'Bắp xào', 22000, 'Bắp non xào bơ, tôm khô, hành phi.', {}],
      [0, 'Bò bía', 20000, 'Bò bía củ sắn, trứng, lạp xưởng, chấm tương.', {}],
      [0, 'Gỏi khô bò', 32000, 'Đu đủ bào, khô bò, rau thơm, đậu phộng.', {}],
      [0, 'Bánh bao chiên', 24000, 'Bánh bao chiên vàng, nhân thịt trứng cút.', {}],
      [1, 'Há cảo hấp (6 cái)', 38000, 'Há cảo tôm thịt hấp, tương ớt.', {}],
      [1, 'Tokbokki phô mai', 45000, 'Bánh gạo cay Hàn Quốc, phô mai, chả cá.', { f: 1 }],
      [1, 'Súp cua', 28000, 'Súp cua trứng bắc thảo, hành ngò.', {}],
      [1, 'Hoành thánh chiên', 30000, 'Hoành thánh chiên giòn, sốt chua ngọt.', {}],
      [1, 'Bánh canh chả cá', 38000, 'Bánh canh sợi to, chả cá, nước dùng xương.', {}],
      [1, 'Ốc len xào dừa', 45000, 'Ốc len xào nước cốt dừa, lá chanh.', {}],
      [2, 'Chè khúc bạch', 25000, 'Khúc bạch, nhãn, hạnh nhân, thạch.', {}],
      [2, 'Chè thái', 28000, 'Mít, sầu riêng, thạch, nước cốt dừa.', { f: 1 }],
      [2, 'Chè đậu xanh', 18000, 'Đậu xanh nấu nhừ, nước cốt dừa.', {}],
      [2, 'Sữa chua nếp cẩm', 22000, 'Sữa chua dẻo, nếp cẩm dẻo thơm.', {}],
      [2, 'Rau câu dừa', 18000, 'Rau câu trái dừa mát lạnh.', {}]
    ]
  },

  /* 32 - Cà Phê Sớm Mai */
  32: {
    toppings: 'coffee',
    cats: ['Cà phê', 'Trà & nước ép', 'Bánh ngọt'],
    dishes: [
      [0, 'Cà phê đen đá', 22000, 'Cà phê phin rang mộc, đậm đắng.', { v: 'drink', t: 4 }],
      [0, 'Cà phê sữa đá', 25000, 'Cà phê phin sữa đặc, đá viên.', { v: 'drink', f: 1, t: 4 }],
      [0, 'Bạc xỉu', 27000, 'Nhiều sữa ít cà phê, kem sữa mịn.', { v: 'drink', f: 1, t: 4 }],
      [0, 'Cà phê muối', 32000, 'Cà phê espresso, kem muối béo mặn.', { v: 'drink', t: 6 }],
      [0, 'Cà phê dừa', 38000, 'Cà phê xay cùng nước cốt dừa, đá bào.', { v: 'drink', t: 7 }],
      [0, 'Americano', 32000, 'Espresso pha loãng với nước nóng hoặc đá.', { v: 'drink', t: 4 }],
      [0, 'Latte nóng', 38000, 'Espresso, sữa nóng đánh bông.', { v: 'drink', t: 5 }],
      [0, 'Cappuccino', 38000, 'Espresso, sữa nóng, lớp bọt dày.', { v: 'drink', t: 5 }],
      [0, 'Cacao đá', 30000, 'Cacao nguyên chất, sữa tươi.', { v: 'drink', t: 5 }],
      [0, 'Cold brew cam', 42000, 'Cold brew ủ lạnh 18 giờ, cam tươi.', { v: 'drink', t: 5 }],
      [1, 'Trà đào cam sả', 38000, 'Trà đen, đào miếng, cam, sả.', { v: 'drink', t: 6 }],
      [1, 'Trà vải', 36000, 'Trà vải thiều ngâm lạnh.', { v: 'drink', t: 5 }],
      [1, 'Trà gừng mật ong', 28000, 'Trà gừng ấm, mật ong.', { v: 'drink', t: 5 }],
      [1, 'Nước ép cam', 35000, 'Cam vàng ép tươi.', { v: 'drink', t: 5 }],
      [1, 'Nước ép dưa hấu', 32000, 'Dưa hấu ép nguyên chất.', { v: 'drink', t: 5 }],
      [1, 'Sinh tố bơ', 42000, 'Bơ sáp xay sữa đặc.', { v: 'drink', t: 6 }],
      [2, 'Croissant bơ', 35000, 'Bánh sừng bò bơ Pháp nướng giòn.', { t: 8 }],
      [2, 'Bánh tiramisu', 45000, 'Bánh tiramisu cà phê mascarpone.', { f: 1, t: 5 }],
      [2, 'Bánh flan caramel', 22000, 'Flan trứng sữa caramel.', { t: 3 }],
      [2, 'Cookie socola chip', 25000, 'Bánh quy socola chip nướng giòn.', { t: 3 }]
    ]
  },

  /* 33 - Bánh Mì Lò Than */
  33: {
    toppings: 'snack',
    cats: ['Bánh mì', 'Cuốn & nem', 'Nước uống'],
    dishes: [
      [0, 'Bánh mì thịt nướng', 28000, 'Bánh mì giòn, thịt nướng than hoa, rau, dưa chua, sốt.', { f: 1, t: 6 }],
      [0, 'Bánh mì chả lụa', 25000, 'Chả lụa, pate, bơ, rau, ngò.', { t: 5 }],
      [0, 'Bánh mì xíu mại', 30000, 'Xíu mại sốt cà, bánh mì nóng.', { t: 6 }],
      [0, 'Bánh mì ốp la', 24000, 'Trứng ốp la, pate, xì dầu, hành.', { t: 5 }],
      [0, 'Bánh mì gà nướng', 32000, 'Gà nướng lá chanh, rau sống.', { t: 6 }],
      [0, 'Bánh mì heo quay', 35000, 'Heo quay giòn bì, dưa leo, nước tương.', { t: 6 }],
      [0, 'Bánh mì bò kho', 38000, 'Bò kho mềm, cà rốt, chấm bánh mì.', { f: 1, t: 8 }],
      [0, 'Bánh mì pate trứng', 24000, 'Pate gan, trứng ốp la, bơ.', { t: 5 }],
      [0, 'Bánh mì đặc biệt', 36000, 'Thịt nguội, chả, pate, thịt nướng, bơ.', { f: 1, t: 6 }],
      [0, 'Bánh mì cá hộp', 24000, 'Cá mòi sốt cà, hành, ngò.', { t: 5 }],
      [1, 'Gỏi cuốn tôm thịt (2 cuốn)', 28000, 'Tôm, thịt, bún, rau thơm, tương đậu phộng.', {}],
      [1, 'Nem nướng Nha Trang', 45000, 'Nem nướng, bánh tráng, rau sống, nước chấm.', {}],
      [1, 'Chả giò (4 cái)', 32000, 'Chả giò chiên giòn nhân thịt tôm.', {}],
      [1, 'Bì cuốn', 25000, 'Bì heo, rau thơm cuốn bánh tráng.', {}],
      [1, 'Bánh xèo mini (3 cái)', 38000, 'Bánh xèo giòn nhân tôm giá.', {}],
      [1, 'Bò nướng lá lốt (4 cuốn)', 42000, 'Bò xay cuốn lá lốt nướng.', {}],
      [2, 'Trà tắc', 15000, 'Trà tắc tươi mát lạnh.', { t: 3 }],
      [2, 'Sữa đậu nành', 12000, 'Sữa đậu nành tự nấu.', { t: 3 }],
      [2, 'Nước mía', 15000, 'Nước mía ép tươi.', { t: 5 }],
      [2, 'Cà phê sữa đá', 20000, 'Cà phê phin sữa đá.', { t: 4 }]
    ]
  },

  /* 34 - Hủ Tiếu Nam Vang An Lạc */
  34: {
    toppings: 'noodle',
    cats: ['Hủ tiếu', 'Món nước khác', 'Ăn kèm'],
    dishes: [
      [0, 'Hủ tiếu Nam Vang nước', 55000, 'Tôm, thịt bằm, gan, trứng cút, nước dùng xương hầm.', { v: 'bowl', f: 1 }],
      [0, 'Hủ tiếu Nam Vang khô', 57000, 'Hủ tiếu trộn tỏi phi, tôm thịt, chén nước dùng riêng.', { v: 'bowl', f: 1 }],
      [0, 'Hủ tiếu bò kho', 58000, 'Bò kho hầm sả, hủ tiếu mềm, bánh mì.', { v: 'bowl' }],
      [0, 'Hủ tiếu sườn', 55000, 'Sườn heo hầm mềm, nước dùng ngọt.', { v: 'bowl' }],
      [0, 'Hủ tiếu mực', 60000, 'Mực tươi chần, nước dùng ngọt, hẹ.', { v: 'bowl' }],
      [0, 'Hủ tiếu gõ', 40000, 'Hủ tiếu bình dân nước trong, thịt xá xíu.', { v: 'bowl' }],
      [0, 'Hủ tiếu xá xíu', 55000, 'Xá xíu mềm, trứng cút, nước dùng.', { v: 'bowl' }],
      [0, 'Hủ tiếu thập cẩm', 68000, 'Tôm, mực, thịt, gan, trứng cút.', { v: 'bowl' }],
      [1, 'Bánh canh giò heo', 55000, 'Bánh canh sợi lớn, giò heo mềm, hành phi.', { v: 'bowl' }],
      [1, 'Bánh canh cua', 65000, 'Bánh canh sợi to, thịt cua, trứng cút.', { v: 'bowl' }],
      [1, 'Mì xá xíu', 52000, 'Mì trứng vàng, xá xíu, cải xanh.', { v: 'bowl' }],
      [1, 'Mì hoành thánh', 54000, 'Hoành thánh nhân tôm thịt, mì dai.', { v: 'bowl' }],
      [1, 'Bún mọc', 48000, 'Mọc viên, giò, sườn non, nước dùng ngọt.', { v: 'bowl' }],
      [1, 'Miến cua', 60000, 'Miến dai, thịt cua, trứng cút.', { v: 'bowl' }],
      [2, 'Gỏi cuốn tôm thịt', 30000, 'Gỏi cuốn tôm thịt, tương đậu phộng.', {}],
      [2, 'Hoành thánh chiên', 28000, 'Hoành thánh chiên, sốt chua ngọt.', {}],
      [2, 'Bánh bao nhân thịt', 20000, 'Bánh bao hấp nhân thịt trứng.', { t: 5 }],
      [2, 'Quẩy (3 cái)', 10000, 'Quẩy nóng giòn.', { t: 4 }],
      [2, 'Trà đá', 5000, 'Trà đá.', { t: 2 }],
      [2, 'Nước ngọt lon', 15000, 'Pepsi, Sprite, 7Up.', { t: 2 }]
    ]
  },

  /* 35 - Cơm Gà Hội An Bếp Vàng */
  35: {
    toppings: 'rice',
    cats: ['Cơm gà', 'Món Hội An', 'Món phụ & nước'],
    dishes: [
      [0, 'Cơm gà xé Hội An', 55000, 'Cơm nấu nước luộc gà nghệ, gà ta xé, hành tây, rau răm.', { v: 'portion', f: 1 }],
      [0, 'Cơm gà đùi', 62000, 'Đùi gà ta luộc, cơm vàng, nước mắm gừng.', { v: 'portion', f: 1 }],
      [0, 'Cơm gà nướng', 58000, 'Gà nướng mật ong, cơm vàng, đồ chua.', { v: 'portion' }],
      [0, 'Cơm gà chiên giòn', 58000, 'Gà chiên giòn da, cơm vàng, đồ chua.', { v: 'portion' }],
      [0, 'Cơm gà lòng', 52000, 'Lòng gà xào, tim gan, cơm gà.', { v: 'portion' }],
      [0, 'Cơm gà trứng', 58000, 'Gà xé, trứng gà luộc, cơm vàng.', { v: 'portion' }],
      [0, 'Cơm gà thập cẩm', 68000, 'Gà xé, đùi, lòng, trứng non.', { v: 'portion' }],
      [0, 'Cơm gà sốt me', 60000, 'Gà chiên sốt me chua ngọt.', {}],
      [1, 'Mì Quảng ếch', 58000, 'Mì Quảng nhân ếch xào nghệ.', {}],
      [1, 'Cao lầu', 55000, 'Cao lầu Hội An, thịt xá xíu, rau sống, tóp mỡ.', { f: 1 }],
      [1, 'Bánh mì Phượng', 35000, 'Bánh mì kiểu Hội An, thịt nướng, pate.', {}],
      [1, 'Bánh xèo Hội An', 45000, 'Bánh xèo mỏng, tôm thịt, cuốn rau.', {}],
      [1, 'Bánh bao bánh vạc', 40000, 'Bánh bao bánh vạc hoa hồng trắng (6 cái).', {}],
      [1, 'Cháo gà', 42000, 'Cháo gà xé, hành phi.', {}],
      [2, 'Gỏi gà bắp cải', 45000, 'Gà xé, bắp cải, rau răm, đậu phộng.', {}],
      [2, 'Gỏi đu đủ khô bò', 38000, 'Đu đủ bào, khô bò, rau thơm.', {}],
      [2, 'Canh rong biển', 25000, 'Canh rong biển thịt bằm.', {}],
      [2, 'Dưa chua', 8000, 'Dưa cải chua giòn.', { t: 2 }],
      [2, 'Nước sâm', 12000, 'Nước sâm mát lạnh.', { t: 3 }],
      [2, 'Trà đá', 5000, 'Trà đá.', { t: 2 }]
    ]
  },

  /* 36 - Mì Ý Sốt Nhà Làm */
  36: {
    toppings: 'pizza',
    cats: ['Mì Ý sốt đỏ', 'Mì Ý sốt kem & pesto', 'Khai vị & tráng miệng'],
    dishes: [
      [0, 'Spaghetti Bolognese', 72000, 'Sốt bò bằm cà chua hầm chậm, parmesan.', { f: 1 }],
      [0, 'Spaghetti Arrabbiata', 65000, 'Sốt cà chua ớt cay, tỏi, húng tây.', {}],
      [0, 'Penne sốt cà chua gà', 68000, 'Penne, gà áp chảo, sốt cà chua húng quế.', {}],
      [0, 'Spaghetti hải sản sốt cà', 92000, 'Tôm mực nghêu, sốt cà chua rượu vang.', { f: 1 }],
      [0, 'Spaghetti meatball', 82000, 'Thịt viên bò hầm sốt cà chua.', {}],
      [0, 'Penne all\'Amatriciana', 78000, 'Thịt xông khói, hành tây, sốt cà chua.', {}],
      [0, 'Mì Ý chay sốt cà', 62000, 'Cà chua, nấm, cà tím, ô liu.', {}],
      [1, 'Spaghetti Carbonara', 78000, 'Trứng, bacon, parmesan, tiêu đen.', { f: 1 }],
      [1, 'Fettuccine Alfredo gà', 82000, 'Sốt kem phô mai, gà áp chảo.', { f: 1 }],
      [1, 'Spaghetti sốt kem nấm', 72000, 'Sốt kem nấm mỡ, tỏi.', {}],
      [1, 'Linguine pesto tôm', 88000, 'Pesto húng quế, hạt thông, tôm sú.', {}],
      [1, 'Penne sốt kem cà chua', 70000, 'Hỗn hợp kem và cà chua, bacon.', {}],
      [1, 'Fettuccine bò sốt tiêu', 92000, 'Bò áp chảo, sốt kem tiêu xanh.', {}],
      [1, 'Mì Ý sốt kem hải sản', 95000, 'Tôm, mực, sò điệp, sốt kem tươi.', {}],
      [2, 'Salad cà chua mozzarella', 58000, 'Caprese, dầu olive, balsamic.', {}],
      [2, 'Bánh mì bơ tỏi', 32000, 'Bánh mì nướng bơ tỏi.', { t: 8 }],
      [2, 'Súp bí đỏ', 38000, 'Súp bí đỏ kem tươi.', {}],
      [2, 'Tiramisu', 48000, 'Bánh tiramisu mascarpone.', { f: 1 }],
      [2, 'Panna cotta dâu', 42000, 'Panna cotta sốt dâu.', {}],
      [2, 'Nước cam ép', 32000, 'Cam vàng ép tươi.', { t: 5 }]
    ]
  },

  /* 37 - Gỏi Cuốn Tươi Mỗi Ngày */
  37: {
    toppings: 'snack',
    cats: ['Gỏi cuốn', 'Món chiên & cuốn', 'Gỏi & nước'],
    dishes: [
      [0, 'Gỏi cuốn tôm thịt (3 cuốn)', 38000, 'Tôm sú, thịt ba chỉ, bún, rau thơm, tương đậu phộng.', { f: 1, t: 6 }],
      [0, 'Gỏi cuốn tôm (3 cuốn)', 45000, 'Tôm sú luộc, bún, rau thơm.', { t: 6 }],
      [0, 'Gỏi cuốn chay (3 cuốn)', 32000, 'Đậu hũ chiên, rau củ, bún.', { t: 6 }],
      [0, 'Gỏi cuốn heo quay (3 cuốn)', 42000, 'Heo quay giòn bì, bún, dưa leo.', { t: 6 }],
      [0, 'Gỏi cuốn bò nướng (3 cuốn)', 46000, 'Bò xào lá lốt, bún, rau thơm.', { t: 6 }],
      [0, 'Gỏi cuốn cá hồi (3 cuốn)', 58000, 'Cá hồi tươi, bơ, dưa leo.', { f: 1, t: 6 }],
      [0, 'Gỏi cuốn thập cẩm (6 cuốn)', 78000, 'Combo gỏi cuốn tôm thịt, chay, heo quay.', { f: 1 }],
      [0, 'Gỏi cuốn nem nướng (3 cuốn)', 44000, 'Nem nướng, rau sống, bún.', { t: 6 }],
      [1, 'Chả giò hải sản (4 cái)', 42000, 'Chả giò nhân tôm mực.', {}],
      [1, 'Bì cuốn (3 cuốn)', 30000, 'Bì heo thính, rau răm, chấm mắm.', {}],
      [1, 'Nem rán (4 cái)', 38000, 'Nem rán Hà Nội.', {}],
      [1, 'Bánh tráng cuốn thịt heo', 48000, 'Thịt luộc, rau sống, bún, mắm nêm.', {}],
      [1, 'Bánh xèo tôm (2 cái)', 50000, 'Bánh xèo nhân tôm, giá, rau cuốn.', {}],
      [1, 'Bánh cuốn nóng', 38000, 'Bánh cuốn nhân thịt, chả lụa, nước mắm.', { t: 8 }],
      [1, 'Tôm chiên giòn (6 con)', 55000, 'Tôm chiên giòn, sốt me.', {}],
      [2, 'Gỏi ngó sen tôm thịt', 62000, 'Ngó sen, tôm, thịt, rau răm.', {}],
      [2, 'Gỏi xoài khô cá', 48000, 'Xoài xanh bào, khô cá sặc.', {}],
      [2, 'Gỏi đu đủ tôm khô', 40000, 'Đu đủ bào, tôm khô, rau húng.', {}],
      [2, 'Nước sâm bí đao', 15000, 'Bí đao nấu sâm.', { t: 3 }],
      [2, 'Trà chanh', 18000, 'Trà chanh tươi.', { t: 3 }]
    ]
  },

  /* 38 - Lẩu Ly Đêm Sài Gòn */
  38: {
    toppings: 'snack',
    cats: ['Lẩu ly', 'Đồ nướng & chiên', 'Nước & tráng miệng'],
    dishes: [
      [0, 'Lẩu ly Thái chua cay', 59000, 'Nước lẩu Tom Yum, bò, tôm, nấm, rau.', { f: 1, t: 15 }],
      [0, 'Lẩu ly kim chi', 59000, 'Kim chi, ba chỉ bò, đậu hũ, nấm.', { t: 15 }],
      [0, 'Lẩu ly hải sản', 69000, 'Tôm, mực, nghêu, nấm, rau.', { f: 1, t: 15 }],
      [0, 'Lẩu ly nấm gà', 55000, 'Gà, nấm, rau cải.', { t: 15 }],
      [0, 'Lẩu ly bò Mỹ', 75000, 'Bò Mỹ, nấm, bắp, rau.', { t: 15 }],
      [0, 'Lẩu ly mala', 65000, 'Nước lẩu cay tê, thịt bò, viên, nấm.', { t: 15 }],
      [0, 'Lẩu ly chay', 49000, 'Nấm, đậu hũ, rau củ, nước dùng chay.', { t: 15 }],
      [1, 'Xiên bò nướng (3 xiên)', 45000, 'Bò nướng sa tế.', {}],
      [1, 'Cánh gà nướng mật ong (4 cái)', 48000, 'Cánh gà nướng mật ong.', {}],
      [1, 'Bạch tuộc nướng sa tế', 62000, 'Bạch tuộc nướng, sa tế.', {}],
      [1, 'Tôm nướng muối ớt (6 con)', 68000, 'Tôm sú nướng muối ớt.', {}],
      [1, 'Khoai tây chiên', 25000, 'Khoai chiên giòn.', { t: 6 }],
      [1, 'Phô mai que (5 que)', 38000, 'Phô mai que chiên.', {}],
      [1, 'Nem chua rán', 30000, 'Nem chua rán.', {}],
      [1, 'Trứng cút nướng (10 trứng)', 25000, 'Trứng cút nướng bơ.', {}],
      [2, 'Trà đào cam sả', 32000, 'Trà đào cam sả.', { t: 5 }],
      [2, 'Soda chanh dây', 30000, 'Chanh dây soda.', { t: 4 }],
      [2, 'Bia lon Tiger', 22000, 'Bia Tiger lon 330ml.', { t: 2 }],
      [2, 'Chè khúc bạch', 25000, 'Chè khúc bạch.', {}],
      [2, 'Kem dừa', 28000, 'Kem dừa trái dừa.', {}]
    ]
  },

  /* 39 - Nước Ép Mùa Xanh */
  39: {
    toppings: 'coffee',
    cats: ['Nước ép', 'Sinh tố', 'Detox & trà'],
    dishes: [
      [0, 'Nước ép cam', 35000, 'Cam vàng ép tươi, không đường.', { v: 'drink', f: 1, t: 5 }],
      [0, 'Nước ép dưa hấu', 32000, 'Dưa hấu ép nguyên chất.', { v: 'drink', t: 5 }],
      [0, 'Nước ép ổi', 33000, 'Ổi hồng ép, thơm đậm.', { v: 'drink', t: 5 }],
      [0, 'Nước ép cà rốt táo', 36000, 'Cà rốt, táo đỏ, chút gừng.', { v: 'drink', t: 6 }],
      [0, 'Nước ép dứa', 32000, 'Dứa ép, thêm chút muối.', { v: 'drink', t: 5 }],
      [0, 'Nước ép cần tây táo', 38000, 'Cần tây, táo xanh, chanh.', { v: 'drink', t: 6 }],
      [0, 'Nước ép lựu', 42000, 'Lựu ép tươi nguyên chất.', { v: 'drink', t: 6 }],
      [0, 'Nước ép cam cà rốt', 36000, 'Cam và cà rốt ép.', { v: 'drink', f: 1, t: 6 }],
      [1, 'Sinh tố bơ', 42000, 'Bơ sáp, sữa đặc, sữa tươi.', { v: 'drink', f: 1, t: 6 }],
      [1, 'Sinh tố xoài', 40000, 'Xoài cát chín, sữa chua.', { v: 'drink', t: 6 }],
      [1, 'Sinh tố dâu', 42000, 'Dâu Đà Lạt xay, sữa chua.', { v: 'drink', t: 6 }],
      [1, 'Sinh tố sapoche', 40000, 'Sapoche xay, sữa đặc.', { v: 'drink', t: 6 }],
      [1, 'Sinh tố mãng cầu', 42000, 'Mãng cầu xiêm xay, sữa.', { v: 'drink', t: 6 }],
      [1, 'Sinh tố chuối yến mạch', 38000, 'Chuối, yến mạch, sữa hạnh nhân.', { v: 'drink', t: 6 }],
      [1, 'Sinh tố thập cẩm', 45000, 'Xoài, bơ, dâu, sữa chua.', { v: 'drink', t: 7 }],
      [2, 'Nước detox dưa leo', 38000, 'Dưa leo, bạc hà, chanh.', { v: 'drink', t: 5 }],
      [2, 'Nước detox cam sả', 38000, 'Cam, sả, gừng.', { v: 'drink', t: 5 }],
      [2, 'Trà gạo lứt', 28000, 'Gạo lứt rang, thanh nhiệt.', { v: 'drink', t: 4 }],
      [2, 'Trà hoa cúc táo đỏ', 30000, 'Hoa cúc, táo đỏ, kỷ tử.', { v: 'drink', t: 5 }],
      [2, 'Sữa hạt óc chó', 38000, 'Sữa hạt tươi không đường.', { v: 'drink', t: 4 }]
    ]
  },

  /* 40 - Bếp Bắc Nhỏ */
  40: {
    toppings: 'rice',
    cats: ['Món chính', 'Bún & cuốn', 'Món phụ & nước'],
    dishes: [
      [0, 'Bún đậu mắm tôm', 65000, 'Đậu hũ chiên, chả cốm, thịt luộc, lòng, mắm tôm.', { f: 1 }],
      [0, 'Bún chả', 60000, 'Chả viên, chả miếng nướng, bún lá, nước mắm.', { f: 1 }],
      [0, 'Bún thang', 55000, 'Gà xé, trứng tráng, giò lụa, nước dùng trong.', {}],
      [0, 'Bún riêu', 50000, 'Riêu cua, cà chua, đậu hũ.', {}],
      [0, 'Miến lươn', 62000, 'Lươn đồng chiên giòn, miến dong, rau.', {}],
      [0, 'Chả cá Lã Vọng', 95000, 'Cá lăng nướng nghệ, thì là, bún, mắm tôm.', {}],
      [0, 'Cơm rang dưa bò', 55000, 'Cơm rang dưa cải, bò xào.', { v: 'portion' }],
      [0, 'Xôi gà', 40000, 'Xôi gà xé, hành phi.', {}],
      [1, 'Nem rán Hà Nội (5 cái)', 45000, 'Nem rán nhân thịt, miến, mộc nhĩ.', {}],
      [1, 'Bánh cuốn Thanh Trì', 45000, 'Bánh cuốn mỏng, chả quế, hành phi.', { t: 10 }],
      [1, 'Phở cuốn', 48000, 'Phở cuốn bò xào, rau thơm.', {}],
      [1, 'Bánh giò', 20000, 'Bánh giò nhân thịt nấm.', {}],
      [1, 'Bún ốc', 52000, 'Ốc nhồi, giò, đậu hũ, nước chua.', {}],
      [1, 'Bún mọc', 48000, 'Mọc, sườn, nước dùng.', {}],
      [2, 'Nem chua rán', 32000, 'Nem chua rán Thanh Hóa.', {}],
      [2, 'Dưa góp', 10000, 'Dưa cải góp.', { t: 2 }],
      [2, 'Chè hạt sen', 25000, 'Chè hạt sen long nhãn.', {}],
      [2, 'Nước vối', 12000, 'Nước vối thanh nhiệt.', { t: 3 }],
      [2, 'Trà sen', 18000, 'Trà sen Hà Nội.', { t: 4 }],
      [2, 'Cà phê trứng', 35000, 'Cà phê trứng kiểu Hà Nội.', { f: 1, t: 6 }]
    ]
  },

  /* 41 - Cháo Đêm Ấm Bụng */
  41: {
    toppings: 'noodle',
    cats: ['Cháo', 'Món ăn đêm', 'Đồ uống'],
    dishes: [
      [0, 'Cháo sườn', 38000, 'Cháo trắng nấu xương, sườn non, hành phi.', { v: 'bowl', f: 1 }],
      [0, 'Cháo lòng', 40000, 'Lòng, dồi, tim, gan, hành ngò, tiêu.', { v: 'bowl', f: 1 }],
      [0, 'Cháo gà', 38000, 'Gà ta xé, gừng, hành lá.', { v: 'bowl' }],
      [0, 'Cháo cá lóc', 42000, 'Cá lóc, rau om, bạc hà.', { v: 'bowl' }],
      [0, 'Cháo ếch Singapore', 55000, 'Ếch om sả, cháo trắng.', {}],
      [0, 'Cháo hàu', 48000, 'Hàu tươi, gừng, hành.', { v: 'bowl' }],
      [0, 'Cháo thịt bằm trứng bắc thảo', 40000, 'Thịt bằm, trứng bắc thảo.', { v: 'bowl' }],
      [0, 'Cháo yến mạch rau củ', 38000, 'Yến mạch, bí đỏ, rau củ.', {}],
      [1, 'Quẩy giòn', 10000, 'Quẩy nóng (3 cái).', { t: 4 }],
      [1, 'Trứng chiên', 12000, 'Trứng chiên hành lá.', { t: 5 }],
      [1, 'Gỏi gà', 45000, 'Gà xé, bắp cải, rau răm.', {}],
      [1, 'Bánh mì chảo', 42000, 'Trứng ốp la, pate, xúc xích, chấm bánh mì.', {}],
      [1, 'Hoành thánh chiên', 28000, 'Hoành thánh chiên giòn.', {}],
      [1, 'Cháo trắng hột vịt muối', 25000, 'Cháo trắng, trứng vịt muối.', {}],
      [1, 'Dưa muối', 8000, 'Dưa cải muối.', { t: 2 }],
      [2, 'Sữa đậu nành nóng', 12000, 'Sữa đậu nành nóng.', { t: 3 }],
      [2, 'Trà gừng', 15000, 'Trà gừng nóng.', { t: 4 }],
      [2, 'Trà đá', 5000, 'Trà đá.', { t: 2 }],
      [2, 'Nước sâm', 12000, 'Nước sâm.', { t: 3 }],
      [2, 'Cà phê sữa nóng', 20000, 'Cà phê sữa.', { t: 4 }]
    ]
  }
};
