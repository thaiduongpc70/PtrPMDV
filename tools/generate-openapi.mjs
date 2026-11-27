/* Sinh docs/openapi.json từ danh sách route THẬT (quét stack Express của createApp()), giữ nguyên các mô tả chi tiết đã viết tay
   trong file cũ (nếu route đã có) và bổ sung các route còn thiếu: tag theo module, mô tả tiếng Việt ngắn, tham số đường dẫn, bảo mật Bearer.
   Chạy:  node tools/generate-openapi.mjs   (cần MySQL đang chạy như generate-dev-docs.mjs) */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(root, 'food-delivery-platform', 'backend');
process.chdir(backend);
await import(pathToFileURL(resolve(backend, 'node_modules/dotenv/config.js')).href).catch(() => {});
const { createApp } = await import(pathToFileURL(resolve(backend, 'src/app.js')).href);
const app = createApp();

function pathOf(layer) {
  const source = layer.regexp.source;
  if (source === '^\\/?(?=\\/|$)') return '';
  return source.replace('^\\/', '/').replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/').replace(/^\^/, '');
}
const routes = [];
function walk(stack, prefix) {
  for (const layer of stack) {
    if (layer.route) {
      for (const method of Object.keys(layer.route.methods)) routes.push({ method, path: `${prefix}${layer.route.path === '/' ? '' : layer.route.path}` || '/' });
    } else if (layer.name === 'router' && layer.handle?.stack) walk(layer.handle.stack, `${prefix}${pathOf(layer)}`);
  }
}
walk(app._router.stack, '');
const api = routes.filter(route => (route.path.startsWith('/api') || route.path.startsWith('/health')) && route.method !== '_all');

/* ---- tag theo module (tiền tố đường dẫn dài nhất thắng) ---- */
const TAGS = [
  ['/health', 'Sức khoẻ hệ thống'], ['/api/auth', 'Xác thực'], ['/api/account', 'Tài khoản'], ['/api/catalog', 'Danh mục công khai'],
  ['/api/customer/addresses', 'Khách: địa chỉ'], ['/api/customer/profile', 'Khách: hồ sơ'], ['/api/customer/cart', 'Khách: giỏ và đặt hàng'], ['/api/customer/orders', 'Khách: giỏ và đặt hàng'],
  ['/api/customer', 'Khách hàng'], ['/api/restaurant', 'Chủ quán'], ['/api/shippers', 'Tài xế'], ['/api/deliveries', 'Giao hàng'],
  ['/api/payments', 'Thanh toán'], ['/api/settlements', 'Quyết toán'], ['/api/communication', 'Chat, đánh giá, hỗ trợ'], ['/api/notifications', 'Thông báo'],
  ['/api/jobs', 'Công việc nền'], ['/api/analytics', 'Phân tích'], ['/api/admin/dashboard', 'Quản trị: tổng quan và chất lượng dữ liệu'],
  ['/api/admin/audit-logs', 'Quản trị: nhật ký'], ['/api/admin/export', 'Xuất dữ liệu'], ['/api/admin', 'Quản trị'], ['/api/partners', 'Đối tác'],
  ['/api/live', 'Giao hàng thời gian thực'], ['/api/promotions', 'Khuyến mãi và điểm thưởng'], ['/api/rewards', 'Khuyến mãi và điểm thưởng']
];
const tagOf = path => (TAGS.filter(([prefix]) => path === prefix || path.startsWith(`${prefix}/`)).sort((a, b) => b[0].length - a[0].length)[0]?.[1]) ?? 'Khác';

