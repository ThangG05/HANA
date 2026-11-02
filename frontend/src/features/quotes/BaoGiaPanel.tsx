"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/lib/auth";
import { ApiError, loiToiThongBao } from "@/src/lib/api-client";
import { ngay, nhapSangIso, tien } from "@/src/lib/formatters";
import { useApi } from "@/src/lib/use-api";
import { Dialog, Loi, Nhan, Trong, Truong } from "@/src/components/ui";
import { layDichVu } from "../catalogs/api";
import { layKhamTheoCoHoi } from "../consultations/api";
import { chapNhanBaoGia, guiBaoGia, huyBaoGia, layBaoGiaTheoCoHoi, suaBaoGia, taoBaoGia, taoPhienBanMoi } from "./api";
import type { BaoGia } from "./types";

const NHAN: Record<string, string> = { nhap: "Bản nháp", da_gui: "Đã gửi khách", da_chap_nhan: "Khách đã chấp nhận", het_han: "Hết hạn", da_thay_the: "Đã thay bằng bản mới", huy: "Đã hủy" };
const TONE: Record<string, "xam" | "xanh" | "nau" | "do" | "vang" | "tim"> = { nhap: "vang", da_gui: "xanh", da_chap_nhan: "tim", het_han: "do", da_thay_the: "xam", huy: "xam" };
const NGUONG = 10;

