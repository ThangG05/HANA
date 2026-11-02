# Hana Premium CRM — Yêu cầu thiết kế UI/UX và chuyển động 3D

**Phiên bản:** 1.0 · **Ngày:** 02/11/2026  
**Loại tài liệu:** Design brief và tiêu chí triển khai cho Codex  
**Tham chiếu:** `Hana-Premium-De-xuat-quy-trinh-CRM.docx`, `Hana-Premium-Database-CRM.docx`, `Hana-Premium-CRM-Phan-tich-va-chia-task.md`.  
**Phạm vi:** Giao diện **CRM nội bộ** của phòng khám thẩm mỹ Hana Premium. Không mặc định đây là website quảng cáo hoặc hệ thống bệnh án đầy đủ.

> Tài liệu này là yêu cầu thiết kế. Logo, bộ nhận diện chính thức, ảnh thương hiệu, font có bản quyền, nội dung truyền thông và các quyết định nghiệp vụ chưa có trong nguồn cần được Hana cung cấp/phê duyệt. Trong lúc chưa có, dùng nhận diện đề xuất và dữ liệu giả lập; không trình bày bản phác thảo như tài sản đã được Hana duyệt.

## 1. Mục tiêu thiết kế

Tạo một CRM có cảm giác **cao cấp, tinh tế, hiện đại và đáng tin cậy** như một sản phẩm được thiết kế riêng cho phòng khám thẩm mỹ. Giao diện cần tạo ấn tượng mạnh ở trang đăng nhập và tổng quan, đồng thời cho phép nhân viên thao tác nhanh, chính xác trong lịch hẹn, tư vấn, thu tiền và chăm sóc sau ca.

Thứ tự ưu tiên khi có xung đột:

1. An toàn dữ liệu, quyền truy cập và tính đúng của hành động.
2. Khả năng đọc, tìm, nhập và đối chiếu thông tin nhanh.
3. Tính nhất quán và rõ trạng thái của toàn bộ hành trình khách.
4. Thẩm mỹ, chiều sâu và chuyển động có chủ đích.

**Tuyên ngôn hình ảnh:** “Clinical elegance” — sự sạch sẽ, chính xác của môi trường y khoa kết hợp nét mềm mại và sang trọng của thương hiệu thẩm mỹ. Tránh cảm giác dashboard SaaS đại trà, spa quá nữ tính, hiệu ứng neon/cyberpunk, màu vàng kim chói, kính mờ phủ toàn trang, ảnh stock phẫu thuật gây khó chịu và 3D quay liên tục làm phân tâm.

## 2. Người dùng và công việc quan trọng

| Vai trò | Việc cần làm nhanh | Giao diện ưu tiên |
| --- | --- | --- |
| Marketing/trực page | Nhận lead, nhìn thời gian chờ, phân công | Hàng đợi lead mới, nguồn, cảnh báo trùng, thao tác phân công |
| Tư vấn viên | Xem bối cảnh khách, ghi tương tác, hẹn khám, theo dõi chưa chốt | Hồ sơ 360°, timeline, việc hôm nay, lịch hẹn, trạng thái cơ hội |
| Lễ tân | Xác nhận, check-in, đổi lịch, đánh dấu không đến | Lịch theo ngày/bác sĩ/phòng, trạng thái hiện diện, thao tác nhanh |
| Bác sĩ | Xem hồ sơ được giao, ghi khám, phương án, xử lý cảnh báo | Khu vực y khoa tập trung, thông tin rõ, ít yếu tố trang trí |
| Điều dưỡng/CSKH | Theo dõi mốc chăm sóc, phản hồi, tái khám, báo bất thường | Danh sách việc đến hạn, timeline sau ca, nút tạo cảnh báo dễ thấy |
| Thu ngân | Xem báo giá, ghi cọc/thu/hoàn, đối soát kỳ | Số tiền, trạng thái, nguồn giao dịch rõ và dễ kiểm tra |
| Quản lý | Theo dõi phễu, thời gian phản hồi, thực thu, việc quá hạn | Dashboard có định nghĩa số liệu và drill-down theo quyền |

