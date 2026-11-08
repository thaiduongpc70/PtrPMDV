/* Banner trang chủ dựng từ dữ liệu thật trong DB (voucher toàn sàn đang chạy, combo tiết kiệm nhất, chương trình điểm thưởng),
   tạo qua API admin kèm ảnh nền PNG được sinh ra rồi lưu vào kho ảnh của hệ thống. Chữ trên banner do giao diện hiển thị
   từ chính dữ liệu voucher nên luôn khớp với DB. Chạy khi server đang chạy:  node scripts/load-banners.mjs */
import sharp from 'sharp';
import { api, tokenFor } from './lib/api-client.mjs';

const admin = await tokenFor('thaiduongpc7');
const store = await api('GET', '/api/catalog/storefront');
const money = value => `${Math.round(value / 1000)}K`;

const art = ([c1, c2, c3], seed) => `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="420" viewBox="0 0 1400 420">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
  <radialGradient id="r" cx=".85" cy=".2" r=".7"><stop offset="0" stop-color="${c3}" stop-opacity=".55"/><stop offset="1" stop-color="${c3}" stop-opacity="0"/></radialGradient></defs>
  <rect width="1400" height="420" fill="url(#g)"/><rect width="1400" height="420" fill="url(#r)"/>
  ${Array.from({ length: 7 }, (_, i) => `<circle cx="${(seed * 137 + i * 211) % 1400}" cy="${(seed * 53 + i * 97) % 420}" r="${50 + ((seed + i) % 5) * 28}" fill="#fff" opacity="${0.05 + (i % 3) * 0.03}"/>`).join('')}
</svg>`;

const png = async (colors, seed) => `data:image/png;base64,${(await sharp(Buffer.from(art(colors, seed))).png().toBuffer()).toString('base64')}`;
const percentVoucher = store.vouchers.filter(item => item.discountType === 'PERCENT').sort((a, b) => b.discountValue - a.discountValue)[0];
const freeship = store.vouchers.find(item => item.discountType === 'FREE_DELIVERY');
const newcomer = store.vouchers.find(item => item.firstOrderOnly);

const banners = [];
if (percentVoucher) banners.push({ title: `Giảm ${percentVoucher.discountValue}%${percentVoucher.maxDiscount ? ` tối đa ${money(percentVoucher.maxDiscount)}` : ''} cho đơn từ ${money(percentVoucher.minimumOrder)}`, target: `voucher:${percentVoucher.code}`, colors: ['#d93b1b', '#ff8a3d', '#ffd166'] });
if (freeship) banners.push({ title: `Freeship đơn từ ${money(freeship.minimumOrder)}, giảm tối đa ${money(freeship.maxDiscount ?? freeship.discountValue)} phí giao`, target: `voucher:${freeship.code}`, colors: ['#0b7a75', '#12b886', '#b2f2bb'] });
if (newcomer) banners.push({ title: `Khách mới giảm ${money(newcomer.discountValue)} cho đơn đầu tiên`, target: `voucher:${newcomer.code}`, colors: ['#5b2fc9', '#9b5de5', '#f1c0e8'] });
if (store.topCombo?.savings) banners.push({ title: `${store.topCombo.name} tại ${store.topCombo.restaurantName} tiết kiệm ${money(store.topCombo.savings)}`, target: `restaurant:${store.topCombo.restaurantId}`, colors: ['#b45309', '#f59e0b', '#fde68a'] });
if (store.loyalty.cheapestReward) banners.push({ title: `Tích điểm đổi quà: chỉ ${store.loyalty.cheapestReward.pointsCost} điểm đổi "${store.loyalty.cheapestReward.name}"`, target: 'offers', colors: ['#1d4ed8', '#38bdf8', '#bfdbfe'] });

// Thay bộ banner cũ (ảnh không tồn tại, nội dung không gắn với dữ liệu) bằng bộ mới
const existing = await api('GET', '/api/admin/manage/banners', { token: admin });
for (const banner of existing.items.filter(item => item.status === 'ACTIVE')) await api('DELETE', `/api/admin/banners/${banner.id}`, { token: admin });

const start = new Date(Date.now() - 86400000).toISOString().slice(0, 19).replace('T', ' ');
const end = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 19).replace('T', ' ');
for (const [index, banner] of banners.entries()) {
  await api('POST', '/api/admin/banners', {
    token: admin,
    body: { title: banner.title, imageData: await png(banner.colors, index + 3), targetUrl: banner.target, startAt: start, endAt: end, sortOrder: index + 1, status: 'ACTIVE' }
  });
}
console.log(`Đã tạo ${banners.length} banner từ dữ liệu thật:`, banners.map(item => item.title));
