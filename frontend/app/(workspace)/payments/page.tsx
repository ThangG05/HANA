"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { ngay, tien } from "@/src/lib/formatters";
import { useApi } from "@/src/lib/use-api";
import { Loi, PhanTrang, TieuDeTrang, Trong } from "@/src/components/ui";
import { laySoCongNo } from "@/src/features/payments/api";

const CO_TRANG = 20;

export default function CongNoPage() {
  const [tim, setTim] = useState("");
  const [trang, setTrang] = useState(1);
  const tuKhoa = useDeferredValue(tim.trim());
  const ds = useApi(() => laySoCongNo({ q: tuKhoa || undefined, page: trang, pageSize: CO_TRANG }), [tuKhoa, trang]);
  return <>
    <TieuDeTrang tieuDe="Công nợ khách hàng" phu="Các báo giá đã được chấp nhận nhưng còn số tiền cần thu." />
    <div className="stats"><div className="stat"><b>{ds.data ? tien(ds.data.tong_con_no) : "…"}</b><span>Tổng còn phải thu trong phạm vi của bạn</span></div><div className="stat"><b>{ds.data?.total ?? "…"}</b><span>Báo giá còn phải thu</span></div></div>
    <div className="toolbar">
      <input className="input" type="search" value={tim} onChange={(e) => { setTim(e.target.value); setTrang(1); }} placeholder="Tìm tên hoặc số điện thoại khách" aria-label="Tìm công nợ" />
      <button className="btn btn-ghost" onClick={() => void ds.tai()}>Làm mới</button>
    </div>
    <Loi>{ds.loi}</Loi>
    {ds.data && (ds.data.items.length ? <>
      <div className="table-wrap"><table><thead><tr><th>Khách hàng</th><th>Dịch vụ</th><th>Báo giá</th><th className="right">Giá trị</th><th className="right">Thực thu</th><th className="right">Còn phải thu</th></tr></thead><tbody>
        {ds.data.items.map((c) => <tr key={c.bao_gia_id}>
          <td><Link href={`/customers/${c.khach_hang.khach_hang_id}`}>{c.khach_hang.ho_ten}</Link><span className="sub">{c.khach_hang.so_dien_thoai ?? "—"}</span></td>
          <td><Link href={`/opportunities/${c.co_hoi_id}#thanh-toan`}>{c.dich_vu ?? "Mở dịch vụ"}</Link></td>
          <td>Phiên bản {c.phien_ban}<span className="sub">{ngay(c.ngay_lap)}</span></td>
          <td className="right">{tien(c.tong_bao_gia)}</td><td className="right">{tien(c.thuc_thu)}</td><td className="right"><b>{tien(c.con_lai)}</b></td>
        </tr>)}
      </tbody></table></div>
      <PhanTrang trang={trang} tong={ds.data.total} coTrang={CO_TRANG} doi={setTrang} />
    </> : <Trong>Không có khoản phải thu phù hợp.</Trong>)}
    <p className="muted small" style={{ marginTop: 12 }}>Số dư dựa trên khoản thu và hoàn tiền đã thành công. Khoản chuyển khoản chờ xác nhận chưa tính vào thực thu.</p>
  </>;
}