**Nguyên tắc:** Một hồ sơ khách có thể chứa nhiều cơ hội dịch vụ. Mỗi cơ hội có trạng thái riêng; không hiển thị một trạng thái duy nhất cho cả khách. Không đưa dữ liệu y khoa vào màn hình/timeline chung của vai trò không có quyền.

## 3. Hướng mỹ thuật

### 3.1 Màu sắc đề xuất

Bảng màu là điểm khởi đầu, cần chỉnh sau khi nhận bộ nhận diện chính thức. Dùng token thay cho mã màu rải rác trong component.

| Token | Gợi ý | Vai trò |
| --- | --- | --- |
| `--color-canvas` | `#F7F5F2` | Nền ấm rất nhẹ |
| `--color-surface` | `#FFFFFF` | Card, form, bảng |
| `--color-surface-soft` | `#F1F3F0` | Vùng phụ, hover nhẹ |
| `--color-ink` | `#20292B` | Văn bản chính, xanh than gần đen |
| `--color-muted` | `#667174` | Chú thích, metadata |
| `--color-brand` | `#176B68` | CTA và điểm nhấn xanh ngọc trầm |
| `--color-brand-deep` | `#104D4B` | Hover/active |
| `--color-accent` | `#B79579` | Đồng champagne tiết chế, viền/nhấn thương hiệu |
| `--color-border` | `#DDE3E0` | Đường chia mảnh |
| `--color-success` | `#277A60` | Thành công |
| `--color-warning` | `#A96824` | Chờ/xử lý |
| `--color-danger` | `#B4494A` | Lỗi, cảnh báo y khoa |

- Nền chủ đạo sáng, nhiều khoảng trắng. Chỉ dùng vùng tối có chủ đích cho sidebar, login hoặc hero dashboard; không làm toàn bộ CRM tối.
- Màu trạng thái phải đi với **nhãn chữ và/hoặc biểu tượng**, không chỉ dựa vào màu. Cảnh báo y khoa dùng hệ màu riêng, mức ưu tiên rõ và CTA trực tiếp.
- Gradient nhẹ ở bề mặt giới thiệu: xanh than → xanh ngọc trầm, hoặc trắng ngà → xanh nhạt. Không dùng gradient trên bảng nhiều dữ liệu.
- Không coi các mã hex là ràng buộc thương hiệu cuối cùng; kiểm tra tương phản sau khi chốt palette.

### 3.2 Chữ và nhịp thị giác

- Ưu tiên font sans hỗ trợ tiếng Việt đầy đủ, nét hiện đại và dễ đọc (ví dụ `Inter` hoặc một lựa chọn tương đương có giấy phép phù hợp). Có thể dùng serif thanh lịch cho một tiêu đề thương hiệu ngắn ở login/hero; **không dùng serif cho bảng, biểu mẫu, số tiền**.
- Cỡ chữ nội dung mặc định 14–16 px; bảng không nhỏ hơn 13–14 px; tiêu đề trang 28–32 px trên desktop, 24–28 px trên mobile. Dùng trọng lượng vừa phải, không viết hoa toàn bộ các nhãn dài.
- Số tiền dùng chữ số tabular, căn phải trong bảng, hiển thị `30.000.000 ₫`; ngày giờ theo ngữ cảnh Việt Nam, ví dụ `02/11/2026 · 09:30`.
- Khoảng cách theo thang 4/8 px; card bo 16–20 px, input 10–12 px; bóng đổ rất nhẹ và viền mảnh. Không xếp nhiều card lồng nhau.
- Nội dung UI dùng tiếng Việt tự nhiên, ngắn, nhất quán. Ví dụ “Lưu báo giá”, “Đặt lịch khám”, “Ghi nhận đã đến”, “Tạo cảnh báo”; tránh thuật ngữ kỹ thuật database trên màn hình.

### 3.3 Hình ảnh và biểu tượng

