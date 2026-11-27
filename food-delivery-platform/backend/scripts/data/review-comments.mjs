/*
 * Bộ sinh bình luận đánh giá THEO LOẠI MÓN / LOẠI QUÁN (không dùng một câu chung cho mọi món):
 *  - động từ đúng loại: đồ uống → "uống", món ăn → "ăn" (đơn vị: ly / tô / phần …)
 *  - nhiệt độ đúng loại: đồ uống lạnh → "mát lạnh, đá chưa tan"; món nước → "nóng hổi"; đồ chiên/bánh mì → "còn giòn"
 *  - chi tiết đặc trưng từng món (trân châu, nước dùng, đế pizza, da gà…)
 * Hàm nhận `rnd` (0..1) để kết quả lặp lại được khi chạy cùng seed.
 */

const pick = (rnd, list) => list[Math.floor(rnd() * list.length)];
const cap = text => text.charAt(0).toUpperCase() + text.slice(1);
const EMOJI = ['😋', '👍', '❤️', '🥰', '👌', '🔥'];

/* Nhiệt độ khi giao → cụm nói về chất lượng giao tới */
const DELIVERY = {
  hot: { good: ['giao tới vẫn còn nóng hổi', 'đồ còn ấm nóng khi nhận', 'tới tay vẫn nóng sốt'], bad: ['giao tới đã nguội ngắt', 'nhận hàng thì đồ nguội hết rồi', 'đồ nguội, phải hâm lại mới ăn được'] },
  cold: { good: ['giao tới vẫn còn mát lạnh', 'đá chưa tan hết khi nhận', 'tới tay vẫn lạnh, uống rất đã'], bad: ['đá tan gần hết nên uống bị nhạt', 'giao tới không còn lạnh nữa', 'nhận hàng thì đá đã tan, vị loãng'] },
  warm: { good: ['giao tới vẫn còn ấm', 'uống vẫn còn nóng ấm', 'tới tay vẫn ấm, uống rất dễ chịu'], bad: ['giao tới đã nguội', 'nhận hàng thì không còn ấm nữa'] },
  crispy: { good: ['giao tới vẫn còn giòn', 'đóng hộp thoáng nên không bị mềm', 'vẫn giòn rụm khi nhận'], bad: ['giao tới bị mềm, hết giòn', 'để hơi lâu nên mất độ giòn', 'bị ỉu vì đóng kín hơi hơi nhiều'] },
  room: { good: ['đóng gói gọn gàng, không bị đổ', 'giao tới vẫn tươi ngon', 'đóng gói cẩn thận, sạch sẽ'], bad: ['đóng gói sơ sài, bị xô lệch', 'giao tới bị đổ ra một chút', 'hộp bị móp khi nhận'] }
};

/*
 * Mỗi profile: match (tên món viết thường), verb, unit, temp, pos (điểm tốt), mild (chê nhẹ), neg (chê nặng).
 * Thứ tự quan trọng: khớp đầu tiên thắng. Các profile đồ uống đặt trước món ăn.
 */
const P = (key, match, verb, unit, temp, pos, mild, neg) => ({ key, match, verb, unit, temp, pos, mild, neg });

