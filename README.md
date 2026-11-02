# Hana Premium CRM

Monorepo gồm hai ứng dụng tách riêng và PostgreSQL:

- `frontend/`: Next.js + React + TypeScript, dashboard và biểu mẫu MVP.
- `backend/`: NestJS REST API + Prisma, nghiệp vụ khách hàng, cơ hội, tương tác, công việc và lịch hẹn.
- `docker-compose.yml`: PostgreSQL dùng cho phát triển local.

## Khởi động lần đầu trên Windows

Mở terminal ở thư mục gốc `E:\HANA\HanaPremiumCRM`:

```cmd
corepack pnpm install
docker compose up -d db
```

File `.env` tại thư mục gốc là cấu hình local dùng chung. Thay các secret mẫu trước khi chia sẻ hoặc triển khai.

### Database (Supabase)

Schema do các file SQL trong `backend/db/migrations/` quản lý (xem `README.md` trong thư mục đó). Đặt `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` trong `.env`.

### Backend

```cmd
cd /d E:\HANA\HanaPremiumCRM\backend
corepack pnpm exec prisma db pull --config prisma.config.ts
corepack pnpm db:generate
corepack pnpm dev
```

Không dùng `prisma migrate`. Mọi endpoint (trừ `/api/health`) yêu cầu token đăng nhập Supabase và quyền theo bảng `quyen_vai_tro`. Chạy kiểm tra: `corepack pnpm test`.

### Frontend

Mở terminal thứ hai:

```cmd
cd /d E:\HANA\HanaPremiumCRM\frontend
corepack pnpm dev
```

Mở `http://localhost:3000`.

## Phần đã triển khai

- Tạo/tìm khách hàng; chuẩn hóa số điện thoại; cảnh báo hồ sơ có số điện thoại/email trùng nhưng không tự gộp.
- Một khách hàng có nhiều cơ hội dịch vụ; chuyển giai đoạn theo sơ đồ đề xuất và lưu lịch sử trong cùng transaction.
- Ghi nhận tương tác và tạo công việc theo dõi.
- Tạo lịch hẹn, kiểm tra khoảng thời gian trùng bác sĩ/phòng và cập nhật trạng thái có lịch sử.
- Dashboard kết nối API, biểu mẫu nhanh, danh sách cơ hội/khách/công việc/lịch hẹn.

## Giới hạn hiện tại

Đây là bản MVP phát triển local, chưa có đăng nhập/RBAC, audit đầy đủ, hồ sơ khám, báo giá, thanh toán, ca thực hiện, chăm sóc sau ca, gửi tin tự động hoặc tích hợp bên ngoài. API chưa yêu cầu xác thực; chỉ dùng dữ liệu giả lập/local, không nhập dữ liệu khách hàng thật và không đưa API lên Internet trước khi hoàn thành M0 về xác thực, phân quyền và audit.

Các quy tắc chuyển trạng thái và xử lý lịch đang theo đề xuất trong backlog; cần Hana xác nhận trước khi coi là quy trình chính thức.