export function BaoGiaPanel({ coHoiId, ketThuc, xong }: { coHoiId: string; ketThuc: boolean; xong: () => void }) {
  const { can } = useAuth();
  const ds = useApi(() => layBaoGiaTheoCoHoi(coHoiId), [coHoiId]);
  const [soan, setSoan] = useState<BaoGia | "moi" | null>(null);
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState("");

  const coNhap = (ds.data ?? []).some((b) => b.trang_thai === "nhap");
  async function chay(id: string, ten: string, f: () => Promise<unknown>) {
    setDang(id + ten); setLoi("");
    try { await f(); await ds.tai(); xong(); } catch (e) {
      setLoi(e instanceof ApiError && e.code === "GIAM_GIA_VUOT_MUC" ? `${e.message} Nhờ quản lý mở báo giá này và bấm Gửi.` : loiToiThongBao(e));
      await ds.tai();
    } finally { setDang(""); }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Báo giá</h2>
        {can("bao_gia", "them") && !ketThuc && !coNhap && <button className="btn btn-ghost btn-sm" onClick={() => setSoan("moi")}>Lập báo giá</button>}
      </div>
      <Loi>{loi || ds.loi}</Loi>
      {ds.data && ds.data.length === 0 && <Trong>Chưa có báo giá. Cần có lần khám trước khi lập.</Trong>}
      <ul className="rows">
        {(ds.data ?? []).map((b) => {
          const hetHan = b.da_het_han;
          const bi = (t: string) => dang === b.bao_gia_id + t;
          return (
            <li key={b.bao_gia_id}>
              <div className="top">
                <b>Phiên bản {b.phien_ban} · {tien(b.tong)}</b>
                <Nhan ten={hetHan ? "Hết hạn" : NHAN[b.trang_thai]} tone={hetHan ? "do" : TONE[b.trang_thai]} />
              </div>
              <table className="table small" style={{ marginTop: 6 }}>
                <tbody>
                  {b.hang_muc.map((h) => (
                    <tr key={h.chi_tiet_bao_gia_id}>
                      <td>{h.ten_hang_muc}</td>
                      <td>{h.so_luong} × {tien(h.don_gia)}{h.giam_gia > 0 && <span className="muted"> − {tien(h.giam_gia)}</span>}</td>
                      <td style={{ textAlign: "right" }}>{tien(h.thanh_tien)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="muted small">
                {[b.nguoi_lap && `Lập bởi ${b.nguoi_lap}`, b.tham_kham?.bac_si && `Căn cứ khám: ${b.tham_kham.bac_si}`, b.hieu_luc_den && `Có hiệu lực đến ${ngay(b.hieu_luc_den)}`, b.khach_xac_nhan_luc && `Khách xác nhận ${ngay(b.khach_xac_nhan_luc)}`].filter(Boolean).join(" · ")}
              </div>
              {can("bao_gia", "sua") && !ketThuc && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {b.trang_thai === "nhap" && <>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSoan(b)}>Sửa</button>
                    <button className="btn btn-sm" disabled={!!dang} onClick={() => chay(b.bao_gia_id, "gui", () => guiBaoGia(b.bao_gia_id))}>{bi("gui") ? "Đang gửi…" : "Gửi khách"}</button>
                    <button className="btn btn-ghost btn-sm" disabled={!!dang} onClick={() => chay(b.bao_gia_id, "huy", () => huyBaoGia(b.bao_gia_id))}>Hủy bản nháp</button>
                  </>}
                  {b.trang_thai === "da_gui" && !hetHan && <>
                    <button className="btn btn-sm" disabled={!!dang} onClick={() => chay(b.bao_gia_id, "nhan", () => chapNhanBaoGia(b.bao_gia_id))}>{bi("nhan") ? "Đang lưu…" : "Khách đã chấp nhận"}</button>
                    <button className="btn btn-ghost btn-sm" disabled={!!dang} onClick={() => chay(b.bao_gia_id, "huy", () => huyBaoGia(b.bao_gia_id))}>Hủy báo giá</button>
                  </>}
                  {(b.trang_thai === "da_gui" || b.trang_thai === "da_chap_nhan" || b.trang_thai === "het_han") && !coNhap && can("bao_gia", "them") && (
                    <button className="btn btn-ghost btn-sm" disabled={!!dang} onClick={() => chay(b.bao_gia_id, "moi", () => taoPhienBanMoi(b.bao_gia_id))}>Tạo phiên bản mới</button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <BaoGiaFormDialog mo={!!soan} bg={soan === "moi" ? null : soan} coHoiId={coHoiId} dong={() => setSoan(null)} xong={() => { void ds.tai(); xong(); }} />
    </section>
  );
}

interface Dong { dichVuId: string; soLuong: string; donGia: string; giamGia: string }
const dongTrong = (): Dong => ({ dichVuId: "", soLuong: "1", donGia: "", giamGia: "0" });
const so = (s: string) => (s.trim() === "" ? 0 : Math.trunc(Number(s)));

function BaoGiaFormDialog({ mo, bg, coHoiId, dong, xong }: { mo: boolean; bg: BaoGia | null; coHoiId: string; dong: () => void; xong: () => void }) {
  const dv = useApi(() => (mo ? layDichVu() : Promise.resolve([])), [mo]);
  const kham = useApi(() => (mo ? layKhamTheoCoHoi(coHoiId) : Promise.resolve([])), [mo, coHoiId]);
  const [dongs, setDongs] = useState<Dong[]>([dongTrong()]);
  const [khamId, setKhamId] = useState("");
  const [han, setHan] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);

  useEffect(() => {
    if (!mo) return;
    setLoi("");
    if (bg) {
      setDongs(bg.hang_muc.map((h) => ({ dichVuId: h.dich_vu_id, soLuong: String(h.so_luong), donGia: String(h.don_gia), giamGia: String(h.giam_gia) })));
      setKhamId(bg.tham_kham_id);
      setHan(bg.hieu_luc_den ? bg.hieu_luc_den.slice(0, 10) : "");
    } else { setDongs([dongTrong()]); setKhamId(""); setHan(""); }
  }, [mo, bg]);
  useEffect(() => { if (mo && !khamId && kham.data?.length) setKhamId(kham.data[0].tham_kham_id); }, [mo, khamId, kham.data]);

  const tong = useMemo(() => {
    let goc = 0, giam = 0;
    for (const d of dongs) { goc += so(d.soLuong) * so(d.donGia); giam += so(d.giamGia); }
    return { goc, giam, tong: goc - giam, phanTram: goc > 0 ? (giam / goc) * 100 : 0 };
  }, [dongs]);
  const capNhat = (i: number, p: Partial<Dong>) => setDongs(dongs.map((d, j) => (j === i ? { ...d, ...p } : d)));
  const chonDichVu = (i: number, id: string) => {
    const d = dv.data?.find((x) => x.dich_vu_id === id);
    capNhat(i, { dichVuId: id, ...(d?.gia_tham_khao_tu && !dongs[i].donGia ? { donGia: String(Math.trunc(Number(d.gia_tham_khao_tu))) } : {}) });
  };

  async function gui(e: FormEvent) {
    e.preventDefault();
    const hm = dongs.filter((d) => d.dichVuId).map((d) => ({ dichVuId: d.dichVuId, soLuong: so(d.soLuong), donGia: so(d.donGia), giamGia: so(d.giamGia) }));
    if (hm.length === 0) return setLoi("Thêm ít nhất một hạng mục.");
    if (!khamId) return setLoi("Chọn lần khám làm căn cứ. Cần bác sĩ ghi lần khám trước.");
    setDang(true); setLoi("");
    try {
      const hieuLucDen = han ? nhapSangIso(`${han}T23:59`) : undefined;
      if (bg) await suaBaoGia(bg.bao_gia_id, { thamKhamId: khamId, hieuLucDen, hangMuc: hm });
      else await taoBaoGia({ coHoiId, thamKhamId: khamId, hieuLucDen, hangMuc: hm });
      xong(); dong();
    } catch (err) { setLoi(loiToiThongBao(err)); } finally { setDang(false); }
  }

  return (
    <Dialog mo={mo} dong={dong} tieuDe={bg ? `Sửa báo giá phiên bản ${bg.phien_ban}` : "Lập báo giá"} rong>
      <form className="form" onSubmit={gui}>
        <div className="field-full"><Loi>{loi}</Loi></div>
        <Truong nhan="Căn cứ lần khám *">
          <select value={khamId} onChange={(e) => setKhamId(e.target.value)} required>
            <option value="">Chọn lần khám</option>
            {(kham.data ?? []).map((k) => <option key={k.tham_kham_id} value={k.tham_kham_id}>{k.bac_si ?? "Bác sĩ"} · {ngay(k.thoi_diem_kham)}</option>)}
          </select>
        </Truong>
        <Truong nhan="Có hiệu lực đến" ghiChu="Bỏ trống: 14 ngày kể từ lúc gửi.">
          <input type="date" value={han} onChange={(e) => setHan(e.target.value)} />
        </Truong>
        <div className="field-full stack">
          {dongs.map((d, i) => (
            <div key={i} className="panel" style={{ padding: 10 }}>
              <select aria-label="Dịch vụ" value={d.dichVuId} onChange={(e) => chonDichVu(i, e.target.value)}>
                <option value="">Chọn dịch vụ</option>
                {(dv.data ?? []).map((x) => <option key={x.dich_vu_id} value={x.dich_vu_id}>{x.ten_dich_vu}</option>)}
              </select>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,2fr) minmax(0,2fr)", gap: 8, marginTop: 8 }}>
                <input aria-label="Số lượng" type="number" min={1} value={d.soLuong} onChange={(e) => capNhat(i, { soLuong: e.target.value })} />
                <input aria-label="Đơn giá (đ)" type="number" min={0} placeholder="Đơn giá (đ)" value={d.donGia} onChange={(e) => capNhat(i, { donGia: e.target.value })} />
                <input aria-label="Giảm giá (đ)" type="number" min={0} placeholder="Giảm giá (đ)" value={d.giamGia} onChange={(e) => capNhat(i, { giamGia: e.target.value })} />
              </div>
              {dongs.length > 1 && <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setDongs(dongs.filter((_, j) => j !== i))}>Bỏ hạng mục</button>}
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDongs([...dongs, dongTrong()])}>Thêm hạng mục</button>
        </div>
        <div className="field-full">
          <b>Tổng: {tien(tong.tong)}</b>
          <span className="muted small"> · giảm {tien(tong.giam)} ({tong.phanTram.toFixed(1)}%)</span>
          {tong.phanTram > NGUONG && <p className="muted small">Giảm trên {NGUONG}% cần quản lý duyệt: bạn vẫn lưu được bản nháp, nhưng quản lý phải là người gửi.</p>}
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={dong}>Hủy</button>
          <button className="btn" disabled={dang}>{dang ? "Đang lưu…" : "Lưu bản nháp"}</button>
        </div>
      </form>
    </Dialog>
  );
}