- Biểu tượng nét đồng nhất, hình học mềm, kích thước 18–20 px ở navigation; không pha nhiều bộ icon.
- Ảnh thương hiệu nếu được Hana cung cấp: ánh sáng mềm, nền sạch, con người thật, tôn trọng riêng tư; không dùng ảnh trước/sau của khách làm trang trí.
- Khi chưa có ảnh được phép dùng, dùng họa tiết trừu tượng dạng dải lụa, đường cong hữu cơ, vòng sáng hoặc bề mặt vật liệu mờ. Tuyệt đối không tự bịa logo chính thức.

## 4. 3D và chuyển động — đẹp nhưng phục vụ công việc

### 4.1 Điểm nhấn 3D

- **Login / màn hình chào:** một đối tượng 3D trừu tượng như dải lụa satin hoặc khối thủy tinh mờ hình hữu cơ, chuyển động chậm theo con trỏ hoặc thời gian. Nó nằm trong vùng minh họa riêng, không che form đăng nhập.
- **Dashboard:** một hero nhỏ có chiều sâu (các lớp gradient, ánh sáng, mesh hoặc WebGL nhẹ) diễn tả “hành trình chăm sóc” bằng hình trừu tượng. Số liệu và CTA là HTML bình thường, luôn đọc được khi 3D không tải.
- **Các trang nghiệp vụ:** chiều sâu chủ yếu bằng layering, bóng nhẹ, chuyển động vi mô. Không đưa canvas 3D vào bảng khách, lịch, khám, báo giá, thu tiền hoặc cảnh báo.

### 4.2 Quy tắc chuyển động

| Tình huống | Chuyển động mong muốn | Giới hạn |
| --- | --- | --- |
| Mở trang | Fade + translate nhẹ ở header/card | 180–300 ms; không làm nội dung xuất hiện tuần tự quá lâu |
| Hover nút/card | Đổi màu, nâng tối đa 2–4 px, bóng nhẹ | 120–200 ms; không nhảy layout |
| Mở drawer/modal | Trượt/fade, focus vào nội dung | 200–300 ms; khóa focus phù hợp |
| Đổi trạng thái công việc | Phản hồi ngay, hiệu ứng xác nhận kín đáo | Không thay thế thông báo trạng thái bằng animation |
| Số liệu dashboard | Có thể count-up một lần khi vào trang | Không count-up trên bảng, không lặp khi filter |
| Hero 3D | Chuyển động chậm, tinh tế | Dừng/giảm khi không hiển thị; không bắt buộc để hoàn thành thao tác |

- Tôn trọng `prefers-reduced-motion`: tắt parallax, xoay và count-up; giữ chuyển trạng thái tối thiểu cần thiết.
- Không autoplay video có âm thanh. Không dùng flashing, hiệu ứng chói hoặc animation vô hạn ở vùng đọc dữ liệu.
- Có fallback CSS/SVG tĩnh nếu WebGL không hỗ trợ, mạng chậm hoặc thiết bị yếu. Lựa chọn công nghệ 3D theo stack đã chốt; không thêm thư viện nặng chỉ để làm hiệu ứng không cần thiết.
- Chỉ tải tài nguyên 3D ở trang dùng đến, ưu tiên lazy-load; không để 3D trì hoãn đăng nhập, lịch hoặc hồ sơ khách.

## 5. Khung ứng dụng và điều hướng

### 5.1 Desktop

- Sidebar trái rộng khoảng 240–264 px, có thể thu gọn về icon; vùng nội dung chính thoáng, max-width hợp lý cho form, bảng dùng toàn chiều ngang khả dụng.
- Topbar: breadcrumb/tên trang, tìm kiếm toàn hệ thống theo quyền, thông báo việc/cảnh báo, cơ sở đang chọn nếu áp dụng, menu tài khoản.
- Navigation nhóm theo công việc: **Tổng quan; Khách hàng; Cơ hội; Lịch hẹn; Công việc; Thăm khám; Báo giá; Thanh toán; Ca thực hiện; Chăm sóc sau ca; Báo cáo; Cài đặt**. Mục không có quyền không xuất hiện hoặc có trạng thái phù hợp; backend vẫn kiểm tra quyền.
- Trang danh sách có header rõ, CTA chính, bộ lọc ở phía trên, bảng dữ liệu bên dưới; các hành động theo dòng đặt ở menu hoặc nút dễ hiểu, không nhồi quá nhiều icon.

