# Migration database (Supabase)

Schema do các file SQL ở đây quản lý, **không** dùng `prisma migrate`. Prisma chỉ đọc cấu trúc về bằng `db pull`.

## Thứ tự và cách chạy
Chạy trong **Supabase → SQL Editor**, mỗi file một query riêng, đúng thứ tự, thấy "Success" mới chạy file sau.

| File | Nội dung | Chạy lại được? |
| --- | --- | --- |
| `001_base.sql` | 28 bảng, RLS, trigger, view, seed vai trò + nguồn khách | Không (chỉ một lần, project trống) |
| `002_chong_trung_lich.sql` | Ràng buộc chống trùng lịch bác sĩ/phòng | Không (báo constraint đã tồn tại) |
| `003_actor_cho_lich_su.sql` | Trigger lịch sử đọc người/lý do từ `hana.actor`, `hana.ly_do` | Có |
| `004_seed_quyen.sql` | Ma trận quyền khởi đầu | Có |
| `005_bo_sung_quyen.sql` | Bổ sung quyền để MVP vận hành được | Có |

Quy tắc: **không sửa file đã chạy**. Muốn đổi thì tạo file số tiếp theo (`006_...`). Mỗi đợt chỉ một người giữ thứ tự số.

## Sau mỗi lần đổi schema
```cmd
cd backend
corepack pnpm exec prisma db pull --config prisma.config.ts
```
Rồi **sửa tay lại** (db pull ghi đè):
1. `schemas = ["public", "auth"]` trong khối `datasource`.
2. Model `lan_tham_kham`: đổi `bao_gia bao_gia?` thành `bao_gia bao_gia[]`.
3. `corepack pnpm db:generate`.

## Tài khoản demo
Tạo user ở Authentication → Users (tick Auto Confirm), rồi liên kết với `nhan_vien.auth_user_id` và gán vai trò qua `nhan_vien_vai_tro`.
Bác sĩ để đặt lịch phải có vai trò `bac_si` (không cần tài khoản đăng nhập).
