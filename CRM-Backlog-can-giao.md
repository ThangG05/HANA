# Hana Premium CRM — backlog còn lại để giao task

Ngày rà soát: 02/11/2026. Căn cứ: `Hana-Premium-CRM-Phan-tich-va-chia-task.md`, `Styles/Hana-Premium-CRM-Yeu-cau-thiet-ke-UI-UX.md`, các module frontend/backend và Prisma schema hiện có. Đây là rà soát mã nguồn; chưa phải nghiệm thu vận hành trên dữ liệu thật.

## Đã có, không giao lại từ đầu

CRM đã có hồ sơ khách, nhiều cơ hội trên một khách, tương tác, công việc, lịch hẹn, khám, báo giá, thanh toán/công nợ, ca, chăm sóc, đồng ý theo mục đích và RBAC ở API. Có việc nội bộ nhắc lịch, gọi lại khi không đến, theo dõi cơ hội 1–3–7–14 ngày. Những phần này vẫn cần nghiệm thu theo vai trò và dữ liệu giả lập.

## P0 — nên giao trước khi dùng cho dữ liệu thật hoặc chia nhóm phát triển

| Mã | Task | Đầu ra / tiêu chí nghiệm thu | Phụ thuộc |
| --- | --- | --- | --- |
| G01 | Khôi phục lịch sử database | Lấy lại các migration SQL đã chạy, gồm trigger/RLS/check/seed quyền; bỏ quy tắc ignore SQL; dựng được DB trắng và đối chiếu schema với Supabase hiện tại. Có quy trình backup/restore. **Không chạy reset trên DB đang dùng.** | Quyền truy cập bản SQL/backup gốc |
| G02 | Dọn thông tin nhạy cảm và tài liệu chạy dự án | Gỡ thông tin đăng nhập demo dạng văn bản thuần khỏi README; xác định có dùng ở môi trường nào không để đổi mật khẩu nếu cần; cập nhật README vì mô tả “chưa có auth/RBAC/khám/thanh toán” đã lỗi thời. `.env` và khóa thật không vào Git. | Không |
| G03 | Nghiệm thu phân quyền và luồng lõi | Ma trận vai trò × thao tác × phạm vi; kiểm tra tình huống bị từ chối và chuỗi tạo khách → cơ hội → lịch → khám → báo giá → thu → ca → chăm sóc. Kiểm tra đặt lịch đồng thời, thu/hoàn đồng thời, đổi lịch, rút đồng ý. Lỗi phải giữ trạng thái nhất quán. | G01, quy tắc Hana xác nhận |
| G04 | Chốt quy tắc nghiệp vụ đang hard-code | Hana phê duyệt sơ đồ trạng thái, điều kiện “đã chốt”/bắt đầu ca, ngưỡng cọc, mức giảm giá và thời hạn báo giá. Ghi quyết định vào tài liệu và cấu hình có version; không dùng mặc định 0%/10%/14 ngày như quy tắc chính thức khi chưa duyệt. | Hana trả lời Q03 |

## P1 — hoàn thiện CRM nội bộ

