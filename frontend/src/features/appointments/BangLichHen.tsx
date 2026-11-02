"use client";

import Link from "next/link";
import { useState } from "react";
import { ngay, gio } from "@/src/lib/formatters";
import { NHAN_LOAI_LICH, nhan } from "@/src/lib/labels";
import { TrangThaiLich } from "@/src/components/tags";
import { Loi } from "@/src/components/ui";
import { DoiLichDialog } from "./DoiLichDialog";
import { NutLichHen } from "./NutLichHen";
import type { LichHen } from "./types";

export function BangLichHen({ ds, tai, hienKhach = true }: { ds: LichHen[]; tai: () => void; hienKhach?: boolean }) {
  const [doi, setDoi] = useState<LichHen | null>(null);
  const [loi, setLoi] = useState("");
  return (
    <>
      <Loi>{loi}</Loi>
      <div className="table-wrap">
        <table className="mobile-card-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              {hienKhach && <th>Khách hàng</th>}
              <th>Nơi khám</th>
              <th>Trạng thái</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {ds.map((l) => (
              <tr key={l.lich_hen_id}>
                <td data-label="Thời gian" className="nowrap">
                  <b>{ngay(l.bat_dau)}</b>
                  <span className="sub">{gio(l.bat_dau)} – {gio(l.ket_thuc)} · {nhan(NHAN_LOAI_LICH, l.loai_lich_hen)}</span>
                </td>
                {hienKhach && (
                  <td data-label="Khách hàng">
                    {l.khach_hang ? <Link href={`/customers/${l.khach_hang_id}`}>{l.khach_hang.ho_ten}</Link> : "—"}
                    <span className="sub"><Link href={`/opportunities/${l.co_hoi_id}`}>Xem cơ hội</Link></span>
                  </td>
                )}
                <td data-label="Nơi khám">
                  {l.co_so ?? "—"}
                  <span className="sub">{[l.phong && `Phòng ${l.phong}`, l.bac_si && `BS ${l.bac_si}`].filter(Boolean).join(" · ") || "Chưa xếp phòng/bác sĩ"}</span>
                </td>
                <td data-label="Trạng thái">
                  <TrangThaiLich v={l.trang_thai} />
                  {l.ly_do_huy && <span className="sub">{l.ly_do_huy}</span>}
                </td>
                <td data-label="Thao tác"><NutLichHen lich={l} tai={tai} doiLich={setDoi} baoLoi={setLoi} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DoiLichDialog lich={doi} dong={() => setDoi(null)} xong={tai} />
    </>
  );
}
