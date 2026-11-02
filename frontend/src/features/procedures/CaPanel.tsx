"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/src/lib/auth";
import { loiToiThongBao } from "@/src/lib/api-client";
import { isoSangNhap, ngayGio, nhapSangIso } from "@/src/lib/formatters";
import { useApi } from "@/src/lib/use-api";
import { Dialog, Loi, Nhan, Trong, Truong } from "@/src/components/ui";
import { layCoSo, layNhanVien } from "../catalogs/api";
import { layBaoGiaTheoCoHoi } from "../quotes/api";
import { batDauCa, doiLichCa, ghiYKhoaCa, hoanCa, hoanThanhCa, huyCa, layCa, layCaTheoCoHoi, taoCa } from "./api";
import type { Ca } from "./types";

const TRANG_THAI: Record<string, string> = { du_kien: "Dự kiến", hoan: "Đã hoãn", dang_thuc_hien: "Đang thực hiện", hoan_thanh: "Đã hoàn thành", huy: "Đã hủy" };
const TONE: Record<string, "xam" | "xanh" | "nau" | "do" | "vang" | "tim"> = { du_kien: "vang", hoan: "nau", dang_thuc_hien: "tim", hoan_thanh: "xanh", huy: "xam" };

export function CaPanel({ coHoiId, xong }: { coHoiId: string; xong: () => void }) {
  const { can } = useAuth();
  const ds = useApi(() => layCaTheoCoHoi(coHoiId), [coHoiId]);
  const [lap, setLap] = useState(false);
  const [lich, setLich] = useState<Ca | null>(null);
  const [yk, setYk] = useState<Ca | null>(null);
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState("");

  async function chay(id: string, f: () => Promise<unknown>) {
    setDang(id); setLoi("");
    try { await f(); await ds.tai(); xong(); } catch (e) { setLoi(loiToiThongBao(e)); await ds.tai(); } finally { setDang(""); }
  }
  const lamMoi = () => { void ds.tai(); xong(); };
  const sua = can("ca_thuc_hien", "sua");
  const yKhoa = can("ho_so_kham", "sua");

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Ca thực hiện</h2>
        {can("ca_thuc_hien", "them") && <button className="btn btn-sm" onClick={() => setLap(true)}>Lên lịch ca</button>}
      </div>
      <Loi>{loi || ds.loi}</Loi>
      {ds.data && ds.data.length === 0 && <Trong>Chưa có ca nào. Chỉ lên lịch được khi báo giá đã được khách chấp nhận.</Trong>}
      <ul className="rows">
        {(ds.data ?? []).map((c) => {
          const dong = c.trang_thai === "hoan_thanh" || c.trang_thai === "huy";
          return (
            <li key={c.ca_id}>
              <div className="top">
                <b>{c.ten_hang_muc ?? "Hạng mục"}</b>
                <Nhan ten={TRANG_THAI[c.trang_thai]} tone={TONE[c.trang_thai]} />
              </div>
              <dl className="kv" style={{ margin: "6px 0" }}>
                <dt>Bác sĩ</dt><dd>{c.bac_si ?? "—"} · {c.co_so ?? "—"}</dd>
                <dt>Dự kiến</dt><dd>{c.du_kien_luc ? ngayGio(c.du_kien_luc) : "Chưa đặt giờ"}</dd>
                {c.bat_dau_luc && <><dt>Bắt đầu</dt><dd>{ngayGio(c.bat_dau_luc)}</dd></>}
                {c.ket_thuc_luc && <><dt>Kết thúc</dt><dd>{ngayGio(c.ket_thuc_luc)}{c.nguoi_ban_giao && <span className="muted"> · bàn giao: {c.nguoi_ban_giao}</span>}</dd></>}
              </dl>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {c.xem_duoc_y_khoa && (
                  <button className="btn btn-sm" onClick={() => setYk(c)}>{dong || c.trang_thai === "dang_thuc_hien" ? "Xem / ghi chú y khoa" : "Ghi kiểm tra trước ca"}</button>
                )}
                {sua && (c.trang_thai === "du_kien" || c.trang_thai === "hoan") && <button className="btn btn-ghost btn-sm" onClick={() => setLich(c)}>Đổi lịch</button>}
                {sua && c.trang_thai === "du_kien" && <button className="btn btn-ghost btn-sm" disabled={!!dang} onClick={() => chay(c.ca_id, () => hoanCa(c.ca_id))}>Hoãn</button>}
                {sua && (c.trang_thai === "du_kien" || c.trang_thai === "hoan") && <button className="btn btn-ghost btn-sm" disabled={!!dang} onClick={() => chay(c.ca_id, () => huyCa(c.ca_id))}>Hủy ca</button>}
                {yKhoa && c.xem_duoc_y_khoa && c.trang_thai === "du_kien" && <button className="btn btn-sm" disabled={!!dang} onClick={() => chay(c.ca_id, () => batDauCa(c.ca_id))}>{dang === c.ca_id ? "Đang lưu…" : "Bắt đầu ca"}</button>}
                {yKhoa && c.xem_duoc_y_khoa && c.trang_thai === "dang_thuc_hien" && <button className="btn btn-sm" disabled={!!dang} onClick={() => chay(c.ca_id, () => hoanThanhCa(c.ca_id))}>{dang === c.ca_id ? "Đang lưu…" : "Hoàn thành ca"}</button>}
              </div>
            </li>
          );
        })}
      </ul>
      <LapCaDialog mo={lap} coHoiId={coHoiId} dong={() => setLap(false)} xong={lamMoi} />
      <DoiLichDialog ca={lich} dong={() => setLich(null)} xong={lamMoi} />
      <YKhoaDialog ca={yk} dong={() => setYk(null)} xong={lamMoi} />
    </section>
  );
}