| Mã | Task | Đầu ra / tiêu chí nghiệm thu | Phụ thuộc |
| --- | --- | --- | --- |
| G05 | Quản trị danh mục, nhân viên và quyền | Màn quản trị và API cần thiết cho nguồn lead, cơ sở, nhân viên, vai trò/quyền; khóa nhân viên không xóa lịch sử; audit thay đổi quyền. Hiện API danh mục chủ yếu đọc và chỉ dịch vụ có thao tác ghi. | G01, ma trận quyền |
| G06 | Tiếp nhận lead và chống trùng sự kiện | API/import có mã sự kiện nguồn, chuẩn hóa liên hệ, cảnh báo hồ sơ trùng, không tự gộp; gửi lại cùng sự kiện không tạo khách/cơ hội thứ hai; lỗi nhập có báo cáo từng dòng. Kết nối form thật là task riêng. | Quy tắc nguồn và phân công Q02 |
| G07 | SLA phản hồi đầu và hàng đợi lead | Tính lần tương tác đầu tiên do nhân viên thực hiện sau tiếp nhận; loại hành động tự động; hiển thị lead chưa phản hồi/quá hạn theo người phụ trách và nguồn. Giờ làm việc phải được Hana xác nhận trước khi tính SLA theo giờ làm. | G06, định nghĩa SLA |
| G08 | Job nội bộ đáng tin cậy | Worker quét việc đến hạn, retry có giới hạn, log lỗi và khóa chống trùng; hỗ trợ việc của lead mới, chưa chốt, no-show và mốc hậu phẫu; chạy lại không nhân đôi. Mốc/giờ liên hệ cấu hình theo cơ sở và múi giờ. **Chưa gửi tin ra ngoài.** | G01, quy tắc nhắc việc |
| G09 | Đồng ý và tài liệu riêng tư | Truy vấn đồng ý còn hiệu lực tại thời điểm sử dụng; kho tệp riêng tư và metadata `tai_lieu`; upload/xem/tải kiểm tra quyền và mục đích đồng ý; URL có thời hạn, audit truy cập. Không hiện ảnh nhạy cảm ở timeline thường. | G01, quy trình đồng ý ảnh |
| G10 | Báo cáo CRM có định nghĩa | Từ điển KPI được Hana duyệt; phễu đếm cơ hội duy nhất, thời gian phản hồi đầu, tỷ lệ đến hẹn, việc quá hạn, thực thu = thu thành công − hoàn thành công. Bộ lọc theo kỳ/cơ sở/nhân viên/nguồn/dịch vụ; drill-down không vượt quyền. | G07, định nghĩa Q09 |
| G11 | Kiểm tra và vận hành phát hành | CI cho typecheck/build và kiểm tra nghiệp vụ; dữ liệu UAT giả lập theo từng vai trò; hướng dẫn backup/restore, triển khai staging, log/monitoring, quy trình xử lý lỗi và rollback. | G01–G03 |

## P2 — chỉ bắt đầu khi Hana chốt phạm vi

| Mã | Task | Điều kiện bắt đầu / kết quả |
| --- | --- | --- |
| G12 | Kỳ trả góp và phân bổ | Chốt đối tác, ai thu từng kỳ, ai giữ công nợ (Q06). Sau đó dùng `ky_thanh_toan`, `phan_bo_thanh_toan`, đối soát và hoàn tiền đúng kỳ. |
| G13 | Gửi Zalo/SMS/email và chiến dịch | Chốt nhà cung cấp, mẫu tin, giờ liên hệ, mục đích đồng ý và rút lại (Q07). Cần hàng đợi, retry, giới hạn gửi, log gửi và chống trùng. Không hiển thị “đã gửi” khi chưa có kết quả nhà cung cấp. |
| G14 | Form/webhook và tích hợp bên ngoài | Có thông số nguồn và API thực tế (Q02/Q04), xác thực webhook và mã sự kiện; retry an toàn. |
| G15 | Vật tư, tồn kho, thẻ, kế toán hoặc tương tác hội nhóm | Chỉ tạo task sau khi Hana xác định quy trình, người dùng, dữ liệu gốc, quyền và tiêu chí nghiệm thu. Những mục này chưa có module tương ứng trong schema/CRM backlog hiện tại. |

## Thứ tự giao việc đề xuất

1. G02 và G01 có thể chạy song song; G04 là buổi chốt nghiệp vụ với Hana.
2. Sau đó G03 + G05/G06. Lấy kết quả G06 để làm G07 và G08.
3. G09 và G10 triển khai sau khi quyền/dữ liệu nền ổn định; G11 xuyên suốt nhưng chỉ nghiệm thu cuối khi các luồng chính hoàn tất.
4. G12–G15 đưa vào backlog chờ quyết định, chưa ước lượng chắc chắn.

**Gợi ý cho nhóm hai người:** A phụ trách G02, G06–G08 và G10; B phụ trách G01, G05, G09 và G12. Cả hai cùng review G03/G11. G04 cần người đại diện Hana ra quyết định; kỹ thuật chỉ ghi và triển khai quyết định đã duyệt.

Tài liệu này không chứa URL kết nối, token, mật khẩu hoặc dữ liệu khách hàng.