### 5.2 Tablet và mobile

- Tablet: sidebar thu gọn, bảng cuộn ngang có kiểm soát hoặc chuyển dạng list theo màn hình; drawer thao tác chiếm đủ chỗ.
- Mobile: navigation/drawer đơn giản; ưu tiên **việc của tôi, lịch hôm nay, hồ sơ khách, check-in, ghi tương tác, cảnh báo**. Bảng dày dữ liệu thành card/list với trường quan trọng; chi tiết tiền và y khoa phải đọc được, không cắt bớt thông tin quyết định.
- Vùng chạm tối thiểu khoảng 44 × 44 px cho hành động chính. Không phụ thuộc hover để thấy chức năng. Form một cột, bàn phím phù hợp kiểu dữ liệu, CTA lưu dễ tiếp cận.
- Breakpoint là gợi ý theo nội dung, không phải con số cố định; kiểm tra tối thiểu 360 px, 768 px, 1280 px và 1440 px.

## 6. Yêu cầu cho từng màn hình

### 6.1 Đăng nhập

- Bố cục hai vùng trên desktop: form gọn, rõ ràng một bên; minh họa thương hiệu/3D một bên. Trên mobile ưu tiên form, minh họa thu nhỏ hoặc ẩn.
- Hiển thị logo tạm dạng chữ “Hana Premium” nếu chưa có tài sản thật; thông điệp ngắn, không dùng thông tin khách giả như nội dung quảng cáo.
- Form có nhãn thật, hiện/ẩn mật khẩu, trạng thái loading, lỗi cụ thể nhưng không tiết lộ tài khoản tồn tại hay không; focus và điều hướng bàn phím tốt.

### 6.2 Tổng quan theo vai trò

- Greeting ngắn và bối cảnh ngày/cơ sở; hero 3D nhẹ ở phần đầu.
- **Tư vấn:** lead mới/chưa phản hồi, việc đến hạn, lịch khám hôm nay, cơ hội cần theo dõi.
- **Lễ tân:** lịch hôm nay, khách sắp đến, chưa xác nhận, no-show.
- **Bác sĩ:** lịch khám/ca được giao, hồ sơ cần hoàn tất, cảnh báo chưa nhận.
- **Điều dưỡng/CSKH:** mốc hậu phẫu hôm nay/quá hạn, phản hồi cần xử lý.
- **Thu ngân:** khoản chờ xác nhận, kỳ đến hạn, giao dịch cần đối soát.
- **Quản lý:** phễu, thời gian phản hồi, thực thu, việc quá hạn với định nghĩa số liệu và quyền phù hợp.
- Card KPI có nhãn, giá trị, kỳ thời gian, biến động nếu thực sự có dữ liệu so sánh; click để đến danh sách đã lọc. Không dùng số liệu bịa trong sản phẩm thật.

### 6.3 Khách hàng và hồ sơ 360°

- Danh sách: tìm theo tên/số điện thoại, lọc nguồn/người phụ trách, phân trang, trạng thái loading/empty/error, nút thêm khách nổi bật.
- Form thêm khách: thông tin liên hệ, nguồn, kênh ưa thích, người giới thiệu; kiểm tra trùng khi nhập số và hiển thị lựa chọn “Xem hồ sơ có thể trùng” / “Tiếp tục tạo khách mới”. Không tự gộp.
- Chi tiết: header tên và liên hệ; tab **Tổng quan, Cơ hội, Tương tác, Lịch hẹn, Công việc**; tab y khoa/tài liệu/giao dịch chỉ xuất hiện theo quyền. Một khách có thể có nhiều cơ hội với trạng thái khác nhau.
- Timeline dùng icon, thời điểm, người thực hiện, kết quả; phân biệt sự kiện tự động và do nhân viên ghi. Ghi chú nhạy cảm không hiện trong timeline thường.

### 6.4 Cơ hội dịch vụ

