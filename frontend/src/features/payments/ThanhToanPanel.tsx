"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/src/lib/auth";
import { loiToiThongBao } from "@/src/lib/api-client";
import { ngayGio, tien } from "@/src/lib/formatters";
import { useApi } from "@/src/lib/use-api";
import { Dialog, Loi, Nhan, Trong, Truong } from "@/src/components/ui";
import { huyChoXacNhan, hoanTien, layThanhToanTheoCoHoi, thuTien, xacNhanThu } from "./api";
import type { GiaoDich, TienBaoGia } from "./types";

const LOAI: Record<string, string> = { dat_coc: "Đặt cọc", thanh_toan: "Thanh toán", hoan_tien: "Hoàn tiền" };
const PHUONG_THUC: Record<string, string> = { tien_mat: "Tiền mặt", chuyen_khoan: "Chuyển khoản", the: "Quẹt thẻ" };
const TRANG_THAI: Record<string, string> = { cho_xac_nhan: "Chờ xác nhận", thanh_cong: "Thành công", that_bai: "Thất bại", huy: "Đã hủy" };
const TONE: Record<string, "xam" | "xanh" | "nau" | "do" | "vang" | "tim"> = { cho_xac_nhan: "vang", thanh_cong: "xanh", that_bai: "do", huy: "xam" };

