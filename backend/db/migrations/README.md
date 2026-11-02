# G01 — dựng lại database

`000_baseline_supabase_public.sql` là **ảnh chụp schema public** xuất từ Supabase đang dùng ngày 2026-11-02 bằng PostgreSQL 17 `pg_dump --schema-only`. Nó chứa 29 bảng, cột, check/FK/unique/exclusion, index, 40 trigger, 15 hàm Hana, view và trạng thái RLS. Đây **không phải** các file migration 001–009 nguyên gốc; không thể suy ra lịch sử chạy trước đây chỉ từ database hiện tại.

`001_reference_data.sql` chứa 7 vai trò và 110 quyền từ database hiện tại. Không chứa khách hàng, nhân viên, cơ sở, tài khoản Auth, token hoặc dữ liệu thanh toán. Các tên tiếng Việt được giữ đúng như dữ liệu nguồn, kể cả chỗ nguồn có lỗi mã hóa ký tự.

## Áp dụng trên Supabase project mới

1. Tạo **project Supabase mới, trống**; không chạy hai file này trên project đang dùng.
2. Chạy `000_baseline_supabase_public.sql` trong SQL Editor hoặc `psql` với `ON_ERROR_STOP=1`; file có `BEGIN/COMMIT`, nên lỗi sẽ rollback toàn bộ.
3. Chạy `001_reference_data.sql`.
4. Tạo Auth users, cơ sở, nhân viên và các danh mục riêng theo dữ liệu môi trường mới. Gán `nhan_vien.auth_user_id` với user của Supabase Auth. Không copy dữ liệu thật vào seed trong Git.
5. Đặt `.env` trỏ tới project mới, chạy `cd backend; corepack pnpm db:generate` và khởi động API.

Supabase cung cấp schema `auth`, bảng `auth.users` và hàm `auth.uid()`. PostgreSQL thuần cần mô phỏng ba đối tượng này khi chỉ kiểm tra schema cục bộ. Baseline tạo extension `btree_gist` nếu thiếu để hỗ trợ ràng buộc chống trùng lịch.

## Đối chiếu

Đặt `DATABASE_URL` trong `.env` là DB gốc và `G01_VERIFY_DATABASE_URL` là DB mới, rồi chạy từ `backend`:

```powershell
$env:G01_VERIFY_DATABASE_URL = '<URL database mới>'
node db/verify-g01.mjs
Remove-Item Env:G01_VERIFY_DATABASE_URL
```

Script chỉ đọc và so sánh cột, constraint, index, trigger, hàm Hana, view, RLS, policy, vai trò và quyền. Mỗi mục phải in `OK`. Nó không so sánh dữ liệu khách hàng hoặc object do Supabase quản lý ngoài `public`.

## Backup và restore

Trước mỗi đợt thay đổi schema trên DB dùng chung, tạo **custom-format backup mã hóa/lưu ở nơi hạn chế truy cập ngoài repository**. Dùng PostgreSQL client 17 (`pg_dump`, `pg_restore`) và biến môi trường `PGDATABASE` chứa URL kết nối; không ghi URL hoặc backup vào Git.

```powershell
$env:PGDATABASE = $env:DATABASE_URL
pg_dump --format=custom --schema=public --no-owner --no-privileges --file='D:\secure-backups\hana-YYYYMMDD.dump'
Remove-Item Env:PGDATABASE
```

Để kiểm tra file backup, chuẩn bị một **PostgreSQL 17 riêng**: bỏ schema `public` mặc định trong database thử nghiệm, tạo `auth.users` và `auth.uid()` giả lập. Restore phần schema trước, tạo `btree_gist` (dump chỉ chọn `public` không mang extension), rồi restore các ràng buộc/index/trigger:

```powershell
$env:PGDATABASE = '<URL PostgreSQL thử nghiệm>'
pg_restore --dbname="$env:PGDATABASE" --schema-only --section=pre-data --no-owner --no-privileges --exit-on-error 'D:\secure-backups\hana-YYYYMMDD.dump'
psql -v ON_ERROR_STOP=1 -c 'CREATE EXTENSION btree_gist WITH SCHEMA public'
pg_restore --dbname="$env:PGDATABASE" --schema-only --section=post-data --no-owner --no-privileges --exit-on-error 'D:\secure-backups\hana-YYYYMMDD.dump'
Remove-Item Env:PGDATABASE
```

Backup `public` không chứa Supabase Auth users và Storage objects. Khôi phục **dữ liệu đầy đủ** cần khôi phục Auth/Storage theo quy trình Supabase trước, sau đó mới restore `public` vào môi trường riêng và kiểm tra FK. Không dùng `--clean`, `db reset` hoặc restore vào database đang phục vụ người dùng.

## Thay đổi tiếp theo

Tạo file SQL mới, số tiếp theo bắt đầu `010_...` để tránh nhầm với lịch sử 001–009 đã thất lạc. Không chỉnh sửa `000`/`001` sau khi đã áp dụng lên môi trường dùng chung. Prisma schema là bản introspect phục vụ code, không phải công cụ migrate của dự án.
