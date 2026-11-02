"use client";

import { FormEvent, useMemo, useState } from "react";
import { useAuth } from "@/src/lib/auth";
import { loiToiThongBao } from "@/src/lib/api-client";
import { ngay } from "@/src/lib/formatters";
import { useApi } from "@/src/lib/use-api";
import { Dialog, Loi, Nhan, TieuDeTrang, Trong, Truong } from "@/src/components/ui";
import { layDichVu } from "@/src/features/catalogs/api";
import { duyetMau, layMau, ngungMau, taoMauNhap, themMoc, xoaMoc } from "@/src/features/care/api";
import { DON_VI, LIEN_HE } from "@/src/features/care/ChamSocCom";
import type { Mau } from "@/src/features/care/types";

const TT: Record<string, string> = { nhap: "Bản nháp", da_duyet: "Đang dùng", ngung_dung: "Đã ngừng" };
const TONE: Record<string, "vang" | "xanh" | "xam"> = { nhap: "vang", da_duyet: "xanh", ngung_dung: "xam" };

export default function MauChamSocPage() {
  const { can } = useAuth();
  const dv = useApi(layDichVu, []);
  const mau = useApi(layMau, []);
  const [them, setThem] = useState<Mau | null>(null);
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState("");
  const theoDv = useMemo(() => {
    const m = new Map<string, Mau[]>();
    for (const x of mau.data ?? []) m.set(x.dich_vu_id, [...(m.get(x.dich_vu_id) ?? []), x]);
    return m;
  }, [mau.data]);

  async function chay(id: string, f: () => Promise<unknown>) {
    setDang(id); setLoi("");
    try { await f(); await mau.tai(); } catch (e) { setLoi(loiToiThongBao(e)); await mau.tai(); } finally { setDang(""); }
  }

  return (
    <>
      <TieuDeTrang tieuDe="Mẫu chăm sóc" phu="Mỗi dịch vụ có các mốc chăm sóc sau ca. Mẫu cần được duyệt mới dùng để tạo lịch; mẫu đã duyệt không sửa, muốn đổi thì tạo phiên bản mới." />
      <Loi>{loi || dv.loi || mau.loi}</Loi>
      {dv.data && dv.data.length === 0 && <Trong>Chưa có dịch vụ nào.</Trong>}
      {(dv.data ?? []).map((d) => {
        const ds = theoDv.get(d.dich_vu_id) ?? [];
        const nhap = ds.find((m) => m.trang_thai === "nhap");
        const dungDuoc = ds.find((m) => m.trang_thai === "da_duyet");
        return (
          <section className="panel" key={d.dich_vu_id}>
            <div className="panel-head">
              <h2>{d.ten_dich_vu}</h2>
              {can("mau_cham_soc", "them") && !nhap && (
                <button className="btn btn-sm" disabled={!!dang} onClick={() => chay(d.dich_vu_id, () => taoMauNhap(d.dich_vu_id))}>{dungDuoc ? "Tạo phiên bản mới" : "Soạn mẫu chăm sóc"}</button>
              )}
            </div>
            {ds.length === 0 && <p className="muted small">Chưa có mẫu. Ca của dịch vụ này sẽ chưa tự sinh lịch chăm sóc.</p>}
            {ds.filter((m) => m.trang_thai !== "ngung_dung" || m === ds[0]).map((m) => (
              <div key={m.mau_id} style={{ marginBottom: 12 }}>
                <div className="top">
                  <b>Phiên bản {m.phien_ban}</b>
                  <Nhan ten={TT[m.trang_thai]} tone={TONE[m.trang_thai]} />
                </div>
                {m.nguoi_duyet && <div className="muted small">Duyệt bởi {m.nguoi_duyet}{m.ngay_duyet ? ` ngày ${ngay(m.ngay_duyet)}` : ""}</div>}
                <ul className="rows">
                  {m.moc.map((x) => (
                    <li key={x.moc_id}>
                      <div className="top">
                        <b>Sau {x.khoang_thoi_gian_sau_ca} {DON_VI[x.don_vi]}: {x.noi_dung}</b>
                        <span className="muted small">{LIEN_HE[x.loai_lien_he]}</span>
                      </div>
                      {m.trang_thai === "nhap" && can("mau_cham_soc", "sua") && <button className="btn btn-ghost btn-sm" disabled={!!dang} onClick={() => chay(x.moc_id, () => xoaMoc(x.moc_id))}>Xóa mốc</button>}
                    </li>
                  ))}
                  {m.moc.length === 0 && <li className="muted small">Chưa có mốc nào.</li>}
                </ul>
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  {m.trang_thai === "nhap" && can("mau_cham_soc", "sua") && <button className="btn btn-ghost btn-sm" onClick={() => setThem(m)}>Thêm mốc</button>}
                  {m.trang_thai === "nhap" && can("mau_cham_soc", "duyet") && <button className="btn btn-sm" disabled={!!dang || m.moc.length === 0} onClick={() => chay(m.mau_id, () => duyetMau(m.mau_id))}>Duyệt để dùng</button>}
                  {m.trang_thai !== "ngung_dung" && can("mau_cham_soc", "duyet") && <button className="btn btn-ghost btn-sm" disabled={!!dang} onClick={() => chay(m.mau_id, () => ngungMau(m.mau_id))}>{m.trang_thai === "nhap" ? "Bỏ bản nháp" : "Ngừng dùng"}</button>}
                </div>
              </div>
            ))}
          </section>
        );
      })}
      <ThemMocDialog mau={them} dong={() => setThem(null)} xong={() => void mau.tai()} />
    </>
  );
}