export const PROFILES = [
  // ===== Đồ uống =====
  P('tra-sua', /trà sữa|sữa tươi trân châu|trân châu/, 'uống', 'ly', 'cold',
    ['trà thơm, vị sữa béo vừa phải', 'trân châu dai mềm, thơm mùi đường đen', 'ngọt vừa đúng như mình dặn', 'ly đầy đặn, nhiều topping', 'vị trà đậm, không bị loãng', 'sữa béo ngậy mà không bị ngấy', 'ít đá đúng yêu cầu, uống rất đã'],
    ['hơi ngọt so với khẩu vị của mình', 'trân châu hơi ít một chút', 'vị trà hơi nhạt', 'ít đá mà vẫn nhiều đá hơn mong đợi'],
    ['trà nhạt, vị sữa quá gắt', 'trân châu cứng, không được dẻo', 'ngọt gắt, uống một lúc là ngán', 'ly không đầy như hình', 'uống có vị hơi lạ, không giống mọi lần']),
  P('tra-trai-cay', /^trà (đào|vải|dâu|chanh|xoài|tắc|hoa|gừng|gạo|sen|đá|nhài|xanh)|trà xanh matcha|trà đào|trà chanh|trà tắc|trà dâu|trà xoài|trà vải|trà hoa cúc/, 'uống', 'ly', 'cold',
    ['trà thơm mùi trái cây, vị chua ngọt cân bằng', 'topping tươi, nhiều miếng đào/cam', 'thanh mát, uống giải nhiệt rất tốt', 'không quá ngọt, uống không bị ngán', 'vị trà rõ, hậu ngọt nhẹ', 'ly đầy đặn, trái cây tươi'],
    ['hơi chua so với mình', 'topping hơi ít', 'vị trà hơi nhạt'],
    ['trà nhạt như pha nhiều nước', 'trái cây không tươi', 'chua gắt, khó uống', 'ngọt quá mức']),
  P('tra-nong', /trà gừng|nước sâm|nước vối|trà sen|trà hoa cúc|sữa đậu nành (nóng)?$|nước sâm|trà gạo lứt|trà hoa cúc táo đỏ/, 'uống', 'ly', 'warm',
    ['vị thanh, uống ấm bụng rất dễ chịu', 'nấu đúng vị, không quá ngọt', 'thơm mùi thảo mộc, uống nhẹ nhàng', 'uống vào buổi tối rất hợp'],
    ['hơi ngọt một chút', 'mùi hơi nhạt'], ['vị nhạt như nước lọc', 'ngọt gắt, không thấy mùi đặc trưng']),
  P('ca-phe', /cà phê|bạc xỉu|americano|latte|cappuccino|cold brew|cacao/, 'uống', 'ly', 'cold',
    ['cà phê đậm đà, thơm đúng vị', 'vị đắng vừa, hậu ngọt béo', 'pha chuẩn, không bị chua', 'lớp bọt mịn, uống rất cuốn', 'hương thơm rất rõ, tỉnh cả người'],
    ['hơi đắng so với khẩu vị của mình', 'hơi ngọt hơn mình nghĩ', 'đá hơi nhiều'],
    ['cà phê nhạt, vị như pha loãng', 'chua và đắng gắt', 'ngọt quá, mất vị cà phê', 'ly thiếu so với hình']),
  P('nuoc-ep', /nước ép|nước detox|nước cam|nước mía|nước dừa|sữa hạt/, 'uống', 'ly', 'cold',
    ['nước ép tươi, không pha nhiều đường', 'vị trái cây rất thật, uống mát', 'ép nguyên chất, không bị ngọt gắt', 'đầy ly, uống rất đã khát', 'không có cặn, uống thanh vị'],
    ['hơi ngọt so với mình', 'hơi ít đá nên không đủ lạnh', 'vị hơi nhạt'],
    ['nước ép loãng, như pha thêm nước', 'có vị lạ, không tươi', 'ngọt gắt chắc pha nhiều đường']),
  P('sinh-to', /sinh tố|đá xay|matcha đá xay|socola đá xay|cookie đá xay/, 'uống', 'ly', 'cold',
    ['xay mịn, đặc vừa, uống rất đã', 'vị béo thơm, trái cây tươi', 'không bị tách nước, ngọt vừa', 'ly đầy đặn, topping hấp dẫn', 'kem béo mà không ngấy'],
    ['hơi ngọt một chút', 'hơi loãng so với mình thích'], ['xay chưa nhuyễn, còn cục đá', 'loãng như nước, mất vị', 'ngọt gắt uống một lúc là ngán']),
  P('tra-da', /^(trà đá|nước suối|nước lọc)/, 'uống', 'ly', 'cold',
    ['đá đầy ly, uống giải khát rất đã', 'trà mát, không bị chát', 'ly đầy đặn, đá sạch', 'hợp uống kèm món ăn chính'],
    ['hơi nhiều đá', 'hơi nhạt'], ['đá tan hết, uống như nước lã', 'ly bị đổ một ít khi nhận']),
  P('nuoc-ngot', /^(pepsi|coca|nước ngọt|soda|bia)/, 'uống', 'lon/ly', 'cold',
    ['ướp lạnh đúng chuẩn', 'giao đủ lon, còn nguyên niêm phong', 'uống rất đã, hợp ăn kèm món chiên', 'đóng gói gọn, không bị móp'],
    ['hơi ít đá', 'lon bị móp nhẹ'], ['không lạnh, uống mất ngon', 'ly bị đổ một ít khi nhận']),
  P('che', /^chè|sữa chua|rau câu|kem dừa|bánh flan|panna cotta|tiramisu/, 'ăn', 'phần', 'cold',
    ['ngọt thanh, không bị gắt', 'topping đầy đủ, thạch dai ngon', 'ăn mát lạnh rất giải nhiệt', 'nước cốt dừa béo thơm', 'phần vừa đủ ăn, vị đậm đà'],
    ['hơi ngọt so với mình', 'phần hơi ít một chút'], ['ngọt gắt khó ăn hết', 'đá bào tan hết, ăn bị nhạt', 'topping không tươi']),

  // ===== Món theo vùng/ẩm thực (đặt trước các profile chung) =====
  P('han', /tokbokki|kimbap|bibimbap|cơm trộn|mì lạnh hàn|canh kim chi|canh rong biển|mì cay|chả cá hàn/, 'ăn', 'phần', 'hot',
    ['sốt cay ngọt đậm vị, đúng kiểu Hàn', 'bánh gạo dẻo, phô mai kéo sợi', 'rau củ tươi, trộn đều rất ngon', 'kim chi chua cay vừa, ăn kèm rất hợp', 'phần đầy đặn, ăn rất đã'],
    ['hơi cay so với mình', 'sốt hơi ngọt', 'phần hơi ít một chút'],
    ['sốt nhạt, không đúng vị Hàn', 'bánh gạo bị cứng, nguội', 'quá cay, ăn không nổi', 'phần ít so với giá']),
  P('nhat', /sushi|sashimi|maki|california|ramen|udon|soba|karaage|tempura|teriyaki|katsu|tamagoyaki/, 'ăn', 'phần', 'room',
    ['cá tươi, cơm giấm vừa vị', 'nước dùng đậm đà, sợi mì dai', 'chiên giòn nhẹ, không bị ngấy dầu', 'đóng gói cẩn thận, đủ wasabi và nước tương', 'trình bày đẹp, hương vị rất Nhật'],
    ['hơi nhạt so với khẩu vị của mình', 'phần hơi ít một chút'],
    ['cá không tươi, có mùi', 'cơm sushi bị khô, rời rạc', 'mì nhão, nước dùng nhạt', 'tempura bị mềm, nguội']),
  P('dimsum', /há cảo|xíu mại|bánh bao|chân gà hấp|sườn hấp|bánh trứng nướng|bánh cuốn hấp/, 'ăn', 'phần', 'hot',
    ['hấp nóng hổi, vỏ mỏng dai', 'nhân đầy đặn, thơm mùi nấm hương', 'đóng hộp giữ nhiệt, tới nơi còn nóng', 'nước chấm đậm vị, ăn rất cuốn', 'phần vừa đủ, ăn không ngấy'],
    ['vỏ hơi dày một chút', 'phần hơi ít so với giá'],
    ['vỏ bị dính, nhân ít', 'hấp nguội nên không còn mềm', 'nhân nhạt, thiếu vị', 'bánh bị bể khi nhận']),
  P('banh-ngot', /bánh kem|mousse|su kem|cookie|croissant|kem vani|bánh tiramisu|panna cotta|bánh flan|chè khúc bạch|bánh ngọt/, 'ăn', 'phần', 'room',
    ['bánh mềm xốp, kem béo mà không ngấy', 'ngọt vừa phải, trang trí đẹp mắt', 'đóng hộp chắc chắn, bánh không bị móp', 'nguyên liệu tươi, hương vị rất ngon', 'vị béo thơm, hợp ăn xế chiều'],
    ['hơi ngọt so với mình', 'phần hơi nhỏ'],
    ['bánh bị khô, kem chảy', 'ngọt gắt, ăn một lúc là ngán', 'hộp bị móp, bánh dính hộp', 'bánh không còn tươi']),
  P('nuong', /ba chỉ nướng|sườn nướng mật ong|tôm nướng|bạch tuộc nướng|bò nướng lá lốt|cánh gà nướng/, 'ăn', 'phần', 'hot',
    ['nướng thơm mùi than, thịt mềm mọng', 'ướp đậm vị, không bị khô', 'ăn cùng rau cuốn và nước chấm rất hợp', 'phần đầy đặn, đóng hộp giữ nhiệt', 'nướng vừa chín, không bị cháy'],
    ['hơi mặn một chút', 'phần hơi ít so với giá'],
    ['nướng bị khô, cháy cạnh', 'ướp nhạt, thiếu vị', 'giao tới đã nguội, dai', 'phần ít hơn trong hình']),
  P('xoi', /^xôi|bánh khúc/, 'ăn', 'phần', 'hot',
    ['xôi dẻo thơm, hành phi giòn', 'nhân đầy đặn, ăn rất no', 'còn nóng khi nhận, ăn sáng rất hợp', 'phần vừa đủ, không bị khô'],
    ['hơi khô một chút', 'nhân hơi ít'],
    ['xôi khô cứng, nguội', 'nhân ít so với giá', 'hành phi bị cháy đắng']),
  P('chao', /^cháo/, 'ăn', 'tô', 'hot',
    ['cháo nhừ mịn, nêm vừa miệng', 'nóng hổi, ăn ấm bụng', 'topping đầy đặn, hành ngò thơm', 'phần ăn vừa đủ, ăn sáng rất hợp'],
    ['hơi loãng một chút', 'hơi mặn so với mình'],
    ['cháo nhạt, loãng như nước', 'nguội khi nhận', 'topping ít, nhiều hành']),
  P('ga-ta', /gà (đông tảo|ta)|chả gà|gỏi gà/, 'ăn', 'phần', 'room',
    ['gà ta thịt chắc, da vàng giòn', 'ngọt thịt, ăn kèm muối tiêu chanh rất hợp', 'phần đầy đặn, đóng gói gọn', 'ướp vừa vị, thơm mùi lá chanh'],
    ['hơi dai so với mình', 'phần hơi ít so với giá'],
    ['thịt dai, không ngọt', 'ướp nhạt, ăn nhạt miệng', 'gà nguội, da bị mềm']),

  // ===== Món nước / bún phở =====
  P('pho', /phở|hủ tiếu (nam vang|nước|bò kho|sườn|mực|gõ|xá xíu|thập cẩm)|bún (bò|riêu|mọc|thang|giò|chay|huế)|bún giò|miến|mì (vịt|quảng|xá xíu|hoành thánh)|bánh canh|cao lầu|cháo|bánh bèo|cơm hến/, 'ăn', 'tô', 'hot',
    ['nước dùng ngọt thanh, đậm đà', 'sợi mềm vừa, không bị nát', 'thịt nhiều, thơm mùi hành', 'rau sống tươi, ăn rất vừa miệng', 'nước trong, không bị gắt mỡ', 'topping đầy đặn so với giá', 'hương vị chuẩn kiểu truyền thống'],
    ['nước dùng hơi nhạt', 'hơi mặn với khẩu vị của mình', 'thịt hơi ít một chút', 'sợi hơi nở vì giao lâu'],
    ['nước dùng nhạt, thiếu vị', 'thịt dai và ít', 'sợi bị nát, nhão', 'nước có mùi hơi lạ', 'mặn gắt, ăn không hết']),
  P('bun-tron', /bún (chả|đậu|thịt nướng|mắm)|hủ tiếu khô|phở trộn|bún nem|nem nướng|bún ốc/, 'ăn', 'phần', 'room',
    ['chả nướng thơm, ướp đậm vị', 'bún tươi, rau sống đầy đủ', 'nước chấm pha chuẩn, chua ngọt vừa', 'thịt nướng thơm khói, không bị khô', 'phần đầy đặn, ăn rất no'],
    ['nước chấm hơi ngọt', 'thịt hơi ít', 'rau hơi ít một chút'],
    ['thịt nướng khô, ướp nhạt', 'nước chấm nhạt, thiếu vị', 'bún bị vón cục', 'thiếu rau và nước chấm']),
  P('com-tam', /cơm tấm|cơm sườn|sườn (nướng|bì)/, 'ăn', 'phần', 'hot',
    ['sườn nướng thơm, mềm vừa', 'cơm tấm dẻo, hạt tơi', 'bì chả đầy đủ, nước mắm pha ngon', 'đồ chua giòn, ăn không ngán', 'phần đầy đặn, đúng vị Sài Gòn'],
    ['sườn hơi khô', 'nước mắm hơi ngọt', 'phần hơi ít cơm'],
    ['sườn khô cứng, ướp nhạt', 'cơm khô, bị cứng', 'nước mắm nhạt, thiếu vị', 'thiếu bì chả như trong hình']),
  P('com', /^cơm|cá kho|thịt kho|thịt rim|trứng chiên|đậu hũ sốt|mực xào|canh|rau muống|dưa leo|chả trứng|cá chiên|khổ qua/, 'ăn', 'phần', 'hot',
    ['cơm dẻo, đồ ăn nêm vừa miệng', 'món nấu đậm đà, đúng kiểu cơm nhà', 'phần ăn đầy đặn, đủ món kèm', 'thịt mềm, thấm vị', 'rau xanh tươi, xào vừa lửa', 'nước canh ngọt thanh, dễ ăn'],
    ['hơi mặn so với khẩu vị', 'thịt hơi ít một chút', 'cơm hơi khô'],
    ['món mặn, ăn không hết', 'cơm cứng, thức ăn nhạt', 'đồ ăn ít so với giá', 'rau xào bị nhũn']),

  // ===== Bánh mì, cuốn, chiên =====
  P('banh-mi', /bánh mì(?! bơ tỏi)(?! chảo)/, 'ăn', 'ổ', 'crispy',
    ['vỏ bánh giòn, nhân đầy đặn', 'pate béo thơm, rau dưa chua giòn', 'thịt thơm, ướp vừa vị', 'ổ bánh nóng giòn, ăn rất đã', 'nước sốt đậm đà, không bị ướt bánh'],
    ['hơi nhiều rau so với thịt', 'bánh hơi cứng một chút', 'hơi cay với mình'],
    ['bánh mềm nhũn, nhân ít', 'nhân ít, toàn rau', 'bánh bị ỉu, ăn mất ngon', 'thịt khô và nhạt']),
  P('cuon', /gỏi cuốn|bì cuốn|bò bía|phở cuốn|bánh tráng cuốn|chả giò|nem rán|nem chua|bánh cuốn|bánh xèo|bò nướng lá lốt|bánh giò|bánh ram|bánh nậm|bánh bột lọc|xôi|hoành thánh chiên|há cảo|bánh bao|tôm chiên|bánh tráng/, 'ăn', 'phần', 'crispy',
    ['nhân đầy đặn, vỏ mềm/giòn đúng kiểu', 'nước chấm pha chuẩn, ăn rất vừa miệng', 'rau sống tươi, cuốn ăn rất đã', 'chiên vàng giòn, không bị ngấy dầu', 'tôm thịt tươi, nhân đậm vị'],
    ['nước chấm hơi ngọt', 'hơi ít nhân', 'hơi nhiều dầu một chút'],
    ['vỏ bị rách, nhân ít', 'chiên bị cháy, hơi đắng', 'nước chấm nhạt, thiếu vị', 'dầu cũ, ăn có mùi']),
  P('ga-ran', /gà rán|đùi gà|phi lê gà|cánh gà|gà viên|gà sốt|gà nướng muối|gà (cay|bbq)|gà popcorn/, 'ăn', 'phần', 'crispy',
    ['da gà giòn rụm, thịt mềm mọng nước', 'ướp vừa vị, thơm mùi tiêu', 'sốt đậm đà, bám đều miếng gà', 'miếng gà to, không bị khô', 'lớp bột giòn tan, ăn không ngấy', 'cay vừa phải, ăn rất cuốn'],
    ['hơi mặn một chút', 'hơi nhiều dầu', 'cay hơn mình nghĩ'],
    ['gà khô, bột bị mềm', 'ướp nhạt, ăn không có vị', 'miếng gà nhỏ so với giá', 'dầu cũ, ăn có mùi']),
  P('burger', /burger|hotdog|sandwich/, 'ăn', 'cái', 'room',
    ['bánh mềm, thịt bò dày và thơm', 'phô mai tan chảy béo ngậy', 'rau tươi, sốt vừa miệng', 'burger đầy đặn, ăn rất no', 'gà giòn, bánh nướng vừa lửa'],
    ['hơi ngấy một chút', 'sốt hơi nhiều'], ['thịt khô, bánh nguội cứng', 'nhân ít, nhiều rau', 'bánh bị nát khi nhận']),
  P('pizza', /pizza/, 'ăn', 'cái', 'hot',
    ['đế mỏng giòn, phô mai kéo sợi', 'topping nhiều, không bị khô', 'nướng vừa lửa, thơm mùi lò gạch', 'sốt cà chua đậm vị', 'pizza to, ăn đủ cả nhóm'],
    ['hơi mặn một chút', 'đế hơi dày với mình', 'topping hơi ít'],
    ['đế bị mềm, phô mai ít', 'nướng hơi cháy cạnh', 'topping ít hơn trong hình', 'giao tới bị dính hộp']),
  P('pasta', /mì ý|spaghetti|penne|fettuccine|linguine|lasagna/, 'ăn', 'phần', 'hot',
    ['mì al dente, sốt đậm đà', 'sốt không bị nhạt, thịt/hải sản nhiều', 'phần ăn đầy đặn', 'phô mai thơm, vị rất chuẩn', 'sợi mì dai ngon, không bị nát'],
    ['hơi mặn một chút', 'sốt hơi ít', 'mì hơi mềm'],
    ['mì nhão, sốt nhạt', 'hải sản ít và tanh', 'sốt bị khô, vón cục']),
  P('side', /khoai|hành tây chiên|phô mai que|salad|bánh mì bơ tỏi|bánh mì chảo|súp|ốc|xiên|nem chua rán|trứng cút|bắp xào|cá viên|tokbokki|bạch tuộc|tôm nướng|cánh gà nướng|khô bò|gỏi|dưa góp|rau sống|quẩy|trứng gà chần|gân bò|bò viên|chả cua|giò heo|bì thêm|sườn nướng thêm|đồ chua|chả trứng thêm/, 'ăn', 'phần', 'crispy',
    ['giòn thơm, ăn vặt rất cuốn', 'phần vừa đủ ăn, nêm vừa vị', 'nguyên liệu tươi, chế biến sạch sẽ', 'chấm sốt ăn rất ngon', 'nướng thơm, không bị cháy'],
    ['hơi mặn một chút', 'phần hơi ít so với giá'], ['bị mềm, hết giòn', 'ăn nhạt, thiếu vị', 'phần ít hơn hình nhiều']),
  P('lau', /lẩu|mala/, 'ăn', 'ly', 'hot',
    ['nước lẩu đậm đà, đúng vị', 'topping nhiều, nhúng ăn rất vui', 'cay vừa, ăn xong thấy đã', 'rau và viên tươi, đóng gói gọn'],
    ['hơi mặn một chút', 'topping hơi ít'], ['nước lẩu nhạt, thiếu vị', 'topping ít, nhiều rau', 'bị tràn nước khi nhận']),
  P('chay', /chay|nấm|đậu hũ|gạo lứt/, 'ăn', 'phần', 'hot',
    ['chế biến thanh đạm, vị rất đậm đà', 'nấm và đậu hũ nêm vừa miệng', 'ăn không bị ngấy dầu', 'rau củ tươi, trình bày đẹp', 'đồ chay nhưng rất ngon, ăn no lâu'],
    ['hơi nhạt so với mình', 'hơi nhiều dầu'], ['nhạt, thiếu vị', 'rau củ bị nhũn', 'ít đồ ăn kèm']),
  P('combo', /^combo/, 'ăn', 'combo', 'room',
    ['combo đủ món, đồ ăn đầy đặn', 'rẻ hơn mua lẻ, ăn đủ cho cả nhóm', 'mọi món đều ngon, đóng gói riêng từng phần', 'phần ăn chia vừa đủ số người', 'đúng mô tả, nhiều món trong một đơn'],
    ['một món hơi ít so với mong đợi', 'đồ hơi nhiều dầu'], ['thiếu một món trong combo', 'món trong combo nguội và ít', 'không đầy đủ như mô tả'])
];

