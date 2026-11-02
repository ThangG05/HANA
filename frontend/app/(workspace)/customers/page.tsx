"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/src/lib/auth";
import { ngay } from "@/src/lib/formatters";
import { useApi } from "@/src/lib/use-api";
import { Loi, PhanTrang, TieuDeTrang, Trong } from "@/src/components/ui";
import { layDanhSachKhach } from "@/src/features/customers/api";
import { CustomerFormDialog } from "@/src/features/customers/CustomerFormDialog";

const CO_TRANG = 20;

export default function CustomersPage() {
  const router = useRouter();
  const { can } = useAuth();
  const [o, setO] = useState("");
  const [q, setQ] = useState("");
  const [trang, setTrang] = useState(1);
  const [them, setThem] = useState(false);

  // Chờ người dùng ngừng gõ rồi mới tìm.
  useEffect(() => {
    const t = setTimeout(() => { setQ(o.trim()); setTrang(1); }, 300);
    return () => clearTimeout(t);
  }, [o]);

  const ds = useApi(() => layDanhSachKhach({ q: q || undefined, page: trang, pageSize: CO_TRANG }), [q, trang]);

  return (
    <>
      <TieuDeTrang tieuDe="Khách hàng" phu="Tìm theo tên, số điện thoại, email hoặc Zalo.">
        {can("khach_hang", "them") && <button className="btn" onClick={() => setThem(true)}>Thêm khách hàng</button>}
      </TieuDeTrang>
      <div className="toolbar">
        <input className="input" type="search" placeholder="Tìm khách hàng…" value={o} onChange={(e) => setO(e.target.value)} aria-label="Tìm khách hàng" />
      </div>
      <Loi>{ds.loi}</Loi>
      {ds.data && ds.data.items.length === 0 ? (
        <Trong hanhDong={can("khach_hang", "them") && !q ? <button className="btn" onClick={() => setThem(true)}>Thêm khách hàng đầu tiên</button> : undefined}>
          {q ? `Không có khách nào khớp “${q}”.` : "Chưa có khách hàng nào trong phạm vi của bạn."}
        </Trong>
      ) : (
        ds.data && (
          <>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Họ tên</th><th>Điện thoại</th><th>Email</th><th>Khu vực</th><th>Ngày tạo</th></tr></thead>
                <tbody>
                  {ds.data.items.map((k) => (
                    <tr key={k.khach_hang_id}>
                      <td><Link href={`/customers/${k.khach_hang_id}`}><b>{k.ho_ten}</b></Link></td>
                      <td className="nowrap">{k.so_dien_thoai ?? "—"}</td>
                      <td>{k.email ?? "—"}</td>
                      <td>{k.khu_vuc ?? "—"}</td>
                      <td className="nowrap">{ngay(k.ngay_tao)}</td>
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
