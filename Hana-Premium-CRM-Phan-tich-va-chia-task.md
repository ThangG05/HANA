# Hana Premium CRM — Phân tích nghiệp vụ và backlog cho nhóm 2 lập trình viên

**Phiên bản:** 1.0 · **Ngày:** 01/11/2026  
**Nguồn:** `Hana-Premium-De-xuat-quy-trinh-CRM.docx` (05/10/2026), `Hana-Premium-Database-CRM.docx` (bản đề xuất 30/10/2026), và bản chia module đã trao đổi.  
**Trạng thái:** Đề xuất triển khai để nhóm rà soát cùng Hana; các quy tắc chưa được Hana xác nhận được đánh dấu **[CẦN CHỐT]**.

## 1. Kết luận nhanh

CRM cần quản lý hành trình **theo cơ hội dịch vụ**. Một khách hàng có một hồ sơ chung nhưng có thể có nhiều cơ hội ở các giai đoạn khác nhau. Luồng cốt lõi: tiếp nhận → tư vấn → hẹn → khám → báo giá/chốt → ca thực hiện → chăm sóc sau ca. Các bảng trong tài liệu là thiết kế dữ liệu đề xuất, chưa phải migration có thể chạy ngay.

Với hai người, nên bàn giao theo ba mức:

- **MVP vận hành:** đăng nhập/phân quyền, danh mục, khách hàng, cơ hội, tương tác, công việc và lịch hẹn. Nhân viên có thể tiếp nhận và theo dõi khách đến khám mà không dùng bảng tính rời.
- **Luồng chốt và thực hiện:** hồ sơ khám giới hạn quyền, đồng ý/tài liệu, báo giá có phiên bản, thu/hoàn tiền, ca và bàn giao.
- **Hậu phẫu và tối ưu:** mẫu chăm sóc được duyệt, cảnh báo y khoa, nhắc tự động, tích hợp kênh gửi và báo cáo.

Mốc 7–8 tuần của tài liệu quy trình là tham khảo, **không phải cam kết tiến độ**. Ước lượng thực tế chỉ lập sau khi chốt stack, mức độ giao diện, tích hợp và các câu hỏi ở mục 12.

## 2. Phân tích đối chiếu nghiệp vụ và database

| Nghiệp vụ | Thiết kế đã hỗ trợ | Khoảng trống / quyết định cần làm |
| --- | --- | --- |
| Khách có thể quay lại cho dịch vụ khác | `KHACH_HANG` 1–N `CO_HOI_DICH_VU`; lịch sử trạng thái | Quy trình nói “mỗi khách luôn ở một trạng thái”, nhưng phải hiểu là **mỗi cơ hội** có trạng thái; “khách thân thiết” là phân nhóm khách. |
| Tiếp nhận nhiều nguồn, cảnh báo trùng | `NGUON_KHACH`, nguồn đầu tiên và nguồn cơ hội | Thêm số điện thoại chuẩn hóa, quy trình xử lý khách dùng chung số, idempotency cho form/webhook, quy tắc phân công. |
| Tư vấn và nhắc gọi lại | `TUONG_TAC`, `CONG_VIEC` | Cần định nghĩa phản hồi đầu tiên, giờ làm việc, mốc 1–3–7–14 ngày, cách hủy việc khi đã hẹn/chốt/từ chối. |
| Hẹn khám, đổi lịch, không đến | `LICH_HEN`, liên kết lịch cũ | Cần kiểm tra chồng lịch bác sĩ/phòng ở backend; xác định lịch giữ chỗ, trạng thái và khoảng đệm. |
| Thăm khám trước báo giá | `LAN_THAM_KHAM`, `BAO_GIA` tham chiếu lần khám | Phân quyền trường y khoa, chốt hệ thống bệnh án nguồn; báo giá không được phát hành nếu chưa có khám hợp lệ. |
| Chốt, cọc, hoàn tiền, trả góp | `BAO_GIA`, `CHI_TIET_BAO_GIA`, `THANH_TOAN`, `KY_THANH_TOAN`, `PHAN_BO_THANH_TOAN` | Chốt điều kiện chuyển “Đã chốt”; quy tắc phân bổ/hoàn phân bổ, đối tác thu tiền, giới hạn số tiền và quyền sửa. |
| Thực hiện và vật tư | `CA_THUC_HIEN` | Checklist hiện là TEXT; chưa có bảng vật tư hoặc checklist từng mục. Chỉ bổ sung nếu Hana xác nhận quản lý vật tư trong CRM. |
| Chăm sóc theo phác đồ | `MAU_CHAM_SOC`, `MOC_CHAM_SOC`, `CHAM_SOC_SAU_CA`, `CANH_BAO_Y_KHOA` | Bác sĩ duyệt phiên bản mẫu; cố định mẫu áp dụng cho từng ca; quy tắc điều chỉnh mốc, giao người nhận và báo động. |
| Đồng ý và ảnh trước/sau | `DONG_Y`, `TAI_LIEU`, `NHAT_KY_TRUY_CAP`, RBAC | Xác định đồng ý còn hiệu lực theo mục đích; tệp lưu riêng tư, kiểm tra quyền khi tải và khi xuất bản; chính sách lưu/xóa do Hana chốt. |
| Gửi tin và chiến dịch | Chưa có bảng chuyên biệt | Cần mẫu tin, hàng đợi, lần gửi, lỗi, idempotency, opt-out; ưu tiên nhắc việc nội bộ trong MVP. |
| Dashboard | Có dữ liệu nguồn | Chốt mẫu số, kỳ ghi nhận, công thức, timezone và cách loại lịch đổi/hủy, tiền hoàn trước khi viết truy vấn. |

