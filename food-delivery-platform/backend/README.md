# Food Delivery API: scope 2.2-3.5

The backend is an Express ES-module API backed by MySQL 8. Import `food_delivery_db.sql` before starting it. For an existing database, apply `database/migrations/20260926_add_order_idempotency.sql`. The schema includes the `orders.idempotency_key` column used by checkout retries.

## Run

```powershell
$env:DB_PASSWORD = "your-password"
npm.cmd install
npm.cmd run check
npm.cmd test
npm.cmd run seed:real
npm.cmd run dev
```

When the backend is started from this directory, Express also serves the frontend.
Open `http://localhost:3000` and no second frontend server is needed.

`seed:real` is repeatable. It creates operational sample data with realistic Vietnamese accounts, 20 restaurants, 20 restaurant owner accounts, menus, topping groups, promotions, banners, wallet, notifications, support ticket and at least 2,000 menu items. The default seeded password is `duong2k5`; set `SEED_PASSWORD` before running the script to change it.

Seeded accounts:

- Admin/system owner: `thaiduongpc7` (`Lê Nguyễn Thái Dương`, `thaiduongpc70@gmail.com`, `0852076750`)
- Restaurant owners: `bep.annhien`, `pho.ganh36`, `comtam.suonmoc`, `gagion.bepdo`, `pizza.logach` ... each owns one restaurant.
- Customer: `minh.anh`
- Shipper: `bao.shipper`

## Implemented API groups

- `GET /api/catalog/restaurants`, `GET /api/catalog/menu-items`, `GET /api/catalog/restaurants/:restaurantId/menu` and customer `search-history`.
- Restaurant owner menu CRUD at `/api/restaurant/restaurants/:restaurantId/menus`, `menu-categories`, `menu-items`, `variants`, `topping-groups` and `toppings`.
- Public promotions/banners, customer promotion validation and favorites, restaurant promotion CRUD, and admin banner CRUD at `/api/admin/banners`.
- Customer cart at `/api/customer/cart` and checkout at `/api/customer/orders/checkout`. Checkout requires `restaurantId`, recalculates menu prices, validates availability/toppings, applies promotion limits, creates payment/order snapshots in one transaction and accepts the `Idempotency-Key` header.
- Restaurant order queue at `/api/restaurant/orders` with `confirm`, `prepare`, `ready` and `reject` transitions.
- In-app notifications at `/api/notifications`; order transitions also emit an in-process event and queue an email payload.
- Restaurant/menu-item/banner image upload accepts JPEG/PNG/WebP data URLs and serves stored files below `/uploads`.

All mutation controllers set audit metadata consumed by the existing request audit middleware. Customer and restaurant ownership is checked in repository queries and route permissions are enforced with the seeded RBAC codes.

## Operations and handover

- `POST /api/jobs/imports` imports `RESTAURANTS` or `MENU_ITEMS` from CSV or Excel-compatible SpreadsheetML `.xls/.xml` text and stores row-level results in `import_jobs`.
- `POST /api/jobs/exports` creates `ORDERS`, `REVENUE`, `SHIPPER` or `SETTLEMENT` exports in `CSV`, `EXCEL` or `PDF`; generated files are served below `/exports`.
- `POST /api/jobs/background` and `POST /api/jobs/background/run` manage retryable cleanup/export jobs. The API worker polls pending jobs every 30 seconds.
- `GET /api/docs` opens Swagger UI and `GET /api/openapi.json` exposes the OpenAPI contract. The tested Postman collection is in `postman/collections/Food Delivery API - Tested Flow`.
- `GET /health/live` and `GET /health/ready` expose liveness/readiness checks. HTTP requests are emitted as structured JSON, catalog reads use Redis-backed TTL cache with memory fallback, and menu mutations invalidate that cache.
- Docker Compose starts API, MySQL, Redis and MailHog. See `docs/deployment.md`, `docs/user-guide.md` and `docs/handover-checklist.md`.
