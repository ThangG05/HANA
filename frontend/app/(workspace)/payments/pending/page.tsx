"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { useAuth } from "@/src/lib/auth";
import { loiToiThongBao } from "@/src/lib/api-client";
import { ngayGio, tien } from "@/src/lib/formatters";
import { useApi } from "@/src/lib/use-api";
import { Loi, PhanTrang, TieuDeTrang, Trong } from "@/src/components/ui";
import { huyChoXacNhan, layChoXacNhan, xacNhanThu } from "@/src/features/payments/api";

const CO_TRANG = 20;

export default function ChoXacNhanPage() {
  const { can } = useAuth();
  const [tim, setTim] = useState("");
  const [trang, setTrang] = useState(1);
  const [dangXuLy, setDangXuLy] = useState<string | null>(null);
  const [loi, setLoi] = useState("");
  const tuKhoa = useDeferredValue(tim.trim());
  const ds = useApi(() => layChoXacNhan({ q: tuKhoa || undefined, page: trang, pageSize: CO_TRANG }), [tuKhoa, trang]);

  async function xuLy(id: string, den: "xac_nhan" | "huy") {
    const cauHoi = den === "xac_nhan"
      ? "Bạn đã kiểm tra khoản tiền thực nhận và muốn xác nhận giao dịch này?"
      : "Hủy khoản chuyển khoản đang chờ này?";
    if (!window.confirm(cauHoi)) return;
    setDangXuLy(id); setLoi("");
    try {
      if (den === "xac_nhan") await xacNhanThu(id); else await huyChoXacNhan(id);
      await ds.tai();
    } catch (e) { setLoi(loiToiThongBao(e)); }
    finally { setDangXuLy(null); }
  }

  return <>
    <TieuDeTrang tieuDe="Chuyển khoản chờ xác nhận" phu="Thu ngân đối chiếu tiền thực nhận trước khi ghi vào công nợ khách hàng." />
    <div className="toolbar">
      <input className="input" type="search" value={tim} onChange={(e) => { setTim(e.target.value); setTrang(1); }} placeholder="Tìm tên hoặc số điện thoại khách" aria-label="Tìm giao dịch" />
      <button className="btn btn-ghost" onClick={() => void ds.tai()}>Làm mới</button>
    </div>
    <Loi>{loi || ds.loi}</Loi>
    {ds.data && (ds.data.items.length ? <>
      <div className="table-wrap"><table><thead><tr><th>Khách hàng</th><th>Dịch vụ</th><th>Thời điểm ghi nhận</th><th>Mã giao dịch</th><th className="right">Số tiền</th><th>Đối soát</th></tr></thead><tbody>
        {ds.data.items.map((g) => <tr key={g.thanh_toan_id}>
          <td><Link href={`/customers/${g.khach_hang.khach_hang_id}`}>{g.khach_hang.ho_ten}</Link><span className="sub">{g.khach_hang.so_dien_thoai ?? "—"}</span></td>
          <td><Link href={`/opportunities/${g.co_hoi_id}#thanh-toan`}>{g.dich_vu ?? "Mở dịch vụ"}</Link></td>
          <td>{ngayGio(g.thoi_diem)}</td>
          <td>{g.ma_giao_dich ?? "—"}<span className="sub">{g.ben_cung_cap ?? ""}</span></td>
          <td className="right"><b>{tien(g.so_tien)}</b></td>
          <td>{can("thanh_toan", "sua") && <div className="actions">
            <button className="btn btn-sm" disabled={!!dangXuLy} onClick={() => void xuLy(g.thanh_toan_id, "xac_nhan")}>Đã nhận tiền</button>
            <button className="btn btn-ghost btn-sm" disabled={!!dangXuLy} onClick={() => void xuLy(g.thanh_toan_id, "huy")}>Hủy</button>
          </div>}</td>
        </tr>)}
      </tbody></table></div>
      <PhanTrang trang={trang} tong={ds.data.total} coTrang={CO_TRANG} doi={setTrang} />
    </> : <Trong>Không có khoản chuyển khoản đang chờ xác nhận.</Trong>)}
  </>;
}
