"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/src/lib/auth";
import { AppIcon } from "@/src/components/AppIcon";
import { NHAN_VAI_TRO, nhan } from "@/src/lib/labels";
import { useApi } from "@/src/lib/use-api";
import { layCoSo } from "@/src/features/catalogs/api";

type Muc = { href: string; ten: string; icon: "home" | "users" | "spark" | "calendar" | "tasks" | "heart" | "wallet"; quyen: string | null };
const NHOM: ReadonlyArray<{ ten: string; muc: readonly Muc[] }> = [
  { ten: "Không gian làm việc", muc: [
    { href: "/dashboard", ten: "Tổng quan", icon: "home", quyen: null },
    { href: "/customers", ten: "Khách hàng", icon: "users", quyen: "khach_hang" },
    { href: "/opportunities", ten: "Cơ hội dịch vụ", icon: "spark", quyen: "co_hoi" },
    { href: "/appointments", ten: "Lịch hẹn", icon: "calendar", quyen: "lich_hen" },
    { href: "/tasks", ten: "Công việc", icon: "tasks", quyen: "cong_viec" },
  ] },
  { ten: "Chuyên môn & vận hành", muc: [
    { href: "/appointments/all", ten: "Tra cứu lịch hẹn", icon: "calendar", quyen: "lich_hen" },
    { href: "/care", ten: "Chăm sóc sau ca", icon: "heart", quyen: "cham_soc" },
    { href: "/care-templates", ten: "Mẫu chăm sóc", icon: "heart", quyen: "mau_cham_soc" },
  ] },
  { ten: "Tài chính", muc: [
    { href: "/payments", ten: "Công nợ khách hàng", icon: "wallet", quyen: "thanh_toan" },
    { href: "/payments/pending", ten: "Chờ xác nhận", icon: "wallet", quyen: "thanh_toan" },
  ] },
];

const TEN_TRANG: Record<string, string> = {
  dashboard: "Tổng quan", customers: "Khách hàng", opportunities: "Cơ hội dịch vụ",
  appointments: "Lịch hẹn", tasks: "Công việc", care: "Chăm sóc sau ca",
  "care-templates": "Mẫu chăm sóc", payments: "Thanh toán", pending: "Chờ xác nhận", all: "Tra cứu lịch hẹn",
};

function Khung({ children }: { children: ReactNode }) {
  const { user, can, logout } = useAuth();
  const duong = usePathname();
  const router = useRouter();
  const [thuGon, setThuGon] = useState(false);
  const [moMobile, setMoMobile] = useState(false);
  const [tim, setTim] = useState("");
  const coSo = useApi(layCoSo, []);
  const tenCoSo = coSo.data?.find((c) => c.co_so_id === user?.coSoId)?.ten_co_so ?? "Cơ sở chưa xác định";
  const phan = duong.split("/").filter(Boolean);
  const tieuDe = TEN_TRANG[phan.at(-1) ?? ""] ?? (phan.length > 1 ? "Chi tiết hồ sơ" : "Hana Premium");
  useEffect(() => { setMoMobile(false); }, [duong]);
  function timKhach(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = tim.trim();
    if (q) router.push(`/customers?tim=${encodeURIComponent(q)}`);
  }
  return (
    <div className={`app${thuGon ? " app-collapsed" : ""}${moMobile ? " app-mobile-open" : ""}`}>
      {moMobile && <button className="mobile-scrim" aria-label="Đóng menu" onClick={() => setMoMobile(false)} />}
      <aside className="side" aria-label="Điều hướng chính">
        <div className="side-brand-row"><Link className="brand" href="/dashboard" aria-label="Hana Premium, về tổng quan">
          <div className="brand-mark">H</div>
          <div className="brand-copy">
            <b>Hana Premium</b>
            <small>CRM phòng khám</small>
          </div>
        </Link><button className="icon-btn side-close" aria-label="Đóng menu" onClick={() => setMoMobile(false)}><AppIcon name="close" /></button></div>
        <div className="side-context"><span>Cơ sở làm việc</span><b>{coSo.dangTai ? "Đang tải…" : tenCoSo}</b></div>
        <nav className="nav" aria-label="Chức năng">
          {NHOM.map((nhom) => {
            const muc = nhom.muc.filter((m) => !m.quyen || can(m.quyen, "xem") || (m.href === "/care" && can("canh_bao_y_khoa", "xem")));
            return muc.length ? <div className="nav-group" key={nhom.ten}>
              <span className="nav-group-title">{nhom.ten}</span>
              {muc.map((m) => <Link key={m.href} href={m.href} title={m.ten} aria-current={duong === m.href || (m.href !== "/appointments" && m.href !== "/payments" && duong.startsWith(m.href + "/")) ? "page" : undefined}><AppIcon name={m.icon} /><span>{m.ten}</span></Link>)}
            </div> : null;
          })}
        </nav>
        <div className="side-foot">
          <div className="user-avatar" aria-hidden="true">{user?.hoTen?.trim().charAt(0).toLocaleUpperCase("vi-VN") ?? "H"}</div>
          <div className="side-user"><b>{user?.hoTen}</b><span>{user?.vaiTro.map((v) => nhan(NHAN_VAI_TRO, v)).join(", ")}</span></div>
          <button className="side-logout" onClick={() => void logout()}>Đăng xuất</button>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <button className="icon-btn mobile-menu" aria-label="Mở menu" aria-expanded={moMobile} onClick={() => setMoMobile(true)}><AppIcon name="menu" /></button>
          <button className="icon-btn collapse-menu" aria-label={thuGon ? "Mở rộng menu" : "Thu gọn menu"} onClick={() => setThuGon((v) => !v)}><AppIcon name="menu" /></button>
          <div className="topbar-title"><span>Không gian làm việc</span><AppIcon name="chevron" size={14} /><strong>{tieuDe}</strong></div>
          {can("khach_hang", "xem") && <form className="global-search" role="search" onSubmit={timKhach}><AppIcon name="search" size={18} /><input aria-label="Tìm khách hàng trong phạm vi quyền" placeholder="Tìm khách hàng…" value={tim} onChange={(e) => setTim(e.target.value)} /><kbd>↵</kbd></form>}
          <div className="topbar-actions">{can("cong_viec", "xem") && <Link href="/tasks" className="icon-btn" aria-label="Xem công việc"><AppIcon name="bell" /></Link>}<span className="topbar-avatar" aria-label={user?.hoTen}>{user?.hoTen?.trim().charAt(0).toLocaleUpperCase("vi-VN") ?? "H"}</span></div>
        </header>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Khung>{children}</Khung>
    </AuthProvider>
  );
}