const FALLBACK_FOOD = P('khac-an', /.*/, 'ăn', 'phần', 'room',
  ['nêm nếm vừa miệng, nguyên liệu tươi', 'phần ăn đầy đặn so với giá', 'đóng gói sạch sẽ, món đúng như mô tả', 'ăn rất ngon, sẽ ủng hộ thêm'],
  ['hơi mặn một chút', 'phần hơi ít'], ['vị nhạt, không như mô tả', 'đồ ăn ít so với giá']);
const FALLBACK_DRINK = P('khac-uong', /.*/, 'uống', 'ly', 'cold',
  ['vị ngon, uống rất đã', 'ly đầy đặn, không quá ngọt', 'pha chế vừa vị, nguyên liệu tươi'],
  ['hơi ngọt một chút', 'hơi nhiều đá'], ['vị nhạt, loãng', 'uống có vị lạ']);

const DRINK_CATEGORIES = /trà sữa|đồ uống/i;

/** Chọn profile theo tên món; món không khớp thì theo loại quán (đồ uống → "uống", còn lại → "ăn"). */
export function dishProfile(name, category = '') {
  const lower = String(name).toLowerCase().trim();
  const found = PROFILES.find(profile => profile.match.test(lower));
  if (found) {
    // "combo" trong quán đồ uống là combo ly
    if (found.key === 'combo' && DRINK_CATEGORIES.test(category)) return { ...found, verb: 'uống', unit: 'combo ly', temp: 'cold', pos: ['đủ ly cho cả nhóm, rẻ hơn mua lẻ', 'ly nào cũng đầy đặn, đóng khay chống đổ', 'mỗi ly một vị đúng như đặt', 'đá và đường đúng yêu cầu từng ly'], mild: ['một ly hơi ngọt', 'đá hơi nhiều'], neg: ['thiếu một ly so với đơn', 'có ly bị đổ khi nhận'] };
    return found;
  }
  return DRINK_CATEGORIES.test(category) ? FALLBACK_DRINK : FALLBACK_FOOD;
}