function LapCaDialog({ mo, coHoiId, dong, xong }: { mo: boolean; coHoiId: string; dong: () => void; xong: () => void }) {
  const { user } = useAuth();
  const bg = useApi(() => (mo ? layBaoGiaTheoCoHoi(coHoiId) : Promise.resolve([])), [mo, coHoiId]);
  const bacSi = useApi(() => (mo ? layNhanVien("bac_si") : Promise.resolve([])), [mo]);
  const coSo = useApi(() => (mo ? layCoSo() : Promise.resolve([])), [mo]);
  const [hm, setHm] = useState("");
  const [bacSiId, setBacSiId] = useState("");
  const [coSoId, setCoSoId] = useState("");
  const [luc, setLuc] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  const chapNhan = (bg.data ?? []).find((b) => b.trang_thai === "da_chap_nhan");
  useEffect(() => { if (mo) { setHm(""); setBacSiId(""); setCoSoId(user?.coSoId ?? ""); setLuc(""); setLoi(""); } }, [mo, user?.coSoId]);

  async function gui(e: FormEvent) {
    e.preventDefault();
    if (!chapNhan) return;
    setDang(true); setLoi("");
    try {
      await taoCa({ baoGiaId: chapNhan.bao_gia_id, chiTietBaoGiaId: hm, ...(bacSiId && { bacSiId }), ...(coSoId && { coSoId }), ...(luc && { duKienLuc: nhapSangIso(luc) }) });
      xong(); dong();
    } catch (err) { setLoi(loiToiThongBao(err)); } finally { setDang(false); }
  }

  return (
    <Dialog mo={mo} dong={dong} tieuDe="Lên lịch ca thực hiện">
      <form className="form" onSubmit={gui}>
        <div className="field-full"><Loi>{loi}</Loi></div>
        {!bg.dangTai && !chapNhan && <p className="field-full muted small">Chưa có báo giá nào được khách chấp nhận.</p>}
        <Truong nhan="Hạng mục *">
          <select required value={hm} onChange={(e) => setHm(e.target.value)}>
            <option value="">Chọn hạng mục</option>
            {(chapNhan?.hang_muc ?? []).map((h) => <option key={h.chi_tiet_bao_gia_id} value={h.chi_tiet_bao_gia_id}>{h.ten_hang_muc}</option>)}
          </select>
        </Truong>
        <Truong nhan="Bác sĩ">
          <select value={bacSiId} onChange={(e) => setBacSiId(e.target.value)}>
            <option value="">{user?.vaiTro?.includes("bac_si") ? "Chính tôi" : "Chọn bác sĩ"}</option>
            {(bacSi.data ?? []).map((b) => <option key={b.nhan_vien_id} value={b.nhan_vien_id}>{b.ho_ten}</option>)}
          </select>
        </Truong>
        <Truong nhan="Cơ sở">
          <select value={coSoId} onChange={(e) => setCoSoId(e.target.value)}>
            <option value="">Cơ sở của tôi</option>
            {(coSo.data ?? []).map((c) => <option key={c.co_so_id} value={c.co_so_id}>{c.ten_co_so}</option>)}
          </select>
        </Truong>
        <Truong nhan="Giờ dự kiến"><input type="datetime-local" value={luc} onChange={(e) => setLuc(e.target.value)} /></Truong>
        <div className="dialog-actions field-full">
          <button type="button" className="btn btn-ghost" onClick={dong}>Đóng</button>
          <button className="btn" disabled={dang || !chapNhan}>{dang ? "Đang lưu…" : "Lên lịch"}</button>
        </div>
      </form>
    </Dialog>
  );
}

