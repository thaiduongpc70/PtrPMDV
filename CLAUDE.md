# FoodGo — Food Delivery Management System

Nền tảng đặt món & giao hàng: Express + MySQL 8 (backend, `food-delivery-platform/backend`) và frontend JS thuần một trang (`food-delivery-platform/frontend`), 4 vai trò: **Admin, Nhà hàng, Tài xế, Khách hàng**. Giao diện cửa hàng theo phong cách ShopeeFood.

## Đọc trước khi làm (theo thứ tự)

1. `docs/dev/README.md` — mục lục bộ tài liệu kỹ thuật
2. `docs/dev/architecture.md` — stack, thư mục, module ↔ API, cấu hình
3. `docs/dev/features.md` — chức năng theo vai trò + đối chiếu Master Plan (cái gì xong/thiếu)
4. `docs/dev/business-rules.md` — công thức tiền, trạng thái đơn, voucher/điểm/combo, trigger
5. `docs/dev/db-schema.md` (sinh tự động) và `docs/dev/api-routes.md` (sinh tự động)
6. `docs/dev/frontend-map.md`, `docs/dev/data-pipeline.md`, `docs/dev/gotchas.md`

Sau khi đổi schema hoặc route: `node tools/generate-dev-docs.mjs` (cần MySQL chạy) để làm mới hai file sinh tự động; cập nhật tay `features.md`/`business-rules.md` nếu đổi nghiệp vụ.

## Lệnh thường dùng (trong `food-delivery-platform/backend`)

```
npm start                 # chạy server + frontend tại http://localhost:3001
npm test                  # test đơn vị (không cần DB)
npm run check             # kiểm tra cú pháp
npm run data:*            # dựng/nối dữ liệu qua API thật (xem docs/dev/data-pipeline.md)
```
Tài khoản thử (mật khẩu `duong2k5`): admin `thaiduongpc7`, chủ quán `trasua.lanon`, tài xế `bao.shipper`, khách `minh.anh`.

## Quy tắc bắt buộc với dự án này

- **Chỉ dữ liệu thật trong DB**: không mock/seed chèn tay, không chữ/số cứng trên giao diện (thống kê, banner, liên hệ… lấy từ API). Dữ liệu mẫu chỉ tạo bằng script gọi API thật. Nói rõ phần còn sandbox (thanh toán online) hay hư cấu (khách hàng).
- **Không chạy lại Postman/newman** trừ khi người dùng yêu cầu.
- Số liệu thống kê trong bảng (điểm, doanh thu quán, số chuyến…) do **trigger** duy trì — đừng cập nhật tay; xem `docs/dev/business-rules.md` §8.
- Áp migration SQL bằng **mysql client**, không dùng driver gộp nhiều câu lệnh (làm hỏng file mysqldump) — xem `docs/dev/gotchas.md`.
- Trả lời người dùng bằng **tiếng Việt**.

## Bản đồ nhanh

- Backend: `src/app.js` (mount route) → `src/modules/<module>/*.routes.js` → service → repository; tiện ích ở `src/shared`.
- Frontend: `index.html` + `src/app.js` (lõi, màn khách), `admin.js`, `restaurant.js`, `analytics.js`, `live.js` (bản đồ/GPS/chat), `storefront.css` (giao diện ShopeeFood, đè lên `styles.css`).
- Master Plan gốc: `outputs/master-plan/Master Plan.xlsx`; quy trình nghiệp vụ: `Food_Delivery_Phan_1_Quy_trinh_nghiep_vu.docx`.
