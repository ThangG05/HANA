# Hana Premium CRM

Dự án được tách thành hai ứng dụng riêng để bạn có thể mở terminal tại từng thư mục và chạy độc lập:

- `frontend/`: Next.js + React + TypeScript.
- `backend/`: NestJS REST API + Prisma.
- PostgreSQL chạy bằng Docker Compose tại thư mục gốc.

## Cài đặt lần đầu

Mở terminal tại thư mục gốc `E:\HANA\HanaPremiumCRM` và chạy một lần:

```cmd
pnpm install
docker compose up -d db
```

File `.env` ở thư mục gốc được dùng chung cho hai ứng dụng. Các giá trị hiện tại là cấu hình local mẫu; không dùng làm credentials production.

## Chạy backend

Mở một terminal riêng trong VS Code:

```cmd
cd /d E:\HANA\HanaPremiumCRM\backend
pnpm db:migrate
pnpm dev
```

`pnpm db:migrate` chỉ cần chạy khi thiết lập database lần đầu hoặc khi có migration mới. API chạy tại `http://localhost:3001`, health check tại `http://localhost:3001/api/health`.

## Chạy frontend

Mở terminal thứ hai:

```cmd
cd /d E:\HANA\HanaPremiumCRM\frontend
pnpm dev
```

Web chạy tại `http://localhost:3000`.

## Chạy cả hai từ thư mục gốc

Có thể dùng lệnh sau nếu muốn khởi động frontend và backend cùng lúc:

```cmd
pnpm dev
```

## Lưu ý phạm vi

Đây vẫn là bộ khung khởi đầu. Chưa có đăng nhập, phân quyền thực thi, các màn hình nghiệp vụ CRM, tích hợp kênh nhắn tin hoặc quy trình bảo vệ hồ sơ y khoa hoàn chỉnh. Cần hoàn thiện các phần này trước khi dùng dữ liệu khách hàng thật.