const DISH_FRAMES = {
  5: [
    '{Dish} {p1}, {p2}. Sẽ {verb} lại!',
    '{Dish} ở đây {p1}. {Deliv}.',
    'Mình đã {verb} {dish} mấy lần rồi, lần nào cũng thấy {p1}.',
    '{P1}, {p2}. Rất đáng tiền, 5 sao!',
    'Quá ngon luôn! {Dish} {p1}, {deliv}.',
    '{Dish} {p1} nha cả nhà. {Deliv}.',
    'Lần đầu {verb} {dish} và mê luôn: {p1}, {p2}.',
    '{Dish} {p1}. Chắc chắn sẽ đặt tiếp.',
    '{P1}, đúng món mình thích. {Deliv}.'
  ],
  4: [
    '{Dish} {p1}, chỉ tiếc là {m1}.',
    '{Dish} ngon, {p1}. Trừ một sao vì {m1}.',
    '{P1}, {deliv}. Nhưng {m1}.',
    'Khá ổn, {dish} {p1}. Chỉ có điều {m1}.',
    '{Dish} {p1}, giá hợp lý. Chỉ {m1} thôi.'
  ],
  3: [
    '{Dish} bình thường, {p1} nhưng {m1}.',
    '{Dish} ở mức tạm được, {m1}. Chắc để lần sau thử món khác.',
    '{P1} nhưng {n1}, nên mình chấm 3 sao.',
    'Cũng được, {m1}. Không có gì đặc biệt so với giá.'
  ],
  2: [
    '{Dish} {n1}, {n2}. Hơi thất vọng.',
    'Không như kỳ vọng: {n1}. Còn {baddeliv}.',
    '{N1}, {baddeliv}. Mong quán cải thiện.',
    '{Dish} {n1}, không đáng với giá tiền.'
  ],
  1: [
    '{Dish} {n1}, {baddeliv}. Sẽ không đặt lại.',
    'Rất thất vọng, {n1} và {n2}.',
    '{N1}, {baddeliv}. Không như hình đăng.',
    'Đặt {dish} mà {n1}. Không {verb} nổi, tiếc tiền.'
  ]
};

