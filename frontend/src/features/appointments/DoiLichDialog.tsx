"use client";

import { FormEvent, useEffect, useState } from "react";
import { loiToiThongBao } from "@/src/lib/api-client";
import { isoSangNhap, nhapSangIso } from "@/src/lib/formatters";
import { Dialog, Loi, Truong } from "@/src/components/ui";
import { doiLich } from "./api";
import type { LichHen } from "./types";

export function DoiLichDialog({ lich, dong, xong }: { lich: LichHen | null; dong: () => void; xong: () => void }) {
  const [batDau, setBatDau] = useState("");
  const [ketThuc, setKetThuc] = useState("");
  const [lyDo, setLyDo] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);

  useEffect(() => {
    if (lich) { setBatDau(isoSangNhap(lich.bat_dau)); setKetThuc(isoSangNhap(lich.ket_thuc)); setLyDo(""); setLoi(""); }
  }, [lich]);

  async function gui(e: FormEvent) {
    e.preventDefault();
    if (!lich) return;
    setDang(true);
    setLoi("");
    try {
      await doiLich(lich.lich_hen_id, { batDau: nhapSangIso(batDau), ketThuc: nhapSangIso(ketThuc), ...(lyDo.trim() && { lyDo: lyDo.trim() }) });
      xong();
      dong();
    } catch (err) {
      setLoi(loiToiThongBao(err));
    } finally {
      setDang(false);
    }
  }

  return (
    <Dialog mo={lich !== null} dong={dong} tieuDe="Đổi lịch hẹn">
      <form className="form" onSubmit={gui}>
        <div className="field-full"><Loi>{loi}</Loi></div>
        <Truong nhan="Bắt đầu mới *"><input type="datetime-local" required value={batDau} onChange={(e) => setBatDau(e.target.value)} /></Truong>
        <Truong nhan="Kết thúc mới *"><input type="datetime-local" required min={batDau} value={ketThuc} onChange={(e) => setKetThuc(e.target.value)} /></Truong>
        <Truong nhan="Lý do đổi (không bắt buộc)" rong ghiChu="Lịch cũ được giữ lại với trạng thái “Đã đổi lịch”; công việc đang mở chuyển sang lịch mới."><input maxLength={500} value={lyDo} onChange={(e) => setLyDo(e.target.value)} /></Truong>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={dong}>Hủy</button>
          <button className="btn" disabled={dang}>{dang ? "Đang lưu…" : "Đổi lịch"}</button>
        </div>
      </form>
    </Dialog>
  );
}