### 2.1 Quy tắc dữ liệu cần thống nhất trước migration

1. UUID cho khóa nội bộ; timestamp có múi giờ; tiền VND dùng số nguyên/`DECIMAL(18,0)`, không dùng float. Lưu thời điểm theo UTC và hiển thị theo múi giờ cơ sở.
2. Tạo/sửa trạng thái cơ hội và thêm `LICH_SU_TRANG_THAI` trong **một transaction**. Không sửa/xóa lịch sử.
3. Khóa ngoại phải nhất quán xuyên chuỗi khách → cơ hội → lịch/khám/báo giá → ca. Backend kiểm tra cùng khách/cùng cơ hội, không dựa vào riêng FK.
4. Báo giá đã chấp nhận là bất biến; thay đổi bằng phiên bản mới. Lưu giá/tên hạng mục tại thời điểm lập.
5. Thu, hoàn, phân bổ kỳ và số dư được kiểm tra trong transaction; mã giao dịch bên ngoài phải chống xử lý lặp.
6. Không cascade delete hồ sơ y khoa, thanh toán, đồng ý và nhật ký. Dùng trạng thái/ngừng hoạt động khi cần giữ lịch sử.
7. Các tác vụ tự động phải có khóa chống trùng, có thể chạy lại an toàn và ghi lỗi để xử lý.
8. Mọi endpoint truy cập dữ liệu y khoa, tài liệu và giao dịch đều kiểm tra quyền ở server; việc ẩn nút trên UI không đủ.

### 2.2 Sơ đồ trạng thái đề xuất — cần Hana phê duyệt

`Mới → Đang tư vấn → Đã hẹn → Đã khám → Đã chốt → Đang hậu phẫu → Hoàn tất`.

- Từ `Mới`, `Đang tư vấn`, `Đã hẹn`, `Đã khám` có thể chuyển sang `Cần nuôi dưỡng` hoặc `Ngừng chăm sóc` với lý do. `Cần nuôi dưỡng` có thể quay lại `Đang tư vấn` khi khách phản hồi.
- Đổi/hủy lịch **không tự động** xóa lịch sử trạng thái. Khi lịch hợp lệ cuối cùng bị hủy, quy tắc quay về `Đang tư vấn` hay `Cần nuôi dưỡng` cần được chốt.
- `Đã chốt` phụ thuộc điều kiện chấp nhận báo giá và/hoặc cọc **[CẦN CHỐT]**. `Đang hậu phẫu` chỉ bắt đầu sau ca hoàn thành và bàn giao **[CẦN CHỐT]**.
- `Hoàn tất` là kết thúc cơ hội; khách thân thiết là nhãn/nhóm khách, không phải trạng thái của mọi cơ hội.

## 3. Nguyên tắc chia việc

Gọi hai người là **A (bạn)** và **B (đồng đội)**; có thể đổi tên khi đưa lên board.

- **A sở hữu luồng tiếp nhận/vận hành:** khách, cơ hội, tương tác, công việc, lịch hẹn, nhắc nội bộ, báo cáo phễu.
- **B sở hữu luồng chuyên môn/giao dịch:** khám, đồng ý/tài liệu, báo giá, thanh toán, ca, hậu phẫu.
- **Nền tảng chung:** A phụ trách API/auth và tích hợp luồng; B phụ trách migration/schema và seed. Cả hai duyệt hợp đồng API, ma trận quyền và migration trước khi merge. Chỉ một người chịu trách nhiệm thứ tự migration.
- Mỗi task có chủ sở hữu duy nhất; người kia review những PR đụng quyền, tiền, dữ liệu y khoa hoặc bảng dùng chung. Tránh hai người cùng sửa một màn hình hay một migration trong cùng đợt.
- Giao diện và backend của một nghiệp vụ nên do cùng một chủ sở hữu triển khai đến mức dùng được. Phần nền tảng UI/API được thống nhất trước.

**Quy ước backlog:** P0 = thiết yếu cho MVP; P1 = luồng nghiệp vụ chính sau MVP; P2 = mở rộng. `S` khoảng 0,5–1 ngày, `M` khoảng 2–3 ngày, `L` khoảng 4–6 ngày làm việc *sau khi yêu cầu rõ*. Đây là độ lớn tương đối, không phải lịch cam kết. Tách task `L` thành PR nhỏ khi thực hiện.