/** Bình luận một món theo số sao (đúng động từ ăn/uống, đúng nhiệt độ). */
export function makeDishComment(rnd, { dishName, category = '', rating }) {
  const profile = dishProfile(dishName, category);
  const delivery = DELIVERY[profile.temp];
  const shortName = String(dishName).replace(/\s*\(.*\)\s*$/, '');
  const [p1, p2] = shuffle(rnd, profile.pos);
  const [m1] = shuffle(rnd, profile.mild);
  const [n1, n2] = shuffle(rnd, profile.neg);
  const values = {
    dish: shortName.toLowerCase() === shortName ? shortName : lowerFirst(shortName), Dish: shortName, verb: profile.verb, unit: profile.unit,
    p1, P1: cap(p1), p2: p2 ?? p1, m1, n1, N1: cap(n1), n2: n2 ?? n1,
    deliv: pick(rnd, delivery.good), Deliv: cap(pick(rnd, delivery.good)), baddeliv: pick(rnd, delivery.bad)
  };
  // Tên riêng (Pizza, Burger, Spaghetti, Latte…) giữ nguyên chữ hoa
  if (/^[A-ZĐ]/.test(shortName) && /^(pizza|burger|spaghetti|penne|fettuccine|linguine|lasagna|latte|americano|cappuccino|cold|cookie|croissant|coca|pepsi|hotdog|sandwich|salad|combo|tokbokki|matcha|socola)/i.test(shortName)) values.dish = shortName;
  const frame = pick(rnd, DISH_FRAMES[rating] ?? DISH_FRAMES[4]);
  let text = frame.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
  text = text.replace(/\s+([,.!])/g, '$1').replace(/\s{2,}/g, ' ').trim();
  if (rnd() < 0.14 && rating >= 4) text += ` ${pick(rnd, EMOJI)}`;
  return cap(text);
}