- Danh sách có chế độ bảng và có thể thêm Kanban nếu dữ liệu/lượng người dùng phù hợp. Kanban không thay thế bảng lọc/search.
- Card cơ hội: tên khách, dịch vụ, trạng thái, nguồn, tư vấn viên, việc kế tiếp/hạn; không hiển thị thông tin sức khỏe ở đây.
- Chi tiết dùng “journey stepper” gọn: Mới → Tư vấn → Hẹn → Khám → Chốt → Hậu phẫu → Hoàn tất. Nhánh `Cần nuôi dưỡng`/`Ngừng chăm sóc` hiển thị rõ như trạng thái riêng, không ép vào tuyến tiến thẳng.
- Chuyển trạng thái là hành động có điều kiện và lý do; UI chỉ cho các chuyển đổi hợp lệ, thông báo vì sao không chuyển được; lưu lịch sử.

### 6.5 Lịch hẹn

- Chế độ ngày/tuần và bộ lọc bác sĩ, phòng, cơ sở, loại lịch; màu loại lịch khác màu trạng thái và luôn có nhãn/legend.
- Click một slot để đặt lịch; drawer cho chọn khách/cơ hội, bác sĩ, phòng, thời gian, ghi chú phù hợp. Hiển thị lịch xung đột ngay khi chọn và kiểm tra lại lúc lưu.
- Card lịch thể hiện giờ, tên khách, loại, bác sĩ, phòng, trạng thái; thao tác xác nhận, check-in, hoàn thành, đổi/hủy, no-show theo quyền.
- Đổi lịch giữ tham chiếu lịch cũ; UI cho thấy lịch đã đổi và lịch mới, không biến lịch cũ mất khỏi lịch sử.

### 6.6 Công việc và tương tác

- Danh sách việc chia **Hôm nay / Quá hạn / Sắp tới / Hoàn thành**, lọc theo người và loại; nút hoàn thành yêu cầu kết quả khi nghiệp vụ cần.
- Drawer ghi tương tác cho phép chọn kênh/chiều/kết quả, ghi tóm tắt và hẹn lần liên hệ tiếp. Không tạo cảm giác biểu mẫu bệnh án trên màn tư vấn.
- Nút gọi/nhắn nếu có tích hợp phải cho thấy hành động thực sự và trạng thái gửi; không mô phỏng đã gửi khi chưa có kết nối.

### 6.7 Thăm khám và tài liệu y khoa

- Giao diện tập trung, nền sạch, ít chuyển động; chia vùng **Thông tin lần khám, Tiền sử/Dị ứng, Đánh giá, Phương án, Kết luận**. Có trạng thái lưu nháp/đã hoàn tất nếu nghiệp vụ duyệt.
- Dữ liệu nhạy cảm có nhãn và quyền rõ; tài liệu có loại, ngày tải, người tải, mục đích; ảnh trước/sau không hiện thumbnail cho vai trò không có quyền.
- Trước khi lưu/sử dụng ảnh, hiển thị mục đích đồng ý hiện hành và bằng chứng; không dùng một checkbox đồng ý chung cho mọi mục đích.

### 6.8 Báo giá, thanh toán và trả góp

- Báo giá: danh sách hạng mục, số lượng, đơn giá, giảm giá, thành tiền, tổng; preview dễ đọc/in; badge **Nháp / Đã gửi / Chấp nhận / Hết hạn / Thay thế / Hủy**.
- Phiên bản và lịch sử hiển thị rõ. Sau khi chấp nhận, UI chỉ đọc và đưa CTA “Tạo phiên bản mới” nếu được phép.
- Thu tiền: phân biệt **Giá trị báo giá, Đã thu, Đã hoàn, Thực thu, Còn phải thu**; người dùng nhìn thấy tính toán và giao dịch nguồn. Hành động hoàn tiền có xác nhận, hiển thị khoản thu gốc và giới hạn hoàn.
- Trả góp chỉ hiển thị khi quy trình đã được chốt; phân biệt tiền phòng khám đã nhận từ đối tác với nghĩa vụ khách trả đối tác. Không dùng một nhãn “công nợ” mơ hồ.

### 6.9 Ca thực hiện và chăm sóc sau ca

