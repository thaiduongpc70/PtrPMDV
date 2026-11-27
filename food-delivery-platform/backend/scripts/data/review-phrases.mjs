/* Bộ câu bình luận (đợt 5): ghép mảnh theo NHÃN MÓN/QUÁN thật + số sao thật, không nêu số sao trong câu, không placeholder lọt ra ngoài.
   - Món gắn nhãn (dishTags): kind drink|dessert|food, sub (trà, cà phê, sinh tố/đá xay, nước ép, soda, bia, chè/bánh/kem, gỏi/cuốn/sushi, nước dùng, cơm, chiên, nướng, Âu, bánh mì),
     nhiệt độ hot|cold|neutral, chay. Câu về nhiệt độ/đá/“phần ăn” chỉ dùng khi hợp nhãn (đồ uống không có “phần ăn”, món lạnh không “nóng hổi”).
   - Quán gắn nhãn (shopTag): drink | dessert | fresh | hot — câu về “món nóng” chỉ dành cho quán món nóng.
   - Phản hồi của quán (makeReply) tách theo nhóm sao, đủ biến thể để một câu không lặp quá 5 lần.
   Registry (createRegistry) bảo đảm một câu bình luận ≤ maxRepeat lần toàn hệ thống. */

const tier = stars => (stars >= 4 ? 'hi' : stars === 3 ? 'mid' : 'lo');
const pick = (rnd, list) => list[Math.floor(rnd() * list.length)];
const cap = text => text.charAt(0).toUpperCase() + text.slice(1);

