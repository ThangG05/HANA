"use client";

import { FormEvent, useEffect, useState } from "react";
import { loiToiThongBao } from "@/src/lib/api-client";
import { NHAN_KENH } from "@/src/lib/labels";
import { Dialog, Loi, Truong } from "@/src/components/ui";
import { taoTuongTac } from "./api";

export function TuongTacFormDialog({ mo, dong, khachHangId, coHoiId, xong }: { mo: boolean; dong: () => void; khachHangId: string; coHoiId?: string; xong: () => void }) {
  const [kenh, setKenh] = useState("dien_thoai");
  const [chieu, setChieu] = useState("di");
  const [noiDung, setNoiDung] = useState("");
  const [ketQua, setKetQua] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);

  useEffect(() => {
    if (mo) { setKenh("dien_thoai"); setChieu("di"); setNoiDung(""); setKetQua(""); setLoi(""); }
  }, [mo]);

  async function gui(e: FormEvent) {
    e.preventDefault();
    setDang(true);
    setLoi("");
    try {
      await taoTuongTac({ khachHangId, coHoiId, kenh, chieu, ...(noiDung.trim() && { noiDungTomTat: noiDung.trim() }), ...(ketQua.trim() && { ketQua: ketQua.trim() }) });
      xong();
      dong();
    } catch (err) {
      setLoi(loiToiThongBao(err));
    } finally {
      setDang(false);
    }
  }

  return (
    <Dialog mo={mo} dong={dong} tieuDe="Ghi nhận liên hệ">
      <form className="form" onSubmit={gui}>
        <div className="field-full"><Loi>{loi}</Loi></div>
        <Truong nhan="Kênh">
          <select value={kenh} onChange={(e) => setKenh(e.target.value)}>
            {Object.entries(NHAN_KENH).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Truong>
        <Truong nhan="Chiều liên hệ">
          <select value={chieu} onChange={(e) => setChieu(e.target.value)}>
            <option value="di">Mình liên hệ khách</option>
            <option value="den">Khách liên hệ mình</option>
          </select>
        </Truong>
        <Truong nhan="Nội dung trao đổi" rong ghiChu="Chỉ ghi nội dung tư vấn thông thường. Không ghi tiền sử bệnh hay chi tiết y khoa ở đây.">
          <textarea rows={4} maxLength={2000} value={noiDung} onChange={(e) => setNoiDung(e.target.value)} autoFocus />
        </Truong>
        <Truong nhan="Kết quả" rong><input maxLength={500} placeholder="Ví dụ: khách hẹn gọi lại thứ Sáu" value={ketQua} onChange={(e) => setKetQua(e.target.value)} /></Truong>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={dong}>Hủy</button>
          <button className="btn" disabled={dang}>{dang ? "Đang lưu…" : "Lưu liên hệ"}</button>
        </div>
      </form>
    </Dialog>
  );
}
