# Deployment guide

## Local single-port run

```powershell
cd food-delivery-platform/backend
npm.cmd install
npm.cmd run seed:real
npm.cmd run dev
```

Open `http://localhost:3000`. The Express API serves the frontend, `/api/docs` Swagger UI, `/api/openapi.json`, uploads and generated exports.

## Docker Compose

From `food-delivery-platform`:

```powershell
docker compose up --build
```

Services are API `3000`, MySQL `3307`, Redis `6379` and MailHog `8025`.

The API uses Redis for catalog response cache when `REDIS_URL` is set. If Redis is unavailable in local development, it falls back to in-process memory cache and logs a single warning.

## Backup and restore

```powershell
$env:DB_HOST = "localhost"
$env:DB_PORT = "3306"
$env:DB_USER = "root"
$env:DB_PASSWORD = "duong2k5"
$env:DB_NAME = "food_delivery_db"
.\backend\scripts\backup-db.ps1
```

Verify restore safely on a temporary database:

```powershell
cd .\backend
npm.cmd run db:restore:test
```

`db:restore:test` creates `food_delivery_restore_test`, imports the backup, checks `users`, `restaurants` and `menu_items`, then drops the temporary database unless `-KeepDatabase` is passed to `scripts/restore-test.ps1`.