## 4. Backlog chi tiết

### M0. Nền tảng, danh mục, bảo mật

**Mục tiêu:** Môi trường chạy được, phân quyền trước khi nhập dữ liệu thật.  
**Bảng:** `NHAN_VIEN`, `CO_SO`, `DICH_VU`, `NGUON_KHACH`, `VAI_TRO`, `NHAN_VIEN_VAI_TRO`, `QUYEN_VAI_TRO`, `NHAT_KY_TRUY_CAP`.

| Task | Owner | Ưu tiên / cỡ | Kết quả và tiêu chí nghiệm thu |
| --- | --- | --- | --- |
| M0-01 Chốt kiến trúc và hợp đồng | A+B; A chốt | P0/M | Sơ đồ module, quy ước API/lỗi/phân trang, môi trường dev, migration, seed, CI và chiến lược tệp được ghi trong repo. Không tự giả định stack khi chưa thống nhất. |
| M0-02 Schema nền và seed | B | P0/M | Migration có FK/index/check cơ bản; seed một cơ sở, vai trò, nhân viên và dịch vụ mẫu; chạy lên DB trống và rollback/khôi phục theo chiến lược dự án. |
| M0-03 Đăng nhập và phiên | A | P0/M | Đăng nhập/đăng xuất, khóa tài khoản, hết hạn phiên; API từ chối truy cập khi chưa xác thực. Cách quản lý mật khẩu/SSO theo stack đã chọn. |
| M0-04 RBAC theo vai trò và phạm vi | A | P0/L | Middleware/policy kiểm tra hành động + phạm vi được giao/cơ sở/toàn bộ; bác sĩ không mặc định xem tất cả ca; quản lý báo cáo không mặc định xem y khoa. Có kiểm thử các trường hợp bị từ chối. |
| M0-05 Danh mục và nhân sự | B | P0/M | CRUD có kiểm tra dữ liệu cho dịch vụ, nguồn, cơ sở và nhân viên; ngừng hoạt động không làm mất lịch sử; chỉ người có quyền sửa danh mục. |
| M0-06 Nhật ký truy cập nhạy cảm | A | P0/M | Ghi người, đối tượng, ID, hành động, thời điểm cho xem/sửa/tải/xuất dữ liệu y khoa/tài liệu/giao dịch; log chỉ nối thêm và người dùng thường không sửa được. |

**Phụ thuộc:** M0-01 trước các module còn lại; M0-04 phải hoàn thành trước khi mở màn hình y khoa/giao dịch cho người dùng thật.

### M1. Khách hàng và cơ hội dịch vụ

**Bảng:** `KHACH_HANG`, `CO_HOI_DICH_VU`, `LICH_SU_TRANG_THAI`.

| Task | Owner | Ưu tiên / cỡ | Kết quả và tiêu chí nghiệm thu |
| --- | --- | --- | --- |
| M1-01 Hồ sơ khách và tìm kiếm | A | P0/M | Tạo/sửa/tìm theo tên, số điện thoại chuẩn hóa; cần ít nhất một kênh liên hệ; cảnh báo trùng nhưng cho phép người thân dùng chung số; không tự gộp. |
| M1-02 Cơ hội nhiều dịch vụ | A | P0/M | Một khách tạo nhiều cơ hội; nguồn, dịch vụ, tư vấn viên, mong muốn, ngân sách và ngày dự kiến; danh sách lọc theo trạng thái/người phụ trách. |
| M1-03 Chuyển trạng thái và lịch sử | A | P0/M | Chỉ cho chuyển hợp lệ, lưu lý do và người đổi; trạng thái và lịch sử ghi atomically; không sửa trực tiếp trạng thái bằng endpoint cập nhật hồ sơ. |
| M1-04 Phân công và màn hình tổng quan | A | P0/M | Tư vấn viên thấy cơ hội được giao; người có quyền phân công đổi người phụ trách; trang khách hiển thị các cơ hội riêng, không hiển thị một trạng thái khách gây hiểu nhầm. |
| M1-05 Nhập form đầu vào thủ công/chuẩn bị tích hợp | A | P0/S | Nhập khách từ nhân viên; thiết kế API tiếp nhận có khóa sự kiện nguồn để sau này kết nối form mà không tạo lặp. Kết nối form thực tế ở M9. |

**Phụ thuộc:** M0. **Điểm quyết định:** bộ trạng thái, quy tắc phân công và xử lý khách trùng.

### M2. Tương tác và công việc

**Bảng:** `TUONG_TAC`, `CONG_VIEC`.

