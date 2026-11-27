/*
 * Đợt 5 (22/11/2026): lấp ảnh cho các món còn thiếu sau đợt 4 — nhóm có khả năng tìm đúng (nước sâm/vối, cháo, canh, gỏi, trứng…).
 * Chỉ là ỨNG VIÊN: vẫn phải xem bằng mắt rồi mới ghi vào accept.json. Dùng collect.mjs --wiki.
 */
const T = (key, must, match, sources = {}) => ({ key, must, match, ...sources });

export const ROUND5 = [
  T('nuoc-voi', 'cốc/ấm nước vối (nước nâu vàng nhạt từ nụ vối)', /^nước vối/, { search: ['nước vối', 'nụ vối'], wiki: [['vi', 'Vối']], ov: ['nuoc voi vietnamese herbal tea', 'syzygium nervosum tea'] }),
  T('tra-dau-tam', 'ly trà/nước dâu tằm (màu tím đỏ, có quả dâu tằm)', /^trà dâu tằm/, { search: ['mulberry tea', 'mulberry juice'], wiki: [['en', 'Mulberry']], ov: ['mulberry juice glass', 'mulberry tea iced'] }),
  T('tra-xoai', 'ly trà xoài (trà đá có xoài, màu vàng cam)', /^trà xoài/, { search: ['mango iced tea', 'mango tea'], ov: ['mango iced tea glass', 'mango fruit tea'] }),
  T('chao-trang', 'tô cháo trắng (cháo gạo trắng loãng, ăn kèm trứng muối/hành)', /^cháo trắng/, { cats: ['Congee'], search: ['cháo trắng', 'plain congee'], wiki: [['en', 'Congee'], ['vi', 'Cháo']], ov: ['plain rice porridge congee bowl', 'cháo trắng'] }),
  T('chao-ca', 'tô cháo cá (cháo với thịt cá, hành, rau thơm)', /^cháo cá/, { search: ['cháo cá', 'fish congee'], wiki: [['vi', 'Cháo cá']], ov: ['fish congee bowl', 'chao ca vietnamese fish porridge'] }),
  T('chao-ech', 'cháo ếch (cháo với thịt ếch)', /^cháo ếch/, { search: ['cháo ếch', 'frog porridge'], ov: ['frog porridge', 'chao ech singapore frog congee'] }),
  T('canh-rau-cu', 'tô canh rau củ (nước canh trong, cà rốt, su su, nấm…)', /^canh (nấm )?rau củ/, { search: ['canh rau củ', 'vegetable soup vietnamese'], ov: ['vietnamese vegetable soup canh', 'clear vegetable soup bowl'] }),
  T('canh-ga-la-giang', 'canh gà lá giang (nước canh chua, gà, lá giang)', /^canh gà lá giang/, { search: ['canh gà lá giang', 'gà nấu lá giang'], ov: ['canh ga la giang chicken sour soup'] }),
  T('dua-leo-tron', 'đĩa dưa leo cà chua trộn (salad dưa leo, cà chua, hành)', /^dưa leo cà chua/, { search: ['cucumber tomato salad', 'cucumber salad'], wiki: [['en', 'Cucumber salad']], ov: ['cucumber and tomato salad', 'vietnamese cucumber salad'] }),
  T('mien-ga', 'tô miến gà (miến trong, thịt gà xé, hành)', /^miến gà/, { search: ['miến gà', 'mien ga'], wiki: [['vi', 'Miến gà']], ov: ['mien ga vietnamese chicken glass noodle soup'] }),
  T('mi-vit-tiem', 'tô mì vịt tiềm (mì, đùi vịt hầm thuốc bắc)', /^mì vịt tiềm/, { search: ['mì vịt tiềm', 'vịt tiềm', 'braised duck noodle'], ov: ['braised duck noodle soup', 'mi vit tiem'] }),
  T('sushi-tom', 'sushi tôm (ebi nigiri: tôm trên cơm giấm)', /^sushi tôm/, { cats: ['Ebi nigiri'], search: ['ebi nigiri sushi', 'shrimp sushi'], wiki: [['en', 'Sushi']], ov: ['ebi nigiri shrimp sushi', 'shrimp nigiri'] }),
  T('cha-trung-hap', 'chả trứng hấp (khối chả trứng thịt hấp, cắt miếng)', /^chả trứng hấp/, { search: ['chả trứng hấp', 'steamed egg meatloaf'], ov: ['steamed egg pork meatloaf vietnamese cha trung'] }),
  T('dau-ran', 'đậu rán / đậu hũ chiên vàng', /^đậu rán/, { search: ['đậu rán', 'fried tofu'], wiki: [['vi', 'Đậu hũ'], ['en', 'Tofu']], ov: ['fried tofu vietnamese dau ran', 'deep fried tofu plate'] }),
  T('ga-rang-gung', 'gà rang gừng (gà xào với gừng thái sợi)', /^gà ta rang gừng/, { search: ['gà rang gừng', 'ginger chicken'], ov: ['ginger chicken stir fry vietnamese ga rang gung'] }),
  T('nam-xao-sa-ot', 'nấm xào sả ớt (nấm xào có sả, ớt)', /^nấm xào sả ớt/, { search: ['nấm xào', 'stir fried mushrooms'], ov: ['stir fried mushrooms lemongrass chili', 'mushroom stir fry vietnamese'] }),
  T('dau-hu-chien-sa-ot', 'đậu hũ chiên sả ớt', /^đậu hũ chiên sả ớt/, { search: ['đậu hũ chiên sả ớt', 'lemongrass tofu'], ov: ['lemongrass chili tofu fried', 'tofu lemongrass vietnamese'] }),
  T('hat-huong-duong', 'hạt hướng dương (đĩa/bát hạt hướng dương)', /^hướng dương$/, { cats: ['Sunflower seeds as food'], search: ['sunflower seeds in shell', 'hạt hướng dương'], wiki: [['en', 'Sunflower seed']], ov: ['sunflower seeds bowl snack'] }),
  T('com-gao-lut', 'cơm gạo lứt (cơm gạo lứt với đậu hũ/nấm/rau)', /^cơm gạo lứt/, { search: ['brown rice tofu bowl', 'cơm gạo lứt'], wiki: [['en', 'Brown rice']], ov: ['brown rice tofu mushroom bowl', 'brown rice vegetable bowl'] }),
  T('banh-mi-xiu-mai', 'bánh mì xíu mại (ổ bánh mì ăn với xíu mại sốt cà)', /^bánh mì xíu mại/, { search: ['bánh mì xíu mại', 'banh mi xiu mai'], ov: ['banh mi xiu mai meatball sandwich', 'xiu mai vietnamese meatballs tomato sauce bread'] }),
  T('banh-mi-ca-hop', 'bánh mì cá hộp (bánh mì kẹp/ăn với cá mòi sốt cà)', /^bánh mì cá hộp/, { search: ['bánh mì cá hộp', 'sardine sandwich'], ov: ['sardine sandwich banh mi', 'canned sardine bread tomato sauce'] }),
  T('trung-chan', 'trứng chần / trứng trần (trứng gà luộc lòng đào, trứng poached)', /^trứng (gà )?chần/, { search: ['poached egg', 'trứng chần'], wiki: [['en', 'Poached egg']], ov: ['poached egg on plate', 'poached egg in noodle soup'] }),
  T('bun-chay', 'tô bún chay (bún, rau, đậu hũ, nấm, nước trong)', /^bún chay riêu/, { search: ['bún chay', 'vegetarian noodle soup'], ov: ['vegetarian bun noodle soup tofu', 'vegan vietnamese noodle soup'] })
];
