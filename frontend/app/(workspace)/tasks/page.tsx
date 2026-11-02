"use client";

import { useState } from "react";
import { NHAN_CONG_VIEC } from "@/src/lib/labels";
import { useApi } from "@/src/lib/use-api";
import { Loi, PhanTrang, TieuDeTrang, Trong } from "@/src/components/ui";
import { layDanhSachViec } from "@/src/features/tasks/api";
import { DanhSachViec } from "@/src/features/tasks/DanhSachViec";

const CO_TRANG = 30;
const MUC = [
  { k: "toi", ten: "Của tôi" },
  { k: "tre", ten: "Quá hạn" },
  { k: "tatca", ten: "Tất cả" },
] as const;

export default function TasksPage() {
  const [muc, setMuc] = useState<(typeof MUC)[number]["k"]>("toi");
  const [tt, setTt] = useState("cho_lam");
  const [trang, setTrang] = useState(1);
  const ds = useApi(
    () => layDanhSachViec({ cuaToi: muc === "toi" ? true : undefined, quaHan: muc === "tre" ? true : undefined, trangThai: muc === "tre" ? undefined : tt || undefined, page: trang, pageSize: CO_TRANG }),
    [muc, tt, trang],
  );

  return (
    <>
      <TieuDeTrang tieuDe="Công việc" phu="Việc gọi lại, nhắc lịch, chăm sóc. Thêm việc từ hồ sơ khách hoặc chi tiết cơ hội." />
      <div className="chips" role="group" aria-label="Phạm vi">
        {MUC.map((m) => <button key={m.k} className="chip" aria-pressed={muc === m.k} onClick={() => { setMuc(m.k); setTrang(1); }}>{m.ten}</button>)}
      </div>
      {muc !== "tre" && (
        <div className="toolbar">
          <select className="input" value={tt} onChange={(e) => { setTt(e.target.value); setTrang(1); }} aria-label="Lọc theo trạng thái">
            <option value="">Mọi trạng thái</option>
            {Object.entries(NHAN_CONG_VIEC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      )}
      <Loi>{ds.loi}</Loi>
      {ds.data && (ds.data.items.length === 0 ? (
        <Trong>{muc === "tre" ? "Không có việc nào quá hạn." : "Không có công việc nào khớp bộ lọc."}</Trong>
      ) : (
        <section className="panel">
          <DanhSachViec ds={ds.data.items} tai={ds.tai} />
          <PhanTrang trang={trang} tong={ds.data.total} coTrang={CO_TRANG} doi={setTrang} />
        </section>
      ))}
    </>
  );
}