| Task | Owner | Ưu tiên / cỡ | Kết quả và tiêu chí nghiệm thu |
| --- | --- | --- | --- |
| M2-01 Dòng thời gian tương tác | A | P0/M | Ghi kênh, chiều, thời gian, kết quả, tóm tắt, nhân viên; có thể gắn cơ hội hoặc chỉ khách; không đưa tiền sử/chi tiết bệnh lý vào ghi chú tư vấn thường. |
| M2-02 Danh sách công việc | A | P0/M | Tạo, giao, ưu tiên, hạn, hoàn thành với kết quả; lọc việc của tôi/quá hạn/theo khách; người ngoài phạm vi không sửa việc. |
| M2-03 Việc theo dõi chưa chốt | A | P1/M | Sinh mốc 1–3–7–14 ngày theo quy tắc đã duyệt; không tạo trùng; chốt/hẹn/từ chối thì hủy hoặc điều chỉnh việc còn mở. |
| M2-04 Đo phản hồi đầu | A | P1/S | Lấy tương tác đầu tiên của nhân viên sau `ngay_tiep_nhan`, loại tin tự động; thể hiện số phút và chưa phản hồi; tính theo giờ làm việc khi lịch hoạt động đã được chốt. |

**Phụ thuộc:** M1; M2-03 dùng cơ chế job ở M9 hoặc triển khai bộ xử lý nội bộ tối thiểu có thể chạy lặp an toàn.

### M3. Lịch hẹn

**Bảng:** `LICH_HEN`; liên kết `CONG_VIEC`.

| Task | Owner | Ưu tiên / cỡ | Kết quả và tiêu chí nghiệm thu |
| --- | --- | --- | --- |
| M3-01 Đặt lịch và xem lịch | A | P0/L | Chọn khách/cơ hội/cơ sở/bác sĩ/phòng/thời gian/loại; lịch theo ngày, bác sĩ và phòng; `ket_thuc > bat_dau`; kiểm tra khách và cơ hội nhất quán. |
| M3-02 Trạng thái hiện diện | A | P0/M | Xác nhận, ghi đến, hoàn thành, hủy, không đến; ghi lý do hủy; cập nhật cơ hội theo sơ đồ đã duyệt; không xóa lịch sử. |
| M3-03 Chống chồng lịch và đổi lịch | A | P0/M | Khi xác nhận, không có hai lịch hiệu lực giao thời gian cùng bác sĩ hoặc phòng; đổi lịch tạo bản ghi mới gắn lịch cũ và vô hiệu lịch cũ trong một giao dịch; thử đồng thời hai yêu cầu. |
| M3-04 Việc nhắc và khách không đến | A | P1/M | Tạo việc nội bộ trước lịch và việc gọi lại khi no-show; đổi/hủy lịch xử lý các việc chưa hoàn thành; khóa chống trùng. Tin gửi khách thuộc M9. |

**Phụ thuộc:** M0–M2. **Điểm quyết định:** phòng là danh mục riêng hay chuỗi tự do, thời lượng/giờ hoạt động, trạng thái nào giữ chỗ.

### M4. Thăm khám, đồng ý và tài liệu

**Bảng:** `LAN_THAM_KHAM`, `DONG_Y`, `TAI_LIEU`.

| Task | Owner | Ưu tiên / cỡ | Kết quả và tiêu chí nghiệm thu |
| --- | --- | --- | --- |
| M4-01 Lần khám | B | P1/L | Bác sĩ ghi tiền sử, dị ứng, đánh giá, phương án, kết luận; gắn lịch/cơ hội cùng khách; chỉ vai trò được cấp quyền xem/sửa; ghi audit. |
| M4-02 Ghi nhận đồng ý theo mục đích | B | P1/M | Lưu phiên bản nội dung, bằng chứng, thời điểm đồng ý/rút lại cho từng mục đích; truy vấn được trạng thái hiệu lực tại thời điểm sử dụng; không ghi đè lịch sử. |
| M4-03 Tài liệu và ảnh riêng tư | B | P1/L | Lưu tệp ở vùng riêng tư; metadata trong DB; kiểm tra quyền khi upload/xem/tải, kiểm tra đồng ý phù hợp; không đưa URL công khai vào response; log thao tác. |
| M4-04 Liên kết bệnh án ngoài | B | P2/S | Lưu mã hồ sơ ngoài và quy tắc đối chiếu; đồng bộ thực tế chỉ làm khi biết hệ thống nguồn và API. |

**Phụ thuộc:** M0, M1, M3. **Chưa xác nhận:** CRM lưu hồ sơ y khoa gốc hay chỉ bản tóm tắt/liên kết.

### M5. Báo giá và chốt dịch vụ

**Bảng:** `BAO_GIA`, `CHI_TIET_BAO_GIA`.

| Task | Owner | Ưu tiên / cỡ | Kết quả và tiêu chí nghiệm thu |
| --- | --- | --- | --- |
| M5-01 Lập báo giá từ lần khám | B | P1/M | Không lập báo giá chính thức thiếu lần khám hợp lệ; thêm nhiều hạng mục; số lượng > 0, giá/giảm giá hợp lệ, tính tiền ở backend bằng số nguyên VND. |
| M5-02 Phiên bản và vòng đời | B | P1/L | Nháp → đã gửi → chấp nhận/hết hạn/thay thế/hủy theo quy tắc; báo giá đã chấp nhận không sửa nội dung; phiên bản mới giữ lịch sử; tránh hai bản chấp nhận cùng phạm vi. |
| M5-03 Xác nhận chốt | B | P1/M | Lưu người lập, thời điểm, bằng chứng xác nhận; chuyển cơ hội `Đã chốt` đúng điều kiện Hana phê duyệt; không có đường tắt qua UI/API. |
| M5-04 Bản báo giá để xem/in | B | P1/M | Hiển thị tên và giá tại thời điểm báo giá, tổng tiền, hiệu lực, phiên bản, trạng thái; chỉ người có quyền thấy và xuất. |

