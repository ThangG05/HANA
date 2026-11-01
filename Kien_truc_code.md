# Kiến trúc code và quy ước làm việc — Hana Premium CRM

**Mục đích:** để các thành viên cùng tổ chức code nhất quán, dễ review và mở rộng. Tài liệu này là quy ước kỹ thuật đề xuất cho repo hiện tại; không thay thế các quyết định nghiệp vụ Hana còn cần xác nhận trong `Hana-Premium-CRM-Phan-tich-va-chia-task.md`.

**Nguyên tắc quan trọng:** tổ chức code theo **chức năng nghiệp vụ (feature/module)**. Vai trò người dùng quyết định **quyền truy cập** vào chức năng qua guard/policy ở backend. Không tạo bản sao màn hình/API riêng cho từng role nếu chỉ khác quyền.

## 1. Stack và ranh giới ứng dụng

```text
HanaPremiumCRM/
├── frontend/           Next.js, React, TypeScript
├── backend/            NestJS REST API, Prisma
├── docker-compose.yml  PostgreSQL cho môi trường local
├── .env                Cấu hình local, không commit
└── Kien_truc_code.md
```

- **Frontend** hiển thị dữ liệu, nhận thao tác và gọi API. Không tự quyết định quyền bảo mật hay quy tắc tài chính/y khoa.
- **Backend** xác thực, phân quyền, kiểm tra dữ liệu và quy tắc nghiệp vụ; là nơi duy nhất ghi dữ liệu vào database.
- **PostgreSQL** lưu dữ liệu chuẩn. Thay đổi cấu trúc database được quản lý bằng Prisma schema và migration.
- Không để frontend kết nối trực tiếp PostgreSQL, chứa database credential, hoặc tính lại một kết quả quan trọng rồi xem đó là dữ liệu tin cậy.

## 2. Tổ chức module: theo chức năng, quyền theo role

Một module đại diện cho một nhóm nghiệp vụ có dữ liệu và quy tắc liên quan. Ví dụ:

| Module | Trách nhiệm chính |
| --- | --- |
| `auth` / `users` | Đăng nhập, nhân viên, vai trò, phiên/token |
| `customers` | Hồ sơ khách hàng, tìm kiếm, cảnh báo trùng |
| `opportunities` | Cơ hội dịch vụ, phân công, giai đoạn và lịch sử |
| `interactions` | Nhật ký liên hệ với khách hàng/cơ hội |
| `tasks` | Việc cần làm, người nhận, hạn và kết quả |
| `appointments` | Đặt/đổi/hủy lịch và kiểm tra trùng nguồn lực |
| `catalogs` | Dịch vụ, nguồn khách, cơ sở, phòng và nhân sự |
| `consultations` | Lần khám và nội dung y khoa được phân quyền |
| `quotes`, `payments` | Báo giá phiên bản, thu/hoàn tiền và đối soát |
| `procedures`, `aftercare` | Ca thực hiện, bàn giao và chăm sóc sau ca |
| `notifications`, `reports` | Job/nhắc việc/tích hợp và chỉ số báo cáo |

Ví dụ: tư vấn viên và quản lý đều có thể vào module cơ hội, nhưng backend chỉ cho phép quản lý phân công hoặc xem phạm vi rộng hơn nếu policy cho phép. Bác sĩ được quyền xem hồ sơ khám theo phạm vi được giao. Quyền phải kiểm tra ở backend, ẩn nút ở frontend chỉ là hỗ trợ trải nghiệm.

## 3. Cấu trúc backend mục tiêu

Repo hiện có `backend/src/crm/` chứa controller và service cho lát cắt MVP. Khi bổ sung nghiệp vụ, tách dần theo cấu trúc dưới đây; không cần đổi tên toàn bộ code đang chạy trong một lần.

```text
backend/src/
├── main.ts
├── app.module.ts
├── health/
├── common/
│   ├── decorators/       # CurrentUser, RequirePermissions...
│   ├── guards/           # JWT/authentication, permission/scope
│   ├── filters/          # Chuẩn hóa lỗi API
│   ├── interceptors/     # Correlation ID, logging đã lọc dữ liệu nhạy cảm
│   ├── pipes/            # Parse UUID, query, pagination
│   └── types/
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
└── modules/
    ├── customers/
    │   ├── customers.module.ts
    │   ├── customers.controller.ts
    │   ├── customers.service.ts
    │   └── dto/
    ├── opportunities/
    ├── interactions/
    ├── tasks/
    ├── appointments/
    ├── catalogs/
    ├── consultations/
    ├── quotes/
    ├── payments/
    ├── procedures/
    ├── aftercare/
    ├── notifications/
    └── reports/
```

### Quy tắc mỗi module backend

