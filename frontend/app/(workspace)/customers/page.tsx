"use client";

import Link from "next/link";
import { AppIcon } from "@/src/components/AppIcon";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/src/lib/auth";
import { ngay } from "@/src/lib/formatters";
import { useApi } from "@/src/lib/use-api";
import { DangTai, Loi, PhanTrang, TieuDeTrang, Trong } from "@/src/components/ui";
import { layDanhSachKhach } from "@/src/features/customers/api";
import { CustomerFormDialog } from "@/src/features/customers/CustomerFormDialog";

const CO_TRANG = 20;

function Noi() {
  const router = useRouter();
  const sp = useSearchParams();
  const timToanCuc = sp.get("tim") ?? "";
  const { can } = useAuth();
  const [o, setO] = useState(timToanCuc);
  const [q, setQ] = useState(timToanCuc);
  const [trang, setTrang] = useState(1);
  const [them, setThem] = useState(false);

  useEffect(() => { setO(timToanCuc); setQ(timToanCuc); setTrang(1); }, [timToanCuc]);

  // Chờ người dùng ngừng gõ rồi mới tìm.
  useEffect(() => {
    const t = setTimeout(() => { setQ(o.trim()); setTrang(1); }, 300);
    return () => clearTimeout(t);
  }, [o]);

  const ds = useApi(() => layDanhSachKhach({ q: q || undefined, page: trang, pageSize: CO_TRANG }), [q, trang]);

  return (
    <>
      <TieuDeTrang tieuDe="Khách hàng" phu="Tìm trong hồ sơ bạn được quyền xem theo tên, số điện thoại, email hoặc Zalo.">
        {can("khach_hang", "them") && <button className="btn" onClick={() => setThem(true)}>Thêm khách hàng</button>}
      </TieuDeTrang>
      <div className="toolbar">
        <div className="search-field"><AppIcon name="search" size={18} /><input className="input" type="search" placeholder="Tìm tên, số điện thoại, email…" value={o} onChange={(e) => setO(e.target.value)} aria-label="Tìm khách hàng" /></div>
      </div>
      <Loi thuLai={() => void ds.tai()}>{ds.loi}</Loi>
      {ds.dangTai && !ds.data && <DangTai soDong={5} />}
      {ds.data && ds.data.items.length === 0 ? (
        <Trong hanhDong={can("khach_hang", "them") && !q ? <button className="btn" onClick={() => setThem(true)}>Thêm khách hàng đầu tiên</button> : undefined}>
          {q ? `Không có khách nào khớp “${q}”.` : "Chưa có khách hàng nào trong phạm vi của bạn."}
        </Trong>
      ) : (
        ds.data && (
          <>
            <div className="table-wrap">
              <table className="mobile-card-table">
                <thead><tr><th>Họ tên</th><th>Điện thoại</th><th>Email</th><th>Khu vực</th><th>Ngày tạo</th></tr></thead>
                <tbody>
                  {ds.data.items.map((k) => (
                    <tr key={k.khach_hang_id}>
                      <td data-label="Họ tên"><Link href={`/customers/${k.khach_hang_id}`}><b>{k.ho_ten}</b></Link></td>
                      <td data-label="Điện thoại" className="nowrap">{k.so_dien_thoai ?? "—"}</td>
                      <td data-label="Email">{k.email ?? "—"}</td>
                      <td data-label="Khu vực">{k.khu_vuc ?? "—"}</td>
                      <td data-label="Ngày tạo" className="nowrap">{ngay(k.ngay_tao)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PhanTrang trang={trang} tong={ds.data.total} coTrang={CO_TRANG} doi={setTrang} />
          </>
        )
      )}
      <CustomerFormDialog mo={them} dong={() => setThem(false)} xong={(k) => router.push(`/customers/${k.khach_hang_id}`)} />
    </>
  );
}

export default function CustomersPage() {
  return <Suspense fallback={<p className="muted">Đang tải danh sách khách hàng…</p>}><Noi /></Suspense>;
}