const lowerFirst = text => text.charAt(0).toLowerCase() + text.slice(1);
function shuffle(rnd, list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) { const j = Math.floor(rnd() * (index + 1)); [copy[index], copy[j]] = [copy[j], copy[index]]; }
  return copy;
}

/* ===== Đánh giá QUÁN theo loại quán ===== */
const SHOP = {
  'trà sữa': { noun: 'đồ uống', verb: 'uống', pos: ['pha chế nhanh, ly nào cũng đầy đặn', 'nguyên liệu tươi, vị trà rất thơm', 'đóng ly kín, bỏ khay chống đổ', 'đúng đường đá như mình dặn', 'topping dày, giá hợp lý'], neg: ['ly pha hơi lâu', 'vị hơi ngọt', 'thiếu topping so với đơn', 'ít đá mà bỏ nhiều đá'] },
  'đồ uống': { noun: 'đồ uống', verb: 'uống', pos: ['pha chế nhanh, vị ổn định', 'nước ép/cà phê tươi mới, đóng gói gọn', 'ly đầy, không bị đổ', 'đúng yêu cầu ít đường ít đá'], neg: ['chờ pha hơi lâu', 'vị hơi nhạt', 'thiếu một ly nhưng đã báo lại'] },
  'cơm': { noun: 'đồ ăn', verb: 'ăn', pos: ['cơm dẻo, món nấu đậm đà như cơm nhà', 'đồ ăn đầy đặn, đóng hộp gọn', 'chuẩn bị nhanh dù giờ trưa đông', 'canh và món mặn đủ phần'], neg: ['hơi mặn giờ cao điểm', 'chờ món hơi lâu', 'thiếu đồ chua'] },
  'bún - phở': { noun: 'đồ ăn', verb: 'ăn', pos: ['nước dùng đậm đà, tách riêng nước và bún nên không bị nở', 'topping nhiều, rau sống đầy đủ', 'chuẩn bị nhanh, nước nóng khi nhận', 'đóng gói cẩn thận không đổ nước'], neg: ['nước dùng hơi nhạt', 'chờ hơi lâu lúc đông khách', 'thiếu rau sống'] },
  'gà rán': { noun: 'đồ ăn', verb: 'ăn', pos: ['gà chiên giòn đều, đóng hộp thoáng', 'ướp vừa vị, sốt đầy đủ', 'chuẩn bị nhanh, gà mới chiên', 'phần ăn đầy đặn'], neg: ['gà hơi nhiều dầu', 'chờ lâu giờ cao điểm', 'thiếu sốt chấm'] },
  'pizza': { noun: 'đồ ăn', verb: 'ăn', pos: ['pizza nướng lò thơm, phô mai nhiều', 'hộp chắc chắn, bánh không bị dính', 'chuẩn bị đúng giờ hẹn', 'topping đúng mô tả'], neg: ['bánh hơi ít topping', 'chờ nướng hơi lâu', 'bánh hơi mặn'] },
  'đồ chay': { noun: 'đồ ăn', verb: 'ăn', pos: ['món chay thanh đạm, nêm vị rất khéo', 'rau củ tươi, đóng gói sạch sẽ', 'phần ăn đầy đặn, no lâu', 'nấu nhẹ dầu mỡ'], neg: ['hơi nhạt so với khẩu vị', 'chờ món hơi lâu', 'thiếu nước chấm'] },
  'đồ ăn nhanh': { noun: 'đồ ăn', verb: 'ăn', pos: ['làm nhanh, bánh nóng giòn', 'đóng gói gọn, không bị nát', 'phần ăn đầy đặn, giá hợp lý', 'đúng mô tả, sốt đủ'], neg: ['khoai hơi mềm', 'chờ hơi lâu', 'thiếu sốt'] },
  'đồ ăn vặt': { noun: 'đồ ăn', verb: 'ăn', pos: ['đồ ăn vặt chiên nướng thơm, nêm vừa miệng', 'đóng gói gọn từng món, kèm sốt đầy đủ', 'chuẩn bị nhanh, ăn còn nóng giòn', 'phần nhiều, giá học sinh sinh viên'], neg: ['hơi nhiều dầu', 'chờ lâu giờ tan học', 'thiếu sốt chấm'] },
  'món hàn': { noun: 'đồ ăn', verb: 'ăn', pos: ['đồ ăn đậm vị Hàn, sốt cay ngọt vừa miệng', 'đóng hộp gọn, kèm kim chi và đồ chua', 'chuẩn bị nhanh, gà/bánh gạo còn nóng', 'phần đầy đặn, hợp ăn nhóm'], neg: ['hơi cay so với dự kiến', 'chờ hơi lâu giờ cao điểm', 'thiếu kim chi ăn kèm'] },
  'món nhật': { noun: 'đồ ăn', verb: 'ăn', pos: ['nguyên liệu tươi, cơm sushi vừa vị', 'đóng hộp cẩn thận, đủ wasabi và nước tương', 'ramen/udon tách nước dùng nên không bị nở', 'trình bày gọn gàng, đúng kiểu Nhật'], neg: ['chờ hơi lâu', 'phần hơi ít so với giá', 'thiếu gừng hồng'] },
  'dimsum & món hoa': { noun: 'đồ ăn', verb: 'ăn', pos: ['dimsum hấp nóng, vỏ mỏng dai', 'đóng hộp giữ nhiệt, nước chấm đủ', 'nhân đầy đặn, đậm vị', 'chuẩn bị nhanh, ăn rất đã'], neg: ['một số món hơi nguội', 'thiếu nước chấm', 'chờ hơi lâu giờ trưa'] },
  'bánh & kem': { noun: 'bánh ngọt', verb: 'ăn', pos: ['bánh tươi mới, ngọt vừa phải', 'đóng hộp chắc chắn, bánh không bị móp', 'trang trí đẹp, đúng như hình', 'có đá khô/túi giữ lạnh cho món lạnh'], neg: ['bánh hơi mềm do giao lâu', 'kem hơi chảy', 'hộp bị móp nhẹ'] },
  'lẩu & nướng': { noun: 'đồ ăn', verb: 'ăn', pos: ['nước lẩu đậm đà, nguyên liệu tươi', 'đồ nướng thơm mùi than, đóng hộp giữ nhiệt', 'rau và nước chấm đầy đủ', 'phần ăn đầy đặn, hợp ăn nhóm'], neg: ['chờ hơi lâu', 'nước lẩu hơi mặn', 'đồ nướng hơi nguội'] },
  'món việt': { noun: 'đồ ăn', verb: 'ăn', pos: ['món đậm vị truyền thống, đóng gói cẩn thận', 'nguyên liệu tươi, nêm nếm vừa miệng', 'chuẩn bị nhanh, rau sống đầy đủ', 'phần đầy đặn, đúng mô tả'], neg: ['hơi mặn một chút', 'chờ món hơi lâu', 'thiếu rau sống'] }
};
const SHOP_FALLBACK = SHOP['món việt'];