1. **Controller:** khai báo route, nhận DTO, lấy user hiện tại; gọi service. Không đặt truy vấn Prisma, tính tiền hoặc quy tắc chuyển trạng thái trong controller.
2. **DTO:** mô tả input/output của API và validate input ở biên hệ thống. Khi bật validation toàn cục, dùng whitelist để loại field ngoài hợp đồng. ID, ngày, enum và số tiền phải được parse/kiểm tra; không tin dữ liệu từ browser.
3. **Service:** thực hiện nghiệp vụ, kiểm tra phạm vi quyền, tính toán và quản lý transaction. Đây là nơi đặt quy tắc có thể cần dùng chung cho REST/API/job.
4. **Module:** đăng ký controller/provider và chỉ export provider khi module khác thực sự cần gọi. Tránh một `CrmService` khổng lồ chứa mọi nghiệp vụ.
5. **Repository riêng:** chỉ thêm khi truy vấn phức tạp/tái sử dụng hoặc giúp test rõ hơn; không tạo lớp bọc Prisma máy móc cho mọi bảng.
6. **Job/worker:** dùng service nghiệp vụ và idempotency giống request HTTP; không copy quy tắc vào cron handler.

Đặt tên route theo tài nguyên và dùng HTTP method đúng nghĩa, ví dụ `GET /api/customers`, `POST /api/customers`, `PATCH /api/opportunities/:id/stage`. API hiện tại dùng `/api`; có thể chuyển sang `/api/v1` khi thống nhất versioning trước tích hợp ngoài.

## 4. Cấu trúc frontend mục tiêu

Frontend hiện bắt đầu ở `frontend/app/page.tsx` và có dashboard MVP. Khi các màn hình tăng lên, tách theo route và feature:

```text
frontend/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (workspace)/layout.tsx
│   ├── (workspace)/dashboard/page.tsx
│   ├── (workspace)/customers/page.tsx
│   ├── (workspace)/customers/[customerId]/page.tsx
│   ├── (workspace)/opportunities/page.tsx
│   ├── (workspace)/appointments/page.tsx
│   ├── (workspace)/tasks/page.tsx
│   ├── layout.tsx
│   └── globals.css
├── src/
│   ├── features/
│   │   ├── customers/{api,components,schemas,types}.ts[x]
│   │   ├── opportunities/{api,components,schemas,types}.ts[x]
│   │   ├── appointments/
│   │   └── tasks/
│   ├── components/       # Button, Dialog, DataTable, FormField...
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── auth.ts
│   │   └── formatters.ts
│   └── hooks/
└── ...
```

- `app/` chịu trách nhiệm route, layout và ghép page; component nghiệp vụ lớn đặt gần feature.
- `features/<module>/api.ts` gọi API của feature đó; không rải URL và fetch logic khắp page.
- Component tái sử dụng chung đặt trong `components/`; không đưa form khách hàng hay business rules vào component dùng chung.
- Không nhân đôi cùng một quy tắc chuyển trạng thái/tính tiền ở UI như nguồn quyết định. UI có thể hiển thị lựa chọn hợp lệ, nhưng API vẫn kiểm tra lại.
- Dùng server/client component phù hợp; chỉ thêm `"use client"` cho phần thực sự cần state, event hoặc browser API.
- Các menu/màn hình theo role là trải nghiệm; backend vẫn là lớp thực thi quyền cuối cùng.

## 5. Quy ước API và dữ liệu

- Input phải được validate ở backend. Lỗi trả status HTTP phù hợp và message không chứa stack trace/SQL.
- Danh sách lớn cần pagination, sort/filter có allowlist; không nhận trực tiếp tên cột SQL từ request.
- UUID cho khóa nội bộ; thời gian lưu nhất quán (UTC trong DB/API), hiển thị theo timezone cơ sở đã cấu hình.
- Tiền VND dùng số nguyên hoặc `DECIMAL`, không dùng số thực. Tính tổng ở backend và kiểm tra lại trong transaction.
- Số điện thoại/email chuẩn hóa phục vụ tìm kiếm; không đặt unique cứng trên điện thoại khi người thân có thể dùng chung.
- Liên kết khách–cơ hội–lịch/khám/báo giá phải được xác thực đồng nhất ở backend, không chỉ dựa vào việc từng ID tồn tại.
- Thay đổi trạng thái và ghi history cùng transaction. History/audit, thanh toán và hồ sơ y khoa không xóa cascade.
- Chống lặp với request/job/tin gửi bằng idempotency key phù hợp; retry phải an toàn.
- Không ghi thông tin y khoa, token, mật khẩu, nội dung đồng ý hoặc URL file riêng tư vào log thông thường.

## 6. Phân quyền và bảo mật

Thiết kế quyền theo hai lớp:

1. **Permission theo hành động/module:** ví dụ `customers.read`, `customers.create`, `opportunities.assign`, `consultations.read`, `payments.refund`.
2. **Scope dữ liệu:** bản ghi được giao, cùng cơ sở, hoặc toàn hệ thống; quyền rộng hơn phải được cấp rõ.

