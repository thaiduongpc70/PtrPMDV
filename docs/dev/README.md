# Tài liệu kỹ thuật FoodGo (đọc trước khi làm việc)

Mục đích: giúp người/AI vào làm tiếp **không phải khám phá lại** dự án. Đọc theo thứ tự dưới đây; mỗi file tự đủ nghĩa.

| Thứ tự | File | Nội dung | Nguồn |
|---|---|---|---|
| 1 | [architecture.md](architecture.md) | Stack, cấu trúc thư mục, luồng request, module ↔ prefix API, cấu hình, chạy/test | viết tay |
| 2 | [features.md](features.md) | Chức năng theo vai trò, đối chiếu Master Plan (xong/thiếu), nơi nằm trong code | viết tay |
| 3 | [business-rules.md](business-rules.md) | Công thức tiền, máy trạng thái, voucher/điểm/combo, trigger | viết tay |
| 4 | [db-schema.md](db-schema.md) | 71 bảng: cột, FK, chỉ mục, trigger, số dòng | **sinh tự động** |
| 5 | [api-routes.md](api-routes.md) | 219 route Express theo nhóm | **sinh tự động** |
| 6 | [frontend-map.md](frontend-map.md) | Frontend: file, màn hình/sub-view, state, quy ước CSS/JS | viết tay |
| 7 | [data-pipeline.md](data-pipeline.md) | Dữ liệu "chạy thật" qua API: lệnh, thứ tự, khôi phục | viết tay |
| 8 | [gotchas.md](gotchas.md) | Bẫy đã gặp, quy ước sửa file, những gì chưa làm | viết tay |

Tài liệu liên quan có sẵn: `docs/openapi.json` (Swagger `/api/docs`), `docs/user-guide.md` (hướng dẫn dùng), `docs/deployment.md`, `docs/handover-checklist.md`, `outputs/master-plan/Master Plan.xlsx` (kế hoạch gốc), `Food_Delivery_Phan_1_Quy_trinh_nghiep_vu.docx` (quy trình nghiệp vụ), `postman/` (bộ test).

## Làm mới hai file sinh tự động

```
node tools/generate-dev-docs.mjs        # cần MySQL đang chạy (đọc .env của backend)
```

Chạy lại sau khi đổi schema (migration) hoặc thêm/sửa route.

## Chạy nhanh

```
cd food-delivery-platform/backend
npm install
npm start                 # http://localhost:3001 (frontend tĩnh cũng được phục vụ ở đây)
npm test                  # test đơn vị (node:test)
npm run check             # kiểm tra cú pháp toàn bộ file JS
```

Tài khoản thử (mật khẩu `duong2k5`): `thaiduongpc7` (admin), `trasua.lanon` / `bep.annhien` (chủ quán), `bao.shipper` (tài xế), `minh.anh` (khách). Dữ liệu là dữ liệu mô phỏng chạy qua API thật (xem `data-pipeline.md`).

## Quy tắc làm việc đã thống nhất với người dùng

1. **Chỉ dữ liệu thật trong DB**: không mock/seed chèn tay, không chữ/số cứng trên giao diện (thống kê, banner, hotline… đều từ DB). Dữ liệu mẫu chỉ tạo bằng các script gọi API thật.
2. **Không chạy lại Postman/newman** nếu người dùng không yêu cầu.
3. Trả lời người dùng bằng tiếng Việt; nói rõ cái gì còn mô phỏng/sandbox (thanh toán online, khách hàng hư cấu).