- Ca: lịch, bác sĩ, cơ sở, hạng mục đã chấp nhận, checklist trước ca, thời gian thực tế, bàn giao. Trạng thái rõ, thông tin y khoa theo quyền.
- Chăm sóc: timeline các mốc được duyệt, hạn, người phụ trách, trạng thái, kết quả; việc quá hạn nổi bật nhưng không dùng hiệu ứng gây hoảng.
- Cảnh báo y khoa: CTA “Báo dấu hiệu bất thường” dễ thấy trong màn chăm sóc; form có mô tả, mức ưu tiên, bác sĩ nhận; trạng thái **Mới → Đã nhận → Đang xử lý → Đã đóng** có thời gian và người chịu trách nhiệm. Cảnh báo chưa nhận nổi bật ở dashboard của bác sĩ.
- Mẫu chăm sóc: hiển thị dịch vụ, phiên bản, người duyệt và ngày duyệt; mẫu chưa duyệt không được chọn tạo lịch tự động.

### 6.10 Báo cáo và cài đặt

- Biểu đồ tối giản, có đơn vị, kỳ, bộ lọc và chú giải; bảng số liệu phía dưới để đối chiếu. Phễu đếm cơ hội duy nhất; thực thu trừ hoàn thành công. Không dùng chart 3D vì làm méo nhận thức số liệu.
- Mỗi KPI có tooltip “Cách tính”; export chỉ xuất dữ liệu trong phạm vi quyền, có trạng thái tải và audit.
- Cài đặt danh mục, nhân viên, vai trò, cơ sở, mẫu chăm sóc và cấu hình nhắc; phân quyền là giao diện quản trị có xác nhận và mô tả tác động.

## 7. Hệ thống component cần xây

Tạo design system nhỏ, dùng chung trước khi xây nhiều màn hình:

| Nhóm | Component tối thiểu | Trạng thái cần có |
| --- | --- | --- |
| Nền | App shell, sidebar, topbar, page header, breadcrumb | Expanded/collapsed, active, mobile |
| Nhập liệu | Button, input, search, select, date/time picker, textarea, checkbox, radio, money input | Default, hover, focus, disabled, error, loading |
| Dữ liệu | Data table, filter bar, pagination, card, KPI card, badge, avatar, timeline | Empty, loading, error, no permission |
| Tương tác | Drawer, modal, confirm dialog, toast, tooltip, tabs | Keyboard focus, escape, pending, success/failure |
| Chuyên biệt | Journey stepper, appointment tile, task row, quote line, payment summary, care milestone, medical alert | Tất cả trạng thái nghiệp vụ và giới hạn quyền |

Sử dụng token cho màu, cỡ chữ, khoảng cách, radius, shadow và motion. Không copy/paste CSS riêng cho từng màn hình. Icon phải có accessible name nếu là nút chỉ có icon.

## 8. UX cho dữ liệu và thao tác thực tế

- **Tìm kiếm:** có debounce hợp lý; phân biệt “không có kết quả” với lỗi mạng; nêu rõ phạm vi tìm kiếm theo quyền.
- **Bảng dài:** cột quan trọng cố định hợp lý, sắp xếp/lọc/phân trang server-side nếu dữ liệu lớn; không tải toàn bộ hồ sơ vào trình duyệt chỉ để lọc.
- **Biểu mẫu:** chia nhóm theo mục đích, đánh dấu bắt buộc, lỗi sát trường và hướng sửa; lưu nháp khi nghiệp vụ cho phép; cảnh báo khi rời trang có thay đổi chưa lưu.
- **Xác nhận:** thao tác nhạy cảm như hoàn tiền, hủy lịch, rút đồng ý, đóng cảnh báo cần nêu đối tượng và hệ quả. Không dùng thông báo thành công trước khi server xác nhận.
- **Quyền:** trang không có quyền hiển thị trạng thái phù hợp; không để dữ liệu nhạy cảm lóe lên trước khi kiểm tra quyền. Backend là nguồn quyết định.
- **Empty state:** có giải thích và CTA phù hợp vai trò. Dùng skeleton chỉ cho cấu trúc đang tải; lỗi có nút thử lại và giữ dữ liệu nhập khi có thể.
- **Ngày giờ:** hiển thị giờ cơ sở, nêu rõ múi giờ nếu nhiều cơ sở; tránh tự tính mốc chăm sóc bằng thời gian trình duyệt.
- **Tính đúng:** giá, trạng thái, tiền thu/hoàn và lịch sử dùng dữ liệu server; không tính độc lập ở client rồi coi là sự thật.