**Phụ thuộc:** M4. **[CẦN CHỐT]** Chấp nhận bằng cách nào, có bắt buộc cọc và ngày thực hiện khi chốt không.

### M6. Thu tiền, hoàn tiền và kỳ thanh toán

**Bảng:** `THANH_TOAN`, `KY_THANH_TOAN`, `PHAN_BO_THANH_TOAN`.

| Task | Owner | Ưu tiên / cỡ | Kết quả và tiêu chí nghiệm thu |
| --- | --- | --- | --- |
| M6-01 Ghi nhận thu/cọc | B | P1/M | Giao dịch có trạng thái và mã đối soát; chỉ giao dịch thành công vào thực thu; cùng mã bên cung cấp không được xử lý hai lần. |
| M6-02 Hoàn tiền | B | P1/M | Tham chiếu khoản thu gốc cùng báo giá; tổng hoàn thành công không vượt khoản thu; không sửa/xóa giao dịch thành công; quyền thu ngân được kiểm tra. |
| M6-03 Sổ tổng hợp tiền | B | P1/M | Theo báo giá: tổng giá trị, thu thành công, hoàn thành công, thực thu, chưa phân bổ; phép tính được kiểm thử với thanh toán một phần và hoàn nhiều lần. |
| M6-04 Kỳ và phân bổ | B | P2/L | Kỳ duy nhất theo báo giá+số kỳ; phân bổ đúng cùng báo giá, không vượt tiền thu/kỳ; lưu khoản chưa phân bổ; xử lý hoàn phân bổ atomically. Chỉ triển khai sau khi chốt quy trình đối tác. |

**Phụ thuộc:** M5. **[CẦN CHỐT]** Hana hay đối tác thu từng kỳ; CRM có thực hiện đối soát thanh toán trực tuyến hay chỉ ghi nhận thủ công.

### M7. Ca thực hiện

**Bảng:** `CA_THUC_HIEN`, liên kết `CHI_TIET_BAO_GIA`, `LAN_THAM_KHAM`.

| Task | Owner | Ưu tiên / cỡ | Kết quả và tiêu chí nghiệm thu |
| --- | --- | --- | --- |
| M7-01 Lập và lên lịch ca | B | P1/M | Chỉ liên kết hạng mục báo giá phù hợp, lần khám và cùng cơ hội/khách; nhiều buổi cho một hạng mục; gắn bác sĩ/cơ sở/thời gian. |
| M7-02 Vòng đời và bàn giao | B | P1/L | Dự kiến/hoãn/đang thực hiện/hoàn thành/hủy; ghi bắt đầu/kết thúc thực tế, kiểm tra trước ca, kỹ thuật và hướng dẫn sau ca; phân quyền y khoa và audit. |
| M7-03 Checklist/vật tư có cấu trúc | B | P2/L | Nếu Hana yêu cầu: bổ sung bảng mẫu checklist, kết quả từng mục và vật tư; không suy ra tồn kho từ trường văn bản hiện có. |

**Phụ thuộc:** M4, M5; M3 nếu lịch thực hiện nằm trên lịch chung. **[CẦN CHỐT]** điều kiện tài chính/y khoa để bắt đầu ca.

### M8. Chăm sóc sau ca, tái khám và cảnh báo

**Bảng:** `MAU_CHAM_SOC`, `MOC_CHAM_SOC`, `CHAM_SOC_SAU_CA`, `CANH_BAO_Y_KHOA`, `DANH_GIA`.

| Task | Owner | Ưu tiên / cỡ | Kết quả và tiêu chí nghiệm thu |
| --- | --- | --- | --- |
| M8-01 Mẫu chăm sóc có duyệt | B | P1/M | Mỗi dịch vụ có phiên bản; chỉ mẫu được bác sĩ duyệt được áp dụng; sửa mẫu đã dùng bằng phiên bản mới; mốc do Hana/bác sĩ duyệt, không hard-code mốc tham khảo. |
| M8-02 Sinh lịch theo ca | B | P1/M | Khi ca hoàn thành, tạo mốc một lần; thời hạn tính từ thời điểm được chốt; có thể điều chỉnh theo chỉ định và ghi người/lý do; chạy lại không nhân đôi. |
| M8-03 Thực hiện chăm sóc/tái khám | B | P1/M | Điều dưỡng/CSKH thấy mốc được giao, ghi phản hồi, kết quả, thời điểm; liên kết lịch tái khám; hiển thị quá hạn. |
| M8-04 Cảnh báo bác sĩ | B | P1/M | Tạo cảnh báo ưu tiên, giao bác sĩ, xác nhận tiếp nhận, xử lý, đóng; cảnh báo mới/chưa nhận được thấy nổi bật; không tự đóng khi việc chăm sóc hoàn thành. |
| M8-05 Đánh giá và giới thiệu | B | P2/S | Ghi điểm kèm thang điểm, ý kiến và người xử lý; liên kết khách giới thiệu khi xác minh; không trộn các thang điểm trong báo cáo. |

