"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/src/lib/auth";
import { loiToiThongBao } from "@/src/lib/api-client";
import { ngayGio } from "@/src/lib/formatters";
import { Dialog, Loi, Nhan, Truong } from "@/src/components/ui";
import { baoBacSi, danhGiaCa, dongCanhBao, hoanThanhViec, nhanCanhBao, xuLyCanhBao } from "./api";
import type { CanhBao, MucUuTien, Viec } from "./types";

export const LIEN_HE: Record<string, string> = { goi_dien: "Gọi điện", nhan_tin: "Nhắn tin", tai_kham: "Tái khám" };
export const DON_VI: Record<string, string> = { ngay: "ngày", tuan: "tuần", thang: "tháng" };
export const UU_TIEN: Record<MucUuTien, string> = { binh_thuong: "Bình thường", cao: "Cao", khan_cap: "Khẩn cấp" };
export const TT_VIEC: Record<string, string> = { cho_thuc_hien: "Chờ thực hiện", hoan_thanh: "Đã xong", huy: "Đã hủy" };
export const TT_CANH_BAO: Record<string, string> = { moi: "Mới", da_nhan: "Đã nhận", dang_xu_ly: "Đang xử lý", da_dong: "Đã đóng" };
export const TONE_CB: Record<string, "xam" | "xanh" | "nau" | "do" | "vang" | "tim"> = { moi: "do", da_nhan: "vang", dang_xu_ly: "tim", da_dong: "xam" };
export const TONE_UT: Record<MucUuTien, "xam" | "vang" | "do"> = { binh_thuong: "xam", cao: "vang", khan_cap: "do" };

function ChonUuTien({ gia, doi }: { gia: MucUuTien; doi: (v: MucUuTien) => void }) {
  return (
    <select value={gia} onChange={(e) => doi(e.target.value as MucUuTien)}>
      {(Object.keys(UU_TIEN) as MucUuTien[]).map((k) => <option key={k} value={k}>{UU_TIEN[k]}</option>)}
    </select>
  );
}

/** Ghi kết quả liên hệ khách; có thể báo bác sĩ ngay trong lần lưu. */
export function HoanThanhViecDialog({ viec, dong, xong }: { viec: Viec | null; dong: () => void; xong: () => void }) {
  const { can } = useAuth();
  const [phanHoi, setPhanHoi] = useState("");
  const [huong, setHuong] = useState("");
  const [bao, setBao] = useState(false);
  const [moTa, setMoTa] = useState("");
  const [uuTien, setUuTien] = useState<MucUuTien>("cao");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  useEffect(() => { if (viec) { setPhanHoi(""); setHuong(""); setBao(false); setMoTa(""); setUuTien("cao"); setLoi(""); } }, [viec]);

  async function gui(e: FormEvent) {
    e.preventDefault();
    if (!viec) return;
    setDang(true); setLoi("");
    try {
      await hoanThanhViec(viec.cham_soc_id, { phanHoi: phanHoi.trim(), ...(huong.trim() && { huongXuLy: huong.trim() }), ...(bao && { canhBao: { moTa: moTa.trim(), mucUuTien: uuTien } }) });
      xong(); dong();
    } catch (err) { setLoi(loiToiThongBao(err)); } finally { setDang(false); }
  }

  return (
    <Dialog mo={!!viec} dong={dong} tieuDe="Ghi kết quả chăm sóc">
      <form className="form" onSubmit={gui}>
        <div className="field-full"><Loi>{loi}</Loi></div>
        {viec && <p className="field-full muted small"><b>{viec.noi_dung}</b> · {viec.khach_hang} · {viec.loai_lien_he ? LIEN_HE[viec.loai_lien_he] : ""}{viec.so_dien_thoai ? ` · ${viec.so_dien_thoai}` : ""}</p>}
        <Truong nhan="Phản hồi của khách *" rong><textarea rows={3} required value={phanHoi} onChange={(e) => setPhanHoi(e.target.value)} /></Truong>
        <Truong nhan="Hướng xử lý" rong><textarea rows={2} value={huong} onChange={(e) => setHuong(e.target.value)} /></Truong>
        {can("canh_bao_y_khoa", "them") && (
          <div className="field-full">
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={bao} onChange={(e) => setBao(e.target.checked)} /> Khách có dấu hiệu bất thường, báo bác sĩ phụ trách
            </label>
          </div>
        )}
        {bao && <>
          <Truong nhan="Mô tả dấu hiệu *" rong><textarea rows={2} required minLength={3} value={moTa} onChange={(e) => setMoTa(e.target.value)} /></Truong>
          <Truong nhan="Mức ưu tiên"><ChonUuTien gia={uuTien} doi={setUuTien} /></Truong>
        </>}
        <div className="dialog-actions field-full">
          <button type="button" className="btn btn-ghost" onClick={dong}>Đóng</button>
          <button className="btn" disabled={dang}>{dang ? "Đang lưu…" : "Lưu kết quả"}</button>
        </div>
      </form>
    </Dialog>
  );
}