const SHOP_FRAMES = {
  5: ['Quán làm rất có tâm: {p1}, {p2}. Sẽ ủng hộ dài dài!', '{P1}. {P2}. 5 sao cho quán.', 'Đặt nhiều lần rồi, lần nào quán cũng {p1}.', 'Quán uy tín, {p1}. Nhất định {verb} lại.', 'Hài lòng tuyệt đối: {p1}, {p2}.'],
  4: ['Quán ổn, {p1}. Chỉ là {n1}.', '{P1}, {p2}. Hơi tiếc vì {n1}.', 'Nhìn chung hài lòng: {p1}. Mong quán khắc phục việc {n1}.', '{P1}, giá hợp lý. Trừ một sao vì {n1}.'],
  3: ['Quán trung bình: {p1} nhưng {n1}.', '{P1}, còn {n1}, chấm 3 sao.', 'Tạm được, {n1}. Sẽ cân nhắc đặt lại.'],
  2: ['Chưa hài lòng: {n1}, {n2}.', '{N1}, {n2}. Quán cần cải thiện thêm.', 'Thất vọng vì {n1}, không như những gì mình mong đợi.'],
  1: ['Rất thất vọng: {n1} và {n2}. Sẽ không quay lại.', '{N1}, {n2}. Trải nghiệm tệ.', 'Quán làm sai đơn, {n1}. Không hài lòng chút nào.']
};

