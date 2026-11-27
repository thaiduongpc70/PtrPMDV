/*
 * Đợt 4: các món của quán mới (Nhật, Hàn, dimsum, bánh ngọt, xôi, lẩu…) và các món cũ còn thiếu ảnh.
 * Chỉ là ỨNG VIÊN: vẫn phải xem bằng mắt rồi mới ghi vào accept.json. Dùng collect.mjs --wiki.
 */
const T = (key, must, match, sources = {}) => ({ key, must, match, ...sources });

export const ROUND4 = [
  // ===== Món Nhật =====
  T('sushi-nigiri', 'sushi nigiri (cá hồi/tôm trên cơm giấm)', /^sushi cá hồi/, { cats: ['Nigiri', 'Nigirizushi'], search: ['salmon nigiri sushi', 'nigiri sushi'], wiki: [['en', 'Nigiri sushi'], ['en', 'Sushi']], ov: ['salmon nigiri sushi', 'nigiri sushi plate'] }),
  T('sashimi', 'sashimi (cá hồi/cá ngừ thái lát)', /^sashimi/, { cats: ['Sashimi'], search: ['salmon sashimi', 'sashimi platter'], wiki: [['en', 'Sashimi']], ov: ['salmon sashimi plate', 'sashimi platter'] }),
  T('maki-roll', 'maki/California roll (cuộn rong biển cắt khoanh)', /^maki|^california roll/, { cats: ['Makizushi', 'California rolls'], search: ['maki sushi', 'california roll'], wiki: [['en', 'Makizushi'], ['en', 'California roll']], ov: ['maki sushi rolls', 'california roll sushi'] }),
  T('ramen', 'tô ramen (mì, nước dùng, chashu, trứng)', /^ramen/, { cats: ['Ramen', 'Tonkotsu ramen'], search: ['tonkotsu ramen', 'ramen'], wiki: [['en', 'Ramen']], ov: ['tonkotsu ramen bowl', 'miso ramen bowl'] }),
  T('udon', 'tô udon (mì udon dày, nước dashi)', /^udon/, { cats: ['Udon'], search: ['tempura udon', 'udon'], wiki: [['en', 'Udon']], ov: ['tempura udon bowl', 'udon noodle soup'] }),
  T('tempura-tom', 'tempura tôm (tôm chiên bột mỏng)', /^tempura/, { cats: ['Tempura'], search: ['ebi tempura', 'tempura'], wiki: [['en', 'Tempura']], ov: ['shrimp tempura plate', 'ebi tempura'] }),
  T('karaage', 'gà karaage (gà chiên kiểu Nhật)', /karaage/, { cats: ['Karaage'], search: ['karaage', 'tori no karaage'], wiki: [['en', 'Karaage']], ov: ['chicken karaage plate', 'karaage japanese fried chicken'] }),
  T('katsu-curry', 'cơm cà ri katsu (cà ri Nhật + thịt chiên xù)', /cà ri katsu/, { cats: ['Katsu curry', 'Katsukare'], search: ['katsu curry', 'katsu kare'], wiki: [['en', 'Katsu curry']], ov: ['katsu curry rice', 'chicken katsu curry'] }),
  T('teriyaki', 'cơm bò/gà teriyaki (thịt sốt bóng + cơm)', /teriyaki/, { cats: ['Teriyaki'], search: ['chicken teriyaki rice', 'beef teriyaki'], wiki: [['en', 'Teriyaki']], ov: ['chicken teriyaki rice bowl', 'beef teriyaki rice'] }),
  T('soba-lanh', 'mì soba lạnh (mì kiều mạch, nước chấm)', /soba/, { cats: ['Zarusoba', 'Soba'], search: ['zaru soba', 'cold soba noodles'], wiki: [['en', 'Soba']], ov: ['zaru soba cold noodles'] }),
  T('tamagoyaki', 'trứng cuộn tamagoyaki', /tamagoyaki/, { cats: ['Tamagoyaki'], search: ['tamagoyaki'], wiki: [['en', 'Tamagoyaki']], ov: ['tamagoyaki japanese rolled omelette'] }),
  T('matcha-da', 'trà xanh matcha đá (ly matcha lạnh)', /trà xanh matcha/, { search: ['iced matcha latte', 'iced matcha'], wiki: [['en', 'Matcha']], ov: ['iced matcha latte glass', 'iced green tea matcha'] }),
  // ===== Món Hàn =====
  T('bibimbap', 'cơm trộn bibimbap (cơm, rau, thịt bò, trứng, gochujang)', /bibimbap|cơm trộn kim chi/, { cats: ['Bibimbap'], search: ['bibimbap'], wiki: [['en', 'Bibimbap']], ov: ['bibimbap bowl', 'dolsot bibimbap'] }),
  T('kimbap', 'kimbap (cơm cuộn rong biển Hàn)', /kimbap/, { cats: ['Gimbap'], search: ['gimbap', 'kimbap'], wiki: [['en', 'Gimbap']], ov: ['gimbap korean rolls', 'kimbap'] }),
  T('mi-lanh-han', 'mì lạnh Hàn Quốc (naengmyeon)', /mì lạnh hàn/, { cats: ['Naengmyeon'], search: ['naengmyeon', 'korean cold noodles'], wiki: [['en', 'Naengmyeon']], ov: ['naengmyeon cold noodles korean'] }),
  T('mi-cay-han', 'mì cay Hàn Quốc (mì ăn liền cay)', /mì cay hàn/, { search: ['buldak ramen', 'spicy korean instant noodles'], wiki: [['en', 'Ramyeon']], ov: ['spicy korean ramyeon noodles', 'korean instant noodles'] }),
  T('canh-kim-chi', 'canh kim chi (kimchi jjigae)', /canh kim chi/, { cats: ['Kimchi-jjigae'], search: ['kimchi jjigae'], wiki: [['en', 'Kimchi-jjigae']], ov: ['kimchi jjigae stew'] }),
  T('chao-ca-han', 'chả cá Hàn Quốc (eomuk)', /chả cá hàn/, { cats: ['Eomuk'], search: ['eomuk', 'korean fish cake skewers'], wiki: [['en', 'Eomuk']], ov: ['korean fish cake eomuk skewers'] }),
  // ===== Dimsum / món Hoa =====
  T('xiu-mai', 'xíu mại (siu mai hấp)', /^xíu mại/, { cats: ['Shaomai', 'Siu mai'], search: ['siu mai', 'shumai dim sum'], wiki: [['en', 'Shumai']], ov: ['siu mai dim sum', 'shumai steamed'] }),
  T('chan-ga-hap', 'chân gà hấp tàu xì', /chân gà hấp/, { search: ['dim sum chicken feet', 'steamed chicken feet'], wiki: [['en', 'Chicken feet']], ov: ['dim sum steamed chicken feet'] }),
  T('suon-hap', 'sườn hấp tương đen (dimsum)', /sườn hấp/, { search: ['steamed pork ribs dim sum'], wiki: [['en', 'Dim sum']], ov: ['dim sum steamed spare ribs black bean'] }),
  T('banh-trung-nuong', 'bánh trứng nướng (egg tart)', /bánh trứng nướng/, { cats: ['Egg tarts', 'Dan tat'], search: ['egg tart', 'dan tat'], wiki: [['en', 'Egg tart']], ov: ['hong kong egg tart', 'egg tarts'] }),
  T('hoanh-thanh-chien', 'hoành thánh chiên (wonton chiên giòn)', /hoành thánh chiên/, { search: ['fried wonton', 'crispy wonton'], wiki: [['en', 'Wonton']], ov: ['fried wontons plate', 'crispy fried wonton'] }),
  // ===== Bánh ngọt / tráng miệng =====
  T('banh-kem-dau', 'bánh kem dâu tươi', /bánh kem dâu/, { cats: ['Strawberry cakes', 'Strawberry shortcake'], search: ['strawberry cream cake', 'strawberry shortcake'], wiki: [['en', 'Strawberry cream cake'], ['en', 'Shortcake']], ov: ['strawberry cream cake', 'strawberry shortcake cake'] }),
  T('banh-kem-socola', 'bánh kem socola', /bánh kem socola/, { cats: ['Chocolate cakes'], search: ['chocolate cake slice', 'chocolate birthday cake'], wiki: [['en', 'Chocolate cake']], ov: ['chocolate cake whole', 'chocolate birthday cake'] }),
  T('banh-mousse-xoai', 'bánh mousse xoài', /mousse xoài/, { search: ['mango mousse cake'], wiki: [['en', 'Mousse']], ov: ['mango mousse cake', 'mango mousse dessert'] }),
  T('banh-su-kem', 'bánh su kem', /su kem/, { cats: ['Cream puffs', 'Profiteroles'], search: ['cream puff', 'choux pastry'], wiki: [['en', 'Choux pastry'], ['en', 'Profiterole']], ov: ['cream puffs plate', 'choux cream puff'] }),
  T('cacao-nong', 'ly cacao nóng (có kem tươi)', /cacao nóng/, { cats: ['Hot chocolate'], search: ['hot chocolate whipped cream'], wiki: [['en', 'Hot chocolate']], ov: ['hot chocolate whipped cream mug'] }),
  // ===== Xôi / giò chả / bánh =====
  T('xoi', 'đĩa xôi (xôi nếp, xéo/ruốc/thịt kho)', /^xôi/, { cats: ['Xôi', 'Sticky rice dishes of Vietnam'], search: ['xôi', 'xôi xéo', 'xôi gà'], wiki: [['vi', 'xôi'], ['vi', 'xôi xéo']], ov: ['xoi vietnamese sticky rice', 'xoi xeo mung bean sticky rice'] }),
  T('gio-lua', 'giò lụa/chả lụa thái lát', /giò lụa|giò chả|chả lụa/, { cats: ['Giò lụa'], search: ['giò lụa', 'chả lụa'], wiki: [['vi', 'giò lụa']], ov: ['gio lua vietnamese pork sausage', 'cha lua vietnamese ham'] }),
  T('nem-cua-be', 'nem cua bể (nem rán Hải Phòng)', /nem cua bể|nem rán/, { search: ['nem cua bể', 'nem rán', 'nem cua be'], wiki: [['vi', 'nem rán']], ov: ['nem cua be fried spring rolls', 'nem ran hanoi'] }),
  T('banh-khuc', 'bánh khúc', /bánh khúc/, { search: ['bánh khúc'], wiki: [['vi', 'bánh khúc']], ov: ['banh khuc vietnamese cake'] }),
  T('goi-cuon-chay', 'gỏi cuốn chay (cuốn rau, bún, đậu hũ)', /gỏi cuốn chay/, { search: ['vegetarian spring rolls', 'gỏi cuốn'], wiki: [['vi', 'gỏi cuốn']], ov: ['vegetarian summer rolls tofu', 'vegetarian goi cuon'] }),
  // ===== Lẩu / nướng / cơm =====
  T('lau-thai', 'nồi lẩu (lẩu thái, lẩu hải sản, lẩu nấm) có nước dùng và nhiều nguyên liệu', /^lẩu (thái|nấm|gà|bò|kim chi|ly)/, { cats: ['Hot pot', 'Hot pot dishes'], search: ['tom yum hot pot', 'seafood hot pot', 'vietnamese hot pot'], wiki: [['en', 'Hot pot'], ['vi', 'lẩu']], ov: ['thai hot pot tom yum seafood', 'vietnamese lau hot pot'] }),
  T('com-nieu', 'cơm niêu (cơm trong niêu đất, cơm cháy)', /^cơm niêu/, { search: ['claypot rice', 'cơm niêu'], wiki: [['vi', 'cơm niêu'], ['en', 'Claypot rice']], ov: ['claypot rice vietnamese', 'clay pot rice com nieu'] }),
  T('com-ga-xoi-mo', 'cơm gà xối mỡ/chiên giòn/đùi', /^cơm gà (xối|chiên|đùi|sốt)/, { search: ['cơm gà xối mỡ', 'crispy fried chicken rice'], wiki: [['vi', 'cơm gà']], ov: ['com ga xoi mo crispy chicken rice', 'fried chicken leg with rice vietnamese'] }),
  T('ga-luoc', 'gà luộc nguyên con (da vàng) / gà ta', /gà đông tảo luộc|gà ta hấp/, { search: ['gà luộc', 'boiled chicken vietnamese'], wiki: [['vi', 'gà luộc'], ['vi', 'gà Đông Tảo']], ov: ['ga luoc vietnamese boiled chicken', 'vietnamese boiled chicken plate'] }),
  T('suon-nuong', 'sườn nướng (sườn heo nướng bóng mật ong)', /sườn nướng mật ong|sườn nướng thêm/, { search: ['grilled pork ribs', 'sườn nướng'], wiki: [['en', 'Spare ribs']], ov: ['grilled pork ribs honey glaze', 'vietnamese grilled pork ribs'] }),
  T('ba-chi-nuong', 'ba chỉ nướng (thịt ba chỉ nướng)', /ba chỉ nướng/, { search: ['grilled pork belly', 'samgyeopsal'], wiki: [['en', 'Samgyeopsal']], ov: ['grilled pork belly slices', 'samgyeopsal grilled pork belly'] }),
  T('nem-lui-nuong', 'nem lụi nướng (xiên sả nướng)', /nem lụi/, { search: ['nem lụi', 'lemongrass pork skewers'], wiki: [['vi', 'nem lụi'], ['vi', 'nem nướng']], ov: ['nem lui lemongrass pork skewers', 'vietnamese pork skewers lemongrass'] }),
  // ===== Mì Ý (theo sốt) =====
  T('mi-y-kem', 'mì Ý sốt kem (carbonara/alfredo/kem nấm/hải sản kem)', /spaghetti sốt kem|mì ý (sốt kem|hải sản sốt kem)|mì ý sốt kem hải sản|fettuccine/, { cats: ['Spaghetti alla carbonara', 'Fettuccine Alfredo'], search: ['fettuccine alfredo', 'spaghetti carbonara', 'mushroom cream pasta'], wiki: [['en', 'Fettuccine Alfredo'], ['en', 'Carbonara']], ov: ['creamy mushroom pasta', 'seafood cream pasta', 'fettuccine alfredo plate'] }),
  T('mi-y-hai-san', 'mì Ý hải sản (sốt cà/dầu olive, tôm mực nghêu)', /spaghetti hải sản|mì ý hải sản/, { cats: ['Spaghetti alle vongole', 'Seafood pasta'], search: ['seafood spaghetti', 'spaghetti alle vongole'], wiki: [['en', 'Spaghetti alle vongole']], ov: ['seafood spaghetti plate', 'spaghetti with shrimp and mussels'] }),
  T('spaghetti-ca-chua', 'spaghetti sốt cà chua (arrabbiata/napoli)', /spaghetti arrabbiata|mì ý chay sốt cà/, { cats: ['Spaghetti with tomato sauce'], search: ['spaghetti tomato sauce', 'spaghetti arrabbiata'], wiki: [['en', 'Spaghetti']], ov: ['spaghetti with tomato sauce plate', 'spaghetti arrabbiata'] }),
  T('pizza-bbq', 'pizza gà BBQ/nấm (pizza topping gà, nấm)', /pizza (bò bbq|gà nướng)/, { search: ['bbq chicken pizza', 'chicken mushroom pizza'], wiki: [['en', 'California-style pizza']], ov: ['bbq chicken pizza whole', 'chicken and mushroom pizza'] }),
  // ===== Đồ uống thêm =====
  T('tra-chanh-ca', 'ly trà chanh/trà tắc (ly trà đá có lát chanh/tắc)', /^trà (chanh|tắc|đá chanh)/, { search: ['iced lemon tea glass', 'trà chanh'], wiki: [['vi', 'trà chanh']], ov: ['vietnamese lemon tea glass', 'iced lemon tea slice'] }),
  T('soda-chanh-day', 'soda chanh dây (soda + chanh dây, hạt)', /soda chanh dây|trà chanh dây/, { search: ['passion fruit soda', 'passion fruit iced tea'], wiki: [['en', 'Passion fruit']], ov: ['passion fruit soda drink glass', 'passion fruit iced drink'] }),
  T('nuoc-cam-ca-rot', 'nước ép cam cà rốt/ nước cam (ly nước cam)', /nước (cam ép|ép cam cà rốt|cam ép)/, { search: ['orange carrot juice', 'orange juice glass'], wiki: [['en', 'Orange juice']], ov: ['orange carrot juice glass', 'fresh orange juice glass'] }),
  T('tra-sua-kem-cheese', 'trà sữa kem cheese (ly trà sữa phủ kem cheese)', /trà sữa kem cheese|trà sữa socola/, { search: ['cheese tea', 'cheese foam milk tea'], wiki: [['en', 'Bubble tea']], ov: ['cheese foam milk tea', 'bubble tea cup milk tea'] }),
  T('che-nhan', 'chè nhãn/chè hạt sen nước cốt dừa', /chè (nhãn|hạt sen|thái)/, { search: ['chè nhãn', 'chè hạt sen', 'longan sweet soup'], wiki: [['vi', 'chè']], ov: ['longan sweet soup dessert', 'che vietnamese dessert coconut milk'] })
];