**Phụ thuộc:** M7, M0; M3 cho tái khám. **[CẦN CHỐT]** người duyệt phác đồ và thời hạn phản hồi cảnh báo.

### M9. Tự động hóa và tích hợp

**Bảng bổ sung đề xuất:** `MAU_THONG_BAO`, `HANG_DOI_THONG_BAO`, `LAN_GUI_THONG_BAO` hoặc cấu trúc tương đương; không nhất thiết lập bảng nếu MVP chỉ tạo việc nội bộ.

| Task | Owner | Ưu tiên / cỡ | Kết quả và tiêu chí nghiệm thu |
| --- | --- | --- | --- |
| M9-01 Job và idempotency | A | P1/M | Job có lịch chạy, retry có giới hạn, khóa chống trùng, log lỗi; chạy lại không nhân đôi việc/mốc/tin. |
| M9-02 Nhắc nội bộ | A | P1/M | Việc cho khách mới, khách chưa chốt, no-show, kỳ đến hạn và mốc hậu phẫu theo rule đã chốt; đổi/hủy đối tượng xử lý việc cũ. |
| M9-03 Form/webhook tiếp nhận | A | P2/M | Xác thực nguồn, lưu mã sự kiện, xử lý gửi lặp, ghi nguồn và phân công; sự kiện lỗi có thể xử lý lại. Chỉ làm khi có thông số form. |
| M9-04 Gửi Zalo/SMS/email | A | P2/L | Mẫu tin, hàng đợi, trạng thái gửi, retry, giới hạn gửi, kiểm tra đồng ý marketing, log phản hồi và chống gửi lặp; adapter theo nhà cung cấp được chọn. |
| M9-05 Cấu hình thời điểm | A | P2/S | Mốc 1 ngày/2 giờ trước hẹn, 1–3–7–14 ngày, sinh nhật... là cấu hình có timezone/giờ làm việc và có thể tắt theo loại. |

**Phụ thuộc:** các module phát sinh sự kiện. Không triển khai gửi tin thật trước khi Hana xác nhận kênh, nội dung và mục đích đồng ý.

### M10. Báo cáo và đồng hành

| Task | Owner | Ưu tiên / cỡ | Kết quả và tiêu chí nghiệm thu |
| --- | --- | --- | --- |
| M10-01 Từ điển chỉ số | A | P1/S | Mỗi KPI có tử số, mẫu số, kỳ/cohort, bộ lọc, timezone, nguồn bảng và ví dụ kiểm chứng được Hana duyệt. |
| M10-02 Phễu và tốc độ phản hồi | A | P1/M | Đếm cơ hội duy nhất theo giai đoạn; đổi lịch không nhân số khách; tin tự động không tính phản hồi nhân viên; lọc theo nhân viên/nguồn/dịch vụ. |
| M10-03 Thực thu và hậu phẫu | A, B review | P2/M | Thực thu = thu thành công trừ hoàn thành công; không lấy báo giá làm doanh thu; tỷ lệ tái khám tính trên lượt đến hạn theo định nghĩa đã chốt. |
| M10-04 Đồng hành/chiến dịch | A | P2/M | Phân nhóm khách, sinh nhật/nhắc duy trì, chỉ tạo chiến dịch gửi khi đồng ý phù hợp còn hiệu lực; có danh sách loại trừ và lịch sử gửi. |

**Phụ thuộc:** dữ liệu đủ chất lượng từ M1–M9; dashboard chỉ đọc dữ liệu trong phạm vi quyền và không lộ chi tiết y khoa.

## 5. Bảng phân công và thứ tự thực hiện

| Đợt | A | B | Điểm tích hợp / điều kiện qua đợt |
| --- | --- | --- | --- |
| 0 — chốt thiết kế | API/auth, trạng thái, quyền | Schema/migration, dữ liệu mẫu | Cùng ký hợp đồng trạng thái, ma trận quyền, quy tắc ID/FK, một hành trình khách mẫu. |
| 1 — MVP | M1, M2, M3 | M0 danh mục/schema; hỗ trợ review và chuẩn bị M4 | Demo tạo khách → cơ hội → tư vấn → hẹn → đến/không đến; phân quyền hoạt động. |
| 2 — chốt dịch vụ | M2/M3 hoàn thiện, job nền M9-01 | M4, M5, M6-01..03 | Demo khám → báo giá → xác nhận → cọc/hoàn, không lộ y khoa cho tư vấn/thu ngân ngoài quyền. |
| 3 — sau ca | Tích hợp nhắc việc, M10-01..02 | M7, M8 | Demo ca hoàn thành → mốc chăm sóc → tái khám/cảnh báo; job chạy lại không nhân đôi. |
| 4 — mở rộng | Form, gửi tin, báo cáo và chiến dịch nếu đã có nhà cung cấp | Trả góp, checklist/vật tư nếu Hana xác nhận | Chỉ nhận task P2 đã được xác nhận phạm vi; UAT và sửa lỗi ưu tiên. |

