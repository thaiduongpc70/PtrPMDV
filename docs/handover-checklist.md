# Handover checklist

- [x] `npm run check` passes.
- [x] `npm test` passes.
- [x] `npm run seed:real` creates four roles, the real admin account and at least 2,000 menu items.
- [x] `npm run smoke` passes against `http://localhost:3000` using `thaiduongpc7`.
- [x] `/health/live` and `/health/ready` return healthy responses.
- [x] Database backup and restore-test flow are scripted with `npm run db:backup` and `npm run db:restore:test`.
- [x] Postman collection, `/api/openapi.json` and `/api/docs` Swagger UI are included.
- [x] Release package was generated with `npm run package:release`.
- [x] Redis response cache is implemented with a safe memory fallback when Redis is not available locally.
- [x] CSV and Excel-compatible SpreadsheetML import paths are implemented and tested.