## 9. Accessibility, hiệu năng và riêng tư

### Accessibility

- Hướng tới WCAG 2.2 AA cho luồng chính: tương phản chữ, focus rõ, điều hướng bàn phím, nhãn form, thông báo lỗi, ngữ nghĩa bảng và modal.
- Bảo đảm tỷ lệ tương phản thông thường tối thiểu 4.5:1 cho văn bản nhỏ, 3:1 cho văn bản lớn và thành phần UI quan trọng; kiểm tra lại màu trạng thái trên nền thực tế.
- Không khóa chức năng sau hover, kéo thả hoặc chuyển động. Kanban/drag nếu có phải có cách thay thế bằng menu.
- Kiểm tra zoom 200%, reduced motion, màn hình nhỏ và screen reader ở các luồng đăng nhập, tạo khách, đặt lịch, ghi khám, hoàn tiền, cảnh báo.

### Hiệu năng

- Nội dung và form nghiệp vụ phải dùng được khi animation/3D chưa tải. Trì hoãn tài nguyên 3D; nén asset, giới hạn độ phân giải và số frame; theo dõi hiệu năng trên máy văn phòng tầm trung.
- Không animation bảng hàng trăm dòng; dùng phân trang/virtualization khi cần. Chuyển trang và lưu thao tác phải cho phản hồi ngay.
- Tránh phụ thuộc tài nguyên ngoài cho phần lõi nếu môi trường phòng khám có kết nối không ổn định.

### Riêng tư

- Không dùng dữ liệu khách thật trong mockup, ảnh demo hoặc screenshot chia sẻ công khai; seed dữ liệu giả lập.
- Không hiện thông tin y khoa, ảnh trước/sau, số điện thoại đầy đủ hoặc giao dịch trong dashboard/notification cho người không có quyền.
- Tài liệu/ảnh dùng URL riêng tư có kiểm tra quyền; không lưu ở thư mục public. Các lần xem/tải/xuất dữ liệu nhạy cảm ghi audit theo backend.
- Không dùng ảnh khách trong hiệu ứng 3D, nền trang hoặc thành phần trang trí.

## 10. Màn hình mẫu và thứ tự thiết kế

Để nhóm hai người làm được mà vẫn giữ chất lượng, thiết kế trước **một lát cắt dọc** thay vì vẽ hết màn hình một lần:

1. **Foundation:** tokens, typography, app shell, button/input/table/card/badge/drawer/modal, trạng thái và responsive.
2. **Mẫu phong cách:** login + dashboard theo vai trò tư vấn + danh sách khách + hồ sơ khách/cơ hội. Đây là nơi xác nhận nhận diện và độ “cao cấp”.
3. **Luồng MVP:** tương tác, công việc, lịch hẹn, tạo/đổi lịch và check-in.
4. **Luồng chuyên môn:** khám, đồng ý, tài liệu, báo giá, thanh toán, ca, hậu phẫu.
5. **Mở rộng:** báo cáo, quản trị, tích hợp gửi tin. Mỗi màn hình mới tái sử dụng component đã duyệt.

Với mỗi màn hình, bàn giao tối thiểu: desktop 1440 px, mobile 390 px, trạng thái loading/empty/error, tương tác chính, hiển thị theo vai trò và ghi chú responsive. Màn hình nhiều dữ liệu cần một mẫu có dữ liệu thật giả lập đủ dài để kiểm tra overflow.

## 11. Tiêu chí nghiệm thu thiết kế

Một bản triển khai được xem là đạt khi:

