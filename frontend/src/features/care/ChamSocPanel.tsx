"use client";

import { useState } from "react";
import { useAuth } from "@/src/lib/auth";
import { loiToiThongBao } from "@/src/lib/api-client";
import { ngay, ngayGio } from "@/src/lib/formatters";
import { useApi } from "@/src/lib/use-api";
import { Loi, Nhan } from "@/src/components/ui";
import { layChamSocTheoCoHoi, nhanViec, sinhLichChamSoc, huyViec } from "./api";
import { BaoBacSiDialog, CanhBaoDong, DanhGiaDialog, HoanThanhViecDialog, LIEN_HE, TT_VIEC } from "./ChamSocCom";
import type { Viec } from "./types";

const TONE: Record<string, "xam" | "xanh" | "vang"> = { cho_thuc_hien: "vang", hoan_thanh: "xanh", huy: "xam" };

/** Chăm sóc sau ca của một cơ hội: lịch chăm sóc, cảnh báo cho bác sĩ, đánh giá. Chỉ hiện khi đã có ca hoàn thành. */
export function ChamSocPanel({ coHoiId, xong }: { coHoiId: string; xong: () => void }) {
  const { can } = useAuth();
  const ds = useApi(() => layChamSocTheoCoHoi(coHoiId), [coHoiId]);
  const [ghi, setGhi] = useState<Viec | null>(null);
  const [bao, setBao] = useState<string | null>(null);
  const [dg, setDg] = useState<string | null>(null);
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState("");
  const d = ds.data;
  if (!d || d.ca_hoan_thanh.length === 0) return ds.loi ? <section className="panel"><Loi>{ds.loi}</Loi></section> : null;

  const lamMoi = () => { void ds.tai(); xong(); };
  async function chay(id: string, f: () => Promise<unknown>) {
    setDang(id); setLoi("");
    try { await f(); await ds.tai(); } catch (e) { setLoi(loiToiThongBao(e)); await ds.tai(); } finally { setDang(""); }
  }
  const sua = can("cham_soc", "sua");

  return (
    <section className="panel">
      <div className="panel-head"><h2>Chăm sóc sau ca</h2></div>
      <Loi>{loi || ds.loi}</Loi>
      {d.ca_hoan_thanh.map((ca) => {
        const viec = d.viec.filter((v) => v.ca_id === ca.ca_id);
        const cb = d.canh_bao.filter((c) => c.ca_id === ca.ca_id);
        const danhGia = d.danh_gia.find((x) => x.ca_id === ca.ca_id);
        return (
          <div key={ca.ca_id} style={{ marginBottom: 16 }}>
            <div className="top">
              <b>{ca.ten_hang_muc ?? "Ca thực hiện"}{ca.ket_thuc_luc && <span className="muted"> · xong {ngay(ca.ket_thuc_luc)}</span>}</b>
              <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {danhGia
                  ? <Nhan ten={`Khách chấm ${danhGia.diem}/${danhGia.thang_diem}`} tone={danhGia.diem / danhGia.thang_diem >= 0.8 ? "xanh" : danhGia.diem / danhGia.thang_diem >= 0.6 ? "vang" : "do"} />
                  : can("danh_gia", "them") && <button className="btn btn-ghost btn-sm" onClick={() => setDg(ca.ca_id)}>Ghi đánh giá</button>}
                {can("canh_bao_y_khoa", "them") && <button className="btn btn-ghost btn-sm" onClick={() => setBao(ca.ca_id)}>Báo bác sĩ</button>}
              </span>
            </div>
            {danhGia?.nhan_xet && <div className="muted small">“{danhGia.nhan_xet}”</div>}

            {viec.length === 0 && (
              <p className="muted small">
                Chưa có lịch chăm sóc cho ca này (dịch vụ chưa có mẫu chăm sóc đã duyệt).{" "}
                {can("cham_soc", "them") && <button className="btn btn-ghost btn-sm" disabled={!!dang} onClick={() => chay(ca.ca_id, () => sinhLichChamSoc(ca.ca_id))}>{dang === ca.ca_id ? "Đang tạo…" : "Tạo lịch chăm sóc"}</button>}
              </p>
            )}
            <ul className="rows">
              {viec.map((v) => (
                <li key={v.cham_soc_id}>
                  <div className="top">
                    <b>{v.noi_dung ?? "Chăm sóc"} <span className="muted">· {v.loai_lien_he ? LIEN_HE[v.loai_lien_he] : ""}</span></b>
                    <span style={{ display: "flex", gap: 6 }}>{v.qua_han && <Nhan ten="Quá hạn" tone="do" />}<Nhan ten={TT_VIEC[v.trang_thai]} tone={TONE[v.trang_thai]} /></span>
                  </div>
                  <div className="muted small">Hạn {ngayGio(v.han_thuc_hien)}{v.nguoi_phu_trach && ` · ${v.nguoi_phu_trach}`}</div>
                  {v.phan_hoi && <div className="small">Khách phản hồi: {v.phan_hoi}{v.huong_xu_ly && <> · Xử lý: {v.huong_xu_ly}</>}</div>}
                  {v.trang_thai === "cho_thuc_hien" && sua && (
                    <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                      {!v.nguoi_phu_trach_id && <button className="btn btn-ghost btn-sm" disabled={!!dang} onClick={() => chay(v.cham_soc_id, () => nhanViec(v.cham_soc_id))}>Nhận việc</button>}
                      <button className="btn btn-sm" onClick={() => setGhi(v)}>Ghi kết quả</button>
                      <button className="btn btn-ghost btn-sm" disabled={!!dang} onClick={() => chay(v.cham_soc_id, () => huyViec(v.cham_soc_id))}>Hủy việc</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {cb.length > 0 && <ul className="rows" style={{ marginTop: 8 }}>{cb.map((c) => <CanhBaoDong key={c.canh_bao_id} cb={c} xong={lamMoi} />)}</ul>}
          </div>
        );
      })}
      <HoanThanhViecDialog viec={ghi} dong={() => setGhi(null)} xong={lamMoi} />
      <BaoBacSiDialog caId={bao} dong={() => setBao(null)} xong={lamMoi} />
      <DanhGiaDialog caId={dg} dong={() => setDg(null)} xong={lamMoi} />
    </section>
  );
}