export function makeRestaurantComment(rnd, { category = '', rating }) {
  const shop = SHOP[String(category).toLowerCase()] ?? SHOP_FALLBACK;
  const [p1, p2] = shuffle(rnd, shop.pos);
  const [n1, n2] = shuffle(rnd, shop.neg);
  const values = { p1, P1: cap(p1), p2: p2 ?? p1, P2: cap(p2 ?? p1), n1, N1: cap(n1), n2: n2 ?? n1, verb: shop.verb };
  let text = pick(rnd, SHOP_FRAMES[rating] ?? SHOP_FRAMES[4]).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '').replace(/\s+([,.!])/g, '$1').trim();
  if (rnd() < 0.12 && rating >= 4) text += ` ${pick(rnd, EMOJI)}`;
  return cap(text);
}

/* ===== Đánh giá TÀI XẾ (không nhắc nhiệt độ món; theo đồ uống/đồ ăn) ===== */
const SHIP_FRAMES = {
  5: ['Tài xế thân thiện, giao nhanh, gọi điện trước khi tới.', 'Anh shipper nhiệt tình, {goods} nguyên vẹn khi nhận.', 'Giao đúng giờ, lịch sự, cảm ơn anh nhiều.', 'Chị shipper rất lịch sự, giao tận cửa, {goods} không bị đổ.', 'Giao nhanh hơn dự kiến, thái độ rất tốt.', 'Shipper chạy cẩn thận, {goods} giữ rất gọn. 5 sao!', 'Tài xế nhắn tin trước khi tới, mình nhận rất tiện.'],
  4: ['Giao hơi chậm một chút nhưng thái độ tốt.', 'Tài xế ổn, {goods} không bị đổ.', 'Giao nhanh, chỉ hơi khó tìm địa chỉ.', 'Shipper lịch sự, chỉ tiếc là gọi điện hơi trễ.'],
  3: ['Giao bình thường, hơi lâu so với dự kiến.', 'Tài xế gọi mình hơi trễ nên phải chờ.', 'Giao được, nhưng {goods} bị nghiêng nhẹ.'],
  2: ['Tài xế giao trễ gần 20 phút, không báo trước.', 'Thái độ chưa thân thiện lắm, {goods} bị xô lệch.'],
  1: ['Giao rất trễ và {goods} bị nghiêng đổ, không xin lỗi.', 'Tài xế để đồ trước cửa, không liên lạc.']
};

const SHIP_TAILS = {
  5: ['Cảm ơn anh/chị shipper!', 'Sẽ ủng hộ tiếp.', 'Rất hài lòng.', 'Đáng 5 sao.', ''],
  4: ['Nhìn chung ổn.', 'Cũng hài lòng.', ''],
  3: ['Tạm được.', ''],
  2: ['Mong cải thiện.', ''],
  1: ['Rất tiếc về trải nghiệm này.', '']
};

export function makeShipperComment(rnd, { rating, drinksOnly = false }) {
  const goods = drinksOnly ? 'ly nước' : 'đồ ăn';
  const base = pick(rnd, SHIP_FRAMES[rating] ?? SHIP_FRAMES[4]).replace(/{goods}/g, goods);
  const tail = pick(rnd, SHIP_TAILS[rating] ?? ['']);
  const emoji = rating >= 4 && rnd() < 0.12 ? ` ${pick(rnd, EMOJI)}` : '';
  return cap(`${base}${tail ? ` ${tail}` : ''}${emoji}`);
}
