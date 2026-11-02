"use client";

import { useDeferredValue, useState } from "react";
import { Dialog, Loi, Trong } from "@/src/components/ui";
import { useApi } from "@/src/lib/use-api";
import { layDanhSachKhach } from "@/src/features/customers/api";
import { layDanhSachCoHoi } from "@/src/features/opportunities/api";
import { ngay } from "@/src/lib/formatters";
import { LichHenFormDialog } from "./LichHenFormDialog";

const DA_KET_THUC = ["hoan_tat", "ngung_cham_soc"];

function ChonDichVu({ khachId, chon }: { khachId: string; chon: (id: string) => void }) {
  const coHoi = useApi(() => layDanhSachCoHoi({ khachHangId: khachId, pageSize: 100 }), [khachId]);
  const dangMo = coHoi.data?.items.filter((c) => !DA_KET_THUC.includes(c.trang_thai)) ?? [];
  return <>
    <p className="muted small" style={{ margin: "12px 0" }}>Mỗi lịch hẹn gắn với một nhu cầu dịch vụ của khách.</p>
    <Loi>{coHoi.loi}</Loi>
    {coHoi.dangTai && <p className="muted">Đang tải nhu cầu dịch vụ…</p>}
    {!coHoi.dangTai && coHoi.data && (dangMo.length ? <ul className="rows choice-list">
      {dangMo.map((c) => <li key={c.co_hoi_id}>
        <button className="choice-button" onClick={() => chon(c.co_hoi_id)}>
          <b>{c.dich_vu?.ten_dich_vu ?? "Dịch vụ"}</b><span className="muted small">Tiếp nhận {ngay(c.ngay_tiep_nhan)}</span>
        </button>
      </li>)}
    </ul> : <Trong>Khách chưa có nhu cầu dịch vụ đang mở. Tạo cơ hội từ hồ sơ khách trước khi đặt lịch.</Trong>)}
  </>;
}

export function DatLichNhanh({ mo, dong, xong }: { mo: boolean; dong: () => void; xong: () => void }) {
  const [tim, setTim] = useState("");
  const [khachId, setKhachId] = useState("");
  const [coHoiId, setCoHoiId] = useState("");
  const tuKhoa = useDeferredValue(tim.trim());
  const khach = useApi(() => mo && tuKhoa ? layDanhSachKhach({ q: tuKhoa, pageSize: 20 }) : Promise.resolve(null), [mo, tuKhoa]);

  function dongHet() { setTim(""); setKhachId(""); setCoHoiId(""); dong(); }
  return <>
    {!coHoiId && <Dialog mo={mo} dong={dongHet} tieuDe="Chọn khách và dịch vụ để đặt lịch" rong>
      {khachId ? <>
        <button className="btn btn-ghost btn-sm" onClick={() => setKhachId("")}>← Chọn khách khác</button>
        <ChonDichVu key={khachId} khachId={khachId} chon={setCoHoiId} />
      </> : <>
        <label className="field"><span>Tìm khách theo tên hoặc số điện thoại</span>
          <input autoFocus value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Nhập ít nhất một phần tên hoặc số điện thoại" />
        </label>
        <Loi>{khach.loi}</Loi>
        {tuKhoa && khach.data && (khach.data.items.length ? <ul className="rows choice-list">
          {khach.data.items.map((k) => <li key={k.khach_hang_id}>
            <button className="choice-button" onClick={() => setKhachId(k.khach_hang_id)}><b>{k.ho_ten}</b><span className="muted small">{k.so_dien_thoai ?? "Chưa có số điện thoại"}</span></button>
          </li>)}
        </ul> : <Trong>Không tìm thấy khách phù hợp.</Trong>)}
      </>}
    </Dialog>}
    {coHoiId && <LichHenFormDialog mo={mo} dong={dongHet} coHoiId={coHoiId} xong={xong} />}
  </>;
}
