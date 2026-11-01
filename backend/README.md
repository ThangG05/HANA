# Backend

NestJS REST API. Cài dependencies một lần tại thư mục gốc (`pnpm install`), khởi động PostgreSQL từ thư mục gốc bằng `docker compose up -d db`, sau đó chạy:

```cmd
cd /d E:\HANA\HanaPremiumCRM\backend
corepack pnpm db:migrate
corepack pnpm dev
```

API health check: http://localhost:3001/api/health. Cấu hình dùng chung nằm trong `../.env`.
