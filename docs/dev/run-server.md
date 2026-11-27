# Bật máy chủ nhanh (FoodGo)

## Chạy bình thường

```
cd food-delivery-platform/backend
node src/server.js          # hoặc: npm start
```

Mở http://localhost:3001 (giao diện + API cùng cổng; cổng 3000 bị Grafana chiếm). Kiểm tra sống: `GET http://localhost:3001/health` → 200 (và `/api/catalog/storefront` trả số liệu thật).

Cần MySQL 8 đang chạy và `backend/.env` đúng (DB_HOST/DB_USER/DB_PASSWORD/DB_NAME). Tài khoản thử (mật khẩu `duong2k5`): admin `thaiduongpc7`, chủ quán `trasua.lanon`, tài xế `bao.shipper`, khách `minh.anh`.

## Dừng / khởi động lại đúng tiến trình (Windows)

Chỉ dừng tiến trình máy chủ, **không** dừng mọi `node.exe` (có thể đang chạy script dữ liệu hoặc công cụ khác):

```
Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object { $_.CommandLine -match 'src/server.js' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

## Biến môi trường chỉ dùng khi chạy script dữ liệu (đặt tạm, KHÔNG để trong .env)

| Biến | Khi nào | Lưu ý |
|---|---|---|
| `ALLOW_ORDER_WHEN_CLOSED=true` | `simulate-activity.mjs` cần đặt đơn lúc quán đóng cửa | Tắt ngay sau khi chạy; máy chủ thật không được bật |
| `RATE_LIMIT_MAX=10000` | script gọi API hàng loạt (`spread-timeline`, `simulate-closeout`, `apply.mjs`) | Mặc định 240/phút/IP/đường dẫn; quản trị viên có trần riêng `RATE_LIMIT_ADMIN_MAX` (2400) |
| `REFUND_AUTO_APPROVE_MINUTES` | job tự duyệt hoàn tiền đơn huỷ/thất bại (mặc định 240, 0 = tắt) | job chạy cùng `job.worker.js` mỗi 30 giây |
| `AUTH_EXPOSE_TOKENS=true` | chạy Postman hoặc thử luồng quên mật khẩu/xác minh email | Trả mã trong response; chỉ dùng trên máy hoặc DB bản sao |
| `SEARCH_MIN_DISH_HITS` | ngưỡng số món để quán là kết quả chính của tìm kiếm (mặc định 3) | |

Chạy xong script: khởi động lại máy chủ **không** kèm các biến trên.
