# Video demo script 5-10 phút

Mục tiêu: quay một video ngắn chứng minh hệ thống Food Delivery chạy một cổng `http://localhost:3000`, có dữ liệu thật, API/DB/test và đủ 4 vai trò.

## Chuẩn bị

```powershell
cd food-delivery-platform/backend
npm.cmd run seed:real
npm.cmd run check
npm.cmd test
npm.cmd run smoke
npm.cmd run dev
```

Mở:

- Web app: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/openapi.json`

## Kịch bản quay

1. Giới thiệu master plan và trạng thái hoàn thành.
2. Mở web app, đăng nhập bằng admin thật:
   - Username: `thaiduongpc7`
   - Password: `duong2k5`
3. Chuyển qua các lớp giao diện: dashboard, quản lý tài khoản, nhà hàng/menu, import/export/jobs, system settings.
4. Mở catalog khách hàng, tìm nhà hàng, xem món.
   - Bấm các chip danh mục như `Cơm`, `Bún - Phở`, `Trà sữa` để chứng minh UI lọc nhà hàng/món thật.
   - Đăng nhập thử owner `bep.annhien` hoặc `pho.ganh36` với password `duong2k5`; mỗi tài khoản chỉ quản lý một nhà hàng riêng.
5. Mở Swagger UI `/api/docs`, show nhóm Auth, Catalog, Jobs, Delivery, Payments.
6. Chạy terminal:
   - `npm.cmd run check`
   - `npm.cmd test`
   - `npm.cmd run smoke`
7. Show dữ liệu seed:
   - 20 nhà hàng active
   - 4.200 món
   - tài khoản admin `thaiduongpc7`
8. Chạy backup/restore test:
   - `npm.cmd run db:backup`
   - `npm.cmd run db:restore:test`
9. Kết luận: source, SQL, Postman, docs, OpenAPI, Docker Compose và release package đã sẵn sàng.

## Gợi ý quay

- Dùng OBS Studio hoặc PowerPoint Screen Recording.
- Độ dài nên khoảng 6-8 phút.
- Xuất file tên `food-delivery-demo.mp4` và đặt cạnh thư mục `release/food-delivery-platform` khi nộp.
