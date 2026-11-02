"use client";

import { FormEvent, useEffect, useState } from "react";
import { loiToiThongBao } from "@/src/lib/api-client";
import { NHAN_KENH } from "@/src/lib/labels";
import { Dialog, Loi, Truong } from "@/src/components/ui";
import { useApi } from "@/src/lib/use-api";
import { layDichVu, layNguon } from "../catalogs/api";
import { taoCoHoi } from "./api";
import type { CoHoi } from "./types";

export function CoHoiFormDialog({ mo, dong, khachHangId, xong }: { mo: boolean; dong: () => void; khachHangId: string; xong: (c: CoHoi) => void }) {
  const [dichVuId, setDichVuId] = useState("");
  const [nguonId, setNguonId] = useState("");
  const [mongMuon, setMongMuon] = useState("");
  const [tu, setTu] = useState("");
  const [den, setDen] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  const dv = useApi(() => (mo ? layDichVu() : Promise.resolve([])), [mo]);
  const nguon = useApi(() => (mo ? layNguon() : Promise.resolve([])), [mo]);

  useEffect(() => {
    if (mo) { setDichVuId(""); setNguonId(""); setMongMuon(""); setTu(""); setDen(""); setLoi(""); }
  }, [mo]);

  async function gui(e: FormEvent) {
    e.preventDefault();
    if (tu && den && Number(tu) > Number(den)) return setLoi("Ngân sách “từ” phải nhỏ hơn hoặc bằng “đến”.");
    setDang(true);
    setLoi("");
    try {
      const c = await taoCoHoi({
        khachHangId,
        dichVuId,
        ...(nguonId && { nguonId }),
        ...(mongMuon.trim() && { mongMuon: mongMuon.trim() }),
        ...(tu && { nganSachTu: Number(tu) }),
        ...(den && { nganSachDen: Number(den) }),
      });
      xong(c);
      dong();
    } catch (err) {
      setLoi(loiToiThongBao(err));
    } finally {
      setDang(false);
    }
  }

  const dsDv = dv.data ?? [];
  return (
    <Dialog mo={mo} dong={dong} tieuDe="Tạo cơ hội dịch vụ">
      <form className="form" onSubmit={gui}>
        <div className="field-full"><Loi>{loi || dv.loi}</Loi></div>
        <Truong nhan="Dịch vụ quan tâm *" rong>
          <select required value={dichVuId} onChange={(e) => setDichVuId(e.target.value)}>
            <option value="">Chọn dịch vụ</option>
            {dsDv.map((d) => <option key={d.dich_vu_id} value={d.dich_vu_id}>{d.nhom_dich_vu} – {d.ten_dich_vu}</option>)}
          </select>
          {dsDv.length === 0 && !dv.dangTai && <small>Chưa có dịch vụ nào. Nhờ quản lý thêm dịch vụ trước.</small>}
        </Truong>
        <Truong nhan="Nguồn" rong>
          <select value={nguonId} onChange={(e) => setNguonId(e.target.value)}>
            <option value="">Chưa rõ</option>
            {(nguon.data ?? []).map((n) => <option key={n.nguon_id} value={n.nguon_id}>{NHAN_KENH[n.kenh] ?? n.kenh}{n.ten_chien_dich ? ` – ${n.ten_chien_dich}` : ""}</option>)}
          </select>
        </Truong>
        <Truong nhan="Mong muốn của khách" rong><textarea rows={3} maxLength={2000} value={mongMuon} onChange={(e) => setMongMuon(e.target.value)} /></Truong>
        <Truong nhan="Ngân sách từ (đ)"><input type="number" min={0} step={100000} value={tu} onChange={(e) => setTu(e.target.value)} /></Truong>
        <Truong nhan="Ngân sách đến (đ)"><input type="number" min={0} step={100000} value={den} onChange={(e) => setDen(e.target.value)} /></Truong>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={dong}>Hủy</button>
          <button className="btn" disabled={dang}>{dang ? "Đang tạo…" : "Tạo cơ hội"}</button>
        </div>
      </form>
    </Dialog>
  );
}
