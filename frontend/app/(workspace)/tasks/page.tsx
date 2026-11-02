"use client";

import { useState } from "react";
import { cuoiNgayIso, dauNgayIso, ngayVN } from "@/src/lib/formatters";
import { useApi } from "@/src/lib/use-api";
import { DangTai, Loi, PhanTrang, TieuDeTrang, Trong } from "@/src/components/ui";
import { layDanhSachViec } from "@/src/features/tasks/api";
import { DanhSachViec } from "@/src/features/tasks/DanhSachViec";

const CO_TRANG = 30;
const NHOM = [
  { k: "hom_nay", ten: "Hôm nay" },
  { k: "qua_han", ten: "Quá hạn" },
  { k: "sap_toi", ten: "Sắp tới" },
  { k: "hoan_thanh", ten: "Hoàn thành" },
] as const;

export default function TasksPage() {
  const [nhom, setNhom] = useState<(typeof NHOM)[number]["k"]>("hom_nay");
  const [cuaToi, setCuaToi] = useState(true);
  const [trang, setTrang] = useState(1);
  const homNay = ngayVN();
  const ds = useApi(
    () => layDanhSachViec({
      cuaToi: cuaToi || undefined,
      quaHan: nhom === "qua_han" || undefined,
      chuaXong: nhom === "hom_nay" || nhom === "sap_toi" || undefined,
      trangThai: nhom === "hoan_thanh" ? "hoan_thanh" : undefined,
      hanTu: nhom === "hom_nay" ? new Date().toISOString() : nhom === "sap_toi" ? dauNgayIso(ngayVN(1)) : undefined,
      hanDen: nhom === "hom_nay" ? cuoiNgayIso(homNay) : undefined,
      page: trang, pageSize: CO_TRANG,
    }),
    [nhom, cuaToi, trang, homNay],
  );

  return (
    <>
      <TieuDeTrang tieuDe="Công việc" phu="Ưu tiên việc đến hạn, gọi lại và theo dõi khách hàng. Thêm việc từ hồ sơ khách hoặc cơ hội." />
      <div className="task-filter-row"><div className="chips" role="group" aria-label="Nhóm công việc">
        {NHOM.map((m) => <button key={m.k} className="chip" aria-pressed={nhom === m.k} onClick={() => { setNhom(m.k); setTrang(1); }}>{m.ten}</button>)}
      </div><label className="task-scope"><input type="checkbox" checked={cuaToi} onChange={(e) => { setCuaToi(e.target.checked); setTrang(1); }} /> Chỉ việc của tôi</label></div>
      <Loi thuLai={() => void ds.tai()}>{ds.loi}</Loi>
      {ds.dangTai && !ds.data && <DangTai soDong={4} />}
      {ds.data && (ds.data.items.length === 0 ? (
        <Trong>{nhom === "qua_han" ? "Không có việc nào quá hạn." : `Không có việc nào trong nhóm “${NHOM.find((m) => m.k === nhom)?.ten}”.`}</Trong>
      ) : (
        <section className="panel">
          <DanhSachViec ds={ds.data.items} tai={ds.tai} />
          <PhanTrang trang={trang} tong={ds.data.total} coTrang={CO_TRANG} doi={setTrang} />
        </section>
      ))}
    </>
  );
}
