# API routes

> Sinh tự động bởi `tools/generate-dev-docs.mjs` lúc 2026-11-08T03:43:19.471Z bằng cách quét stack Express của `createApp()`. **Đừng sửa tay.** Mô tả chi tiết tham số/response nằm ở `docs/openapi.json` (Swagger tại `/api/docs`).

Tổng cộng **219 route**. Xác thực: header `Authorization: Bearer <accessToken>` (JWT), lấy từ `POST /api/auth/login`. Phân quyền: middleware `requireRole`/`requirePermission` khai báo trong file `*.routes.js` của từng module — xem bảng module ↔ prefix trong `docs/dev/architecture.md`.

## /api/accounts

| Method | Đường dẫn |
|---|---|
| GET | `/api/accounts/admin/users` |
| PATCH | `/api/accounts/admin/users/:userId/status` |
| GET | `/api/accounts/session` |

## /api/admin/audit-logs

| Method | Đường dẫn |
|---|---|
| GET | `/api/admin/audit-logs` |

## /api/admin/banners

| Method | Đường dẫn |
|---|---|
| POST | `/api/admin/banners` |
| DELETE | `/api/admin/banners/:bannerId` |
| PATCH | `/api/admin/banners/:bannerId` |

## /api/admin/dashboard

| Method | Đường dẫn |
|---|---|
| GET | `/api/admin/dashboard` |

## /api/admin/export

| Method | Đường dẫn |
|---|---|
| GET | `/api/admin/export/:dataset` |

## /api/admin/manage

| Method | Đường dẫn |
|---|---|
| GET | `/api/admin/manage/banners` |
| GET | `/api/admin/manage/customers` |
| GET | `/api/admin/manage/loyalty-rewards` |
| POST | `/api/admin/manage/loyalty-rewards` |
| PATCH | `/api/admin/manage/loyalty-rewards/:rewardId` |
| GET | `/api/admin/manage/orders` |
| GET | `/api/admin/manage/orders/:orderId` |
| GET | `/api/admin/manage/payments` |
| GET | `/api/admin/manage/promotions` |
| POST | `/api/admin/manage/promotions` |
| DELETE | `/api/admin/manage/promotions/:promotionId` |
| PATCH | `/api/admin/manage/promotions/:promotionId` |
| POST | `/api/admin/manage/promotions/:promotionId/extend` |
| GET | `/api/admin/manage/refunds` |
| PATCH | `/api/admin/manage/refunds/:refundId` |
| GET | `/api/admin/manage/reports` |
| GET | `/api/admin/manage/reviews` |
| DELETE | `/api/admin/manage/reviews/:reviewId` |
| GET | `/api/admin/manage/settlements` |
| PATCH | `/api/admin/manage/settlements/:settlementId` |
| POST | `/api/admin/manage/shipper-documents/:documentId/verify` |
| GET | `/api/admin/manage/shippers` |
| GET | `/api/admin/manage/shippers/:shipperId/documents` |
| PATCH | `/api/admin/manage/shippers/:shipperId/status` |
| GET | `/api/admin/manage/zones` |
| POST | `/api/admin/manage/zones` |
| PATCH | `/api/admin/manage/zones/:zoneId` |

## /api/admin/partners

| Method | Đường dẫn |
|---|---|
| GET | `/api/admin/partners/applications` |
| POST | `/api/admin/partners/applications/:applicationId/approve` |
| POST | `/api/admin/partners/applications/:applicationId/reject` |

## /api/admin/restaurant-categories

| Method | Đường dẫn |
|---|---|
| GET | `/api/admin/restaurant-categories` |
| POST | `/api/admin/restaurant-categories` |
| DELETE | `/api/admin/restaurant-categories/:categoryId` |
| PATCH | `/api/admin/restaurant-categories/:categoryId` |

## /api/admin/restaurants

| Method | Đường dẫn |
|---|---|
| GET | `/api/admin/restaurants` |
| POST | `/api/admin/restaurants` |
| DELETE | `/api/admin/restaurants/:restaurantId` |
| GET | `/api/admin/restaurants/:restaurantId` |
| PATCH | `/api/admin/restaurants/:restaurantId` |
| PATCH | `/api/admin/restaurants/:restaurantId/state` |

## /api/admin/system-settings

| Method | Đường dẫn |
|---|---|
| GET | `/api/admin/system-settings` |
| PUT | `/api/admin/system-settings/:key` |

## /api/analytics/admin