Mỗi endpoint nhạy cảm cần xác thực user, kiểm tra permission và scope ở server. Việc xem/sửa/tải hồ sơ y khoa, ảnh/tệp, thanh toán cần audit actor, đối tượng, hành động và thời điểm. Quyền hiển thị trang không thay thế API guard. Trước khi hoàn tất auth/RBAC/audit, chỉ chạy local bằng dữ liệu giả lập; không triển khai công khai hoặc nhập dữ liệu khách thật.

Secret để trong `.env` local hoặc secret manager môi trường triển khai; commit `.env.example` với giá trị giả, không commit `.env`, token, password hoặc file khách hàng.

## 7. Database, migration và làm việc nhóm

- `backend/prisma/schema.prisma` là nguồn schema Prisma; migration sinh ra và review cùng thay đổi schema.
- Mỗi migration có một owner chịu trách nhiệm thứ tự. Tránh hai người đồng thời tạo/chỉnh migration trên cùng nhánh.
- Không sửa migration đã áp dụng ở môi trường dùng chung/production; tạo migration mới để sửa tiếp.
- PR thay đổi schema cần nêu ảnh hưởng dữ liệu cũ, khóa/index/FK, cách triển khai và rollback/khắc phục.
- Không chạy `migrate reset`, xóa volume DB hoặc seed dữ liệu phá hủy khi chưa xác nhận rõ môi trường.
- Dữ liệu mẫu phải giả lập, không dùng thông tin nhận diện khách thật.

### Chia việc cho nhóm hai người

- **A — tiếp nhận và vận hành:** khách hàng, cơ hội, tương tác, công việc, lịch hẹn, nhắc việc, báo cáo vận hành và hợp đồng API nền.
- **B — chuyên môn và giao dịch:** schema/migration/seed, hồ sơ khám, đồng ý/tài liệu, báo giá, thanh toán, ca thực hiện, hậu phẫu.
- Một người được chỉ định làm migration owner cho từng đợt; người còn lại review. Hợp đồng API và permission cho module dùng chung được thống nhất trước khi code.
- Mỗi task/PR có một owner; không để hai người sửa cùng page/schema trong cùng thời điểm. Nếu vướng quyết định Hana, chuyển task sang “Cần chốt nghiệp vụ”, không hard-code giả định.

## 8. Quy trình một thành viên triển khai feature

1. Đọc task và tiêu chí nghiệm thu; ghi rõ quyết định nghiệp vụ đã chốt và câu hỏi còn mở.
2. Xác định resource, quyền/scope, input/output API và ảnh hưởng database.
3. Thông báo contract với thành viên liên quan trước khi sửa module hoặc migration dùng chung.
4. Làm migration/schema nếu cần, DTO/controller/service ở backend, rồi API-client/UI ở frontend.
5. Cập nhật trạng thái loading/empty/error, quyền truy cập và lịch sử thay đổi phù hợp nghiệp vụ.
6. Chạy kiểm tra phù hợp: lint/typecheck/build; thêm test cho quyền, trạng thái, đặt lịch trùng, tiền và idempotency khi module đó được triển khai.
7. Review diff, không đưa `.env`, dữ liệu thật, generated Prisma Client, `node_modules`, `.next` hoặc log vào commit.
8. Mở PR nhỏ: mục tiêu, thay đổi, migration, cách kiểm tra, ảnh UI nếu có, rủi ro và task phụ thuộc.

### Checklist trước khi merge

- [ ] Code nằm đúng module nghiệp vụ; không đặt rule quan trọng trong UI/controller.
- [ ] Backend validate dữ liệu và permission/scope; frontend có trạng thái lỗi/trống/loading.
- [ ] Liên kết ID nhất quán; transaction/history/idempotency được áp dụng khi cần.
- [ ] Không log dữ liệu y khoa/tài chính/secret; file nhạy cảm không có URL công khai.
- [ ] Migration được review, không sửa migration đã chạy trên môi trường chung.
- [ ] Build/typecheck và kiểm tra nghiệp vụ liên quan đã chạy; hướng dẫn/contract được cập nhật.

## 9. Trạng thái repo hiện tại và bước refactor

- Đã tách `frontend/` và `backend/`; frontend là một dashboard MVP trong `app/page.tsx`.
- Backend hiện có `crm` module chung cho các API MVP. Đây là bước khởi đầu, chưa phải cấu trúc module cuối cùng.
- Khi thêm tính năng, chuyển dần controller/service thành `customers`, `opportunities`, `interactions`, `tasks`, `appointments` và `catalogs`; frontend tách page/feature theo cùng ranh giới.
- Không refactor mọi thứ chỉ để đổi tên folder. Tách khi có task nghiệp vụ tương ứng, giữ build chạy sau mỗi bước.
- Đăng nhập/RBAC, audit đầy đủ, nghiệp vụ khám/báo giá/thanh toán/ca/hậu phẫu và automation chưa hoàn thiện. Đây là các phần tiếp theo cần thiết trước khi dùng dữ liệu thật.
