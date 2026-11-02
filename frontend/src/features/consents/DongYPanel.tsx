"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/src/lib/auth";
import { loiToiThongBao } from "@/src/lib/api-client";
import { ngayGio } from "@/src/lib/formatters";
import { useApi } from "@/src/lib/use-api";
import { Dialog, Loi, Nhan, Trong, Truong } from "@/src/components/ui";
import { ghiDongY, layDongY, rutLaiDongY } from "./api";

const MUC_DICH: Record<string, string> = {
  thuc_hien_dich_vu: "Thực hiện dịch vụ", luu_anh: "Lưu ảnh trong hồ sơ",
  truyen_thong: "Sử dụng hình ảnh truyền thông", marketing: "Liên hệ marketing",
};

export function DongYPanel({ khachId }: { khachId: string }) {
  const { can } = useAuth();
  const ds = useApi(() => layDongY(khachId), [khachId]);
  const [mo, setMo] = useState(false);
  const [mucDich, setMucDich] = useState("thuc_hien_dich_vu");
  const [phienBan, setPhienBan] = useState("");
  const [bangChung, setBangChung] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);

  async function ghi(e: FormEvent) {
    e.preventDefault(); setDang(true); setLoi("");
    try {
      await ghiDongY(khachId, { mucDich, phienBanNoiDung: phienBan.trim(), bangChung: bangChung.trim() });
      setMo(false); setPhienBan(""); setBangChung(""); await ds.tai();
    } catch (err) { setLoi(loiToiThongBao(err)); } finally { setDang(false); }
  }

  async function rut(id: string) {
    if (!window.confirm("Xác nhận khách đã rút lại đồng ý này? Hành động sẽ được lưu vào lịch sử.")) return;
    setDang(true); setLoi("");
    try { await rutLaiDongY(khachId, id); await ds.tai(); }
    catch (err) { setLoi(loiToiThongBao(err)); }
    finally { setDang(false); }
  }

  return <section className="panel" id="dong-y">
    <div className="panel-head"><h2>Đồng ý của khách hàng</h2>
      {can("khach_hang", "sua") && <button className="btn btn-ghost btn-sm" onClick={() => setMo(true)}>Ghi nhận đồng ý</button>}
    </div>
    <Loi>{loi || ds.loi}</Loi>
    {ds.data && (ds.data.length ? <ul className="rows">
      {ds.data.map((d) => <li key={d.dong_y_id}>
        <div className="top"><b>{MUC_DICH[d.muc_dich] ?? d.muc_dich}</b><Nhan ten={d.trang_thai === "dong_y" && !d.thoi_diem_rut_lai ? "Còn hiệu lực" : "Đã rút lại"} tone={d.trang_thai === "dong_y" && !d.thoi_diem_rut_lai ? "xanh" : "xam"} /></div>
        <div className="muted small">Nội dung {d.phien_ban_noi_dung} · ghi nhận {ngayGio(d.thoi_diem_dong_y)}{d.thoi_diem_rut_lai && ` · rút lại ${ngayGio(d.thoi_diem_rut_lai)}`}</div>
        {d.bang_chung && <div className="small">Bằng chứng: {d.bang_chung}</div>}
        {d.trang_thai === "dong_y" && !d.thoi_diem_rut_lai && can("khach_hang", "sua") && <button className="btn btn-ghost btn-sm" disabled={dang} onClick={() => void rut(d.dong_y_id)}>Ghi rút lại</button>}
      </li>)}
    </ul> : <Trong>Chưa ghi nhận đồng ý nào. Cần bằng chứng và phiên bản nội dung trước khi ghi.</Trong>)}
    <Dialog mo={mo} dong={() => setMo(false)} tieuDe="Ghi nhận đồng ý của khách">
      <form className="form" onSubmit={ghi}>
        <div className="field-full"><Loi>{loi}</Loi></div>
        <Truong nhan="Mục đích *" rong><select value={mucDich} onChange={(e) => setMucDich(e.target.value)}>{Object.entries(MUC_DICH).map(([ma, ten]) => <option key={ma} value={ma}>{ten}</option>)}</select></Truong>
        <Truong nhan="Phiên bản nội dung *" rong ghiChu="Ví dụ: PHIEU-DONG-Y-2026-01. Lưu phiên bản mẫu mà khách đã xem."><input required maxLength={100} value={phienBan} onChange={(e) => setPhienBan(e.target.value)} /></Truong>
        <Truong nhan="Bằng chứng *" rong ghiChu="Mã phiếu có chữ ký hoặc tham chiếu tài liệu riêng tư; không nhập nội dung bệnh án."><textarea required minLength={3} maxLength={500} rows={3} value={bangChung} onChange={(e) => setBangChung(e.target.value)} /></Truong>
        <div className="form-actions"><button type="button" className="btn btn-ghost" onClick={() => setMo(false)}>Đóng</button><button className="btn" disabled={dang}>{dang ? "Đang lưu…" : "Ghi nhận"}</button></div>
      </form>
    </Dialog>
  </section>;
}