/* ---- mô tả tiếng Việt ngắn ---- */
const NOUNS = {
  restaurants: 'quán ăn', 'menu-items': 'món ăn', menus: 'thực đơn', categories: 'danh mục', orders: 'đơn hàng', order: 'đơn hàng', cart: 'giỏ hàng', items: 'món trong giỏ', addresses: 'địa chỉ',
  profile: 'hồ sơ', reviews: 'đánh giá', 'restaurant-review': 'đánh giá quán', 'shipper-review': 'đánh giá tài xế', 'item-reviews': 'đánh giá món', notifications: 'thông báo', refunds: 'yêu cầu hoàn tiền',
  settlements: 'bản quyết toán', promotions: 'khuyến mãi', vouchers: 'mã giảm giá', users: 'người dùng', banners: 'banner', zones: 'vùng giao hàng', 'delivery-zones': 'vùng giao hàng', login: 'đăng nhập',
  register: 'đăng ký', logout: 'đăng xuất', refresh: 'làm mới phiên đăng nhập', storefront: 'số liệu trang chủ', quote: 'báo giá', checkout: 'đặt hàng', cancel: 'huỷ đơn', payments: 'thanh toán',
  deliveries: 'chuyến giao', shippers: 'tài xế', chat: 'trò chuyện', tickets: 'phiếu hỗ trợ', analytics: 'phân tích', dashboard: 'tổng quan', 'data-quality': 'chất lượng dữ liệu', 'audit-logs': 'nhật ký hệ thống',
  images: 'ảnh', toppings: 'topping', combo: 'thành phần combo', hours: 'giờ mở cửa', status: 'trạng thái', availability: 'trạng thái làm việc', 'system-settings': 'cấu hình hệ thống', export: 'xuất dữ liệu', jobs: 'công việc nền'
};
const OVERRIDES = {
  'GET /api/deliveries/reviews': ['Xem đánh giá tài xế (chỉ đọc)', 'ADMIN xem tất cả (lọc ?shipperId), tài xế chỉ xem của mình, khách 403. limit tối đa 100 + offset; sai tham số trả 400.'],
  'GET /api/admin/dashboard/data-quality': ['Báo cáo chất lượng dữ liệu', 'Đếm trên 100% bản ghi: đơn ngoài giờ, huỷ/thất bại còn PAID, đơn dở, lệch điểm, món thiếu ảnh, voucher quá hạn, hoàn tiền quá hạn.'],
  'GET /api/notifications': ['Danh sách thông báo (phân trang)', 'Nhận page/pageSize (hoặc limit); trả items, totalItems, pagination {page,pageSize,totalItems,totalPages} và unreadCount.'],
  'POST /api/customer/orders/checkout': ['Đặt hàng', 'Cần ageConfirmed=true khi giỏ có đồ uống có cồn (kể cả combo chứa bia); vượt 15 km, thanh toán sai, thiếu trường trả 400 tiếng Việt.'],
  'PATCH /api/notifications/read-all': ['Đánh dấu tất cả thông báo đã đọc', 'Chỉ của chính người dùng; không xoá thông báo; trả {updated, unreadCount, totalItems}. POST cũng được.'],
  'POST /api/notifications/read-all': ['Đánh dấu tất cả thông báo đã đọc (POST)', 'Giống PATCH /api/notifications/read-all.'],
  'GET /api/admin/manage/customers': ['Danh sách khách hàng (có tìm kiếm)', 'Tham số search (hoặc keyword/q): tìm theo tên, email, số điện thoại, username; phân trang page/pageSize.'],
  'POST /api/customer/orders/quote': ['Báo giá đơn hàng', 'Trả phí giao, thuế, tổng, outOfRange (quá vùng giao) và requiresAgeConfirmation.']
};
const lastSegment = path => path.split('/').filter(part => part && !part.startsWith(':')).pop() ?? '';
const describe = (method, path) => {
  const override = OVERRIDES[`${method.toUpperCase()} ${path}`];
  if (override) return override;
  const parts = path.split('/').filter(Boolean);
  const noun = NOUNS[lastSegment(path)] ?? lastSegment(path).replace(/-/g, ' ');
  const byId = parts[parts.length - 1]?.startsWith(':');
  const verb = { get: byId ? 'Xem chi tiết' : 'Xem danh sách', post: 'Tạo / gửi', put: 'Thay thế', patch: 'Cập nhật', delete: 'Xoá' }[method] ?? method;
  return [`${verb} ${noun}`, `Route ${method.toUpperCase()} ${path} (mô tả tự sinh; xem docs/dev/api-routes.md).`];
};

const existing = JSON.parse(await readFile(resolve(root, 'docs', 'openapi.json'), 'utf8'));
const doc = { ...existing, info: { ...existing.info, description: 'API đặt món & giao hàng FoodGo (khách hàng, chủ quán, tài xế, quản trị). Sinh/đối chiếu từ route thật bằng tools/generate-openapi.mjs; mô tả chi tiết tham số/response của một số route do viết tay.' } };
doc.components = doc.components ?? {};
doc.components.securitySchemes = { ...(doc.components.securitySchemes ?? {}), bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } };
const toOpenApiPath = path => path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
const paths = { ...existing.paths };
let added = 0;
for (const route of api) {
  const openPath = toOpenApiPath(route.path);
  paths[openPath] ??= {};
  if (paths[openPath][route.method]) continue; // giữ mô tả chi tiết viết tay
  const [summary, description] = describe(route.method, route.path);
  const params = [...route.path.matchAll(/:([A-Za-z0-9_]+)/g)].map(match => ({ name: match[1], in: 'path', required: true, schema: { type: 'string' }, description: `Mã/định danh ${match[1]}` }));
  paths[openPath][route.method] = {
    tags: [tagOf(route.path)], summary, description,
    ...(params.length ? { parameters: params } : {}),
    ...(route.path.startsWith('/health') || route.path.startsWith('/api/auth') || route.path.startsWith('/api/catalog') ? {} : { security: [{ bearerAuth: [] }] }),
    responses: { 200: { description: 'Thành công' }, 400: { description: 'Dữ liệu không hợp lệ (thông báo tiếng Việt)' }, 401: { description: 'Chưa đăng nhập' }, 403: { description: 'Không đủ quyền' } }
  };
  added += 1;
}
// Gắn tag tiếng Việt cho thao tác cũ còn dùng tag tiếng Anh? Giữ nguyên; chỉ bổ sung tag mới vào danh sách tags.
const used = new Set();
for (const operations of Object.values(paths)) for (const operation of Object.values(operations)) for (const tag of operation.tags ?? []) used.add(tag);
const known = new Set((existing.tags ?? []).map(tag => tag.name));
doc.tags = [...(existing.tags ?? []), ...[...used].filter(tag => !known.has(tag)).sort().map(name => ({ name }))];
doc.paths = Object.fromEntries(Object.entries(paths).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(resolve(root, 'docs', 'openapi.json'), `${JSON.stringify(doc, null, 2)}\n`);

const covered = api.filter(route => doc.paths[toOpenApiPath(route.path)]?.[route.method]).length;
const total = Object.values(doc.paths).reduce((sum, operations) => sum + Object.keys(operations).length, 0);
console.log(`openapi.json: ${total} thao tác; route thật ${api.length}, phủ ${covered} (${(100 * covered / api.length).toFixed(1)}%), bổ sung mới ${added}`);
process.exit(0);
