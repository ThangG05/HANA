"use client";

import Link from "next/link";
import { useState } from "react";
import { cuoiNgayIso, dauNgayIso, ngayVN } from "@/src/lib/formatters";
import { NHAN_LICH_HEN } from "@/src/lib/labels";
import { useApi } from "@/src/lib/use-api";
import { Loi, PhanTrang, TieuDeTrang, Trong } from "@/src/components/ui";
import { layDanhSachLich } from "@/src/features/appointments/api";
import { BangLichHen } from "@/src/features/appointments/BangLichHen";

const CO_TRANG = 30;

export default function AppointmentsPage() {
  const [tu, setTu] = useState(ngayVN());
  const [den, setDen] = useState(ngayVN(14));
  const [tt, setTt] = useState("");
  const [trang, setTrang] = useState(1);
  const hopLe = !!tu && !!den && tu <= den;
  const ds = useApi(
    () => (hopLe ? layDanhSachLich({ from: dauNgayIso(tu), to: cuoiNgayIso(den), trangThai: tt || undefined, page: trang, pageSize: CO_TRANG }) : Promise.resolve(null)),
    [tu, den, tt, trang, hopLe],
  );

  return (
    <>
      <TieuDeTrang tieuDe="Tra cứu lịch hẹn" phu="Tìm lịch theo khoảng ngày và trạng thái."><Link className="btn btn-ghost" href="/appointments">Về lịch trong ngày</Link></TieuDeTrang>
      <div className="toolbar">
        <label className="small muted">Từ ngày <input className="input" style={{ width: "auto" }} type="date" value={tu} onChange={(e) => { setTu(e.target.value); setTrang(1); }} /></label>
        <label className="small muted">Đến ngày <input className="input" style={{ width: "auto" }} type="date" value={den} min={tu} onChange={(e) => { setDen(e.target.value); setTrang(1); }} /></label>
        <select className="input" value={tt} onChange={(e) => { setTt(e.target.value); setTrang(1); }} aria-label="Lọc theo trạng thái">
          <option value="">Mọi trạng thái</option>
          {Object.entries(NHAN_LICH_HEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {!hopLe && <Loi>Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</Loi>}
      <Loi>{ds.loi}</Loi>
      {ds.data && (ds.data.items.length === 0 ? (
        <Trong>Không có lịch hẹn nào trong khoảng này.</Trong>
      ) : (
        <>
          <BangLichHen ds={ds.data.items} tai={ds.tai} />
          <PhanTrang trang={trang} tong={ds.data.total} coTrang={CO_TRANG} doi={setTrang} />
        </>
      ))}
    </>
  );
}
