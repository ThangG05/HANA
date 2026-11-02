"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/src/lib/auth";
import { NHAN_VAI_TRO, nhan } from "@/src/lib/labels";

const MUC: ReadonlyArray<{ href: string; ten: string; quyen: string | null; hanhDong?: string }> = [
  { href: "/dashboard", ten: "Tổng quan", quyen: null },
  { href: "/customers", ten: "Khách hàng", quyen: "khach_hang" },
  { href: "/opportunities", ten: "Cơ hội", quyen: "co_hoi" },
  { href: "/appointments", ten: "Lịch hẹn", quyen: "lich_hen" },
  { href: "/tasks", ten: "Công việc", quyen: "cong_viec" },
  { href: "/care", ten: "Chăm sóc sau ca", quyen: "cham_soc" },
  { href: "/care-templates", ten: "Mẫu chăm sóc", quyen: "mau_cham_soc" },
  { href: "/payments", ten: "Tiền về chưa khớp", quyen: "thanh_toan", hanhDong: "sua" },
];

function Khung({ children }: { children: ReactNode }) {
  const { user, can, logout } = useAuth();
  const duong = usePathname();
  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <div className="brand-mark">H</div>
          <div>
            <b>Hana Premium</b>
            <small>CRM nội bộ</small>
          </div>
        </div>
        <nav className="nav" aria-label="Chức năng">
          {MUC.filter((m) => !m.quyen || can(m.quyen, m.hanhDong ?? "xem")).map((m) => (
            <Link key={m.href} href={m.href} aria-current={duong === m.href || duong.startsWith(m.href + "/") ? "page" : undefined}>
              {m.ten}
            </Link>
          ))}
        </nav>
        <div className="side-foot">
          <div>
            <b>{user?.hoTen}</b>
            <span>{user?.vaiTro.map((v) => nhan(NHAN_VAI_TRO, v)).join(", ")}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => void logout()}>Đăng xuất</button>
        </div>
      </aside>
      <main className="main">{children}</main>
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