| Method | Đường dẫn |
|---|---|
| GET | `/api/analytics/admin/:report` |

## /api/analytics/customer

| Method | Đường dẫn |
|---|---|
| GET | `/api/analytics/customer/spending` |

## /api/analytics/restaurant

| Method | Đường dẫn |
|---|---|
| GET | `/api/analytics/restaurant/:restaurantId/:report` |

## /api/analytics/shipper

| Method | Đường dẫn |
|---|---|
| GET | `/api/analytics/shipper/performance` |

## /api/auth

| Method | Đường dẫn |
|---|---|
| POST | `/api/auth/email/verification/confirm` |
| POST | `/api/auth/email/verification/request` |
| POST | `/api/auth/login` |
| POST | `/api/auth/logout` |
| GET | `/api/auth/me` |
| POST | `/api/auth/password/forgot` |
| POST | `/api/auth/password/reset` |
| POST | `/api/auth/refresh` |
| POST | `/api/auth/register/customer` |

## /api/catalog

| Method | Đường dẫn |
|---|---|
| GET | `/api/catalog/banners` |
| GET | `/api/catalog/cities` |
| GET | `/api/catalog/collections` |
| GET | `/api/catalog/districts` |
| GET | `/api/catalog/menu-items` |
| GET | `/api/catalog/menu-items/:itemId/reviews` |
| GET | `/api/catalog/promotions` |
| GET | `/api/catalog/restaurant-categories` |
| GET | `/api/catalog/restaurants` |
| GET | `/api/catalog/restaurants/:restaurantId` |
| GET | `/api/catalog/restaurants/:restaurantId/menu` |
| GET | `/api/catalog/restaurants/:restaurantId/reviews` |
| GET | `/api/catalog/search-history` |
| GET | `/api/catalog/storefront` |

## /api/communications

| Method | Đường dẫn |
|---|---|
| GET | `/api/communications/chat/sessions` |
| POST | `/api/communications/chat/sessions` |
| GET | `/api/communications/chat/sessions/:sessionId/messages` |
| POST | `/api/communications/chat/sessions/:sessionId/messages` |
| POST | `/api/communications/orders/:orderId/item-reviews` |
| POST | `/api/communications/orders/:orderId/restaurant-review` |
| POST | `/api/communications/orders/:orderId/shipper-review` |
| GET | `/api/communications/support/tickets` |
| POST | `/api/communications/support/tickets` |
| PATCH | `/api/communications/support/tickets/:ticketId` |
| GET | `/api/communications/support/tickets/:ticketId/messages` |
| POST | `/api/communications/support/tickets/:ticketId/messages` |

## /api/customer/addresses

| Method | Đường dẫn |
|---|---|
| GET | `/api/customer/addresses` |
| POST | `/api/customer/addresses` |
| DELETE | `/api/customer/addresses/:addressId` |
| GET | `/api/customer/addresses/:addressId` |
| PATCH | `/api/customer/addresses/:addressId` |
| POST | `/api/customer/addresses/:addressId/default` |

## /api/customer/cart

| Method | Đường dẫn |
|---|---|
| GET | `/api/customer/cart` |
| DELETE | `/api/customer/cart/:restaurantId` |
| POST | `/api/customer/cart/items` |
| DELETE | `/api/customer/cart/items/:cartItemId` |
| PATCH | `/api/customer/cart/items/:cartItemId` |

## /api/customer/favorites

| Method | Đường dẫn |
|---|---|
| GET | `/api/customer/favorites` |
| POST | `/api/customer/favorites/menu-items/:itemId` |
| POST | `/api/customer/favorites/restaurants/:restaurantId` |

## /api/customer/loyalty

| Method | Đường dẫn |
|---|---|
| GET | `/api/customer/loyalty` |
| POST | `/api/customer/loyalty/rewards/:rewardId/redeem` |

## /api/customer/orders

| Method | Đường dẫn |
|---|---|
| GET | `/api/customer/orders` |
| GET | `/api/customer/orders/:orderId` |
| POST | `/api/customer/orders/checkout` |
| POST | `/api/customer/orders/quote` |

## /api/customer/profile

| Method | Đường dẫn |
|---|---|
| GET | `/api/customer/profile` |
| PATCH | `/api/customer/profile` |

## /api/customer/promotions

| Method | Đường dẫn |
|---|---|
| GET | `/api/customer/promotions` |
| POST | `/api/customer/promotions/:restaurantId/validate` |

## /api/customer/vouchers

