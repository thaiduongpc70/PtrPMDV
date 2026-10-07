# User guide

1. Start the API from `food-delivery-platform/backend` and open `http://localhost:3000`.
2. Use the seeded accounts from `backend/scripts/seed-realistic.mjs`; the default password is `duong2k5`. The primary admin account is `thaiduongpc7` for `Lê Nguyễn Thái Dương`. Restaurant examples: `bep.annhien`, `pho.ganh36`, `comtam.suonmoc`, `gagion.bepdo`, `pizza.logach`; each owns one restaurant.
3. Customer flow: search catalog, add menu items, checkout with address ID, then monitor order status.
4. Restaurant flow: open the order queue and move an order through confirm, preparing and ready; use the management tab to update profile, create menu categories, toppings and variants.
5. Shipper flow: update availability, accept an assignment, send GPS and move delivery status.
6. Admin flow: inspect audit logs, users, system settings, imports, exports and settlements.

The API reference is available at `/api/docs` (Swagger UI) and `/api/openapi.json`.

Import jobs accept CSV text or Excel-compatible SpreadsheetML `.xls/.xml` text. Export jobs can generate CSV, Excel-readable `.xls` and PDF files under `/exports`.
