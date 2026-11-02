"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { khoangTien, ngay } from "@/src/lib/formatters";
import { NHAN_CO_HOI } from "@/src/lib/labels";
import { useApi } from "@/src/lib/use-api";
import { TrangThaiCoHoi } from "@/src/components/tags";
import { Loi, PhanTrang, TieuDeTrang, Trong } from "@/src/components/ui";
import { layDanhSachCoHoi } from "@/src/features/opportunities/api";

const CO_TRANG = 20;

function Noi() {
  const sp = useSearchParams();
  const [tt, setTt] = useState(sp.get("trangThai") ?? "");
  const [trang, setTrang] = useState(1);
  const ds = useApi(() => layDanhSachCoHoi({ trangThai: tt || undefined, page: trang, pageSize: CO_TRANG }), [tt, trang]);

  return (
    <>
      <TieuDeTrang tieuDe="Cơ hội" phu="Mỗi cơ hội là một nhu cầu dịch vụ của một khách hàng. Tạo cơ hội mới từ hồ sơ khách." />
      <div className="chips" role="group" aria-label="Lọc theo giai đoạn">
        {[["", "Tất cả"], ...Object.entries(NHAN_CO_HOI)].map(([k, v]) => (
          <button key={k} className="chip" aria-pressed={tt === k} onClick={() => { setTt(k); setTrang(1); }}>{v}</button>
        ))}
      </div>
      <Loi>{ds.loi}</Loi>
      {ds.data && ds.data.items.length === 0 ? (
        <Trong>{tt ? `Không có cơ hội nào ở giai đoạn “${NHAN_CO_HOI[tt]}”.` : "Chưa có cơ hội nào. Mở một khách hàng và bấm “Tạo cơ hội”."}</Trong>
      ) : (
        ds.data && (
          <>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Khách hàng</th><th>Dịch vụ</th><th>Giai đoạn</th><th>Tư vấn viên</th><th>Ngân sách</th><th>Tiếp nhận</th></tr></thead>
                <tbody>
                  {ds.data.items.map((c) => (
                    <tr key={c.co_hoi_id}>
                      <td><Link href={`/opportunities/${c.co_hoi_id}`}><b>{c.khach_hang?.ho_ten ?? "—"}</b></Link><span className="sub">{c.khach_hang?.so_dien_thoai}</span></td>
                      <td>{c.dich_vu?.ten_dich_vu ?? "—"}<span className="sub">{c.dich_vu?.nhom_dich_vu}</span></td>
                      <td><TrangThaiCoHoi v={c.trang_thai} /></td>
                      <td>{c.tu_van_vien?.ho_ten ?? "Chưa giao"}</td>
                      <td className="nowrap">{khoangTien(c.ngan_sach_tu, c.ngan_sach_den)}</td>
                      <td className="nowrap">{ngay(c.ngay_tiep_nhan)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PhanTrang trang={trang} tong={ds.data.total} coTrang={CO_TRANG} doi={setTrang} />
          </>
        )
      )}
    </>
  );
}

export default function OpportunitiesPage() {
  return <Suspense fallback={<p className="muted">Đang tải…</p>}><Noi /></Suspense>;
}
