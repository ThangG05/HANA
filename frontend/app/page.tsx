const workstreams = [
  { title: "Khách hàng mới", description: "Tiếp nhận và phân công tư vấn viên", count: "Chưa kết nối API" },
  { title: "Lịch hẹn hôm nay", description: "Xác nhận lịch theo bác sĩ và cơ sở", count: "Chưa kết nối API" },
  { title: "Việc cần theo dõi", description: "Gọi lại, hậu phẫu và tái khám", count: "Chưa kết nối API" },
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">HANA PREMIUM</p>
          <h1>CRM phòng khám</h1>
        </div>
        <span className="environment-tag">Bản khởi tạo</span>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">TỔNG QUAN</p>
          <h2>Quản lý hành trình khách hàng</h2>
          <p className="muted">Từ tiếp nhận, tư vấn, đặt lịch đến chăm sóc sau dịch vụ.</p>
        </div>
      </section>

      <section className="card-grid" aria-label="Các khu vực nghiệp vụ">
        {workstreams.map((item) => (
          <article className="work-card" key={item.title}>
            <p className="card-label">{item.title}</p>
            <p className="muted">{item.description}</p>
            <span className="card-count">{item.count}</span>
          </article>
        ))}
      </section>

      <section className="notice">
        <h3>Khung giao diện ban đầu</h3>
        <p>Đây là scaffold để bắt đầu phát triển. Chưa có dữ liệu khách hàng thật hoặc chức năng đăng nhập.</p>
      </section>
    </main>
  );
}