/** Báo bác sĩ về một ca đã hoàn thành (khi khách tự liên hệ, không qua việc chăm sóc). */
export function BaoBacSiDialog({ caId, dong, xong }: { caId: string | null; dong: () => void; xong: () => void }) {
  const [moTa, setMoTa] = useState("");
  const [uuTien, setUuTien] = useState<MucUuTien>("cao");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  useEffect(() => { if (caId) { setMoTa(""); setUuTien("cao"); setLoi(""); } }, [caId]);

  async function gui(e: FormEvent) {
    e.preventDefault();
    if (!caId) return;
    setDang(true); setLoi("");
    try { await baoBacSi(caId, { moTa: moTa.trim(), mucUuTien: uuTien }); xong(); dong(); } catch (err) { setLoi(loiToiThongBao(err)); } finally { setDang(false); }
  }

  return (
    <Dialog mo={!!caId} dong={dong} tieuDe="Báo bác sĩ phụ trách">
      <form className="form" onSubmit={gui}>
        <div className="field-full"><Loi>{loi}</Loi></div>
        <Truong nhan="Mô tả dấu hiệu *" rong><textarea rows={3} required minLength={3} value={moTa} onChange={(e) => setMoTa(e.target.value)} /></Truong>
        <Truong nhan="Mức ưu tiên"><ChonUuTien gia={uuTien} doi={setUuTien} /></Truong>
        <div className="dialog-actions field-full">
          <button type="button" className="btn btn-ghost" onClick={dong}>Đóng</button>
          <button className="btn" disabled={dang}>{dang ? "Đang gửi…" : "Gửi cảnh báo"}</button>
        </div>
      </form>
    </Dialog>
  );
}

export function DanhGiaDialog({ caId, dong, xong }: { caId: string | null; dong: () => void; xong: () => void }) {
  const [diem, setDiem] = useState(5);
  const [nx, setNx] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  useEffect(() => { if (caId) { setDiem(5); setNx(""); setLoi(""); } }, [caId]);

  async function gui(e: FormEvent) {
    e.preventDefault();
    if (!caId) return;
    setDang(true); setLoi("");
    try { await danhGiaCa(caId, { diem, thangDiem: 5, ...(nx.trim() && { nhanXet: nx.trim() }) }); xong(); dong(); } catch (err) { setLoi(loiToiThongBao(err)); } finally { setDang(false); }
  }

  return (
    <Dialog mo={!!caId} dong={dong} tieuDe="Đánh giá của khách">
      <form className="form" onSubmit={gui}>
        <div className="field-full"><Loi>{loi}</Loi></div>
        <Truong nhan="Điểm hài lòng (thang 5)">
          <select value={diem} onChange={(e) => setDiem(Number(e.target.value))}>
            {[5, 4, 3, 2, 1, 0].map((d) => <option key={d} value={d}>{d} / 5</option>)}
          </select>
        </Truong>
        <Truong nhan="Nhận xét của khách" rong><textarea rows={3} value={nx} onChange={(e) => setNx(e.target.value)} /></Truong>
        <p className="field-full muted small">Đánh giá ghi một lần cho mỗi ca và không sửa được.</p>
        <div className="dialog-actions field-full">
          <button type="button" className="btn btn-ghost" onClick={dong}>Đóng</button>
          <button className="btn" disabled={dang}>{dang ? "Đang lưu…" : "Lưu đánh giá"}</button>
        </div>
      </form>
    </Dialog>
  );
}

