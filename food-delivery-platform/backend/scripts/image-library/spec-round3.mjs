/*
 * Đợt 3: tìm đa nguồn cho các món còn thiếu ảnh (Commons + ảnh trong bài Wikipedia vi/en + Openverse).
 *   wiki: [[ngôn ngữ, từ khoá bài Wikipedia]] — chỉ dùng với collect.mjs --wiki
 * Chỉ là ỨNG VIÊN: vẫn phải xem bằng mắt rồi mới ghi vào accept.json.
 */
const T = (key, must, match, sources = {}) => ({ key, must, match, ...sources });

export const ROUND3 = [
  // ===== Đồ uống =====
  T('tra-da', 'ly trà đá (ly trà đá lạnh màu hổ phách)', /^trà đá$/, { search: ['iced tea glass', 'trà đá'], wiki: [['en', 'iced tea']], ov: ['iced tea glass', 'tra da vietnamese iced tea'] }),
  T('tra-chanh', 'ly trà chanh (trà đá với chanh/lát chanh)', /^trà chanh$/, { search: ['iced lemon tea'], wiki: [['en', 'lemon tea']], ov: ['iced lemon tea glass', 'lemon tea'] }),
  T('tra-gung', 'tách/ly trà gừng (nước trà vàng, lát gừng)', /^trà gừng/, { search: ['ginger tea'], wiki: [['en', 'ginger tea']], ov: ['ginger tea cup', 'ginger tea'] }),
  T('nuoc-sam', 'ly nước sâm/nước thảo mộc nâu đỏ', /^nước sâm/, { search: ['nước sâm', 'nước mát'], wiki: [['vi', 'nước sâm']], ov: ['nuoc sam vietnamese herbal drink', 'vietnamese herbal tea cooling drink'] }),
  T('tra-vai', 'ly trà vải (trà đá có trái vải)', /^trà vải/, { search: ['lychee tea'], wiki: [['en', 'lychee tea']], ov: ['lychee iced tea glass'] }),
  T('tra-chanh-day', 'ly trà/soda chanh dây (chanh dây, hạt đen)', /chanh dây/, { search: ['passion fruit tea', 'passion fruit soda'], wiki: [['vi', 'chanh dây']], ov: ['passion fruit iced tea glass', 'passion fruit soda'] }),
  T('tra-hoa-cuc', 'tách trà hoa cúc (hoa cúc nổi trong nước trà vàng)', /^trà hoa cúc/, { search: ['chrysanthemum tea'], wiki: [['en', 'chrysanthemum tea']], ov: ['chrysanthemum tea glass'] }),
  T('tra-gao-lut', 'ly/tách trà gạo lứt rang (gạo rang, nước trà vàng nâu)', /trà gạo lứt/, { search: ['genmaicha', 'roasted brown rice tea'], wiki: [['en', 'genmaicha']], ov: ['genmaicha brown rice tea cup'] }),
  T('tra-sen', 'trà sen (tách trà với nụ/hoa sen)', /^trà sen/, { search: ['lotus tea'], wiki: [['en', 'lotus tea']], ov: ['lotus tea cup'] }),
  T('nuoc-ep-oi', 'ly nước ép ổi (hồng nhạt/đục, ổi)', /nước ép ổi/, { search: ['guava juice'], wiki: [['en', 'guava juice']], ov: ['guava juice glass'] }),
  T('nuoc-ep-dua-thom', 'ly nước ép dứa (vàng, có dứa)', /nước ép dứa/, { search: ['pineapple juice glass'], wiki: [['en', 'pineapple juice']], ov: ['pineapple juice glass', 'fresh pineapple juice'] }),
  T('nuoc-ep-can-tay', 'ly nước ép cần tây táo (xanh lá)', /nước ép cần tây/, { search: ['celery juice'], wiki: [['en', 'celery juice']], ov: ['celery apple green juice glass'] }),
  T('sinh-to-mang-cau', 'ly sinh tố mãng cầu', /sinh tố mãng cầu/, { search: ['soursop smoothie', 'soursop juice'], wiki: [['en', 'soursop']], ov: ['soursop smoothie glass'] }),
  T('sinh-to-chuoi', 'ly sinh tố chuối', /sinh tố chuối/, { search: ['banana smoothie'], wiki: [['en', 'banana smoothie']], ov: ['banana oat smoothie glass', 'banana smoothie'] }),
  T('sinh-to-thap-cam', 'ly sinh tố nhiều loại trái cây', /sinh tố thập cẩm/, { search: ['fruit smoothie'], wiki: [['en', 'smoothie']], ov: ['mixed fruit smoothie glass'] }),
  T('sinh-to-sapoche', 'ly sinh tố sapoche (nâu)', /sinh tố sapoche/, { search: ['sapodilla'], wiki: [['vi', 'hồng xiêm']], ov: ['sapodilla smoothie sapota milkshake'] }),
  T('detox', 'ly nước detox (nước trái cây/rau củ trong, lát dưa leo/cam)', /nước detox/, { search: ['infused water', 'detox water'], wiki: [['en', 'infused water']], ov: ['detox water cucumber lemon glass', 'infused water pitcher'] }),
  T('cold-brew-cam', 'ly cold brew/cà phê đá', /cold brew/, { search: ['cold brew coffee'], wiki: [['en', 'cold brew']], ov: ['cold brew coffee glass ice orange'] }),
  T('tra-sua-socola', 'ly trà sữa socola', /trà sữa socola/, { search: ['chocolate milk tea'], ov: ['chocolate bubble tea', 'chocolate milk tea'] }),
  T('socola-da-xay', 'ly socola/cookie đá xay (kem, bột cacao)', /(socola|cookie) đá xay/, { search: ['frappuccino chocolate', 'chocolate frappé'], wiki: [['en', 'frappuccino']], ov: ['chocolate frappe whipped cream', 'cookies and cream frappe'] }),
  T('ca-phe-sua-nong', 'cà phê sữa (ly/tách cà phê sữa)', /cà phê sữa nóng/, { search: ['cà phê sữa', 'Vietnamese coffee'], wiki: [['vi', 'cà phê sữa đá']], ov: ['vietnamese coffee phin condensed milk'] }),
  T('bia-tiger', 'lon bia Tiger', /bia lon tiger/, { search: ['Tiger beer can', 'Tiger Beer'], wiki: [['en', 'Tiger Beer']], ov: ['tiger beer can', 'tiger beer'] }),
  T('nuoc-ngot-lon', 'lon nước ngọt có ga', /^nước ngọt lon/, { search: ['soft drink cans'], wiki: [['en', 'soft drink']], ov: ['soda cans'] }),
  T('sua-hat', 'ly sữa hạt óc chó (sữa trắng ngà + óc chó)', /sữa hạt/, { search: ['walnut milk', 'nut milk'], wiki: [['en', 'walnut milk'], ['en', 'nut milk']], ov: ['walnut milk glass', 'nut milk glass walnuts'] }),
  T('sua-chua-trai-cay', 'sữa chua trái cây (cốc sữa chua + trái cây)', /sữa chua trái cây/, { search: ['yogurt fruit', 'fruit yogurt parfait'], wiki: [['en', 'frozen yogurt']], ov: ['yogurt with fresh fruit cup', 'fruit yogurt parfait'] }),

  // ===== Tráng miệng / chè =====
  T('rau-cau', 'rau câu (thạch rau câu nhiều màu, dừa)', /^rau câu/, { cats: ['Agar jelly'], search: ['rau câu', 'agar jelly dessert'], wiki: [['vi', 'rau câu']], ov: ['rau cau coconut jelly', 'agar agar jelly dessert'] }),
  T('sua-chua-nep-cam', 'sữa chua nếp cẩm (sữa chua trắng, nếp cẩm tím đen)', /sữa chua nếp cẩm/, { search: ['sữa chua nếp cẩm', 'nếp cẩm'], wiki: [['vi', 'nếp cẩm']], ov: ['sua chua nep cam yogurt purple sticky rice'] }),
  T('che-bap', 'chè bắp (chè ngô nước cốt dừa)', /^chè bắp/, { search: ['chè bắp', 'chè ngô'], wiki: [['vi', 'chè bắp']], ov: ['che bap corn sweet pudding coconut'] }),
  T('che-dau-xanh', 'chè đậu xanh', /^chè đậu xanh/, { search: ['chè đậu xanh', 'mung bean sweet soup'], wiki: [['vi', 'chè đậu xanh']], ov: ['che dau xanh mung bean dessert'] }),
  T('che-hat-sen', 'chè hạt sen', /^chè hạt sen/, { search: ['chè hạt sen', 'lotus seed dessert'], wiki: [['vi', 'chè hạt sen']], ov: ['che hat sen lotus seed sweet soup'] }),
  T('che-thai-2', 'chè Thái (trái cây, thạch, nước cốt dừa, mít)', /^chè thái/, { search: ['chè thái', 'Thai dessert fruit coconut'], wiki: [['vi', 'chè thái']], ov: ['che thai vietnamese dessert fruit jelly coconut milk'] }),
  T('kem', 'ly/cây kem', /^kem /, { cats: ['Ice cream'], search: ['coconut ice cream', 'kem dừa'], wiki: [['vi', 'kem'], ['en', 'coconut ice cream']], ov: ['coconut ice cream scoops in coconut shell', 'ice cream cup'] }),
  T('chao-yen-mach', 'tô cháo yến mạch (oatmeal)', /cháo yến mạch/, { cats: ['Oatmeal'], search: ['oatmeal porridge'], wiki: [['en', 'porridge']], ov: ['oatmeal porridge bowl'] }),

  // ===== Bánh / món vặt =====
  T('banh-nam', 'bánh nậm (bánh gói lá chuối dẹt)', /^bánh nậm/, { search: ['bánh nậm'], wiki: [['vi', 'bánh nậm']], ov: ['banh nam steamed rice cake banana leaf'] }),
  T('banh-gio', 'bánh giò (bánh gói lá chuối hình chóp)', /^bánh giò/, { search: ['bánh giò'], wiki: [['vi', 'bánh giò']], ov: ['banh gio vietnamese pyramid rice dumpling'] }),
  T('banh-ram-it', 'bánh ram ít (bánh ram chiên giòn + bánh ít nếp)', /^bánh ram ít/, { search: ['bánh ram ít', 'bánh ít'], wiki: [['vi', 'bánh ít']], ov: ['banh ram it'] }),
  T('banh-bao', 'bánh bao hấp (bánh bao trắng tròn)', /^bánh bao( bánh vạc)?$/, { search: ['bánh bao', 'baozi steamed bun'], wiki: [['vi', 'bánh bao'], ['en', 'baozi']], ov: ['banh bao steamed bun vietnamese'] }),
  T('banh-bao-chien', 'bánh bao chiên (đáy vàng giòn)', /bánh bao chiên/, { search: ['shengjian mantou', 'pan-fried baozi'], wiki: [['en', 'shengjian mantou']], ov: ['pan fried pork buns shengjianbao'] }),
  T('banh-trang-cuon', 'bánh tráng cuốn thịt heo (thịt heo luộc, rau, bún cuốn bánh tráng)', /bánh tráng cuốn thịt heo/, { search: ['bánh tráng cuốn thịt heo'], wiki: [['vi', 'bánh tráng cuốn thịt heo']], ov: ['banh trang cuon thit heo da nang pork rice paper rolls'] }),
  T('banh-trang-nuong2', 'bánh tráng nướng (bánh tráng nướng trứng, hành, tôm khô)', /bánh tráng nướng/, { search: ['bánh tráng nướng'], wiki: [['vi', 'bánh tráng nướng']], ov: ['banh trang nuong vietnamese pizza grilled rice paper'] }),
  T('cha-gio-chay', 'chả giò chay (chả giò chiên vàng)', /chả giò chay/, { cats: ['Chả giò'], search: ['chả giò', 'spring rolls fried'], wiki: [['vi', 'chả giò']], ov: ['fried spring rolls vietnamese cha gio'] }),
  T('nem-nuong', 'nem nướng Nha Trang (nem nướng, bánh tráng, rau, nước chấm)', /nem nướng/, { search: ['nem nướng'], wiki: [['vi', 'nem nướng']], ov: ['nem nuong nha trang grilled pork sausage rice paper'] }),
  T('khoai-chien-pho-mai', 'khoai tây chiên phô mai (khoai chiên phủ phô mai chảy)', /khoai chiên phô mai/, { search: ['cheese fries', 'chili cheese fries'], wiki: [['en', 'cheese fries']], ov: ['cheese fries loaded', 'cheese fries'] }),
  T('khoai-lang', 'khoai lang nướng/kén (khoai lang vàng cam)', /khoai lang/, { search: ['sweet potato baked', 'khoai lang nướng'], wiki: [['en', 'sweet potato']], ov: ['roasted sweet potato', 'khoai lang nuong'] }),
  T('bap-xao', 'bắp xào (bắp ngô xào bơ, tép khô)', /^bắp xào/, { search: ['bắp xào', 'sweet corn kernels'], wiki: [['vi', 'bắp xào']], ov: ['bap xao stir fried corn vietnamese street snack'] }),
  T('trung-cut-nuong', 'trứng cút nướng (xiên trứng cút)', /trứng cút/, { search: ['quail eggs grilled', 'quail egg skewers'], wiki: [['en', 'quail egg']], ov: ['grilled quail eggs skewers', 'quail eggs'] }),
  T('oc-len', 'ốc len xào dừa (ốc nhỏ xào nước cốt dừa)', /ốc len/, { search: ['ốc len', 'ốc'], wiki: [['vi', 'ốc len']], ov: ['oc len sauteed snails coconut', 'vietnamese snails dish'] }),
  T('ca-vien-chien', 'cá viên chiên (viên chiên xiên que)', /cá viên chiên/, { search: ['fish ball fried', 'cá viên'], wiki: [['en', 'fish ball']], ov: ['fried fish balls skewers street food'] }),

  // ===== Hải sản / thịt / cá =====
  T('tom-chien', 'tôm chiên giòn (tôm tẩm bột chiên vàng)', /^tôm chiên giòn/, { search: ['fried shrimp', 'tempura shrimp'], wiki: [['en', 'fried shrimp'], ['en', 'ebi fry']], ov: ['crispy fried shrimp plate', 'breaded fried shrimp'] }),
  T('tom-nuong', 'tôm nướng muối ớt (tôm nướng nguyên con)', /^tôm nướng/, { search: ['grilled prawns', 'grilled shrimp'], wiki: [['en', 'grilled shrimp']], ov: ['grilled prawns plate', 'grilled shrimp salt chili'] }),
  T('bach-tuoc-nuong', 'bạch tuộc nướng', /bạch tuộc nướng/, { search: ['grilled octopus'], wiki: [['en', 'octopus as food']], ov: ['grilled octopus plate', 'grilled baby octopus'] }),
  T('muc-xao', 'mực xào (mực xào rau củ)', /^mực xào/, { search: ['stir-fried squid'], wiki: [['en', 'squid as food']], ov: ['stir fried squid vegetables', 'squid stir fry'] }),
  T('canh-ga-nuong', 'cánh gà nướng (gà cánh nướng vàng)', /cánh gà nướng|gà cánh nướng/, { cats: ['Chicken wings'], search: ['grilled chicken wings'], wiki: [['en', 'chicken wing']], ov: ['grilled chicken wings plate', 'bbq chicken wings'] }),
  T('canh-ga-chien-nm', 'cánh gà chiên nước mắm (cánh gà chiên bóng, tỏi)', /cánh gà chiên nước mắm/, { search: ['fried chicken wings fish sauce', 'chicken wings'], wiki: [['en', 'chicken wing']], ov: ['fish sauce chicken wings vietnamese', 'fried chicken wings garlic glazed'] }),
  T('ga-nuong', 'gà nướng muối ớt (gà nướng nguyên miếng/đùi)', /^gà nướng muối ớt|^cơm gà nướng/, { search: ['grilled chicken', 'roast chicken'], wiki: [['en', 'roast chicken']], ov: ['grilled chicken legs plate', 'roasted chicken'] }),
  T('ga-sot', 'gà sốt (gà chiên/rim phủ sốt, phô mai/mật ong)', /^gà sốt/, { search: ['glazed chicken', 'honey garlic chicken'], wiki: [['en', "general tso's chicken"]], ov: ['honey glazed chicken', 'sticky sauce chicken pieces'] }),
  T('heo-quay', 'heo quay da giòn (thịt ba chỉ quay)', /heo quay/, { search: ['siu yuk', 'roast pork belly'], wiki: [['en', 'siu yuk'], ['vi', 'heo quay']], ov: ['crispy roast pork belly siu yuk', 'heo quay vietnamese roast pork'] }),
  T('bo-nuong-la-lot', 'bò nướng lá lốt (cuốn bò lá lốt nướng)', /bò nướng lá lốt/, { search: ['bò lá lốt', 'bò nướng lá lốt'], wiki: [['vi', 'bò nướng lá lốt']], ov: ['bo la lot beef wrapped betel leaf grilled'] }),
  T('ca-kho', 'cá kho tộ / cá kho (cá kho nước màu trong nồi đất)', /cá (chay )?kho tộ/, { search: ['cá kho tộ'], wiki: [['vi', 'cá kho tộ']], ov: ['ca kho to braised fish clay pot vietnamese'] }),
  T('ca-chien', 'cá chiên sả ớt (cá nguyên con chiên vàng)', /cá chiên/, { search: ['fried fish whole'], wiki: [['en', 'fried fish']], ov: ['whole fried fish lemongrass chili', 'crispy fried whole fish'] }),
  T('thit-rim', 'thịt rim (thịt ba chỉ kho/rim mặn ngọt)', /thịt rim|cơm tôm rim/, { search: ['thịt kho', 'thịt kho tàu', 'braised pork belly'], wiki: [['vi', 'thịt kho tàu']], ov: ['thit kho braised pork belly eggs vietnamese'] }),
  T('trung-chien', 'trứng chiên (trứng tráng / ốp la)', /^trứng (chiên|ốp la)/, { cats: ['Fried eggs', 'Omelettes'], search: ['fried egg', 'omelette'], wiki: [['en', 'fried egg'], ['en', 'omelette']], ov: ['fried egg plate', 'omelette plate'] }),

  // ===== Cơm =====
  T('com-rang', 'đĩa cơm rang/cơm chiên (hạt cơm vàng, thịt, rau)', /^cơm (rang|chiên)/, { search: ['fried rice', 'cơm rang'], wiki: [['vi', 'cơm rang'], ['en', 'fried rice']], ov: ['vietnamese fried rice beef', 'fried rice plate'] }),
  T('com-tam-2', 'cơm tấm (cơm tấm sườn/gà/chả, đồ chua)', /^cơm tấm/, { cats: ['Cơm tấm'], search: ['cơm tấm'], wiki: [['vi', 'cơm tấm']], ov: ['com tam broken rice grilled chicken', 'com tam suon'] }),
  T('com-hen', 'cơm hến (cơm nguội, hến xào, rau, ruốc)', /^cơm hến/, { search: ['cơm hến'], wiki: [['vi', 'cơm hến']], ov: ['com hen baby clam rice hue'] }),
  T('com-van-phong', 'khay cơm nhiều món (cơm, thịt, rau, canh)', /cơm văn phòng|cơm chay thập cẩm/, { search: ['bento', 'cơm phần'], wiki: [['en', 'bento']], ov: ['rice meal tray three dishes vegetables meat', 'vietnamese lunch rice set'] }),
  T('com-chien-chay', 'cơm chiên chay (cơm chiên rau củ, đậu, nấm)', /cơm chiên dương châu chay/, { search: ['vegetable fried rice'], ov: ['vegetarian fried rice vegetables'] }),
  T('com-ga-2', 'đĩa cơm gà (xối mỡ/chiên giòn/xé/đùi/sốt) — gà + cơm', /^cơm gà (xé|thập cẩm|trứng|lòng)/, { search: ['cơm gà', 'Hainanese chicken rice'], wiki: [['vi', 'cơm gà Hội An'], ['en', 'Hainanese chicken rice']], ov: ['com ga hoi an chicken rice', 'chicken rice plate vietnamese'] }),

  // ===== Gỏi / salad / đồ chua =====
  T('salad-bap-cai', 'salad bắp cải/rau trộn (bắp cải, cà rốt trộn)', /salad bắp cải|gỏi gà bắp cải/, { search: ['coleslaw', 'cabbage salad'], wiki: [['en', 'coleslaw']], ov: ['cabbage carrot salad bowl', 'coleslaw'] }),
  T('goi-ga', 'gỏi gà (gà xé, bắp cải/hành tây, rau răm)', /^gỏi gà$/, { search: ['gỏi gà'], wiki: [['vi', 'gỏi gà']], ov: ['goi ga chicken cabbage salad vietnamese'] }),
  T('goi-ngo-sen', 'gỏi ngó sen (ngó sen, tôm, thịt, rau)', /gỏi ngó sen/, { search: ['gỏi ngó sen', 'lotus root salad'], wiki: [['vi', 'gỏi ngó sen']], ov: ['goi ngo sen lotus stem salad shrimp'] }),
  T('goi-kho-bo', 'gỏi khô bò (đu đủ bào, khô bò, rau răm)', /gỏi khô bò/, { search: ['gỏi khô bò'], wiki: [['vi', 'gỏi khô bò']], ov: ['goi kho bo papaya salad beef jerky'] }),
  T('do-chua', 'đồ chua / dưa chua / dưa muối (dưa góp, cà rốt củ cải muối)', /đồ chua|dưa (chua|muối|góp)/, { search: ['đồ chua', 'dưa góp', 'pickled carrot daikon', 'dưa chua'], wiki: [['vi', 'đồ chua'], ['vi', 'dưa muối']], ov: ['do chua pickled carrot daikon vietnamese', 'pickled vegetables bowl', 'dua chua pickled mustard greens'] }),
  T('rau-song', 'rau sống / bắp chuối (đĩa rau sống, hoa chuối bào)', /rau sống/, { search: ['rau sống', 'rau thơm', 'herb plate'], wiki: [['vi', 'rau sống'], ['en', 'banana flower']], ov: ['vietnamese fresh herbs platter', 'banana blossom salad shredded'] }),

  // ===== Bún / phở / mì / miến / cháo / súp / canh =====
  T('mi-xa-xiu', 'mì xá xíu (mì trứng, thịt xá xíu đỏ) / mì vịt tiềm', /mì xá xíu/, { search: ['char siu noodles', 'wonton noodles'], wiki: [['en', 'char siu']], ov: ['char siu pork noodle soup', 'braised duck noodle soup'] }),
  T('mi-xao-chay', 'mì xào rau củ (mì xào, rau, nấm)', /mì xào rau củ/, { search: ['chow mein', 'stir-fried noodles'], wiki: [['en', 'chow mein']], ov: ['vegetable stir fried noodles'] }),
  T('mien-luon', 'miến (lươn/gà/cua) (miến nước, thịt)', /miến lươn/, { search: ['miến lươn', 'miến gà', 'miến'], wiki: [['vi', 'miến'], ['vi', 'miến gà']], ov: ['mien luon eel glass noodle soup', 'mien ga glass noodle chicken vietnamese'] }),
  T('bun-gio-heo', 'bún giò heo / bún riêu chay / bún Huế chay (bún nước)', /bún giò heo|bún chay riêu|bún huế chay/, { search: ['bún giò heo', 'bún'], wiki: [['vi', 'bún bò Huế']], ov: ['bun gio heo pork knuckle noodle soup'] }),
  T('pho-tron', 'phở trộn / phở chay (phở khô trộn hoặc phở nước chay)', /phở (trộn|chay)/, { search: ['phở trộn', 'phở chay', 'phở'], wiki: [['vi', 'phở']], ov: ['pho tron dry mixed pho beef peanuts', 'vegetarian pho mushrooms'] }),
  T('hu-tieu-go', 'hủ tiếu gõ / hủ tiếu mực (nước trong, hủ tiếu, thịt/mực)', /hủ tiếu (gõ|mực)/, { search: ['hủ tiếu gõ', 'hủ tiếu'], wiki: [['vi', 'hủ tiếu']], ov: ['hu tieu go noodle soup street vendor saigon'] }),
  T('banh-canh-cha-ca', 'bánh canh chả cá (sợi bánh to, chả cá, nước sệt)', /bánh canh chả cá/, { search: ['bánh canh chả cá', 'bánh canh'], wiki: [['vi', 'bánh canh']], ov: ['banh canh cha ca fish cake thick noodle soup'] }),
  T('mi-quang-ech', 'mì Quảng (ếch/gà) (mì bản to, ít nước, bánh tráng)', /mì quảng/, { cats: ['Mì Quảng'], search: ['mì Quảng'], wiki: [['vi', 'mì Quảng']], ov: ['mi quang quang noodles', 'mi quang ga'] }),
  T('chao-hau', 'cháo hàu / cháo cá / cháo trắng (cháo trắng, hàu/cá)', /cháo hàu/, { search: ['cháo cá', 'congee', 'cháo'], wiki: [['vi', 'cháo'], ['en', 'congee']], ov: ['congee oyster', 'rice porridge fish congee bowl'] }),
  T('chao-ga', 'tô cháo (gà/sườn/lòng/thịt bằm)', /^cháo (gà|lòng)/, { search: ['cháo gà', 'cháo lòng', 'cháo'], wiki: [['vi', 'cháo'], ['vi', 'cháo lòng']], ov: ['chao ga chicken congee vietnamese', 'chao long congee offal'] }),
  T('suop-cua', 'súp cua / súp (bát súp sệt, cua/bắp/nấm)', /^súp (cua|bắp)/, { search: ['crab soup', 'corn soup', 'súp cua'], wiki: [['vi', 'súp cua'], ['en', 'crab bisque']], ov: ['crab and corn soup', 'egg drop soup mushroom'] }),
  T('canh-rong-bien', 'canh rong biển / canh rau củ (bát canh nước trong)', /canh rong biển/, { search: ['miyeok guk', 'seaweed soup', 'vegetable soup'], wiki: [['en', 'miyeok-guk']], ov: ['seaweed soup bowl', 'clear vegetable soup bowl vietnamese canh'] }),
  T('rau-xao', 'món chay xào (rau xào, nấm xào, đậu hũ chiên)', /rau xào thập cẩm/, { search: ['stir-fried vegetables', 'mushroom stir-fry', 'fried tofu'], wiki: [['en', 'stir frying'], ['en', 'tofu']], ov: ['stir fried mixed vegetables plate', 'stir fried king oyster mushrooms', 'fried tofu lemongrass chili'] }),

  // ===== Bánh mì / Tây =====
  T('banh-mi-chao', 'bánh mì chảo / ốp la / xíu mại / cá hộp (ổ bánh mì ăn kèm)', /bánh mì chảo/, { cats: ['Bánh mì'], search: ['bánh mì chảo', 'bánh mì xíu mại', 'bánh mì'], wiki: [['vi', 'bánh mì']], ov: ['banh mi op la fried egg vietnamese sandwich', 'banh mi xiu mai meatball'] }),
  T('spaghetti-sot', 'đĩa spaghetti/mì ý sốt (arrabbiata, hải sản, kem nấm, pesto)', /pesto/, { cats: ['Spaghetti'], search: ['spaghetti arrabbiata', 'spaghetti seafood', 'fettuccine', 'pesto pasta', 'linguine'], wiki: [['en', 'arrabbiata sauce'], ['en', 'pesto'], ['en', 'fettuccine'], ['en', 'linguine']], ov: ['spaghetti arrabbiata plate', 'seafood spaghetti cream sauce', 'mushroom cream fettuccine', 'chicken pesto pasta', 'shrimp linguine pesto'] }),
  T('penne', 'đĩa penne (penne sốt cà chua/kem/amatriciana)', /penne/, { cats: ['Penne'], search: ['penne arrabbiata', "penne all'amatriciana", 'penne pasta tomato'], wiki: [['en', 'penne'], ['it', 'amatriciana']], ov: ['penne tomato sauce chicken', 'penne pasta cream tomato', 'penne all amatriciana'] }),
  T('pizza-diavola', 'pizza cay/bò BBQ/gà nướng nấm (pizza có topping tương ứng)', /pizza diavola/, { cats: ['Pizza diavola', 'Pizza'], search: ['pizza diavola', 'pizza salame piccante', 'bbq chicken pizza', 'pepperoni pizza'], wiki: [['en', 'pizza'], ['en', 'barbecue chicken pizza']], ov: ['pizza diavola spicy salami', 'bbq beef pizza', 'chicken mushroom pizza'] }),
  T('burger-tom', 'burger tôm / burger combo (bánh burger có nhân)', /burger tôm|combo burger/, { cats: ['Hamburgers'], search: ['shrimp burger', 'fish burger', 'burger'], wiki: [['en', 'shrimp burger'], ['en', 'hamburger']], ov: ['shrimp burger', 'chicken burger'] }),
  T('burger-chay', 'burger nấm chay (burger nấm/rau)', /burger nấm/, { search: ['portobello mushroom burger', 'veggie burger'], wiki: [['en', 'veggie burger']], ov: ['mushroom burger vegetarian', 'portobello burger'] }),
  T('sandwich-ga', 'sandwich gà (bánh sandwich kẹp gà, rau)', /sandwich/, { cats: ['Sandwiches'], search: ['chicken sandwich', 'grilled chicken sandwich'], wiki: [['en', 'chicken sandwich']], ov: ['grilled chicken sandwich', 'chicken sandwich'] })
];

