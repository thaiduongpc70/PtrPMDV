from datetime import datetime
from pathlib import Path

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "outputs" / "master-plan" / "Master Plan.xlsx"
DONE = "Đã hoàn thành"

completed_plan_ids = {
    "2.2", "2.3", "2.4", "2.5", "2.6", "2.7",
    "3.1", "3.2", "3.3", "3.4", "3.5",
    "4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8"
}
notes = {
    "2.2": "Menu API: CRUD menu/category/item, validation giá và trạng thái, soft-delete; đã gắn owner RBAC.",
    "2.3": "Variant/topping API, liên kết topping theo món và kiểm tra min/max lựa chọn.",
    "2.4": "Catalog search/filter/sort/pagination cho restaurant/menu item và search_history cho customer.",
    "2.5": "Promotion CRUD/validation/usage, banners public và favorites restaurant/menu item.",
    "2.6": "Seed script tạo 20 nhà hàng và tối thiểu 2.100 menu item cùng dữ liệu 4 vai trò.",
    "2.7": "Upload ảnh JPEG/PNG/WebP, lưu an toàn, editor crop khung vuông/rotate/zoom/reset và object-fit.",
    "3.1": "Cart theo customer/restaurant, cập nhật quantity/topping/note và snapshot giá.",
    "3.2": "Checkout transaction tạo order/order items/payment, tính lại phí/giá server và idempotency key.",
    "3.3": "Restaurant state machine PENDING -> CONFIRMED -> PREPARING -> READY_FOR_PICKUP và reject.",
    "3.4": "Customer ordering UI, address/payment/promotion; in-app notification và email queue nhẹ.",
    "3.5": "61 automated tests pass; workflow checkout -> confirm -> prepare -> ready, RBAC, audit metadata và lỗi nghiệp vụ.",
    "4.1": "Shipper profile, trạng thái nhận đơn, assignment offer/accept/reject và phân quyền shipper.",
    "4.2": "Delivery lifecycle, delivery status history, khu vực giao hàng và cập nhật trạng thái lấy hàng/đang giao/đã giao.",
    "4.3": "API nhận GPS shipper, lưu vị trí và phục vụ màn hình theo dõi giao hàng.",
    "4.4": "Payment/COD flow, giao dịch thanh toán, trạng thái thu hộ và xử lý hủy đơn liên quan thanh toán.",
    "4.5": "Invoice/tra cứu chi tiết đơn dùng snapshot đơn hàng và dữ liệu thanh toán.",
    "4.6": "Notification, chat theo đơn, support ticket và review nhà hàng/shipper.",
    "4.7": "Order cancellation, refund, ví khách hàng và wallet transaction.",
    "4.8": "Shipper earnings/withdrawals, restaurant settlement/commission và báo cáo đối soát."
}


workbook = load_workbook(WORKBOOK)
plan = workbook["Plan"]
for row in range(1, plan.max_row + 1):
    task_id = str(plan.cell(row, 1).value or "")
    if task_id in completed_plan_ids:
        plan.cell(row, 6).value = DONE
        plan.cell(row, 7).value = 1

coverage = workbook["SQL coverage"]
for row in range(1, coverage.max_row + 1):
    plan_id = str(coverage.cell(row, 4).value or "")
    ids = {value.strip() for value in plan_id.split(",")}
    matching = sorted(ids & completed_plan_ids)
    if matching:
        coverage.cell(row, 5).value = DONE
        coverage.cell(row, 6).value = "; ".join(notes[item] for item in matching if item in notes)

summary = workbook["Summary"]
summary.cell(11, 2).value = "API foundation, auth/RBAC, restaurant/menu, catalog search, promotion/favorites, cart/checkout, restaurant order state machine; đã bổ sung shipper, delivery/GPS, payment/COD, invoice, chat/support/review, refund/wallet và settlement 4.1-4.8"
summary.cell(12, 2).value = "Còn xác nhận: realtime WebSocket/Redis hoàn chỉnh, Docker/CI, OpenAPI/Postman đầy đủ, test E2E triển khai và dữ liệu thật do người dùng nhập sau"
summary.cell(5, 9).value = "4.8/20"
summary.cell(2, 1).value = "Kế hoạch triển khai bám theo food_delivery_db.sql và yêu cầu bài tập lớn | Cập nhật: 27/09/2026"

infrastructure = workbook["Ha tang"]
infrastructure.cell(6, 4).value = "Đã có web động gọi API thật cho 4 vai trò: Customer, Restaurant, Shipper, Admin; UI đăng nhập phân quyền, catalog/checkout, order queue, shipper delivery/earnings, ví và quản lý tài khoản"
infrastructure.cell(20, 4).value = "Đã hoàn thành trong 2.7: image picker/editor, crop khung vuông, rotate/zoom/reset, thumbnail object-fit và upload API"

workbook.calculation.fullCalcOnLoad = True
workbook.calculation.forceFullCalc = True
workbook.calculation.calcMode = "auto"
workbook.save(WORKBOOK)
print(f"Updated {WORKBOOK} at {datetime.now().isoformat(timespec='seconds')}")
