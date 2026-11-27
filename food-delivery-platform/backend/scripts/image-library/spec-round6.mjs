/*
 * Đợt 7 (24/11/2026): ảnh cho món chay/đặc sản còn thiếu ở 7 quán (Bếp Chay Sen Vàng, Quán Chay Thiện Tâm, Bún Đậu Cô Tâm,
 * Chả Cá Hàng Đường, Bánh Tôm Hồ Tây, Gỏi Cuốn Tươi Mỗi Ngày, Lẩu Nấm Hà Đông). Chỉ là ỨNG VIÊN: xem bằng mắt rồi mới ghi accept.json.
 */
const T = (key, must, match, sources = {}) => ({ key, must, match, ...sources });

export const ROUND6 = [
  T('dau-hu-sot-ca', 'đậu hũ (đậu phụ) chiên vàng sốt cà chua đỏ', /^đậu hũ sốt cà/, { search: ['tofu tomato sauce', 'đậu sốt cà chua'], wiki: [['en', 'Tofu'], ['vi', 'Đậu phụ']], ov: ['fried tofu tomato sauce', 'dau phu sot ca chua'] }),
  T('dau-hu-chien', 'đậu hũ chiên vàng giòn (có sả ớt/ăn kèm)', /^đậu hũ chiên/, { search: ['fried tofu', 'đậu hũ chiên'], wiki: [['en', 'Tofu']], ov: ['fried tofu lemongrass chili', 'vietnamese fried tofu'] }),
  T('dau-ran', 'đậu phụ/đậu hũ rán vàng (món ăn kèm bún đậu)', /^(đậu rán|đậu hũ rán)/, { search: ['đậu rán', 'đậu phụ rán'], ov: ['dau ran vietnamese fried tofu', 'bun dau fried tofu'] }),
  T('nam-xao', 'nấm xào (nấm các loại xào sả ớt)', /^nấm xào/, { search: ['stir-fried mushrooms', 'nấm xào'], ov: ['stir fried mushrooms lemongrass', 'vietnamese stir fried mushroom'] }),
  T('canh-nam', 'bát canh nấm rau củ (nước trong, nấm)', /^canh nấm/, { search: ['mushroom soup vegetables clear', 'canh nấm'], ov: ['vietnamese mushroom soup', 'canh nam rau cu'] }),
  T('com-chay', 'đĩa cơm chay (cơm + các món chay: đậu hũ, rau, nấm)', /^cơm chay/, { search: ['cơm chay', 'vegetarian rice plate'], wiki: [['vi', 'Cơm chay']], ov: ['vietnamese vegetarian rice meal', 'com chay'] }),
  T('pho-chay', 'tô phở chay (nước trong, nấm/đậu hũ, rau)', /^phở chay/, { search: ['phở chay', 'vegetarian pho'], ov: ['vegetarian pho', 'vegan pho mushroom'] }),
  T('bun-hue-chay', 'tô bún Huế chay (nước đỏ cay, đậu hũ/nấm)', /^bún huế chay/, { search: ['bún bò Huế chay', 'vegetarian bun bo hue'], ov: ['vegetarian bun bo hue', 'vegan bun bo hue'] }),
  T('banh-tom-ho-tay', 'bánh tôm Hồ Tây (bánh tôm chiên giòn vàng, tôm nguyên con, ăn kèm rau/nước chấm)', /^bánh tôm/, { search: ['bánh tôm Hồ Tây', 'banh tom ho tay'], wiki: [['vi', 'Bánh tôm Hồ Tây']], ov: ['banh tom ho tay', 'vietnamese shrimp cake west lake'] }),
  T('goi-ngo-sen', 'gỏi ngó sen (ngó sen, tôm, thịt, rau thơm, lạc)', /^gỏi ngó sen/, { search: ['gỏi ngó sen', 'lotus stem salad'], wiki: [['vi', 'Gỏi ngó sen']], ov: ['lotus stem salad vietnamese', 'goi ngo sen'] }),
  T('nem-chua-ran', 'nem chua rán (nem chua chiên vàng giòn)', /^nem chua rán/, { search: ['nem chua rán', 'fried nem chua'], wiki: [['vi', 'Nem chua rán']], ov: ['nem chua ran fried fermented pork', 'nem chua'] }),
  T('banh-trang-nuong', 'bánh tráng nướng (bánh tráng nướng trứng, hành, ruốc)', /^bánh tráng nướng/, { search: ['bánh tráng nướng', 'grilled rice paper'], wiki: [['vi', 'Bánh tráng nướng']], ov: ['banh trang nuong vietnamese pizza', 'grilled rice paper dalat'] }),
  T('trung-cut-nuong', 'trứng cút nướng (xiên/đĩa trứng cút)', /^trứng cút/, { search: ['trứng cút nướng', 'quail eggs skewers'], ov: ['grilled quail eggs skewer', 'trung cut nuong'] }),
  T('xoai-lac', 'xoài lắc (xoài xanh cắt miếng, muối ớt)', /^xoài lắc/, { search: ['xoài lắc', 'mango chili salt'], ov: ['xoai lac shaken mango', 'green mango chili salt'] }),
  T('tra-gao-lut', 'ly/ấm trà gạo lứt (nước trà vàng nâu, có gạo rang)', /^trà gạo lứt/, { ov: ['genmaicha brown rice tea', 'brown rice tea cup'] }),
  T('che-hat-sen', 'bát chè hạt sen (hạt sen nấu đường, nước trong)', /^chè (hạt )?sen/, { ov: ['lotus seed sweet soup', 'che hat sen vietnamese dessert'] }),
  T('ca-phe-dua', 'ly cà phê dừa (cà phê + cốt dừa/dừa xay)', /^cà phê dừa/, { ov: ['coconut coffee vietnamese', 'coconut coffee smoothie'] }),
  T('nam-kho', 'đĩa nấm kho (nấm đùi gà/nấm sò kho tiêu, sốt nâu)', /^nấm đùi gà/, { ov: ['braised king oyster mushroom', 'braised mushrooms soy sauce'] }),
  T('mam-tom-chanh', 'chén mắm tôm pha chanh (nước chấm màu xám tím)', /^mắm tôm/, { search: ['mắm tôm', 'shrimp paste dipping sauce'], wiki: [['vi', 'Mắm tôm']], ov: ['mam tom shrimp paste lime', 'vietnamese shrimp paste'] })
];