| Method | Đường dẫn |
|---|---|
| GET | `/api/customer/vouchers` |

## /api/deliveries

| Method | Đường dẫn |
|---|---|
| GET | `/api/deliveries/:deliveryId/locations` |
| GET | `/api/deliveries/active` |
| POST | `/api/deliveries/assign` |
| GET | `/api/deliveries/available-shippers` |
| GET | `/api/deliveries/order/:orderId` |

## /api/docs

| Method | Đường dẫn |
|---|---|
| GET | `/api/docs` |

## /api/jobs

| Method | Đường dẫn |
|---|---|
| GET | `/api/jobs/background` |
| POST | `/api/jobs/background` |
| POST | `/api/jobs/background/run` |
| GET | `/api/jobs/exports` |
| POST | `/api/jobs/exports` |
| GET | `/api/jobs/exports/:jobId` |
| GET | `/api/jobs/imports` |
| POST | `/api/jobs/imports` |
| GET | `/api/jobs/imports/:jobId` |

## /api/live

| Method | Đường dẫn |
|---|---|
| GET | `/health/live` |

## /api/notifications

| Method | Đường dẫn |
|---|---|
| GET | `/api/notifications` |
| PATCH | `/api/notifications/:notificationId/read` |

## /api/openapi.json

| Method | Đường dẫn |
|---|---|
| GET | `/api/openapi.json` |

## /api/partners

| Method | Đường dẫn |
|---|---|
| POST | `/api/partners/register/restaurant` |
| POST | `/api/partners/register/shipper` |

## /api/payments

| Method | Đường dẫn |
|---|---|
| POST | `/api/payments/:paymentId/callback` |
| GET | `/api/payments/cod` |
| POST | `/api/payments/cod/:codId/collect` |
| POST | `/api/payments/cod/:codId/settle` |
| GET | `/api/payments/invoices/:orderCode` |
| GET | `/api/payments/orders/:orderId` |
| POST | `/api/payments/orders/:orderId/cancel` |
| POST | `/api/payments/orders/:orderId/invoice` |
| POST | `/api/payments/orders/:orderId/mock-pay` |
| POST | `/api/payments/orders/:orderId/refund` |
| GET | `/api/payments/wallet` |
| POST | `/api/payments/wallet/deposit` |

## /api/ready

| Method | Đường dẫn |
|---|---|
| GET | `/health/ready` |

## /api/restaurant/export

| Method | Đường dẫn |
|---|---|
| GET | `/api/restaurant/export/:restaurantId/:dataset` |

## /api/restaurant/manage

| Method | Đường dẫn |
|---|---|
| PATCH | `/api/restaurant/manage/:restaurantId/availability` |
| GET | `/api/restaurant/manage/:restaurantId/hours` |
| PUT | `/api/restaurant/manage/:restaurantId/hours` |
| GET | `/api/restaurant/manage/:restaurantId/orders` |
| GET | `/api/restaurant/manage/:restaurantId/reviews` |
| POST | `/api/restaurant/manage/:restaurantId/reviews/:reviewId/reply` |
| GET | `/api/restaurant/manage/:restaurantId/stats` |

## /api/restaurant/orders

| Method | Đường dẫn |
|---|---|
| GET | `/api/restaurant/orders` |
| GET | `/api/restaurant/orders/:orderId` |
| POST | `/api/restaurant/orders/:orderId/confirm` |
| POST | `/api/restaurant/orders/:orderId/prepare` |
| POST | `/api/restaurant/orders/:orderId/ready` |
| POST | `/api/restaurant/orders/:orderId/reject` |

## /api/restaurant/restaurants

