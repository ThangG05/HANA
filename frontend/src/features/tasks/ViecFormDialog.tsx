"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/src/lib/auth";
import { loiToiThongBao } from "@/src/lib/api-client";
import { ngayVN, nhapSangIso } from "@/src/lib/formatters";
import { LOAI_CONG_VIEC, NHAN_UU_TIEN } from "@/src/lib/labels";
import { useApi } from "@/src/lib/use-api";
import { Dialog, Loi, Truong } from "@/src/components/ui";
import { layNhanVien } from "../catalogs/api";
import { taoViec } from "./api";

export function ViecFormDialog({ mo, dong, khachHangId, coHoiId, xong }: { mo: boolean; dong: () => void; khachHangId: string; coHoiId?: string; xong: () => void }) {
  const { user, phamVi } = useAuth();
  // Người chỉ có phạm vi "được giao" chỉ giao việc cho chính mình: không cần ô chọn.
  const duocChonNguoi = phamVi("cong_viec", "them") !== "duoc_giao";
  const [loai, setLoai] = useState("goi_lai");
  const [noiDung, setNoiDung] = useState("");
  const [han, setHan] = useState(`${ngayVN(1)}T09:00`);
  const [uuTien, setUuTien] = useState("binh_thuong");
  const [nguoi, setNguoi] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  const ds = useApi(() => (mo && duocChonNguoi ? layNhanVien() : Promise.resolve([])), [mo, duocChonNguoi]);

  useEffect(() => {
    if (mo) { setLoai("goi_lai"); setNoiDung(""); setHan(`${ngayVN(1)}T09:00`); setUuTien("binh_thuong"); setNguoi(user?.id ?? ""); setLoi(""); }
  }, [mo, user?.id]);

  async function gui(e: FormEvent) {
    e.preventDefault();
    setDang(true);
    setLoi("");
    try {
      await taoViec({
        khachHangId, coHoiId, loaiCongViec: loai, noiDung: noiDung.trim(), hanHoanThanh: nhapSangIso(han), mucUuTien: uuTien,
        ...(duocChonNguoi && nguoi && { nguoiPhuTrachId: nguoi }),
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
    <Dialog mo={mo} dong={dong} tieuDe="Thêm công việc">
      <form className="form" onSubmit={gui}>
        <div className="field-full"><Loi>{loi}</Loi></div>
        <Truong nhan="Loại việc">
          <select value={loai} onChange={(e) => setLoai(e.target.value)}>
            {Object.entries(LOAI_CONG_VIEC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Truong>
        <Truong nhan="Mức ưu tiên">
          <select value={uuTien} onChange={(e) => setUuTien(e.target.value)}>
            {Object.entries(NHAN_UU_TIEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Truong>
        <Truong nhan="Nội dung *" rong><textarea required rows={3} maxLength={1000} value={noiDung} onChange={(e) => setNoiDung(e.target.value)} autoFocus /></Truong>
        <Truong nhan="Hạn hoàn thành *"><input type="datetime-local" required value={han} onChange={(e) => setHan(e.target.value)} /></Truong>
        {duocChonNguoi && (
          <Truong nhan="Người phụ trách">
            <select value={nguoi} onChange={(e) => setNguoi(e.target.value)}>
              {(ds.data ?? []).map((n) => <option key={n.nhan_vien_id} value={n.nhan_vien_id}>{n.ho_ten}</option>)}
            </select>
          </Truong>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={dong}>Hủy</button>
          <button className="btn" disabled={dang}>{dang ? "Đang lưu…" : "Thêm công việc"}</button>
        </div>
      </form>
    </Dialog>
  );
}