1. Có nhận diện thống nhất trên toàn bộ màn hình: màu, font, spacing, icon, card, form, bảng, trạng thái, motion.
2. Luồng khách → cơ hội → tư vấn → lịch → khám → báo giá → ca → chăm sóc có đường đi rõ; một khách nhiều cơ hội không bị gộp trạng thái.
3. Người dùng hoàn thành các tác vụ thường xuyên mà không phải tìm qua quá nhiều màn hình: ghi tương tác, đặt/đổi lịch, hoàn thành việc, check-in, ghi khám, ghi thu/hoàn, báo cảnh báo.
4. 3D xuất hiện có chủ đích ở login/dashboard, mượt trên thiết bị phù hợp; fallback tĩnh và reduced motion hoạt động; không cản đọc hoặc nhập liệu.
5. Giao diện hoạt động tốt trên desktop, tablet, mobile; không tràn chữ/tiền/ngày giờ; tất cả hành động chính dùng được bằng bàn phím và cảm ứng.
6. Trạng thái loading, empty, lỗi, không có quyền, lưu thành công/thất bại được thiết kế; không có nút giả hoặc số liệu bịa trên bản chạy thật.
7. UI không lộ dữ liệu y khoa/tài liệu/tiền qua màn hình không có quyền; API và tải tệp cũng phải được bảo vệ.
8. Mọi biểu đồ/số tiền thể hiện định nghĩa đã chốt; không dùng 3D cho dữ liệu định lượng.

**Review hình ảnh:** kiểm tra screenshot ít nhất ở 1440 × 900, 1280 × 800, 768 × 1024 và 390 × 844; xem cả trang nhiều dữ liệu, modal/drawer, bảng dài, lỗi form, quyền hạn chế và reduced motion. Cần review trực quan bằng mắt, không chỉ dựa vào test tự động.

## 12. Thông tin cần Hana cung cấp hoặc phê duyệt

- Logo vector, màu thương hiệu, font, tài liệu nhận diện và ảnh được phép dùng.
- Tên gọi chính thức của các vai trò, cơ sở, dịch vụ, trạng thái và thuật ngữ trên màn hình.
- Mẫu quy trình của từng vai trò; 3–5 tác vụ quan trọng nhất mỗi ngày.
- Ma trận quyền, đặc biệt đối với y khoa, ảnh, báo giá, thanh toán và xuất dữ liệu.
- Quy trình đồng ý lưu ảnh/dùng ảnh, kênh gửi tin, định nghĩa báo cáo, múi giờ/cơ sở.
- Có mong muốn phiên bản dark mode không; mặc định chỉ thiết kế light mode chất lượng cao để giảm khối lượng của nhóm hai người.

## 13. Chỉ dẫn đưa cho Codex khi bắt đầu triển khai

> Hãy đọc toàn bộ tài liệu này cùng `Hana-Premium-CRM-Phan-tich-va-chia-task.md` và hai tài liệu nghiệp vụ/database. Trước khi code, kiểm tra cấu trúc repo, stack và các component hiện có; giữ các quy ước phù hợp. Xây design tokens và app shell trước. Triển khai lát cắt đầu tiên gồm login, dashboard theo vai trò tư vấn, danh sách khách, chi tiết khách và cơ hội, sau đó lịch/công việc. Dùng dữ liệu giả lập khi API chưa sẵn sàng, đánh dấu rõ phần demo. Tạo một điểm nhấn 3D nhẹ ở login/dashboard có fallback tĩnh và `prefers-reduced-motion`. Không dùng 3D trong bảng/form/y khoa/tiền. Mỗi màn hình có loading/empty/error, responsive, keyboard focus và kiểm tra quyền ở API. Chụp/kiểm tra trực quan các kích thước nêu ở mục 11, sửa lỗi hiển thị trước khi bàn giao. Nếu tài liệu chưa chốt một quy tắc nghiệp vụ hoặc tài sản thương hiệu, dùng placeholder rõ ràng và ghi lại quyết định cần Hana phê duyệt; không tự khẳng định đó là quy trình/nhận diện chính thức.

---

**Ghi chú phạm vi:** Tài liệu này mô tả giao diện cần xây, không tự tạo thêm quyền, hành vi y khoa, điều kiện thanh toán hoặc lịch chăm sóc ngoài các quy tắc nghiệp vụ đã được phê duyệt.