**Đường găng:** M0 → M1/M3 → M4 → M5 → M7 → M8. M6 cần M5; M9 và M10 dùng sự kiện/dữ liệu từ các module. Khi B chờ dữ liệu M1/M3, có thể làm schema, policy, seed và giao diện khung M4; dùng contract/mẫu dữ liệu đã thống nhất, không tự tạo quy tắc nghiệp vụ khác.

## 6. Các luồng kiểm thử xuyên module bắt buộc

1. **Khách mới:** tạo từ số điện thoại đã tồn tại → cảnh báo trùng, vẫn cho tạo người thân khi có xác nhận; cơ hội mới được phân công, lưu nguồn đúng.
2. **Một khách, hai cơ hội:** ca của cơ hội A đang hậu phẫu, cơ hội B đang tư vấn; danh sách và báo cáo không gộp trạng thái.
3. **Lịch:** hai nhân viên đặt cùng bác sĩ/phòng cùng giờ → chỉ một lịch được xác nhận; đổi lịch giữ lịch cũ và điều chỉnh việc nhắc.
4. **Khám và quyền:** bác sĩ ghi tiền sử; tư vấn viên không đọc được dữ liệu nhạy cảm qua API, kể cả khi biết ID; việc xem/tải ghi audit.
5. **Báo giá:** không lập chính thức trước khám; báo giá đã chấp nhận không sửa được; bản mới không xóa bản cũ.
6. **Tiền:** thu một phần, hoàn một phần, gửi lại cùng mã giao dịch → thực thu và phân bổ đúng, không ghi nhận hai lần.
7. **Sau ca:** hoàn thành ca tạo đúng các mốc từ mẫu đã duyệt; chạy job lại không nhân đôi; dấu hiệu bất thường tạo cảnh báo cho bác sĩ, có người tiếp nhận và đóng.
8. **Marketing:** rút lại đồng ý → các lần gửi marketing tiếp theo bị chặn; giao dịch/chăm sóc thiết yếu được xử lý theo mục đích riêng đã chốt.

## 7. Định nghĩa hoàn thành cho mỗi task

- Migration/schema, API, giao diện và kiểm tra quyền phù hợp phạm vi task; dữ liệu nhập sai trả lỗi rõ ràng.
- Có ít nhất một kiểm thử có ý nghĩa cho quy tắc rủi ro cao (quyền, chuyển trạng thái, chồng lịch, tính tiền, idempotency); luồng chính được demo trên dữ liệu mẫu.
- Có xử lý loading/empty/error cho màn hình; không để thông tin y khoa hoặc URL tệp riêng tư trong log công khai.
- PR nhỏ, có mô tả cách kiểm tra và ảnh/chụp màn hình nếu thay UI; người còn lại review trước merge.
- Chức năng chạy trên môi trường chung sau migration và không phá luồng đã bàn giao.

## 8. Các thay đổi schema nên xem xét

| Đề xuất | Lý do | Thời điểm |
| --- | --- | --- |
| `so_dien_thoai_chuan_hoa` và index tìm kiếm; không unique cứng | Cảnh báo trùng nhưng vẫn hỗ trợ người thân dùng chung số | M1 |
| Danh mục `PHONG` hoặc cấu hình nguồn lực lịch | Chống trùng phòng ổn định hơn chuỗi tự do | M3, nếu phòng là tài nguyên cần đặt |
| Ràng buộc unique phù hợp cho `(co_hoi_id, phien_ban)` báo giá; `(bao_gia_id, so_ky)` kỳ; `(dich_vu_id, phien_ban)` mẫu | Giữ phiên bản và lịch sử nhất quán | M5/M6/M8 |
| Bản ghi sự kiện/job/tin gửi với idempotency key | Theo dõi retry, lỗi và chống gửi/tạo lặp | M9 |
| Snapshot mẫu chăm sóc/phiên bản áp dụng vào ca hoặc mốc thực tế | Sửa mẫu tương lai không đổi lịch ca cũ | M8 |
| Cơ chế lịch sử hoặc audit cho thay đổi quan trọng ngoài trạng thái cơ hội | Đối soát đổi lịch, duyệt mẫu, đồng ý, hoàn tiền | Theo từng module |
| Bảng checklist/vật tư | Chỉ khi CRM phải theo dõi từng mục/vật tư thay vì ghi chú | M7 P2 |

