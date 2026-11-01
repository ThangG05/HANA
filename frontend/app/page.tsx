"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
type Customer = { id: string; fullName: string; phone: string | null; area?: string | null; _count?: { cases: number } };
type Service = { id: string; name: string };
type CustomerCase = { id: string; stage: string; source: string | null; customer: Customer; service: Service | null; updatedAt: string };
type Task = { id: string; title: string; dueAt: string | null; status: string; customer: Pick<Customer, "id" | "fullName"> | null };
type Appointment = { id: string; startsAt: string; endsAt: string; status: string; doctorName: string | null; roomName: string | null; customer: Pick<Customer, "id" | "fullName" | "phone"> };

const stageLabels: Record<string, string> = {
  NEW: "Mới", CONSULTING: "Đang tư vấn", APPOINTMENT_BOOKED: "Đã hẹn", EXAMINED: "Đã khám", QUOTED: "Đã báo giá",
  WON: "Đã chốt", AFTERCARE: "Đang chăm sóc", COMPLETED: "Hoàn tất", NURTURING: "Cần nuôi dưỡng", STOPPED: "Ngừng chăm sóc",
};
const taskLabels: Record<string, string> = { OPEN: "Mở", IN_PROGRESS: "Đang làm", COMPLETED: "Hoàn tất", CANCELLED: "Đã hủy" };
const nextStages: Record<string, string[]> = { NEW: ["CONSULTING", "NURTURING", "STOPPED"], CONSULTING: ["APPOINTMENT_BOOKED", "NURTURING", "STOPPED"], APPOINTMENT_BOOKED: ["CONSULTING", "EXAMINED", "NURTURING", "STOPPED"], EXAMINED: ["QUOTED", "NURTURING", "STOPPED"], QUOTED: ["WON", "NURTURING", "STOPPED"], WON: ["AFTERCARE", "STOPPED"], AFTERCARE: ["COMPLETED"], NURTURING: ["CONSULTING", "STOPPED"], STOPPED: [], COMPLETED: [] };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers }, cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(Array.isArray(body?.message) ? body.message.join("; ") : body?.message ?? "Không thể kết nối máy chủ");
  return body as T;
}

function localInputDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function HomePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cases, setCases] = useState<CustomerCase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (query = "") => {
    try {
      const [customerRows, caseRows, taskRows, appointmentRows, serviceRows] = await Promise.all([
        request<Customer[]>(`/customers${query ? `?q=${encodeURIComponent(query)}` : ""}`), request<CustomerCase[]>("/cases"),
        request<Task[]>("/tasks?status=OPEN"), request<Appointment[]>("/appointments"), request<Service[]>("/services"),
      ]);
      setCustomers(customerRows); setCases(caseRows); setTasks(taskRows); setAppointments(appointmentRows); setServices(serviceRows); setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Không tải được dữ liệu"); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { const timer = setTimeout(() => { void refresh(search.trim()); }, 250); return () => clearTimeout(timer); }, [search, refresh]);

  async function submit(event: FormEvent<HTMLFormElement>, path: string, success: string) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    for (const key of Object.keys(data)) if (data[key] === "") delete data[key];
    for (const field of ["openedAt", "dueAt", "startsAt", "endsAt"]) {
      if (typeof data[field] === "string") data[field] = new Date(data[field] as string).toISOString();
    }
    try {
      const result = await request<{ potentialDuplicates?: { id: string; fullName: string }[] }>(path, { method: "POST", body: JSON.stringify(data) });
      form.reset();
      const possibleMatches = result?.potentialDuplicates ?? [];
      setNotice(path === "/customers" && possibleMatches.length ? `Đã tạo khách hàng. Có hồ sơ trùng cần kiểm tra: ${possibleMatches.map((item) => item.fullName).join(", ")}.` : success);
      await refresh(search.trim());
    }
    catch (err) { setError(err instanceof Error ? err.message : "Không lưu được dữ liệu"); }
    finally { setBusy(false); }
  }

  async function updateTask(id: string, status: string) {
    try { await request(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); await refresh(search.trim()); }
    catch (err) { setError(err instanceof Error ? err.message : "Không cập nhật được công việc"); }
  }

  async function updateStage(id: string, stage: string) {
    const reason = ["NURTURING", "STOPPED"].includes(stage) ? window.prompt("Nhập lý do chuyển giai đoạn:")?.trim() : undefined;
    if (["NURTURING", "STOPPED"].includes(stage) && !reason) { await refresh(search.trim()); return; }
    try { await request(`/cases/${id}/stage`, { method: "PATCH", body: JSON.stringify({ stage, ...(reason ? { reason } : {}) }) }); await refresh(search.trim()); }
    catch (err) { setError(err instanceof Error ? err.message : "Không chuyển được giai đoạn"); }
  }

  async function updateAppointment(id: string, status: string, reason?: string) {
    try { await request(`/appointments/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, ...(reason ? { reason } : {}) }) }); await refresh(search.trim()); }
    catch (err) { setError(err instanceof Error ? err.message : "Không cập nhật được lịch hẹn"); }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#overview"><span className="brand-mark">H</span><span><b>HANA PREMIUM</b><small>Hệ thống chăm sóc khách hàng</small></span></a>
        <div className="topbar-right"><span className="connection"><i /> Dữ liệu trực tiếp</span><span className="avatar">HP</span></div>
      </header>

      <nav className="nav"><a className="active" href="#overview">Tổng quan</a><a href="#customers">Khách hàng</a><a href="#cases">Cơ hội dịch vụ</a><a href="#appointments">Lịch hẹn</a><a href="#tasks">Công việc</a></nav>

      <section className="welcome" id="overview"><div><p className="eyebrow">BẢNG ĐIỀU KHIỂN</p><h1>Chào mừng trở lại</h1><p>Theo dõi hành trình khách hàng và công việc của phòng khám.</p></div><span className="date-chip">{new Intl.DateTimeFormat("vi-VN", { dateStyle: "full" }).format(new Date())}</span></section>

      {error && <div className="alert error" role="alert">{error}</div>}{notice && <div className="alert success" role="status">{notice}</div>}
      <div className="alert warning" role="note">Bản MVP chạy nội bộ, chưa có đăng nhập và phân quyền. Chỉ dùng dữ liệu giả lập cho đến khi hoàn thành bảo mật.</div>

      <section className="metrics" aria-label="Chỉ số tổng quan">
        <article className="metric"><span className="metric-icon peach">♙</span><div><p>Tổng khách hàng</p><strong>{customers.length}</strong><small>Khách hàng gần đây</small></div></article>
        <article className="metric"><span className="metric-icon lilac">◉</span><div><p>Cơ hội đang theo dõi</p><strong>{cases.filter((item) => !["COMPLETED", "STOPPED"].includes(item.stage)).length}</strong><small>Trên tất cả giai đoạn</small></div></article>
        <article className="metric"><span className="metric-icon mint">▣</span><div><p>Lịch hẹn sắp tới</p><strong>{appointments.filter((item) => new Date(item.startsAt) >= new Date()).length}</strong><small>Lịch đã ghi nhận</small></div></article>
        <article className="metric"><span className="metric-icon blue">✓</span><div><p>Việc cần xử lý</p><strong>{tasks.length}</strong><small>Công việc đang mở</small></div></article>
      </section>

      <section className="content-grid">
        <article className="panel wide" id="cases"><div className="panel-heading"><div><p className="eyebrow">PIPELINE</p><h2>Cơ hội dịch vụ</h2></div><span className="count-pill">{cases.length} cơ hội</span></div>
          <div className="table-wrap"><table><thead><tr><th>Khách hàng</th><th>Dịch vụ</th><th>Nguồn</th><th>Giai đoạn</th><th>Cập nhật</th></tr></thead><tbody>
            {cases.slice(0, 8).map((item) => <tr key={item.id}><td><b>{item.customer.fullName}</b><small>{item.customer.phone || "Chưa có số điện thoại"}</small></td><td>{item.service?.name || "Chưa chọn"}</td><td>{item.source || "—"}</td><td><select className="stage-select" aria-label={`Giai đoạn ${item.customer.fullName}`} value={item.stage} onChange={(event) => void updateStage(item.id, event.target.value)}><option value={item.stage}>{stageLabels[item.stage] ?? item.stage}</option>{(nextStages[item.stage] ?? []).map((next) => <option key={next} value={next}>{stageLabels[next]}</option>)}</select></td><td>{new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(item.updatedAt))}</td></tr>)}
            {!cases.length && <tr><td colSpan={5} className="empty">Chưa có cơ hội dịch vụ nào.</td></tr>}
          </tbody></table></div>
        </article>

        <article className="panel" id="tasks"><div className="panel-heading"><div><p className="eyebrow">NHẮC VIỆC</p><h2>Cần theo dõi</h2></div></div>
          <div className="task-list">{tasks.slice(0, 6).map((task) => <div className="task-row" key={task.id}><button className="check-button" aria-label={`Hoàn thành ${task.title}`} onClick={() => void updateTask(task.id, "COMPLETED")}>✓</button><div><b>{task.title}</b><small>{task.customer?.fullName ?? "Việc nội bộ"}{task.dueAt ? ` · ${new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(task.dueAt))}` : ""}</small></div></div>)}{!tasks.length && <p className="empty">Không có công việc đang mở.</p>}</div>
        </article>

        <article className="panel" id="appointments"><div className="panel-heading"><div><p className="eyebrow">LỊCH PHÒNG KHÁM</p><h2>Lịch hẹn sắp tới</h2></div></div>
          <div className="appointment-list">{appointments.filter((item) => new Date(item.startsAt) >= new Date() && !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(item.status)).slice(0, 5).map((item) => <div className="appointment-row" key={item.id}><div className="appointment-date"><b>{new Intl.DateTimeFormat("vi-VN", { day: "2-digit" }).format(new Date(item.startsAt))}</b><small>TH.{new Intl.DateTimeFormat("vi-VN", { month: "2-digit" }).format(new Date(item.startsAt))}</small></div><div className="appointment-main"><b>{item.customer.fullName}</b><small>{new Intl.DateTimeFormat("vi-VN", { timeStyle: "short" }).format(new Date(item.startsAt))} · {item.doctorName || "Chưa phân bác sĩ"}</small></div><select className="mini-select" aria-label={`Cập nhật lịch của ${item.customer.fullName}`} value={item.status} onChange={(event) => void updateAppointment(item.id, event.target.value, ["CANCELLED", "NO_SHOW"].includes(event.target.value) ? window.prompt("Nhập lý do:") || undefined : undefined)}><option value={item.status}>{item.status === "BOOKED" ? "Đã đặt" : item.status === "CONFIRMED" ? "Đã xác nhận" : "Đã đến"}</option>{(item.status === "BOOKED" ? ["CONFIRMED", "CANCELLED", "NO_SHOW"] : item.status === "CONFIRMED" ? ["ARRIVED", "CANCELLED", "NO_SHOW"] : item.status === "ARRIVED" ? ["COMPLETED"] : []).map((next) => <option key={next} value={next}>{next === "CONFIRMED" ? "Xác nhận" : next === "ARRIVED" ? "Đã đến" : next === "COMPLETED" ? "Hoàn tất" : next === "CANCELLED" ? "Hủy lịch" : "Không đến"}</option>)}</select></div>)}{!appointments.length && <p className="empty">Chưa có lịch hẹn.</p>}</div>
        </article>

        <article className="panel" id="customers"><div className="panel-heading"><div><p className="eyebrow">HỒ SƠ KHÁCH</p><h2>Khách hàng gần đây</h2></div><span className="count-pill">{customers.length}</span></div>
          <div className="search-box"><span>⌕</span><input aria-label="Tìm khách hàng" placeholder="Tìm theo tên hoặc số điện thoại" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <div className="customer-list">{customers.slice(0, 6).map((customer, index) => <div className="customer-row" key={customer.id}><span className={`customer-avatar avatar-${index % 4}`}>{customer.fullName.split(/\s+/).slice(-1)[0]?.[0]}</span><div><b>{customer.fullName}</b><small>{customer.phone || customer.area || "Chưa có thông tin liên hệ"}</small></div><span className="customer-cases">{customer._count?.cases ?? 0} cơ hội</span></div>)}{!customers.length && <p className="empty">Chưa có khách hàng.</p>}</div>
        </article>
      </section>

      <section className="forms-section"><div className="section-title"><div><p className="eyebrow">THAO TÁC NHANH</p><h2>Ghi nhận nghiệp vụ</h2></div><p>Tạo hồ sơ và ghi lại hoạt động ngay tại đây.</p></div>
        <div className="form-grid">
          <form className="panel form-panel" onSubmit={(event) => void submit(event, "/customers", "Đã tạo hồ sơ khách hàng.")}><div className="panel-heading"><div><p className="eyebrow">01 · TIẾP NHẬN</p><h3>Thêm khách hàng</h3></div></div><label>Họ và tên<input name="fullName" required placeholder="Nguyễn Thị An" /></label><div className="two-fields"><label>Số điện thoại<input name="phone" placeholder="09xx xxx xxx" /></label><label>Email<input name="email" type="email" placeholder="email@example.com" /></label></div><p className="field-note">Cần nhập ít nhất số điện thoại hoặc email.</p><label>Khu vực<input name="area" placeholder="Quận / tỉnh thành" /></label><button className="primary-button" disabled={busy}>Lưu khách hàng <span>→</span></button></form>

          <form className="panel form-panel" onSubmit={(event) => void submit(event, "/cases", "Đã tạo cơ hội dịch vụ.")}><div className="panel-heading"><div><p className="eyebrow">02 · THEO DÕI</p><h3>Tạo cơ hội dịch vụ</h3></div></div><label>Khách hàng<select name="customerId" required defaultValue=""><option value="" disabled>Chọn khách hàng</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.phone || "Chưa có SĐT"}</option>)}</select></label><label>Dịch vụ<select name="serviceId" defaultValue=""><option value="">Chưa xác định</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="two-fields"><label>Nguồn khách<input name="source" placeholder="Facebook, giới thiệu..." /></label><label>Ngày tiếp nhận<input name="openedAt" type="datetime-local" defaultValue={localInputDate()} /></label></div><button className="primary-button" disabled={busy || customers.length === 0}>Tạo cơ hội <span>→</span></button></form>

          <form className="panel form-panel" onSubmit={(event) => void submit(event, "/interactions", "Đã ghi nhận tương tác.")}><div className="panel-heading"><div><p className="eyebrow">03 · TƯƠNG TÁC</p><h3>Ghi nhận liên hệ</h3></div></div><label>Khách hàng<select name="customerId" required defaultValue=""><option value="" disabled>Chọn khách hàng</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></label><div className="two-fields"><label>Kênh<select name="channel"><option value="PHONE">Điện thoại</option><option value="ZALO">Zalo</option><option value="FACEBOOK">Facebook</option><option value="IN_PERSON">Trực tiếp</option><option value="EMAIL">Email</option><option value="OTHER">Khác</option></select></label><label>Chiều<select name="direction"><option value="OUTBOUND">Phòng khám liên hệ</option><option value="INBOUND">Khách liên hệ</option><option value="INTERNAL">Nội bộ</option></select></label></div><label>Nội dung<textarea name="summary" rows={3} required placeholder="Tóm tắt trao đổi, không ghi thông tin bệnh lý tại đây" /></label><button className="primary-button" disabled={busy || customers.length === 0}>Lưu tương tác <span>→</span></button></form>

          <form className="panel form-panel" onSubmit={(event) => void submit(event, "/tasks", "Đã tạo công việc theo dõi.")}><div className="panel-heading"><div><p className="eyebrow">04 · NHẮC VIỆC</p><h3>Tạo công việc</h3></div></div><label>Tiêu đề<input name="title" required placeholder="Gọi xác nhận lịch hẹn" /></label><label>Khách hàng<select name="customerId" defaultValue=""><option value="">Việc nội bộ</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></label><label>Hạn xử lý<input name="dueAt" type="datetime-local" /></label><label>Mô tả<textarea name="description" rows={2} placeholder="Ghi chú cho người thực hiện" /></label><button className="primary-button" disabled={busy}>Tạo công việc <span>→</span></button></form>

          <form className="panel form-panel" onSubmit={(event) => void submit(event, "/appointments", "Đã đặt lịch hẹn.")}><div className="panel-heading"><div><p className="eyebrow">05 · ĐẶT LỊCH</p><h3>Lịch hẹn mới</h3></div></div><label>Khách hàng<select name="customerId" required defaultValue=""><option value="" disabled>Chọn khách hàng</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></label><div className="two-fields"><label>Bắt đầu<input name="startsAt" type="datetime-local" required defaultValue={localInputDate(new Date(Date.now() + 86_400_000))} /></label><label>Kết thúc<input name="endsAt" type="datetime-local" required defaultValue={localInputDate(new Date(Date.now() + 90 * 60_000 + 86_400_000))} /></label></div><div className="two-fields"><label>Bác sĩ<input name="doctorName" placeholder="Tên bác sĩ" /></label><label>Phòng<input name="roomName" placeholder="Phòng khám" /></label></div><p className="field-note">Hệ thống từ chối lịch trùng bác sĩ hoặc phòng.</p><button className="primary-button" disabled={busy || customers.length === 0}>Đặt lịch hẹn <span>→</span></button></form>

          <form className="panel form-panel" onSubmit={(event) => void submit(event, "/services", "Đã thêm dịch vụ vào danh mục.")}><div className="panel-heading"><div><p className="eyebrow">06 · DANH MỤC</p><h3>Thêm dịch vụ</h3></div></div><label>Tên dịch vụ<input name="name" required placeholder="Tên dịch vụ của phòng khám" /></label><label>Mã dịch vụ<input name="code" placeholder="Tự tạo từ tên nếu để trống" /></label><label>Nhóm dịch vụ<input name="groupName" placeholder="Nhóm / chuyên khoa" /></label><p className="field-note">Tên và mã dịch vụ sẽ dùng trong cơ hội khách hàng.</p><button className="primary-button" disabled={busy}>Lưu dịch vụ <span>→</span></button></form>
        </div>
      </section>

      <footer className="footer"><span>HANA PREMIUM CRM</span><span>MVP · Quản lý vận hành</span></footer>
    </main>
  );
}