// Các loại đã bị loại ở đợt 1–2 (chưa có ảnh đúng): thêm nguồn Wikipedia để tìm lại
export const WIKI_RETRY = {
  'pho-cuon': [['vi', 'phở cuốn']], 'bun-thang': [['vi', 'bún thang']], 'bun-oc': [['vi', 'bún ốc']], 'mi-quang': [['vi', 'mì Quảng']],
  'banh-mi-op-la': [['vi', 'bánh mì']], 'banh-trang-nuong': [['vi', 'bánh tráng nướng']], 'che-thai': [['vi', 'chè thái']],
  'cold-brew': [['en', 'cold brew']], 'matcha': [['en', 'matcha']], 'nuoc-ep-cam': [['en', 'orange juice']], 'nuoc-ep-dua': [['en', 'pineapple juice']],
  'tra-dao': [['en', 'peach tea']], 'kem-dua': [['en', 'coconut ice cream']], 'com-ga': [['vi', 'cơm gà Hội An']], 'ca-phe-dua': [['vi', 'cà phê cốt dừa']],
  'cacao': [['en', 'hot chocolate']], 'nem-lui': [['vi', 'nem lụi']], 'nem-chua-ran': [['vi', 'nem chua rán']], 'bi-cuon': [['vi', 'bì cuốn']],
  'mien': [['vi', 'miến']], 'banh-canh': [['vi', 'bánh canh']], 'dau-hu-sot-ca': [['vi', 'đậu phụ sốt cà chua']]
};