export function ThanhToanPanel({ coHoiId, xong }: { coHoiId: string; xong: () => void }) {
  const { can } = useAuth();
  const ds = useApi(() => layThanhToanTheoCoHoi(coHoiId), [coHoiId]);
  const [thu, setThu] = useState<TienBaoGia | null>(null);
  const [hoan, setHoan] = useState<{ bg: TienBaoGia; gd: GiaoDich } | null>(null);
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState("");

  async function chay(id: string, f: () => Promise<unknown>, cauHoi: string) {
    if (!window.confirm(cauHoi)) return;
    setDang(id); setLoi("");
    try { await f(); await ds.tai(); xong(); } catch (e) { setLoi(loiToiThongBao(e)); await ds.tai(); } finally { setDang(""); }
  }
  const lamMoi = () => { void ds.tai(); xong(); };

  return (
    <section className="panel">
      <div className="panel-head"><h2>Thanh toán</h2></div>
      <Loi>{loi || ds.loi}</Loi>
      {ds.data && ds.data.length === 0 && <Trong>Chưa có báo giá nào được khách chấp nhận nên chưa thu tiền được.</Trong>}
      <ul className="rows">
        {(ds.data ?? []).map((b) => (
          <li key={b.bao_gia_id}>
            <div className="top">
              <b>Báo giá phiên bản {b.phien_ban} · {tien(b.tong_bao_gia)}</b>
              {b.trang_thai !== "da_chap_nhan" && <Nhan ten="Không còn hiệu lực" />}
            </div>
            <dl className="payment-summary">
              <div><dt>Giá trị báo giá</dt><dd>{tien(b.tong_bao_gia)}</dd></div>
              <div><dt>Đã thu</dt><dd>{tien(b.tong_thu)}</dd></div>
              <div><dt>Đã hoàn</dt><dd>{tien(b.tong_hoan)}</dd></div>
              <div><dt>Thực thu</dt><dd>{tien(b.thuc_thu)}</dd></div>
              <div className="payment-remaining"><dt>Còn phải thu</dt><dd>{tien(Math.max(b.con_lai, 0))}</dd></div>
            </dl>
            {b.giao_dich.length > 0 && (
              <table className="table small">
                <tbody>
                  {b.giao_dich.map((g) => (
                    <tr key={g.thanh_toan_id}>
                      <td>{ngayGio(g.thoi_diem)}</td>
                      <td>{LOAI[g.loai_giao_dich]} · {PHUONG_THUC[g.phuong_thuc]}{g.ma_giao_dich && <span className="muted"> · {g.ben_cung_cap} {g.ma_giao_dich}</span>}<div className="muted">{g.thu_ngan}</div></td>
                      <td style={{ textAlign: "right" }}>{g.loai_giao_dich === "hoan_tien" ? "−" : ""}{tien(g.so_tien)}<div><Nhan ten={TRANG_THAI[g.trang_thai]} tone={TONE[g.trang_thai]} /></div></td>
                      <td style={{ textAlign: "right" }}>
                        {g.trang_thai === "cho_xac_nhan" && can("thanh_toan", "sua") && (
                          <div style={{ display: "grid", gap: 4 }}>
                            <button className="btn btn-sm" disabled={!!dang} onClick={() => chay(g.thanh_toan_id, () => xacNhanThu(g.thanh_toan_id), `Xác nhận đã nhận ${tien(g.so_tien)} vào tài khoản? Giao dịch sẽ được tính vào thực thu.`)}>{dang === g.thanh_toan_id ? "Đang lưu…" : "Đã nhận tiền"}</button>
                            <button className="btn btn-ghost btn-sm" disabled={!!dang} onClick={() => chay(g.thanh_toan_id, () => huyChoXacNhan(g.thanh_toan_id), `Hủy khoản chuyển khoản ${tien(g.so_tien)} đang chờ xác nhận?`)}>Hủy</button>
                          </div>
                        )}
                        {g.trang_thai === "thanh_cong" && g.loai_giao_dich !== "hoan_tien" && can("thanh_toan", "duyet") && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setHoan({ bg: b, gd: g })}>Hoàn tiền</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {b.trang_thai === "da_chap_nhan" && b.con_lai > 0 && can("thanh_toan", "them") && (
              <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => setThu(b)}>Thu tiền</button>
            )}
          </li>
        ))}
      </ul>
      <ThuTienDialog bg={thu} dong={() => setThu(null)} xong={lamMoi} />
      <HoanTienDialog muc={hoan} dong={() => setHoan(null)} xong={lamMoi} />
    </section>
  );
}

function ThuTienDialog({ bg, dong, xong }: { bg: TienBaoGia | null; dong: () => void; xong: () => void }) {
  const [loai, setLoai] = useState<"dat_coc" | "thanh_toan">("dat_coc");
  const [soTien, setSoTien] = useState("");
  const [pt, setPt] = useState("tien_mat");
  const [ma, setMa] = useState("");
  const [ben, setBen] = useState("");
  const [cho, setCho] = useState(false);
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  useEffect(() => { if (bg) { setLoai(bg.thuc_thu > 0 ? "thanh_toan" : "dat_coc"); setSoTien(""); setPt("tien_mat"); setMa(""); setBen(""); setCho(false); setLoi(""); } }, [bg]);

  async function gui(e: FormEvent) {
    e.preventDefault();
    if (!bg) return;
    const n = Math.trunc(Number(soTien));
    if (!(n > 0)) return setLoi("Nhập số tiền lớn hơn 0.");
    if (n > bg.con_lai) return setLoi(`Số tiền vượt phần còn phải thu (${tien(bg.con_lai)}).`);
    setDang(true); setLoi("");
    try {
      await thuTien({ baoGiaId: bg.bao_gia_id, loai, soTien: n, phuongThuc: pt, ...(ma.trim() && { maGiaoDich: ma.trim(), benCungCap: ben.trim() }), ...(cho && pt === "chuyen_khoan" && { choXacNhan: true }) });
      xong(); dong();
    } catch (err) { setLoi(loiToiThongBao(err)); } finally { setDang(false); }
  }

  return (
    <Dialog mo={!!bg} dong={dong} tieuDe="Thu tiền">
      <form className="form" onSubmit={gui}>
        <div className="field-full"><Loi>{loi}</Loi></div>
        {bg && <p className="field-full muted small">Còn phải thu: <b>{tien(bg.con_lai)}</b></p>}
        <Truong nhan="Loại khoản thu">
          <select value={loai} onChange={(e) => setLoai(e.target.value as "dat_coc" | "thanh_toan")}>
            <option value="dat_coc">Đặt cọc</option><option value="thanh_toan">Thanh toán</option>
          </select>
        </Truong>
        <Truong nhan="Phương thức">
          <select value={pt} onChange={(e) => setPt(e.target.value)}>{Object.entries(PHUONG_THUC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </Truong>
        <Truong nhan="Số tiền (₫) *" rong><input type="number" min={1} required value={soTien} onChange={(e) => setSoTien(e.target.value)} autoFocus /></Truong>
        {pt !== "tien_mat" && (
          <>
            <Truong nhan="Ngân hàng / máy POS"><input maxLength={100} value={ben} onChange={(e) => setBen(e.target.value)} required={!!ma.trim()} /></Truong>
            <Truong nhan="Mã giao dịch" ghiChu="Nhập để chặn ghi trùng cùng một giao dịch."><input maxLength={100} value={ma} onChange={(e) => setMa(e.target.value)} /></Truong>
          </>
        )}
        {pt === "chuyen_khoan" && (
          <label className="field-full" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={cho} onChange={(e) => setCho(e.target.checked)} /> Tiền chưa về tài khoản, ghi chờ xác nhận
          </label>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={dong}>Hủy</button>
          <button className="btn" disabled={dang}>{dang ? "Đang lưu…" : "Ghi nhận thu"}</button>
        </div>
      </form>
    </Dialog>
  );
}

function HoanTienDialog({ muc, dong, xong }: { muc: { bg: TienBaoGia; gd: GiaoDich } | null; dong: () => void; xong: () => void }) {
  const [soTien, setSoTien] = useState("");
  const [pt, setPt] = useState("tien_mat");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  // Phần còn hoàn được của khoản gốc = số tiền gốc − tổng các lần hoàn thành công đã tham chiếu nó.
  const daHoan = muc ? muc.bg.giao_dich.filter((g) => g.giao_dich_goc_id === muc.gd.thanh_toan_id && g.trang_thai === "thanh_cong").reduce((a, g) => a + g.so_tien, 0) : 0;
  const conHoan = muc ? muc.gd.so_tien - daHoan : 0;
  useEffect(() => { if (muc) { setSoTien(""); setPt(muc.gd.phuong_thuc); setLoi(""); } }, [muc]);

  async function gui(e: FormEvent) {
    e.preventDefault();
    if (!muc) return;
    const n = Math.trunc(Number(soTien));
    if (!(n > 0)) return setLoi("Nhập số tiền lớn hơn 0.");
    if (n > conHoan) return setLoi(`Chỉ hoàn tối đa ${tien(conHoan)} cho khoản thu này.`);
    setDang(true); setLoi("");
    try { await hoanTien({ giaoDichGocId: muc.gd.thanh_toan_id, soTien: n, phuongThuc: pt }); xong(); dong(); } catch (err) { setLoi(loiToiThongBao(err)); } finally { setDang(false); }
  }

  return (
    <Dialog mo={!!muc} dong={dong} tieuDe="Hoàn tiền">
      <form className="form" onSubmit={gui}>
        <div className="field-full"><Loi>{loi}</Loi></div>
        {muc && <p className="field-full muted small">Khoản thu gốc {tien(muc.gd.so_tien)} ({ngayGio(muc.gd.thoi_diem)}). Còn hoàn được: <b>{tien(conHoan)}</b></p>}
        <Truong nhan="Số tiền hoàn (₫) *"><input type="number" min={1} required value={soTien} onChange={(e) => setSoTien(e.target.value)} autoFocus /></Truong>
        <Truong nhan="Hoàn bằng">
          <select value={pt} onChange={(e) => setPt(e.target.value)}>{Object.entries(PHUONG_THUC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </Truong>
        <p className="field-full muted small">Khoản hoàn không xóa hay sửa được sau khi ghi.</p>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={dong}>Hủy</button>
          <button className="btn" disabled={dang}>{dang ? "Đang lưu…" : "Ghi nhận hoàn"}</button>
        </div>
      </form>
    </Dialog>
  );
}