function ThemMocDialog({ mau, dong, xong }: { mau: Mau | null; dong: () => void; xong: () => void }) {
  const [khoang, setKhoang] = useState("1");
  const [donVi, setDonVi] = useState("ngay");
  const [noiDung, setNoiDung] = useState("");
  const [lienHe, setLienHe] = useState("goi_dien");
  const [vaiTro, setVaiTro] = useState("dieu_duong_cskh");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);

  async function gui(e: FormEvent) {
    e.preventDefault();
    if (!mau) return;
    setDang(true); setLoi("");
    try {
      await themMoc(mau.mau_id, { khoangThoiGian: Number(khoang), donVi, noiDung: noiDung.trim(), loaiLienHe: lienHe, ...(vaiTro && { vaiTroPhuTrach: vaiTro }) });
      setNoiDung(""); xong(); dong();
    } catch (err) { setLoi(loiToiThongBao(err)); } finally { setDang(false); }
  }

  return (
    <Dialog mo={!!mau} dong={dong} tieuDe="Thêm mốc chăm sóc">
      <form className="form" onSubmit={gui}>
        <div className="field-full"><Loi>{loi}</Loi></div>
        <Truong nhan="Sau ca bao lâu *"><input type="number" min={0} max={120} required value={khoang} onChange={(e) => setKhoang(e.target.value)} /></Truong>
        <Truong nhan="Đơn vị">
          <select value={donVi} onChange={(e) => setDonVi(e.target.value)}>{Object.entries(DON_VI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </Truong>
        <Truong nhan="Hình thức liên hệ">
          <select value={lienHe} onChange={(e) => setLienHe(e.target.value)}>{Object.entries(LIEN_HE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </Truong>
        <Truong nhan="Người phụ trách">
          <select value={vaiTro} onChange={(e) => setVaiTro(e.target.value)}>
            <option value="dieu_duong_cskh">Điều dưỡng / CSKH</option>
            <option value="">Ai trong cơ sở cũng nhận được</option>
          </select>
        </Truong>
        <Truong nhan="Nội dung cần làm *" rong><textarea rows={3} required value={noiDung} onChange={(e) => setNoiDung(e.target.value)} /></Truong>
        <div className="dialog-actions field-full">
          <button type="button" className="btn btn-ghost" onClick={dong}>Đóng</button>
          <button className="btn" disabled={dang}>{dang ? "Đang lưu…" : "Thêm mốc"}</button>
        </div>
      </form>
    </Dialog>
  );
}
