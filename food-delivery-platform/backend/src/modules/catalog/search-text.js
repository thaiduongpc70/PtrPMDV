/* Chuẩn hoá và xếp hạng tìm kiếm tiếng Việt (thuần hàm, không cần DB).
   Quy tắc:
   - Truy vấn được chuẩn hoá NFC, chữ thường, tách từ; MỌI từ phải khớp (AND).
   - Từ CÓ dấu thì phân biệt dấu (phở ≠ phố ≠ phô); từ KHÔNG dấu thì coi là không dấu (pho khớp cả phở/phố/phô). đ ≠ d khi có dấu gạch ngang ("đ").
   - Xếp hạng: khớp tên có dấu chính xác > khớp tên không dấu > khớp tên (đủ từ) > khớp danh mục/món/quán > khớp mô tả. */

const MAX_TOKENS = 8;

/** Bỏ dấu tiếng Việt (kể cả đ/Đ -> d/D) và đưa về chữ thường. */
export function stripDiacritics(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** Bỏ dấu + gộp y/i ("mỳ" ≡ "mì", "my y" tìm được "mì ý"): dùng để so khớp KHÔNG dấu hai chiều. */
export function foldPlain(text) {
  return stripDiacritics(text).replace(/y/g, 'i');
}

/** NFC + chữ thường + gộp khoảng trắng (giữ nguyên dấu). */
export function normalizeText(text) {
  return String(text ?? '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Có dấu thanh/dấu mũ/đ hay không (khác với dạng không dấu của chính nó). */
export function hasDiacritics(text) {
  return stripDiacritics(normalizeText(text)) !== normalizeText(text);
}

/**
 * Phân tích truy vấn: { phrase, plainPhrase, tokens: [{ text, plain, accented }], accented } hoặc null nếu rỗng.
 * Ký tự không phải chữ/số bị coi là dấu cách.
 */
export function parseSearchQuery(raw) {
  const phrase = normalizeText(String(raw ?? '').replace(/[^\p{L}\p{N}\s]/gu, ' '));
  if (!phrase) return null;
  const tokens = [...new Set(phrase.split(' ').filter(Boolean))].slice(0, MAX_TOKENS).map(text => ({
    text,
    plain: stripDiacritics(text),
    fold: foldPlain(text),
    accented: hasDiacritics(text)
  }));
  return { phrase, plainPhrase: stripDiacritics(phrase), tokens, accented: tokens.some(token => token.accented) };
}

/** Một từ có xuất hiện trong văn bản không (có dấu: khớp đúng dấu; không dấu: bỏ qua dấu). */
export function tokenMatches(text, token) {
  if (!text) return false;
  return token.accented ? normalizeText(text).includes(token.text) : foldPlain(text).includes(token.fold);
}

/** Mọi từ của truy vấn đều khớp ít nhất một trong các văn bản. */
export function matchesAll(texts, parsed) {
  return parsed.tokens.every(token => texts.some(text => tokenMatches(text, token)));
}

/** Thoát ký tự đại diện của LIKE (% _ \). */
export function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, match => `\\${match}`);
}

/**
 * Điểm liên quan (cao hơn = đứng trước). `fields`: { name, description, related: [chuỗi...] }.
 *  +40 tên chứa nguyên cụm từ, đúng dấu · +30 tên chứa cụm từ không dấu · +20 tên khớp đủ từ
 *  +10 danh mục/món/quán liên quan khớp đủ từ · +5 mô tả khớp đủ từ
 */
export function relevanceScore(fields, parsed) {
  if (!parsed) return 0;
  const name = fields.name ?? '';
  let score = 0;
  if (normalizeText(name).includes(parsed.phrase)) score += 40;
  if (stripDiacritics(name).includes(parsed.plainPhrase)) score += 30;
  if (name && matchesAll([name], parsed)) score += 20;
  if (matchesAll(fields.related ?? [], parsed)) score += 10;
  if (fields.description && matchesAll([fields.description], parsed)) score += 5;
  return score;
}

/** Sắp ổn định theo điểm giảm dần; các mục bằng điểm giữ thứ tự sắp xếp gốc (theo `sort` người dùng chọn). */
export function rankByRelevance(items, scoreOf) {
  return items
    .map((item, index) => ({ item, index, score: scoreOf(item) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(entry => entry.item);
}

/** Mệnh đề SQL cho một từ trên biểu thức `expr` (chuỗi). Trả { sql, param }. */
export function tokenLikeSql(expr, token) {
  const value = `%${escapeLike(token.accented ? token.text : token.plain)}%`;
  if (token.accented) return { sql: `(COALESCE(${expr}, '') COLLATE utf8mb4_0900_as_ci LIKE ?)`, param: value };
  // không dấu: bỏ dấu đ và gộp mọi dạng y/ý/ỳ/ỷ/ỹ/ỵ thành i ở cả hai phía (so khớp hai chiều)
  let folded = `LOWER(COALESCE(${expr}, ''))`;
  for (const from of ['đ', 'ý', 'ỳ', 'ỷ', 'ỹ', 'ỵ', 'y']) folded = `REPLACE(${folded}, '${from}', '${from === 'đ' ? 'd' : 'i'}')`;
  return { sql: `(${folded} LIKE ?)`, param: `%${escapeLike(token.fold)}%` };
}

/** Điều kiện SQL: mọi từ phải khớp ít nhất một trong các biểu thức `exprs`. */
export function allTokensSql(exprs, parsed) {
  const clauses = [];
  const params = [];
  for (const token of parsed.tokens) {
    const parts = exprs.map(expr => (typeof expr === 'string' ? tokenLikeSql(expr, token) : expr(token)));
    clauses.push(`(${parts.map(part => part.sql).join(' OR ')})`);
    for (const part of parts) params.push(part.param);
  }
  return { sql: clauses.join(' AND '), params };
}

/* ---- Khớp từ trọn vẹn + trọng số theo trường (tên quán > tên món > danh mục > mô tả) ---- */

/** Các từ (đã chuẩn hoá NFC, chữ thường) của một chuỗi. */
export function wordsOf(text) {
  return normalizeText(String(text ?? '').replace(/[^\p{L}\p{N}\s]/gu, ' ')).split(' ').filter(Boolean);
}

/** Từ có dấu: khớp đầu từ đúng dấu (phở ≠ phố). Từ không dấu: chỉ khớp TỪ TRỌN VẸN sau khi bỏ dấu (com ≠ combo). */
export function tokenInWords(words, token) {
  return token.accented
    ? words.some(word => word.startsWith(token.text))
    : token.exact
      ? words.includes(token.plain)
      : words.some(word => foldPlain(word) === token.fold);
}

export function allTokensInWords(words, parsed) {
  return parsed.tokens.every(token => tokenInWords(words, token));
}

/** Số lượng món cần có ở nhóm "khớp chính" trước khi cho mô tả bổ sung vào kết quả. */
export const WEAK_FILL_BELOW = 5;
/** Kết quả 'strong' phải đạt ít nhất tỉ lệ này so với điểm cao nhất; còn ít kết quả chính thì bổ sung nhóm phụ nhưng tổng không quá MAX_RESULTS_WHEN_FEW. */
export const RELATIVE_CUT = 0.2;
export const MAX_RESULTS_WHEN_FEW = 8;
/** Số món tối thiểu khớp để một quán được coi là kết quả chính khi tên/danh mục quán không chứa từ khoá. */
export const MIN_DISH_HITS = Number(process.env.SEARCH_MIN_DISH_HITS ?? 3);

const flat = (...lists) => lists.flatMap(list => wordsOf(Array.isArray(list) ? list.join(' ') : list));

/**
 * Quán: { name, description, category, dishes: [tên món] }.
 * 'strong' = mọi từ nằm trong (tên + danh mục + MỘT tên món) hoặc (tên + danh mục); 'weak' = cần thêm mô tả; null = không khớp.
 * Từ rải ở nhiều món khác nhau KHÔNG tính (tránh "bún" ở món này + "bò" ở món kia).
 */
export function matchRestaurant(shop, parsed) {
  const head = flat(shop.name, shop.category);
  if (allTokensInWords(head, parsed)) return 'strong';
  const dishHits = (shop.dishes ?? []).filter(dish => allTokensInWords([...head, ...wordsOf(dish)], parsed)).length;
  // khớp nhờ món: cần ít nhất MIN_DISH_HITS món (quán chỉ tình cờ có 1 món 'gà'/'phở' không phải kết quả chính); 1 món thì chỉ là 'weak'
  if (dishHits >= MIN_DISH_HITS) return 'strong';
  if (dishHits > 0) return 'weak';
  if (allTokensInWords([...head, ...wordsOf(shop.description)], parsed)) return 'weak';
  return null;
}

/** Điểm quán: tên đúng dấu +40, tên bỏ dấu +10 (+30 nếu truy vấn có dấu và khớp đúng), món khớp +6/món (≤30), danh mục +8, mô tả +3. */
export function scoreRestaurant(shop, parsed) {
  let score = 0;
  const name = shop.name ?? '';
  if (normalizeText(name).includes(parsed.phrase)) score += 40;
  if (stripDiacritics(name).includes(parsed.plainPhrase)) score += 5;
  if (allTokensInWords(wordsOf(name), parsed)) score += parsed.accented ? 30 : 10;
  const dishHits = (shop.dishes ?? []).filter(dish => allTokensInWords(wordsOf(dish), parsed)).length;
  score += Math.min(dishHits, 5) * 6;
  if (shop.category && allTokensInWords(wordsOf(shop.category), parsed)) score += 8;
  if (shop.description && allTokensInWords(wordsOf(shop.description), parsed)) score += 3;
  return score;
}

/** Món: { name, description, restaurant, category }. */
export function matchItem(item, parsed) {
  const strong = flat(item.name, item.restaurant, item.category);
  if (allTokensInWords(strong, parsed)) return 'strong';
  if (allTokensInWords([...strong, ...wordsOf(item.description)], parsed)) return 'weak';
  return null;
}

export function scoreItem(item, parsed) {
  let score = 0;
  const name = item.name ?? '';
  if (normalizeText(name).includes(parsed.phrase)) score += 40;
  if (stripDiacritics(name).includes(parsed.plainPhrase)) score += 5;
  if (allTokensInWords(wordsOf(name), parsed)) score += parsed.accented ? 30 : 10;
  if (item.restaurant && allTokensInWords(wordsOf(item.restaurant), parsed)) score += 8;
  if (item.category && allTokensInWords(wordsOf(item.category), parsed)) score += 6;
  if (item.description && allTokensInWords(wordsOf(item.description), parsed)) score += 3;
  return score;
}

/** Lọc + xếp hạng: giữ 'strong'; chỉ thêm 'weak' (khớp nhờ mô tả) khi 'strong' ít hơn WEAK_FILL_BELOW. Giữ thứ tự gốc khi bằng điểm. */
/**
 * Từ KHÔNG dấu mà dữ liệu có nguyên chữ không dấu đó (vd "bia" trong "Bia lon Tiger") thì chỉ khớp đúng từ ấy,
 * không kéo theo từ có dấu cùng gốc ("Bò bía"); nếu dữ liệu không có chữ không dấu đó ("pho" chỉ có "phở") thì vẫn khớp không dấu.
 */
export function withExactTokens(parsed, textLists) {
  const exact = new Set();
  for (const token of parsed.tokens) {
    if (token.accented) continue;
    if (textLists.some(texts => texts.some(text => wordsOf(text).includes(token.plain)))) exact.add(token.plain);
  }
  if (!exact.size) return parsed;
  return { ...parsed, tokens: parsed.tokens.map(token => (exact.has(token.plain) && !token.accented ? { ...token, exact: true } : token)) };
}

export function selectAndRank(rows, rawParsed, { match, score, textsOf = null }) {
  const parsed = textsOf ? withExactTokens(rawParsed, rows.map(textsOf)) : rawParsed;
  const classified = rows.map((row, index) => ({ row, index, level: match(row, parsed), score: score(row, parsed) })).filter(entry => entry.level);
  const strong = classified.filter(entry => entry.level === 'strong');
  const order = (x, y) => y.score - x.score || x.index - y.index;
  // Ngưỡng liên quan: kết quả 'strong' điểm quá thấp so với kết quả đầu (vd chỉ trùng danh mục) bị hạ xuống nhóm phụ
  const topScore = Math.max(0, ...strong.map(entry => entry.score));
  const kept = strong.filter(entry => entry.score >= RELATIVE_CUT * topScore).sort(order);
  if (kept.length >= WEAK_FILL_BELOW) return kept.map(entry => entry.row);
  const rest = classified.filter(entry => !kept.includes(entry)).sort(order);
  return [...kept, ...rest.slice(0, Math.max(0, MAX_RESULTS_WHEN_FEW - kept.length))].map(entry => entry.row);
}

/**
 * Với từ KHÔNG dấu, tìm dạng có dấu "chủ đạo" trong danh sách tên (tên danh mục quán: "Bún - Phở", "Cơm"…):
 * pho -> phở, com -> cơm. Trả Map(plain -> dạng có dấu).
 */
export function preferredForms(parsed, names) {
  const counts = new Map();
  for (const name of names) {
    for (const word of wordsOf(name)) {
      const plain = stripDiacritics(word);
      if (word === plain) continue;
      const bucket = counts.get(plain) ?? new Map();
      bucket.set(word, (bucket.get(word) ?? 0) + 1);
      counts.set(plain, bucket);
    }
  }
  const forms = new Map();
  for (const token of parsed.tokens.filter(item => !item.accented)) {
    const bucket = counts.get(token.plain);
    if (bucket) forms.set(token.plain, [...bucket.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  }
  return forms;
}

/** Bản truy vấn dùng để CHẤM ĐIỂM: từ không dấu có dạng chủ đạo thì chấm theo dạng có dấu đó (phô/phố chỉ còn khớp lỏng, điểm thấp). */
export function withPreferredForms(parsed, forms) {
  if (!forms.size) return parsed;
  const tokens = parsed.tokens.map(token => (forms.has(token.plain) ? { text: forms.get(token.plain), plain: token.plain, accented: true } : token));
  const phrase = tokens.map(token => token.text).join(' ');
  return { ...parsed, tokens, phrase, accented: tokens.some(token => token.accented) };
}
