"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ApiError, loiToiThongBao } from "@/src/lib/api-client";
import { NHAN_KENH } from "@/src/lib/labels";
import { Dialog, Loi, Truong } from "@/src/components/ui";
import { useApi } from "@/src/lib/use-api";
import { layNguon } from "../catalogs/api";
import { suaKhach, taoKhach } from "./api";
import type { KhachHang, KhachTrung, NhapKhachHang } from "./types";

const RONG = { hoTen: "", soDienThoai: "", email: "", zaloId: "", ngaySinh: "", khuVuc: "", kenhLienHeUuTien: "", khungGioLienHe: "", nguonDauTienId: "" };

export function CustomerFormDialog({ mo, dong, khach, xong }: { mo: boolean; dong: () => void; khach?: KhachHang; xong: (k: KhachHang) => void }) {
  const [f, setF] = useState(RONG);
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  const [trung, setTrung] = useState<{ ds: KhachTrung[]; ngoai: number } | null>(null);
  const nguon = useApi(() => (mo ? layNguon() : Promise.resolve([])), [mo]);

  useEffect(() => {
    if (!mo) return;
    setLoi("");
    setTrung(null);
    setF(khach ? {
      hoTen: khach.ho_ten,
      soDienThoai: khach.so_dien_thoai ?? "",
      email: khach.email ?? "",
      zaloId: khach.zalo_id ?? "",
      ngaySinh: khach.ngay_sinh ? khach.ngay_sinh.slice(0, 10) : "",
      khuVuc: khach.khu_vuc ?? "",
      kenhLienHeUuTien: khach.kenh_lien_he_uu_tien ?? "",
      khungGioLienHe: khach.khung_gio_lien_he ?? "",
      nguonDauTienId: khach.nguon_dau_tien_id ?? "",
    } : RONG);
  }, [mo, khach]);

  const dat = (k: keyof typeof RONG) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function luu(xacNhanTrungSo: boolean) {
    setDang(true);
    setLoi("");
    try {
      // Tạo mới: bỏ trường trống. Sửa: gửi chuỗi rỗng để xóa giá trị.
      const body: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(f)) if (khach || v !== "") body[k] = v.trim();
      if (xacNhanTrungSo) body.xacNhanTrungSo = true;
      const kq = khach ? await suaKhach(khach.khach_hang_id, body as Partial<NhapKhachHang>) : await taoKhach(body as unknown as NhapKhachHang);
      xong(kq);
      dong();
    } catch (e) {
      if (e instanceof ApiError && e.code === "TRUNG_KHACH") {
        setTrung({ ds: (e.body?.khachTrung as KhachTrung[]) ?? [], ngoai: Number(e.body?.soHoSoNgoaiPhamVi ?? 0) });
      } else setLoi(loiToiThongBao(e));
    } finally {
      setDang(false);
    }
  }

  function gui(e: FormEvent) {
    e.preventDefault();
    setTrung(null);
    void luu(false);
  }

  return (
    <Dialog mo={mo} dong={dong} tieuDe={khach ? "Sửa hồ sơ khách hàng" : "Thêm khách hàng"} rong>
      <form className="form" onSubmit={gui}>
        <div className="field-full"><Loi>{loi}</Loi></div>
        {trung && (
          <div className="alert alert-warn field-full">
            <b>Số điện thoại hoặc email này đã có trong hồ sơ khác.</b>
            {trung.ds.length > 0 && (
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {trung.ds.map((k) => (
                  <li key={k.khach_hang_id}><Link href={`/customers/${k.khach_hang_id}`}>{k.ho_ten}</Link> {k.so_dien_thoai ?? k.email ?? ""}</li>
                ))}
              </ul>
            )}
            {trung.ngoai > 0 && <p style={{ marginTop: 6 }}>Còn {trung.ngoai} hồ sơ trùng khác do nhân viên khác phụ trách, bạn không xem được chi tiết.</p>}
            <p style={{ marginTop: 6 }}>Nếu là người thân dùng chung số, bấm “Vẫn lưu”. Nếu là cùng một người, mở hồ sơ có sẵn để khỏi tạo trùng.</p>
            <div className="btn-row" style={{ marginTop: 8 }}>
              <button type="button" className="btn btn-ghost btn-sm" disabled={dang} onClick={() => void luu(true)}>Vẫn lưu</button>
            </div>
          </div>
        )}
        <Truong nhan="Họ tên *" rong><input required maxLength={200} value={f.hoTen} onChange={dat("hoTen")} autoFocus /></Truong>
        <Truong nhan="Số điện thoại"><input inputMode="tel" value={f.soDienThoai} onChange={dat("soDienThoai")} /></Truong>
        <Truong nhan="Email"><input type="email" value={f.email} onChange={dat("email")} /></Truong>
        <Truong nhan="Zalo"><input value={f.zaloId} onChange={dat("zaloId")} /></Truong>
        <Truong nhan="Ngày sinh"><input type="date" value={f.ngaySinh} onChange={dat("ngaySinh")} /></Truong>
        <Truong nhan="Khu vực"><input value={f.khuVuc} onChange={dat("khuVuc")} /></Truong>
        <Truong nhan="Kênh liên hệ ưu tiên">
          <select value={f.kenhLienHeUuTien} onChange={dat("kenhLienHeUuTien")}>
            <option value="">Chưa rõ</option>
            {Object.entries(NHAN_KENH).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Truong>
        <Truong nhan="Khung giờ liên hệ"><input placeholder="Ví dụ: sau 18h" value={f.khungGioLienHe} onChange={dat("khungGioLienHe")} /></Truong>
        <Truong nhan="Nguồn đầu tiên" rong>
          <select value={f.nguonDauTienId} onChange={dat("nguonDauTienId")}>
            <option value="">Chưa rõ</option>
            {(nguon.data ?? []).map((n) => <option key={n.nguon_id} value={n.nguon_id}>{NHAN_KENH[n.kenh] ?? n.kenh}{n.ten_chien_dich ? ` – ${n.ten_chien_dich}` : ""}</option>)}
          </select>
        </Truong>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={dong}>Hủy</button>
          <button className="btn" disabled={dang}>{dang ? "Đang lưu…" : "Lưu hồ sơ"}</button>
        </div>
      </form>
    </Dialog>
  );
}