/** Một cảnh báo y khoa kèm nút thao tác cho bác sĩ phụ trách ca. */
export function CanhBaoDong({ cb, xong, hienKhach }: { cb: CanhBao; xong: () => void; hienKhach?: boolean }) {
  const { user, can } = useAuth();
  const [dongMo, setDongMo] = useState(false);
  const [huong, setHuong] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  const laBacSiCuaCa = can("canh_bao_y_khoa", "sua") && user?.id === cb.bac_si_id && cb.trang_thai !== "da_dong";

  async function chay(f: () => Promise<unknown>) {
    setDang(true); setLoi("");
    try { await f(); xong(); } catch (e) { setLoi(loiToiThongBao(e)); } finally { setDang(false); }
  }

  return (
    <li className={cb.trang_thai === "moi" ? "medical-alert-new" : undefined}>
      <div className="top">
        <b>{hienKhach ? `${cb.khach_hang ?? "Khách"} · ` : ""}{cb.mo_ta}</b>
        <span style={{ display: "flex", gap: 6 }}><Nhan ten={UU_TIEN[cb.muc_uu_tien]} tone={TONE_UT[cb.muc_uu_tien]} /><Nhan ten={TT_CANH_BAO[cb.trang_thai]} tone={TONE_CB[cb.trang_thai]} /></span>
      </div>
      <div className="muted small">
        Báo lúc {ngayGio(cb.thoi_diem_bao)} · bác sĩ phụ trách: {cb.bac_si ?? "—"}{hienKhach && cb.so_dien_thoai ? ` · ${cb.so_dien_thoai}` : ""}
        {cb.thoi_diem_tiep_nhan && ` · nhận lúc ${ngayGio(cb.thoi_diem_tiep_nhan)}`}
      </div>
      {cb.huong_xu_ly && <div className="small">Hướng xử lý: {cb.huong_xu_ly}</div>}
      <Loi>{loi}</Loi>
      {laBacSiCuaCa && !dongMo && (
        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          {cb.trang_thai === "moi" && <button className="btn btn-sm" disabled={dang} onClick={() => chay(() => nhanCanhBao(cb.canh_bao_id))}>Đã nhận</button>}
          {cb.trang_thai === "da_nhan" && <button className="btn btn-ghost btn-sm" disabled={dang} onClick={() => chay(() => xuLyCanhBao(cb.canh_bao_id))}>Đang xử lý</button>}
          {cb.trang_thai !== "moi" && <button className="btn btn-sm" onClick={() => { setHuong(cb.huong_xu_ly ?? ""); setDongMo(true); }}>Đóng cảnh báo</button>}
        </div>
      )}
      {dongMo && (
        <form style={{ display: "grid", gap: 6, marginTop: 6 }} onSubmit={(e) => { e.preventDefault(); void chay(async () => { await dongCanhBao(cb.canh_bao_id, huong.trim()); setDongMo(false); }); }}>
          <textarea rows={2} required placeholder="Hướng xử lý đã thực hiện" value={huong} onChange={(e) => setHuong(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-sm" disabled={dang}>{dang ? "Đang lưu…" : "Đóng cảnh báo"}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDongMo(false)}>Hủy</button>
          </div>
        </form>
      )}
    </li>
  );
}
