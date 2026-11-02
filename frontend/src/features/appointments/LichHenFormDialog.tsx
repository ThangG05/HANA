"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/src/lib/auth";
import { loiToiThongBao } from "@/src/lib/api-client";
import { nhapSangIso } from "@/src/lib/formatters";
import { NHAN_LOAI_LICH } from "@/src/lib/labels";
import { useApi } from "@/src/lib/use-api";
import { Dialog, Loi, Truong } from "@/src/components/ui";
import { layCoSo, layNhanVien } from "../catalogs/api";
import { taoLich } from "./api";

/** Cộng phút vào chuỗi "YYYY-MM-DDTHH:mm" (giờ VN) mà không phụ thuộc múi giờ máy. */
function congPhut(v: string, phut: number) {
  const d = new Date(`${v}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + phut);
  return d.toISOString().slice(0, 16);
}

export function LichHenFormDialog({ mo, dong, coHoiId, xong }: { mo: boolean; dong: () => void; coHoiId: string; xong: () => void }) {
  const { user } = useAuth();
  const [coSoId, setCoSoId] = useState("");
  const [loai, setLoai] = useState("kham");
  const [batDau, setBatDau] = useState("");
  const [ketThuc, setKetThuc] = useState("");
  const [bacSiId, setBacSiId] = useState("");
  const [phong, setPhong] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  const coSo = useApi(() => (mo ? layCoSo() : Promise.resolve([])), [mo]);
  const bacSi = useApi(() => (mo ? layNhanVien("bac_si") : Promise.resolve([])), [mo]);

  useEffect(() => {
    if (mo) { setCoSoId(user?.coSoId ?? ""); setLoai("kham"); setBatDau(""); setKetThuc(""); setBacSiId(""); setPhong(""); setLoi(""); }
  }, [mo, user?.coSoId]);

  async function gui(e: FormEvent) {
    e.preventDefault();
    setDang(true);
    setLoi("");
    try {
      await taoLich({
        coHoiId, coSoId, loaiLichHen: loai, batDau: nhapSangIso(batDau), ketThuc: nhapSangIso(ketThuc),
        ...(bacSiId && { bacSiId }),
        ...(phong.trim() && { phong: phong.trim() }),
      });
      xong();
      dong();
    } catch (err) {
      setLoi(loiToiThongBao(err));
    } finally {
      setDang(false);
    }
  }

  return (
    <Dialog mo={mo} dong={dong} tieuDe="Đặt lịch hẹn">
      <form className="form" onSubmit={gui}>
        <div className="field-full"><Loi>{loi}</Loi></div>
        <Truong nhan="Cơ sở *">
          <select required value={coSoId} onChange={(e) => setCoSoId(e.target.value)}>
            <option value="">Chọn cơ sở</option>
            {(coSo.data ?? []).map((c) => <option key={c.co_so_id} value={c.co_so_id}>{c.ten_co_so}</option>)}
          </select>
        </Truong>
        <Truong nhan="Loại lịch">
          <select value={loai} onChange={(e) => setLoai(e.target.value)}>
            {Object.entries(NHAN_LOAI_LICH).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Truong>
        <Truong nhan="Bắt đầu *">
          <input type="datetime-local" required value={batDau} onChange={(e) => { setBatDau(e.target.value); if (e.target.value && (!ketThuc || ketThuc <= e.target.value)) setKetThuc(congPhut(e.target.value, 60)); }} />
        </Truong>
        <Truong nhan="Kết thúc *"><input type="datetime-local" required min={batDau} value={ketThuc} onChange={(e) => setKetThuc(e.target.value)} /></Truong>
        <Truong nhan="Bác sĩ">
          <select value={bacSiId} onChange={(e) => setBacSiId(e.target.value)}>
            <option value="">Chưa chọn</option>
            {(bacSi.data ?? []).map((b) => <option key={b.nhan_vien_id} value={b.nhan_vien_id}>{b.ho_ten}</option>)}
          </select>
          {(bacSi.data ?? []).length === 0 && !bacSi.dangTai && <small>Chưa có tài khoản nào mang vai trò bác sĩ.</small>}
        </Truong>
        <Truong nhan="Phòng"><input maxLength={50} placeholder="Ví dụ: P1" value={phong} onChange={(e) => setPhong(e.target.value)} /></Truong>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={dong}>Hủy</button>
          <button className="btn" disabled={dang}>{dang ? "Đang đặt…" : "Đặt lịch"}</button>
        </div>
      </form>
    </Dialog>
  );
}
