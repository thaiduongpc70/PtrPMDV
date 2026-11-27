/* Gắn ảnh cho danh mục nhà hàng còn thiếu bằng ảnh thư viện đã duyệt bằng mắt (hoặc ảnh danh mục sẵn có), qua API admin.
   Chạy khi server đang chạy, chạy lại không đổi gì:  node scripts/set-category-images.mjs */
import { api, tokenFor } from './lib/api-client.mjs';

const IMAGES = {
  'Vietnamese': '/uploads/library/com-tam-1.jpg',
  'Noodles': '/uploads/library/bun-bo-hue-1.jpg',
  'Fast food': '/uploads/categories/fast-food.jpg',
  'Drinks': '/uploads/categories/do-uong.jpg',
  'Dessert': '/uploads/library/tiramisu-1.jpg',
  'Món Hàn': '/uploads/library/bibimbap-1.jpg',
  'Món Nhật': '/uploads/library/sushi-nigiri-1.jpg',
  'Dimsum & Món Hoa': '/uploads/library/xiu-mai-1.jpg',
  'Bánh & Kem': '/uploads/library/banh-kem-socola-1.jpg',
  'Lẩu & Nướng': '/uploads/library/lau-thai-2.jpg'
};
const token = await tokenFor('thaiduongpc7');
const list = await api('GET', '/api/admin/restaurant-categories', { token });
let changed = 0;
for (const category of list.items ?? list) {
  const wanted = IMAGES[category.name];
  if (!wanted || category.imageUrl === wanted || category.image_url === wanted) continue;
  if (category.imageUrl || category.image_url) continue; // không ghi đè ảnh đã có
  await api('PATCH', `/api/admin/restaurant-categories/${category.id}`, { token, body: { imageUrl: wanted } });
  changed += 1;
}
console.log(`Đã gắn ảnh cho ${changed} danh mục.`);