Các ràng buộc khó bảo đảm bằng `CHECK` đơn lẻ (cùng khách/cơ hội, tổng hoàn, tổng phân bổ, lịch chồng) phải được kiểm tra trong transaction với cơ chế khóa phù hợp DB được chọn. Thiết kế cụ thể phụ thuộc công nghệ triển khai.

## 9. Phạm vi nên để ngoài MVP

- Đồng bộ hai chiều với bệnh án/kế toán/tổng đài khi chưa biết hệ thống nguồn.
- Tự động gửi đa kênh và chiến dịch marketing trước khi chốt nhà cung cấp, chi phí, nội dung và đồng ý.
- Quản lý kho/vật tư đầy đủ, thanh toán online, phê duyệt trả góp tự động, ứng dụng di động riêng.
- Dashboard phức tạp hoặc KPI “doanh thu” nếu chưa phân biệt báo giá, thực thu, hoàn tiền, khoản đối tác thu.

Đây là **hoãn phạm vi**, không loại bỏ nhu cầu. Các module nền đã chừa điểm kết nối để bổ sung sau.

## 10. Rủi ro và cách giảm

| Rủi ro | Cách xử lý |
| --- | --- |
| Hai người sửa cùng schema/luồng, conflict liên tục | B là owner migration; hợp đồng API trước khi code; mỗi PR một thay đổi độc lập, review hàng ngày. |
| Phạm vi y khoa rộng hơn CRM | Hana xác nhận hệ thống bệnh án gốc và phần CRM lưu; quyền, audit, lưu tệp riêng tư trước dữ liệu thật. |
| Chốt nghiệp vụ chưa rõ gây sửa lại nhiều | Dùng danh sách [CẦN CHỐT] làm quyết định có người phê duyệt; không hard-code giả định thành quy trình chính thức. |
| Tác vụ tự động gửi/tạo nhiều lần | Idempotency key, transaction, log lần chạy, retry có kiểm soát và test chạy lặp. |
| Báo cáo sai dù dữ liệu đúng | Từ điển KPI được duyệt, ví dụ tính tay và đối chiếu báo cáo với giao dịch mẫu. |
| Một người bị nghẽn trên đường găng | A cung cấp contract và seed sớm; B phát triển theo hợp đồng; demo một hành trình cuối mỗi đợt. |

## 11. Đề xuất board quản lý task

Tạo các cột `Backlog → Cần chốt nghiệp vụ → Ready → Doing → Review → QA/UAT → Done`. Mỗi card dùng mã trong mục 4, owner, ưu tiên, phụ thuộc, tiêu chí nghiệm thu và link PR. Giới hạn mỗi người tối đa 1 task `L` hoặc 2 task `S/M` đang làm; nếu vướng quyết định của Hana, chuyển card sang `Cần chốt nghiệp vụ` và nhận việc độc lập khác. Không kéo toàn bộ M0–M10 vào cùng một sprint.

**Mốc demo đầu tiên có thể kiểm chứng:** một nhân viên đăng nhập, tạo khách và hai cơ hội, ghi cuộc tư vấn, giao việc, đặt/đổi lịch, đánh dấu khách đến hoặc không đến; một tài khoản ngoài phạm vi không xem/sửa được. Mốc demo thứ hai là khám → báo giá → cọc/hoàn; mốc thứ ba là ca → hậu phẫu → cảnh báo.

## 12. Quyết định cần lấy từ Hana trước khi ước lượng và triển khai P1/P2

| Mã | Câu hỏi | Ảnh hưởng |
| --- | --- | --- |
| Q01 | Có bao nhiêu cơ sở, bác sĩ/phòng dùng chung thế nào? | Phân quyền và lịch |
| Q02 | Nguồn lead thực tế, cách chia tư vấn viên, xử lý số dùng chung? | M1, M9 |
| Q03 | Trạng thái và điều kiện chuyển từng bước; “đã chốt” cần xác nhận/cọc/ngày ca nào? | M1, M5, M7 |
| Q04 | Phần mềm bệnh án/kế toán/tổng đài hiện tại; hệ thống nào giữ dữ liệu gốc? | M4, M6, tích hợp |
| Q05 | Bác sĩ duyệt mẫu chăm sóc và cảnh báo theo quy trình nào? | M8 |
| Q06 | Trả góp qua đối tác nào; ai thu tiền từng kỳ; ai chịu khoản nợ? | M6, báo cáo |
| Q07 | Kênh gửi tin, mẫu nội dung, giờ được liên hệ, quy tắc đồng ý và rút lại? | M9, M10 |
| Q08 | CRM có cần quản lý checklist từng mục/vật tư/tồn kho? | M7 và schema |
| Q09 | Báo cáo tính theo khách hay cơ hội, kỳ nào, định nghĩa thực thu và tái khám đúng hạn? | M10 |

**Bước kế tiếp:** chốt Q01–Q03 và ma trận quyền bằng một buổi làm việc với Hana; sau đó tạo task M0-01, M0-02, M0-03, M0-04 và M1-01 trên board. Các quyết định còn lại có thể được chốt trước khi bắt đầu module tương ứng.
