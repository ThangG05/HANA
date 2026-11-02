"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useAuth } from "@/src/lib/auth";
import { loiToiThongBao } from "@/src/lib/api-client";
import { ngayGio, quaHan } from "@/src/lib/formatters";
import { LOAI_CONG_VIEC, nhan } from "@/src/lib/labels";
import { TrangThaiViec, UuTien } from "@/src/components/tags";
import { Dialog, Loi, Truong } from "@/src/components/ui";
import { ReasonDialog } from "@/src/components/ReasonDialog";
import { suaViec } from "./api";
import type { CongViec } from "./types";

function HoanThanhDialog({ mo, dong, xong, id }: { mo: boolean; dong: () => void; xong: () => void; id: string }) {
  const [ketQua, setKetQua] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  async function gui(e: FormEvent) {
    e.preventDefault();
    setDang(true);
    setLoi("");
    try {
      await suaViec(id, { trangThai: "hoan_thanh", ketQua: ketQua.trim() });
      setKetQua("");
      xong();
      dong();
    } catch (err) {
      setLoi(loiToiThongBao(err));
    } finally {
      setDang(false);
    }
  }
  return (
    <Dialog mo={mo} dong={dong} tieuDe="Hoàn thành công việc">
      <form className="form" onSubmit={gui}>
        <div className="field-full"><Loi>{loi}</Loi></div>
        <Truong nhan="Kết quả *" rong ghiChu="Ghi rõ kết quả để người sau nắm được. Ví dụ: đã gọi, khách hẹn khám thứ Bảy."><textarea required rows={3} maxLength={1000} value={ketQua} onChange={(e) => setKetQua(e.target.value)} autoFocus /></Truong>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={dong}>Quay lại</button>
          <button className="btn" disabled={dang || !ketQua.trim()}>{dang ? "Đang lưu…" : "Hoàn thành"}</button>
        </div>
      </form>
    </Dialog>
  );
}

function Dong({ v, tai, hienKhach, baoLoi }: { v: CongViec; tai: () => void; hienKhach: boolean; baoLoi: (m: string) => void }) {
  const { can } = useAuth();
  const [xong, setXong] = useState(false);
  const [huy, setHuy] = useState(false);
  const mo = !["hoan_thanh", "huy"].includes(v.trang_thai);
  const tre = quaHan(v.han_hoan_thanh, v.trang_thai);

  return (
    <li>
      <div className="top">
        <span>
          <b>{nhan(LOAI_CONG_VIEC, v.loai_cong_viec)}</b> <TrangThaiViec v={v.trang_thai} /> <UuTien v={v.muc_uu_tien} />
        </span>
        <span className="when" style={tre ? { color: "var(--bad)", fontWeight: 600 } : undefined}>{tre ? "Quá hạn · " : "Hạn "}{ngayGio(v.han_hoan_thanh)}</span>
      </div>
      <div>{v.noi_dung}</div>
      <div className="muted small">
        {hienKhach && v.khach_hang && <><Link href={`/customers/${v.khach_hang_id}`}>{v.khach_hang}</Link> · </>}
        {v.nguoi_phu_trach ?? "Chưa giao"}
        {v.ket_qua && <> · Kết quả: {v.ket_qua}</>}
      </div>
      {mo && can("cong_viec", "sua") && (
        <div className="btn-row" style={{ marginTop: 4 }}>
          {v.trang_thai === "cho_lam" && (
            <button className="btn btn-ghost btn-sm" onClick={() => suaViec(v.cong_viec_id, { trangThai: "dang_lam" }).then(tai).catch((e) => baoLoi(loiToiThongBao(e)))}>Bắt đầu</button>
          )}
          <button className="btn btn-sm" onClick={() => setXong(true)}>Hoàn thành</button>
          <button className="btn btn-danger btn-sm" onClick={() => setHuy(true)}>Hủy việc</button>
        </div>
      )}
      <HoanThanhDialog mo={xong} dong={() => setXong(false)} xong={tai} id={v.cong_viec_id} />
      <ReasonDialog mo={huy} dong={() => setHuy(false)} tieuDe="Hủy công việc" nhan="Lý do" batBuoc={false} nutXacNhan="Hủy việc" xacNhan={async (l) => { await suaViec(v.cong_viec_id, { trangThai: "huy", ketQua: l || undefined }); tai(); }} />
    </li>
  );
}

export function DanhSachViec({ ds, tai, hienKhach = true }: { ds: CongViec[]; tai: () => void; hienKhach?: boolean }) {
  const [loi, setLoi] = useState("");
  return (
    <>
      <Loi>{loi}</Loi>
      <ul className="rows">{ds.map((v) => <Dong key={v.cong_viec_id} v={v} tai={tai} hienKhach={hienKhach} baoLoi={setLoi} />)}</ul>
    </>
  );
}