| Method | Đường dẫn |
|---|---|
| GET | `/api/restaurant/restaurants` |
| DELETE | `/api/restaurant/restaurants/:restaurantId` |
| GET | `/api/restaurant/restaurants/:restaurantId` |
| PATCH | `/api/restaurant/restaurants/:restaurantId` |
| POST | `/api/restaurant/restaurants/:restaurantId/images` |
| DELETE | `/api/restaurant/restaurants/:restaurantId/images/:imageId` |
| PATCH | `/api/restaurant/restaurants/:restaurantId/images/:imageId` |
| GET | `/api/restaurant/restaurants/:restaurantId/menu-categories` |
| POST | `/api/restaurant/restaurants/:restaurantId/menu-categories` |
| DELETE | `/api/restaurant/restaurants/:restaurantId/menu-categories/:categoryId` |
| PATCH | `/api/restaurant/restaurants/:restaurantId/menu-categories/:categoryId` |
| GET | `/api/restaurant/restaurants/:restaurantId/menu-items` |
| POST | `/api/restaurant/restaurants/:restaurantId/menu-items` |
| DELETE | `/api/restaurant/restaurants/:restaurantId/menu-items/:itemId` |
| PATCH | `/api/restaurant/restaurants/:restaurantId/menu-items/:itemId` |
| PUT | `/api/restaurant/restaurants/:restaurantId/menu-items/:itemId/combo` |
| PUT | `/api/restaurant/restaurants/:restaurantId/menu-items/:itemId/topping-groups` |
| GET | `/api/restaurant/restaurants/:restaurantId/menu-items/:itemId/variants` |
| POST | `/api/restaurant/restaurants/:restaurantId/menu-items/:itemId/variants` |
| DELETE | `/api/restaurant/restaurants/:restaurantId/menu-items/:itemId/variants/:variantId` |
| PATCH | `/api/restaurant/restaurants/:restaurantId/menu-items/:itemId/variants/:variantId` |
| GET | `/api/restaurant/restaurants/:restaurantId/menus` |
| POST | `/api/restaurant/restaurants/:restaurantId/menus` |
| DELETE | `/api/restaurant/restaurants/:restaurantId/menus/:menuId` |
| PATCH | `/api/restaurant/restaurants/:restaurantId/menus/:menuId` |
| PUT | `/api/restaurant/restaurants/:restaurantId/operating-hours` |
| GET | `/api/restaurant/restaurants/:restaurantId/promotions` |
| POST | `/api/restaurant/restaurants/:restaurantId/promotions` |
| DELETE | `/api/restaurant/restaurants/:restaurantId/promotions/:promotionId` |
| PATCH | `/api/restaurant/restaurants/:restaurantId/promotions/:promotionId` |
| POST | `/api/restaurant/restaurants/:restaurantId/promotions/:promotionId/extend` |
| GET | `/api/restaurant/restaurants/:restaurantId/topping-groups` |
| POST | `/api/restaurant/restaurants/:restaurantId/topping-groups` |
| DELETE | `/api/restaurant/restaurants/:restaurantId/topping-groups/:groupId` |
| PATCH | `/api/restaurant/restaurants/:restaurantId/topping-groups/:groupId` |
| GET | `/api/restaurant/restaurants/:restaurantId/topping-groups/:groupId/toppings` |
| POST | `/api/restaurant/restaurants/:restaurantId/topping-groups/:groupId/toppings` |
| DELETE | `/api/restaurant/restaurants/:restaurantId/topping-groups/:groupId/toppings/:toppingId` |
| PATCH | `/api/restaurant/restaurants/:restaurantId/topping-groups/:groupId/toppings/:toppingId` |

## /api/root

| Method | Đường dẫn |
|---|---|
| GET | `/health` |

## /api/settlements

| Method | Đường dẫn |
|---|---|
| POST | `/api/settlements/admin/settlements/generate` |
| GET | `/api/settlements/restaurant/commissions` |
| GET | `/api/settlements/restaurant/settlements` |

## /api/shippers/assignments

| Method | Đường dẫn |
|---|---|
| GET | `/api/shippers/assignments` |
| POST | `/api/shippers/assignments/:assignmentId/accept` |
| POST | `/api/shippers/assignments/:assignmentId/reject` |

## /api/shippers/availability

| Method | Đường dẫn |
|---|---|
| PATCH | `/api/shippers/availability` |

## /api/shippers/deliveries

| Method | Đường dẫn |
|---|---|
| GET | `/api/shippers/deliveries` |
| POST | `/api/shippers/deliveries/:deliveryId/status` |

## /api/shippers/documents

| Method | Đường dẫn |
|---|---|
| GET | `/api/shippers/documents` |
| POST | `/api/shippers/documents` |

## /api/shippers/earnings

| Method | Đường dẫn |
|---|---|
| GET | `/api/shippers/earnings` |

## /api/shippers/locations

| Method | Đường dẫn |
|---|---|
| POST | `/api/shippers/locations` |

## /api/shippers/profile

| Method | Đường dẫn |
|---|---|
| GET | `/api/shippers/profile` |
| PATCH | `/api/shippers/profile` |

## /api/shippers/withdrawals

| Method | Đường dẫn |
|---|---|
| POST | `/api/shippers/withdrawals` |