/* ---------- Nhãn món ---------- */
const DRINK = /^(trà|cà phê|cacao|nước|sinh tố|soda|bạc xỉu|sữa|matcha|latte|cappuccino|americano|bia|coca|pepsi|cold brew|combo [0-9] ly|combo team)/i;
const DESSERT = /(^|\s)(chè|kem|flan|tiramisu|panna cotta|mousse|bánh kem|bánh ngọt|sữa chua|rau câu|pudding|cookie|croissant|bánh su|cheesecake|bánh bông lan)(\s|$)/i;
const COLD_FOOD = /^(gỏi|salad|nem cuốn|bò bía|bánh tráng trộn|sushi|sashimi|maki|dưa leo|rau sống|xoài lắc|nem chua$)|cuốn( chay)?( \(|$)|gỏi cuốn|phở cuốn|bì cuốn/i;
const HOT_DRINK = /(nóng|gừng|cacao nóng|cà phê trứng|trà gừng|sữa nóng)/i;

/** Gắn nhãn món theo tên + danh mục quán: { kind, sub, temp, veg, verb }. */
export function dishTags(name, category = '') {
  const text = String(name ?? '').trim();
  const lower = text.toLowerCase();
  const veg = /\bchay\b/i.test(text);
  const drinkShop = /trà sữa|đồ uống/i.test(category);
  if (DRINK.test(lower) || (drinkShop && !DESSERT.test(lower) && !/bánh|khoai|gà|xúc xích|croissant/.test(lower))) {
    let sub = 'drink';
    if (/^(cà phê|bạc xỉu|latte|cappuccino|americano|cold brew)/.test(lower)) sub = 'coffee';
    else if (/^(trà|matcha)/.test(lower)) sub = 'tea';
    else if (/sinh tố|đá xay|cacao đá|frappe/.test(lower)) sub = 'blended';
    else if (/nước ép|detox|nước (sâm|mía|vối)/.test(lower)) sub = 'juice';
    else if (/^soda|coca|pepsi|nước ngọt/.test(lower)) sub = 'soda';
    else if (/^bia/.test(lower)) sub = 'beer';
    return { kind: 'drink', sub, temp: HOT_DRINK.test(lower) ? 'hot' : 'cold', veg, verb: 'uống' };
  }
  if (DESSERT.test(lower)) return { kind: 'dessert', sub: 'dessert', temp: /nóng/.test(lower) ? 'hot' : 'cold', veg, verb: 'ăn' };
  if (COLD_FOOD.test(lower)) return { kind: 'food', sub: 'cold', temp: 'cold', veg, verb: 'ăn' };
  let sub = 'generic';
  if (/phở|bún|mì (quảng|vịt)|miến|hủ tiếu|cháo|lẩu|bánh canh|canh/.test(lower) && !/trộn|bún chả|bún đậu/.test(lower)) sub = 'soup';
  else if (/^cơm|xôi/.test(lower)) sub = 'rice';
  else if (/chiên|rán|giòn|tempura|karaage|khoai|gà viên|popcorn/.test(lower)) sub = 'fried';
  else if (/nướng|bbq|teriyaki/.test(lower)) sub = 'grilled';
  else if (/pizza|burger|mì ý|spaghetti|sandwich|hotdog|lasagna|ramen|udon/.test(lower)) sub = 'western';
  else if (/bánh mì/.test(lower)) sub = 'banhmi';
  return { kind: 'food', sub, temp: 'hot', veg, verb: 'ăn' };
}

/** Nhãn quán: drink | dessert | fresh | hot. */
export function shopTag(category = '', name = '') {
  const text = `${category} ${name}`.toLowerCase();
  if (/trà sữa|đồ uống|cà phê|sinh tố|nước ép/.test(text)) return 'drink';
  if (/bánh & kem|chè|kem|bánh ngọt/.test(text)) return 'dessert';
  if (/gỏi cuốn|tươi mỗi ngày|salad|sushi/.test(text)) return 'fresh';
  return 'hot';
}

/* ---------- Món: mở đầu, vị, ghi chú giao hàng, kết (KHÔNG có số sao) ---------- */
const OPEN = {
  hi: ['{Dish} lần này làm mình khá bất ngờ', 'Đặt {dish} theo lời giới thiệu và không thất vọng', 'Mình {verb} {dish} ở đây đã mấy lần', '{Dish} đúng khẩu vị của mình', 'Hôm nay thử {dish} cho đỡ nhớ', 'Cả nhà cùng {verb} {dish} và đều khen', 'Lần đầu gọi {dish} ở quán này', 'Đang bận mà có {dish} là yên tâm', 'Thấy nhiều người khen {dish} nên mình thử', 'Mình hay gọi {dish} vào cuối tuần', 'Gọi {dish} cho bữa tối nay', '{Dish} của quán này khá có tiếng trong khu', 'Cuối ngày làm việc mà có {dish} thì còn gì bằng', 'Bạn mình giới thiệu {dish} và đúng là đáng thử', 'Mình đã chờ {dish} từ chiều', 'Gọi {dish} cho cả nhóm {verb} chung', '{Dish} làm mình nhớ hương vị quen thuộc', 'Quyết định {verb} {dish} hôm nay là đúng'],
  mid: ['{Dish} ở mức chấp nhận được', 'Gọi {dish} thử xem sao', 'Mình {verb} {dish} lần đầu ở quán này', '{Dish} không tệ nhưng chưa nổi bật', 'Đặt {dish} cho nhanh bữa trưa', 'Thử {dish} theo gợi ý trong app', '{Dish} cũng tạm, đúng tầm giá', 'Mình kỳ vọng {dish} nhỉnh hơn một chút', '{Dish} ổn nhưng chưa có gì đặc biệt'],
  lo: ['{Dish} lần này khiến mình hơi thất vọng', 'Gọi {dish} mà không như mong đợi', 'Mình {verb} {dish} rồi nên có thể so sánh', 'Rất tiếc với {dish} hôm nay', 'Đặt {dish} nhưng nhận về không giống hình', '{Dish} lần này chất lượng thấp hơn hẳn mọi khi', 'Mình khá buồn vì {dish} hôm nay']
};

// vị theo nhãn: TASTE[kind/sub][tier]
const TASTE = {
  tea: { hi: ['vị trà thơm, ngọt vừa', 'đá đủ lạnh, không bị loãng', 'topping tươi, nhiều', 'ly đầy, uống tới giọt cuối vẫn ngon', 'hậu vị dễ chịu, không gắt', 'mùi trà rõ, không bị nhạt', 'mức đường đúng như mình chọn', 'vị trái cây tự nhiên', 'mát lạnh, rất hợp ngày nóng'] },
  coffee: { hi: ['cà phê đậm, thơm mùi rang', 'béo ngậy mà không gắt', 'hậu vị ngọt nhẹ dễ chịu', 'đúng gu cà phê phin', 'vị cân bằng giữa đắng và ngọt', 'lớp kem/sữa mịn, thơm', 'pha vừa tay, không bị chua'] },
  blended: { hi: ['xay mịn, không lợn cợn', 'trái cây tươi, thơm', 'đặc vừa, uống rất đã', 'ngọt tự nhiên, không gắt', 'béo mịn, ngon miệng', 'đá xay vừa đủ, không bị tách nước'] },
  juice: { hi: ['ép tươi, vị chua ngọt tự nhiên', 'không pha loãng', 'màu đẹp, thơm mùi trái cây', 'mát và dễ uống', 'ít đường, uống nhẹ nhàng'] },
  soda: { hi: ['sảng khoái, sủi bọt đủ', 'chua ngọt cân bằng', 'lạnh, uống đã khát', 'thơm mùi trái cây, không gắt'] },
  beer: { hi: ['lạnh đúng độ', 'đúng loại đã đặt', 'nguyên lon, không móp méo'] },
  drink: { hi: ['vị dịu, dễ uống', 'mát thơm, hợp khẩu vị', 'ngọt vừa phải', 'pha đúng như mô tả', 'uống rất đã khát'] },
  dessert: { hi: ['ngọt dịu, không bị gắt', 'mềm mịn, tan trong miệng', 'topping đầy đặn', 'hương vị hài hoà, ăn không ngán', 'phần vừa đủ cho một người', 'trình bày gọn, nhìn là muốn ăn'] },
  cold: { hi: ['rau tươi giòn', 'nước chấm đậm đà, vừa miệng', 'cuốn chắc tay, không rách', 'nguyên liệu tươi, sạch sẽ', 'vị chua ngọt cân bằng', 'ăn mát, không ngấy', 'trình bày gọn, đẹp mắt'] },
  soup: { hi: ['nước dùng ngọt thanh, nóng hổi', 'sợi mềm vừa, không nát', 'thịt chín tới, mềm', 'hành rau thơm tươi', 'nêm vừa miệng, không mặn', 'topping đầy đặn'] },
  rice: { hi: ['cơm dẻo, nấu đều', 'thịt đậm đà, đưa cơm', 'phần ăn đầy đặn', 'nêm vừa miệng', 'đồ ăn kèm đủ và tươi', 'thơm mùi bếp'] },
  fried: { hi: ['chiên giòn, không ngấy dầu', 'vỏ giòn, nhân đậm đà', 'vàng đều, thơm', 'chấm nước sốt rất hợp', 'vẫn giòn dù đã giao'] },
  grilled: { hi: ['nướng thơm mùi than', 'thịt mềm, thấm gia vị', 'cháy cạnh vừa đủ', 'nước chấm đậm vị', 'ướp vừa miệng'] },
  western: { hi: ['đế/bánh mềm giòn vừa', 'phô mai béo, kéo sợi', 'sốt đậm, thơm', 'nhân đầy đặn', 'nêm hợp khẩu vị'] },
  banhmi: { hi: ['vỏ giòn, nhân đầy', 'pate thơm, rau tươi', 'nước sốt vừa miệng', 'ổ bánh nóng giòn'] },
  generic: { hi: ['vị vừa miệng, đúng như mô tả', 'nguyên liệu tươi', 'nêm nếm khéo', 'phần ăn đầy đặn', 'trình bày gọn gàng', 'ăn xong vẫn nhớ vị'] }
};
const TASTE_TIER = {
  drink: { mid: ['hơi ngọt với mình', 'đá hơi nhiều nên loãng nhanh', 'vị hơi nhạt', 'ly không đầy lắm', 'topping ít hơn mong đợi', 'uống ổn nhưng không nhớ lâu'], lo: ['quá ngọt, uống không nổi', 'vị loãng, nhiều đá', 'ly hụt gần một phần ba', 'không đúng mức đường đã chọn', 'vị lạ, không giống mọi lần'] },
  dessert: { mid: ['hơi ngọt với mình', 'kết cấu chưa mịn lắm', 'phần hơi ít so với giá', 'ăn được nhưng không đọng lại'], lo: ['quá ngọt, ăn bị ngán', 'kết cấu nhão, mất ngon', 'topping ít, không như hình', 'có mùi lạ khi ăn'] },
  cold: { mid: ['rau không giòn lắm', 'nước chấm hơi nhạt', 'cuốn hơi lỏng tay', 'ăn ổn, không có điểm nhấn'], lo: ['rau héo, không tươi', 'nước chấm quá mặn', 'cuốn bị rách, nhân rơi', 'có vị lạ, ăn không nổi'] },
  food: { mid: ['vị hơi nhạt so với kỳ vọng', 'hơi mặn một chút', 'phần ăn vừa đủ', 'nêm ổn nhưng thiếu điểm nhấn', 'hơi nhiều dầu', 'nguyên liệu ổn, không đặc biệt'], lo: ['vị nhạt và nguội', 'quá mặn, ăn không nổi', 'phần ăn ít hơn so với giá', 'nguyên liệu không tươi', 'nhiều dầu mỡ, ăn bị ngán', 'đồ chín không đều'] }
};
const EXTRA = {
  hi: {
    hot: ['Giao nhanh nên món còn nóng', 'Món còn nóng hổi khi nhận', 'Đóng gói chắc tay, không đổ ra ngoài', 'Hộp kín, món vẫn nóng', 'Tài xế gọi trước khi tới nên nhận rất nhanh', 'Ghi chú của mình được làm đúng', 'Có kèm đủ dụng cụ như đã chọn'],
    cold: ['Món còn tươi mát khi nhận', 'Đóng hộp kỹ, rau vẫn giòn', 'Nước chấm đóng riêng, không chảy', 'Giao nhanh nên vẫn tươi', 'Hộp sạch, nhìn là thấy có tâm', 'Có kèm đủ nước chấm'],
    dessertCold: ['Còn lạnh, không bị chảy khi nhận', 'Hộp lạnh chu đáo', 'Đóng gói đẹp, không móp', 'Giao nhanh nên còn nguyên hình'],
    drinkCold: ['Ly đóng nắp chắc, không đổ', 'Đá còn đủ khi nhận', 'Ly đầy, không bị hụt', 'Đóng khay chắc chắn', 'Ống hút và dụng cụ có đủ'],
    drinkHot: ['Ly đóng nắp kín, vẫn ấm khi nhận', 'Giao nhanh nên ly vẫn ấm', 'Đóng gói chắc, không đổ'],
    neutral: ['Đóng gói gọn gàng', 'Giao đúng hẹn', 'Hộp sạch, nhìn là thấy có tâm']
  },
  mid: {
    hot: ['Giao hơi lâu một chút', 'Đóng gói tạm ổn', 'Hộp có dính chút nước sốt', 'Món nguội bớt khi tới nơi'],
    cold: ['Giao hơi lâu một chút', 'Rau hơi mềm khi nhận', 'Đóng hộp tạm ổn'],
    dessertCold: ['Giao hơi lâu nên bớt lạnh', 'Hộp hơi móp nhẹ'],
    drinkCold: ['Đá tan bớt khi nhận', 'Ly hơi đầy nắp, dễ đổ', 'Giao hơi lâu'],
    drinkHot: ['Ly nguội hơn mong đợi', 'Giao hơi lâu'],
    neutral: ['Giao hơi lâu một chút', 'Đóng gói tạm ổn']
  },
  lo: {
    hot: ['Giao trễ hơn dự kiến khá nhiều', 'Nhận hàng đã nguội', 'Hộp bị đổ một phần khi nhận', 'Thiếu món phụ đã đặt'],
    cold: ['Giao trễ nên rau không còn tươi', 'Hộp bị móp, nước chấm chảy', 'Thiếu nước chấm đã đặt'],
    dessertCold: ['Đã chảy nước khi nhận', 'Hộp bị móp, nhìn không giống hình'],
    drinkCold: ['Đá tan gần hết khi nhận', 'Ly bị đổ một phần', 'Ly hụt so với mô tả'],
    drinkHot: ['Ly đã nguội khi nhận', 'Ly bị đổ một phần'],
    neutral: ['Giao trễ hơn dự kiến', 'Đóng gói sơ sài']
  }
};
const CLOSE = {
  hi: ['Sẽ ủng hộ tiếp.', 'Chắc chắn quay lại.', 'Giới thiệu cho bạn bè rồi.', 'Điểm cộng lớn.', 'Rất đáng thử.', 'Lần sau thử món khác của quán.', 'Mong quán giữ phong độ này.', 'Hài lòng trọn vẹn.', 'Ổn áp hơn nhiều chỗ khác.'],
  mid: ['Cũng tạm ổn.', 'Có thể thử món khác của quán.', 'Chưa đến mức muốn quay lại ngay.', 'Hy vọng lần sau tốt hơn.', 'Đúng mức trung bình.'],
  lo: ['Mong quán xem lại chất lượng.', 'Sẽ cân nhắc trước khi đặt lại.', 'Hy vọng quán cải thiện.', 'Khá tiếc vì mình từng thích quán.', 'Chưa hài lòng với lần này.']
};

function dishText(rnd, ctx) {
  const t = tier(ctx.stars);
  const tags = ctx.tags ?? dishTags(ctx.dishName, ctx.category);
  const tasteKey = TASTE[tags.sub] ? tags.sub : tags.kind === 'drink' ? 'drink' : tags.kind === 'dessert' ? 'dessert' : 'generic';
  const tierKey = tags.kind === 'drink' ? 'drink' : tags.kind === 'dessert' ? 'dessert' : tags.sub === 'cold' ? 'cold' : 'food';
  let taste = t === 'hi' ? pick(rnd, TASTE[tasteKey].hi) : pick(rnd, TASTE_TIER[tierKey][t]);
  if (t === 'hi' && tags.veg && tags.kind === 'food' && rnd() < 0.3) taste = 'chay mà vẫn đậm vị, không bị nhạt';
  const extraKey = tags.kind === 'drink' ? (tags.temp === 'hot' ? 'drinkHot' : 'drinkCold') : tags.kind === 'dessert' ? 'dessertCold' : tags.temp === 'cold' ? 'cold' : 'hot';
  const dish = ctx.dishName ? ctx.dishName.toLowerCase() : 'món này';
  const opener = pick(rnd, OPEN[t]).replaceAll('{Dish}', cap(dish)).replaceAll('{dish}', dish).replaceAll('{verb}', tags.verb);
  let text = `${opener}: ${taste}.`;
  if (rnd() < 0.8) text += ` ${pick(rnd, EXTRA[t][extraKey])}.`;
  if (rnd() < 0.75) text += ` ${pick(rnd, CLOSE[t])}`;
  return text;
}

/* ---------- Quán ---------- */
const SHOP_OPEN = {
  hi: ['Quán {shop} làm việc rất chuyên nghiệp', 'Đặt ở {shop} luôn yên tâm', 'Mình đặt {shop} thường xuyên', 'Lần này {shop} làm mình hài lòng hơn cả mong đợi', 'Nhờ bạn giới thiệu mà biết {shop}', 'Hôm nay đặt {shop} cho cả nhà', 'Quán xác nhận đơn rất nhanh', 'Cuối tuần nào cũng có {shop} trong giỏ', '{shop} giữ chất lượng rất ổn định', 'Gọi {shop} lần nào cũng thấy hợp', 'Nhân viên {shop} trả lời nhắn tin nhanh', 'Đơn từ {shop} đến đúng như đặt', 'Mình khá ưng {shop} trong khu này', '{shop} làm đơn gọn gàng, đúng giờ', 'Trải nghiệm với {shop} rất dễ chịu', 'Mình giới thiệu {shop} cho đồng nghiệp rồi', 'Mỗi lần cần món nhanh là mình nghĩ tới {shop}', 'Đơn đầu tiên ở {shop} đã làm mình ấn tượng', '{shop} chuẩn bị nhanh hơn dự kiến', 'Cả nhà mình đều thích {shop}', '{shop} ghi chú của mình rất kỹ', 'Quán {shop} đóng gói có tâm', 'Đặt {shop} thấy giá hợp lý so với chất lượng', 'Lần thứ mấy rồi mình vẫn chọn {shop}', 'Chọn {shop} chưa bao giờ làm mình thất vọng'],
  mid: ['{shop} ở mức trung bình', 'Đặt {shop} lần đầu', 'Quán {shop} cũng ổn', 'Trải nghiệm với {shop} chưa có gì đặc biệt', 'Gọi {shop} cho tiện', 'Mình kỳ vọng {shop} nhỉnh hơn một chút', '{shop} làm đúng đơn nhưng không nổi bật', 'Đơn từ {shop} tạm chấp nhận được', 'Mình thử {shop} theo gợi ý', '{shop} ổn nhưng còn vài điểm cần cải thiện', 'Lần này {shop} chỉ ở mức khá', 'Đặt {shop} giờ đông nên hơi chờ', 'Món từ {shop} ăn được, chưa ấn tượng', 'Mình sẽ cho {shop} thêm cơ hội', '{shop} chưa làm mình thật sự hài lòng', 'Quán {shop} phục vụ bình thường', 'Giá ở {shop} hơi nhỉnh so với khẩu phần', 'Đơn của mình ở {shop} đến hơi chậm'],
  lo: ['Hơi thất vọng với {shop}', 'Lần này {shop} làm không tốt', 'Đặt {shop} nhưng trải nghiệm kém', 'Rất tiếc về {shop}', 'Mình không hài lòng với {shop} lần này', '{shop} làm mình mất khá nhiều thời gian chờ', 'Đơn từ {shop} không như mong đợi', 'Chất lượng {shop} lần này giảm rõ rệt', 'Mình từng thích {shop} nhưng lần này thì không', 'Gọi {shop} mà gặp nhiều sự cố', 'Khâu đóng gói của {shop} cần xem lại', 'Đơn ở {shop} có vài chỗ chưa đúng', 'Mình hơi buồn vì {shop} lần này', 'Trải nghiệm với {shop} chưa tốt', 'Lần này {shop} chưa làm đúng yêu cầu của mình', 'Mong {shop} cải thiện thêm', '{shop} giao đơn khác xa kỳ vọng', 'Mình khá tiếc với đơn ở {shop}']
};
const SHOP_MID = {
  hi: { all: ['món ra nhanh, đóng gói gọn', 'nhân viên trả lời tin nhắn nhiệt tình', 'khẩu phần xứng đáng với giá', 'vị ổn định qua nhiều lần đặt', 'ghi chú được làm đúng', 'bao bì chắc, sạch sẽ', 'đơn đúng món, đủ phần', 'quán chuẩn bị đúng giờ hẹn'], hot: ['món nóng, giao còn nguyên hình', 'đồ ăn nóng hổi khi tới tay', 'món nóng giòn, đúng như mô tả'], drink: ['ly đóng nắp chắc, không đổ', 'đá đủ, vị ổn định mọi lần', 'đồ uống pha đúng mức đường đã chọn'], dessert: ['bánh/chè nguyên vẹn, còn lạnh', 'hộp đóng đẹp, không bị móp', 'ngọt vừa, trình bày gọn'], fresh: ['rau tươi, đóng hộp kỹ', 'món cuốn còn nguyên hình, nước chấm đủ', 'nguyên liệu tươi, ăn mát'] },
  mid: { all: ['món ra hơi chậm giờ cao điểm', 'đồ ăn ổn nhưng đóng gói chưa kỹ', 'khẩu phần vừa phải', 'vị ổn, không quá nổi bật', 'giá hơi cao so với mặt bằng', 'thiếu một ít đồ kèm', 'quán xác nhận đơn khá lâu'], hot: ['món nguội bớt khi tới nơi'], drink: ['đá hơi nhiều', 'ly hơi đầy nắp'], dessert: ['hộp hơi móp nhẹ'], fresh: ['rau hơi mềm khi nhận'] },
  lo: { all: ['đơn ra quá lâu so với dự kiến', 'thiếu phần so với đơn đặt', 'đóng gói sơ sài', 'không làm theo ghi chú', 'hỏi quán thì trả lời qua loa', 'chất lượng giảm so với trước'], hot: ['món nguội, không còn như mọi lần'], drink: ['ly bị đổ một phần, đá tan hết'], dessert: ['bánh/chè đã chảy khi tới'], fresh: ['rau không còn tươi'] }
};
const SHOP_TAIL = {
  hi: ['Sẽ đặt lại.', 'Ủng hộ dài dài.', 'Rất đáng để thử.', 'Mong quán luôn giữ chất lượng.', 'Giới thiệu cho đồng nghiệp rồi.', 'Lần sau gọi thêm món khác.'],
  mid: ['Có thể thử lại sau.', 'Mong quán cải thiện thêm.', 'Tạm chấp nhận.', 'Chưa đủ để mình quay lại ngay.'],
  lo: ['Mong quán xem lại.', 'Sẽ cân nhắc trước khi đặt lại.', 'Hy vọng lần sau tốt hơn.', 'Chưa hài lòng với lần này.']
};

function shopText(rnd, ctx) {
  const t = tier(ctx.stars);
  const tag = ctx.tag ?? shopTag(ctx.category, ctx.shopName);
  const midPool = [...SHOP_MID[t].all, ...(SHOP_MID[t][tag] ?? [])];
  const first = pick(rnd, midPool);
  const opener = pick(rnd, SHOP_OPEN[t]).replaceAll('{shop}', ctx.shopName ?? 'quán');
  let text = `${opener}: ${first}.`;
  const others = midPool.filter(item => item !== first);
  if (others.length && rnd() < 0.85) text += ` ${cap(pick(rnd, others))}.`;
  if (rnd() < 0.7) text += ` ${pick(rnd, SHOP_TAIL[t])}`;
  return text.replace(/\.\.+/g, '.');
}

/* ---------- Tài xế ---------- */
const SHIP = {
  hi: {
    open: ['Tài xế thân thiện', 'Anh/chị shipper giao rất nhanh', 'Giao hàng đúng hẹn', 'Shipper gọi báo trước khi tới', 'Hàng đến còn nguyên vẹn', 'Tài xế lịch sự và cẩn thận', 'Bạn shipper nhiệt tình', 'Giao nhanh hơn dự kiến', 'Shipper tìm nhà dễ dàng', 'Chuyến giao mượt mà', 'Tài xế chạy xe cẩn thận', 'Nhận hàng rất nhanh gọn', 'Shipper nhắn tin báo vị trí', 'Giao hàng chuyên nghiệp'],
    mid: ['đồ không bị đổ', 'giữ hộp thẳng suốt quãng đường', 'trả lời tin nhắn ngay', 'tìm địa chỉ nhanh dù ngõ nhỏ', 'chủ động đưa tận tay', 'túi đồ gọn gàng, kín đáo', 'đến sớm vài phút', 'chào hỏi vui vẻ', 'xác nhận đúng món trước khi giao', 'đi đường tắt nên nhanh', 'để hàng đúng chỗ mình dặn', 'nhắc mình kiểm tra đơn', 'mang theo cả dụng cụ ăn uống', 'không để mình phải chờ lâu', 'giao đúng tầng, đúng phòng'],
    tail: ['Cảm ơn bạn.', 'Rất hài lòng.', 'Mong gặp lại.', 'Dịch vụ tốt.', 'Chúc bạn nhiều đơn.', 'Rất đáng khen.', 'Lần sau vẫn chọn bạn này.', 'Điểm cộng cho khâu giao.', 'Quá ổn.']
  },
  mid: {
    open: ['Giao hàng bình thường', 'Tài xế đến hơi trễ', 'Shipper ổn', 'Giao tạm được', 'Chuyến giao ở mức trung bình', 'Shipper làm đúng việc', 'Giao đúng yêu cầu nhưng không nổi bật', 'Mình thấy khâu giao tạm chấp nhận'],
    mid: ['không có vấn đề lớn', 'hộp hơi nghiêng khi nhận', 'phải gọi lại một lần mới tìm được nhà', 'đến muộn vài phút', 'ít giao tiếp nhưng giao đủ', 'túi đồ hơi lỏng', 'không báo trước khi tới', 'chờ hơi lâu ở cổng', 'nhắn tin chậm một chút', 'giao đúng nhưng hơi vội'],
    tail: ['Tạm ổn.', 'Có thể tốt hơn.', 'Không quá nổi bật.', 'Hy vọng lần sau nhanh hơn.', 'Đúng mức trung bình.']
  },
  lo: {
    open: ['Tài xế giao rất chậm', 'Shipper thiếu cẩn thận', 'Giao hàng không tốt', 'Mình không hài lòng về khâu giao', 'Chuyến giao khiến mình thất vọng', 'Shipper làm mình mất khá nhiều thời gian'],
    mid: ['đồ bị đổ ra ngoài', 'gọi nhiều lần mới nghe máy', 'đến trễ gần nửa tiếng', 'không báo trước khi tới', 'thái độ hơi cộc', 'để hàng sai chỗ', 'đi nhầm đường nên giao muộn', 'không kiểm tra lại đơn', 'túi đồ bị nghiêng ngả'],
    tail: ['Mong được cải thiện.', 'Sẽ góp ý với quán.', 'Rất tiếc.', 'Hy vọng lần sau tốt hơn.', 'Cần rút kinh nghiệm.']
  }
};

function shipText(rnd, ctx) {
  const pool = SHIP[tier(ctx.stars)];
  const first = pick(rnd, pool.mid);
  let text = `${pick(rnd, pool.open)}: ${first}.`;
  if (rnd() < 0.6) text += ` ${cap(pick(rnd, pool.mid.filter(item => item !== first)))}.`;
  if (rnd() < 0.7) text += ` ${pick(rnd, pool.tail)}`;
  return text.replace(/\.\.+/g, '.');
}

/* ---------- Phản hồi của quán ---------- */
const REPLY = {
  hi: {
    open: ['Cảm ơn bạn đã ủng hộ {shop}!', 'Cảm ơn bạn đã tin tưởng đặt món của quán.', '{shop} cảm ơn bạn rất nhiều.', 'Quán rất vui khi nhận được đánh giá của bạn.', 'Cảm ơn bạn đã dành thời gian đánh giá.', 'Bạn ơi, cảm ơn bạn đã chọn {shop}.', 'Cảm ơn lời khen của bạn nhé.', 'Quán xin cảm ơn sự ủng hộ của bạn.', 'Nhận được đánh giá của bạn, cả quán đều vui.', 'Cảm ơn bạn đã quay lại với quán.', 'Đọc đánh giá của bạn, anh chị em trong bếp rất phấn khởi.', 'Cảm ơn bạn đã chia sẻ trải nghiệm tốt.', 'Thật vui vì bạn hài lòng.', 'Cảm ơn bạn nhiều lắm.', 'Quán ghi nhận lời khen của bạn.'],
    body: ['Quán sẽ cố gắng giữ vững chất lượng.', 'Đó là động lực để quán phục vụ tốt hơn.', 'Mong những đơn sau vẫn làm bạn hài lòng.', 'Quán luôn cố gắng làm từng suất ăn thật tươi ngon.', 'Có góp ý gì bạn cứ nhắn để quán hoàn thiện thêm.', 'Quán sẽ chuyển lời khen tới đội bếp.', 'Chúng mình sẽ tiếp tục giữ đúng vị như thế này.', 'Sự hài lòng của bạn là điều quán mong nhất.'],
    close: ['Hẹn gặp lại bạn nhé!', 'Chúc bạn ngon miệng những lần sau.', 'Rất mong được phục vụ bạn tiếp.', 'Chúc bạn một ngày vui vẻ.', 'Hẹn bạn ở đơn tiếp theo.', 'Chúc bạn và gia đình nhiều sức khoẻ.']
  },
  mid: {
    open: ['Cảm ơn bạn đã góp ý cho {shop}.', 'Quán ghi nhận đánh giá của bạn.', 'Cảm ơn bạn đã dành thời gian phản hồi.', '{shop} cảm ơn góp ý chân thành của bạn.', 'Cảm ơn bạn, quán đã đọc kỹ đánh giá.', 'Quán xin cảm ơn ý kiến của bạn.', 'Bạn ơi, cảm ơn bạn đã chia sẻ trải nghiệm.', 'Cảm ơn bạn đã đánh giá thẳng thắn.', 'Quán trân trọng nhận xét của bạn.', 'Cảm ơn bạn đã cho quán cơ hội.'],
    body: ['Quán sẽ điều chỉnh để lần sau tốt hơn.', 'Chúng mình sẽ xem lại khẩu vị và khâu đóng gói.', 'Quán sẽ chuyển ý kiến tới bộ phận bếp.', 'Mong bạn cho quán thêm cơ hội để làm bạn hài lòng hơn.', 'Những điều chưa ổn quán đã ghi lại để cải thiện.', 'Quán sẽ rút kinh nghiệm ngay từ những đơn tới.', 'Quán sẽ cố gắng cải thiện thời gian chuẩn bị.', 'Quán sẽ kiểm tra lại quy trình để bớt những chỗ bạn chưa vừa ý.'],
    close: ['Hẹn bạn ở đơn sau nhé.', 'Rất mong sớm được phục vụ bạn tốt hơn.', 'Cảm ơn bạn đã đồng hành cùng quán.', 'Chúc bạn một ngày tốt lành.', 'Nếu cần hỗ trợ, bạn cứ nhắn cho quán.']
  },
  lo: {
    open: ['Quán xin lỗi bạn về trải nghiệm chưa tốt.', 'Thật sự xin lỗi bạn vì đơn lần này.', '{shop} rất tiếc vì đã làm bạn thất vọng.', 'Quán chân thành xin lỗi bạn.', 'Cảm ơn bạn đã nói thẳng, quán xin lỗi vì sự bất tiện.', 'Quán rất tiếc về những gì bạn gặp phải.', 'Xin lỗi bạn, đơn lần này quán chưa làm tốt.', 'Quán xin nhận lỗi về phần mình.', 'Quán đã đọc đánh giá của bạn và rất áy náy.', 'Xin lỗi bạn vì đã làm hỏng bữa ăn của bạn.'],
    body: ['Quán đã ghi nhận và sẽ cải thiện khâu đóng gói và thời gian chuẩn bị.', 'Chúng mình sẽ làm việc lại với đội bếp ngay hôm nay.', 'Quán sẽ kiểm tra lại nguyên liệu và quy trình làm món.', 'Mong bạn liên hệ quán để được hỗ trợ cho đơn này.', 'Quán sẽ rút kinh nghiệm để không lặp lại.', 'Quán sẽ xem lại khâu giao nhận cùng tài xế.', 'Quán sẽ chấn chỉnh ngay để đơn sau tốt hơn.', 'Phản hồi của bạn giúp quán nhìn ra chỗ cần sửa.'],
    close: ['Mong bạn cho quán một cơ hội sửa sai.', 'Quán rất mong được phục vụ bạn tốt hơn.', 'Hẹn bạn ở lần tới, quán sẽ cố gắng hơn.', 'Một lần nữa quán xin lỗi bạn.', 'Cảm ơn bạn đã góp ý để quán hoàn thiện hơn.']
  }
};

function replyText(rnd, ctx) {
  const pool = REPLY[ctx.stars >= 4 ? 'hi' : ctx.stars === 3 ? 'mid' : 'lo'];
  let text = pick(rnd, pool.open).replaceAll('{shop}', ctx.shopName ?? 'Quán');
  if (rnd() < 0.85) text += ` ${pick(rnd, pool.body)}`;
  if (rnd() < 0.8) text += ` ${pick(rnd, pool.close)}`;
  return text;
}

function compose(rnd, ctx) {
  if (ctx.kind === 'dish') return dishText(rnd, ctx);
  if (ctx.kind === 'shop') return shopText(rnd, ctx);
  if (ctx.kind === 'reply') return replyText(rnd, ctx);
  return shipText(rnd, ctx);
}

/** Bộ đếm câu toàn hệ thống: một câu tối đa `maxRepeat` lần. */
export function createRegistry(maxRepeat = 3) {
  return { counts: new Map(), maxRepeat };
}

/**
 * Sinh bình luận khác biệt. ctx: { kind: 'dish'|'shop'|'ship'|'reply', stars, dishName, category, shopName, drink? }.
 * Thử tới 40 lần để tránh trùng quá giới hạn; nếu bộ câu cạn thì thêm hậu tố ngắn có nghĩa để vẫn không lặp.
 */
export function makeUniqueComment(rnd, ctx, registry) {
  let text = '';
  for (let attempt = 0; attempt < 40; attempt += 1) {
    text = compose(rnd, ctx);
    if ((registry.counts.get(text) ?? 0) < registry.maxRepeat) break;
    text = '';
  }
  if (!text) text = `${compose(rnd, ctx)} (đặt lần thứ ${2 + Math.floor(rnd() * 9)})`;
  registry.counts.set(text, (registry.counts.get(text) ?? 0) + 1);
  return text;
}

/** Số mẫu mở đầu của review quán / phản hồi của quán theo nhóm sao (để thống kê/kiểm thử). */
export const shopOpenerCount = () => Object.values(SHOP_OPEN).reduce((sum, list) => sum + list.length, 0);
export const replyOpenerCount = stars => REPLY[stars >= 4 ? 'hi' : stars === 3 ? 'mid' : 'lo'].open.length;
export const replyVariantCount = stars => { const p = REPLY[stars >= 4 ? 'hi' : stars === 3 ? 'mid' : 'lo']; return p.open.length * p.body.length * p.close.length; };

/** Số mẫu khác nhau tối đa của một nhóm (tương thích kiểm thử cũ). */
export function poolSize(kind, stars, drink = false) {
  const t = tier(stars);
  if (kind === 'dish') return OPEN[t].length * (drink ? TASTE.tea.hi.length : TASTE.generic.hi.length) * EXTRA[t].neutral.length * CLOSE[t].length * 4;
  if (kind === 'shop') return SHOP_OPEN[t].length * SHOP_MID[t].all.length * SHOP_MID[t].all.length * SHOP_TAIL[t].length;
  if (kind === 'reply') return replyVariantCount(stars);
  const p = SHIP[t]; return p.open.length * p.mid.length * p.mid.length * p.tail.length;
}
