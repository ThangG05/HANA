"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/src/lib/auth";
import { loiToiThongBao } from "@/src/lib/api-client";
import { ngayGio } from "@/src/lib/formatters";
import { useApi } from "@/src/lib/use-api";
import { Loi, Nhan, PhanTrang, TieuDeTrang, Trong } from "@/src/components/ui";
import { huyViec, layCanhBao, layViec, nhanViec } from "@/src/features/care/api";
import { CanhBaoDong, HoanThanhViecDialog, LIEN_HE, TT_VIEC } from "@/src/features/care/ChamSocCom";
import type { Viec } from "@/src/features/care/types";

const LOC_VIEC = [["cho_thuc_hien", "Chờ thực hiện"], ["qua_han", "Quá hạn"], ["hoan_thanh", "Đã xong"]] as const;
const LOC_CB = [["", "Tất cả"], ["moi", "Mới"], ["da_nhan", "Đã nhận"], ["dang_xu_ly", "Đang xử lý"], ["da_dong", "Đã đóng"]] as const;

export default function ChamSocPage() {
  const { can } = useAuth();
  const [locViec, setLocViec] = useState<string>("cho_thuc_hien");
  const [trangViec, setTrangViec] = useState(1);
  const [locCb, setLocCb] = useState<string>("moi");
  const [trangCb, setTrangCb] = useState(1);
  const [ghi, setGhi] = useState<Viec | null>(null);
  const [loi, setLoi] = useState("");
  const coViec = can("cham_soc", "xem");
  const coCb = can("canh_bao_y_khoa", "xem");
  const viec = useApi(() => (coViec ? layViec(locViec === "qua_han" ? "" : locViec, locViec === "qua_han", trangViec) : Promise.resolve(null)), [coViec, locViec, trangViec]);
  const cb = useApi(() => (coCb ? layCanhBao(locCb, trangCb) : Promise.resolve(null)), [coCb, locCb, trangCb]);

  async function chay(f: () => Promise<unknown>) {
    setLoi("");
    try { await f(); await viec.tai(); } catch (e) { setLoi(loiToiThongBao(e)); await viec.tai(); }
  }

  return (
    <>
      <TieuDeTrang tieuDe="Chăm sóc sau ca" phu="Việc gọi hỏi thăm, nhắn tin, nhắc tái khám và cảnh báo gửi bác sĩ." />
      {coCb && (
        <section className="panel">
          <div className="panel-head">
            <h2>Cảnh báo cho bác sĩ</h2>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{LOC_CB.map(([k, ten]) => <button key={k} className={`btn btn-sm ${locCb === k ? "" : "btn-ghost"}`} onClick={() => { setLocCb(k); setTrangCb(1); }}>{ten}</button>)}</div>
          </div>
          <Loi>{cb.loi}</Loi>
          {cb.data && cb.data.items.length === 0 && <Trong>Không có cảnh báo nào.</Trong>}
          <ul className="rows">{(cb.data?.items ?? []).map((c) => <CanhBaoDong key={c.canh_bao_id} cb={c} hienKhach xong={() => void cb.tai()} />)}</ul>
          {cb.data && <PhanTrang trang={cb.data.page} tong={cb.data.total} coTrang={cb.data.pageSize} doi={setTrangCb} />}
        </section>
      )}
      {coViec && (
        <section className="panel">
          <div className="panel-head">
            <h2>Việc chăm sóc</h2>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{LOC_VIEC.map(([k, ten]) => <button key={k} className={`btn btn-sm ${locViec === k ? "" : "btn-ghost"}`} onClick={() => { setLocViec(k); setTrangViec(1); }}>{ten}</button>)}</div>
          </div>
          <Loi>{loi || viec.loi}</Loi>
          {viec.data && viec.data.items.length === 0 && <Trong>Không có việc nào.</Trong>}
          <ul className="rows">
            {(viec.data?.items ?? []).map((v) => (
              <li key={v.cham_soc_id}>
                <div className="top">
                  <b>{v.khach_hang} · {v.noi_dung}</b>
                  <span style={{ display: "flex", gap: 6 }}>{v.qua_han && <Nhan ten="Quá hạn" tone="do" />}<Nhan ten={TT_VIEC[v.trang_thai]} tone={v.trang_thai === "hoan_thanh" ? "xanh" : v.trang_thai === "huy" ? "xam" : "vang"} /></span>
                </div>
                <div className="muted small">
                  {v.loai_lien_he ? LIEN_HE[v.loai_lien_he] : ""} · hạn {ngayGio(v.han_thuc_hien)} · {v.ten_hang_muc}{v.so_dien_thoai ? ` · ${v.so_dien_thoai}` : ""}{v.nguoi_phu_trach ? ` · ${v.nguoi_phu_trach}` : ""}
                </div>
                {v.phan_hoi && <div className="small">Khách phản hồi: {v.phan_hoi}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  {v.trang_thai === "cho_thuc_hien" && can("cham_soc", "sua") && <>
                    {!v.nguoi_phu_trach_id && <button className="btn btn-ghost btn-sm" onClick={() => chay(() => nhanViec(v.cham_soc_id))}>Nhận việc</button>}
                    <button className="btn btn-sm" onClick={() => setGhi(v)}>Ghi kết quả</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => chay(() => huyViec(v.cham_soc_id))}>Hủy việc</button>
                  </>}
                  {v.co_hoi_id && can("co_hoi", "xem") && <Link className="btn btn-ghost btn-sm" href={`/opportunities/${v.co_hoi_id}`}>Mở cơ hội</Link>}
                </div>
              </li>
            ))}
          </ul>
          {viec.data && <PhanTrang trang={viec.data.page} tong={viec.data.total} coTrang={viec.data.pageSize} doi={setTrangViec} />}
        </section>
      )}
      <HoanThanhViecDialog viec={ghi} dong={() => setGhi(null)} xong={() => void viec.tai()} />
    </>
  );
}
