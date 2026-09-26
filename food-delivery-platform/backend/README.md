# Food Delivery API: scope 2.2-3.5

The backend is an Express ES-module API backed by MySQL 8. Import `food_delivery_db.sql` before starting it. For an existing database, apply `database/migrations/20260926_add_order_idempotency.sql`. The schema includes the `orders.idempotency_key` column used by checkout retries.

## Run

```powershell
$env:DB_PASSWORD = "your-password"
npm.cmd install
npm.cmd run check
npm.cmd test
npm.cmd run seed:demo
npm.cmd run dev
```

When the backend is started from this directory, Express also serves the frontend.
Open `http://localhost:3000` and no second frontend server is needed.

`seed:demo` is repeatable. It creates demo accounts, 20 restaurants, menus, topping groups and at least 2,000 menu items. The default demo password is `FoodDemo!2026`; set `DEMO_PASSWORD` before running the script to change it.

## Implemented API groups

- `GET /api/catalog/restaurants`, `GET /api/catalog/menu-items`, `GET /api/catalog/restaurants/:restaurantId/menu` and customer `search-history`.
- Restaurant owner menu CRUD at `/api/restaurant/restaurants/:restaurantId/menus`, `menu-categories`, `menu-items`, `variants`, `topping-groups` and `toppings`.
- Public promotions/banners, customer promotion validation and favorites, restaurant promotion CRUD, and admin banner CRUD at `/api/admin/banners`.
- Customer cart at `/api/customer/cart` and checkout at `/api/customer/orders/checkout`. Checkout requires `restaurantId`, recalculates menu prices, validates availability/toppings, applies promotion limits, creates payment/order snapshots in one transaction and accepts the `Idempotency-Key` header.
- Restaurant order queue at `/api/restaurant/orders` with `confirm`, `prepare`, `ready` and `reject` transitions.
- In-app notifications at `/api/notifications`; order transitions also emit an in-process event and queue an email payload.
- Restaurant/menu-item/banner image upload accepts JPEG/PNG/WebP data URLs and serves stored files below `/uploads`.

All mutation controllers set audit metadata consumed by the existing request audit middleware. Customer and restaurant ownership is checked in repository queries and route permissions are enforced with the seeded RBAC codes.