function DoiLichDialog({ ca, dong, xong }: { ca: Ca | null; dong: () => void; xong: () => void }) {
  const bacSi = useApi(() => (ca ? layNhanVien("bac_si") : Promise.resolve([])), [ca?.ca_id]);
  const coSo = useApi(() => (ca ? layCoSo() : Promise.resolve([])), [ca?.ca_id]);
  const [luc, setLuc] = useState("");
  const [bacSiId, setBacSiId] = useState("");
  const [coSoId, setCoSoId] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  useEffect(() => { if (ca) { setLuc(ca.du_kien_luc ? isoSangNhap(ca.du_kien_luc) : ""); setBacSiId(ca.bac_si_id); setCoSoId(ca.co_so_id); setLoi(""); } }, [ca]);

  async function gui(e: FormEvent) {
    e.preventDefault();
    if (!ca) return;
    setDang(true); setLoi("");
    try {
      await doiLichCa(ca.ca_id, { ...(luc && { duKienLuc: nhapSangIso(luc) }), bacSiId, coSoId });
      xong(); dong();
    } catch (err) { setLoi(loiToiThongBao(err)); } finally { setDang(false); }
  }

  return (
    <Dialog mo={!!ca} dong={dong} tieuDe="Đổi lịch ca">
      <form className="form" onSubmit={gui}>
        <div className="field-full"><Loi>{loi}</Loi></div>
        <Truong nhan="Giờ dự kiến"><input type="datetime-local" required value={luc} onChange={(e) => setLuc(e.target.value)} /></Truong>
        <Truong nhan="Bác sĩ">
          <select value={bacSiId} onChange={(e) => setBacSiId(e.target.value)}>
            {(bacSi.data ?? []).map((b) => <option key={b.nhan_vien_id} value={b.nhan_vien_id}>{b.ho_ten}</option>)}
          </select>
        </Truong>
        <Truong nhan="Cơ sở">
          <select value={coSoId} onChange={(e) => setCoSoId(e.target.value)}>
            {(coSo.data ?? []).map((c) => <option key={c.co_so_id} value={c.co_so_id}>{c.ten_co_so}</option>)}
          </select>
        </Truong>
        <div className="dialog-actions field-full">
          <button type="button" className="btn btn-ghost" onClick={dong}>Đóng</button>
          <button className="btn" disabled={dang}>{dang ? "Đang lưu…" : "Lưu lịch"}</button>
        </div>
      </form>
    </Dialog>
  );
}

function YKhoaDialog({ ca, dong, xong }: { ca: Ca | null; dong: () => void; xong: () => void }) {
  const { can } = useAuth();
  const ct = useApi(() => (ca ? layCa(ca.ca_id) : Promise.resolve(null)), [ca?.ca_id]);
  const [kt, setKt] = useState("");
  const [kth, setKth] = useState("");
  const [hd, setHd] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  useEffect(() => {
    if (ct.data) { setKt(ct.data.kiem_tra_truoc_ca ?? ""); setKth(ct.data.ky_thuat_thuc_hien ?? ""); setHd(ct.data.huong_dan_sau_ca ?? ""); setLoi(""); }
  }, [ct.data]);
  const c = ct.data;
  const khoaKiemTra = !c || c.trang_thai !== "du_kien" && c.trang_thai !== "hoan";
  const khoaHet = !c || c.trang_thai === "hoan_thanh" || c.trang_thai === "huy";
  const duocGhi = can("ho_so_kham", "sua") && !khoaHet;

  async function gui(e: FormEvent) {
    e.preventDefault();
    if (!c) return;
    setDang(true); setLoi("");
    try {
      await ghiYKhoaCa(c.ca_id, { ...(khoaKiemTra ? {} : { kiemTraTruocCa: kt }), kyThuatThucHien: kth, huongDanSauCa: hd });
      xong(); dong();
    } catch (err) { setLoi(loiToiThongBao(err)); } finally { setDang(false); }
  }

  return (
    <Dialog mo={!!ca} dong={dong} tieuDe="Ghi chú y khoa của ca" rong>
      <form className="form" onSubmit={gui}>
        <div className="field-full"><Loi>{loi || ct.loi}</Loi></div>
        <p className="field-full muted small">Nội dung y khoa chỉ bác sĩ phụ trách xem được; mỗi lần xem và ghi đều được lưu nhật ký. Kiểm tra trước ca khóa khi ca đã bắt đầu; cả ba mục khóa khi ca đã hoàn thành.</p>
        <Truong nhan="Kiểm tra trước ca (bắt buộc để bắt đầu)"><textarea rows={3} disabled={!duocGhi || khoaKiemTra} value={kt} onChange={(e) => setKt(e.target.value)} /></Truong>
        <Truong nhan="Kỹ thuật đã thực hiện (bắt buộc để hoàn thành)"><textarea rows={3} disabled={!duocGhi} value={kth} onChange={(e) => setKth(e.target.value)} /></Truong>
        <Truong nhan="Hướng dẫn sau ca (bắt buộc để hoàn thành)"><textarea rows={3} disabled={!duocGhi} value={hd} onChange={(e) => setHd(e.target.value)} /></Truong>
        <div className="dialog-actions field-full">
          <button type="button" className="btn btn-ghost" onClick={dong}>Đóng</button>
          {duocGhi && <button className="btn" disabled={dang}>{dang ? "Đang lưu…" : "Lưu"}</button>}
        </div>
      </form>
    </Dialog>
  );
}
