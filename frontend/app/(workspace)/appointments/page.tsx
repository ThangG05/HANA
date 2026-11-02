"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { useAuth } from "@/src/lib/auth";
import { ngayVN } from "@/src/lib/formatters";
import { NHAN_LICH_HEN } from "@/src/lib/labels";
import { useApi } from "@/src/lib/use-api";
import { DangTai, Loi, PhanTrang, TieuDeTrang, Trong } from "@/src/components/ui";
import { layCoSo } from "@/src/features/catalogs/api";
import { BangLichHen } from "@/src/features/appointments/BangLichHen";
import { layDanhSachLich, layTongQuanLichNgay } from "@/src/features/appointments/api";
import { DatLichNhanh } from "@/src/features/appointments/DatLichNhanh";

const CO_TRANG = 30;
const KHUNG_GIO = ["00:00 – 10:00", "10:00 – 13:00", "13:00 – 17:00", "17:00 – 24:00"];

export default function LichTrongNgay() {
  const { user, can } = useAuth();
  const [ngay, setNgay] = useState(ngayVN());
  const [coSoId, setCoSoId] = useState(user?.coSoId ?? "");
  const [trangThai, setTrangThai] = useState("");
  const [tim, setTim] = useState("");
  const [trang, setTrang] = useState(1);
  const [datLich, setDatLich] = useState(false);
  const tuKhoa = useDeferredValue(tim.trim());
  const coSo = useApi(layCoSo, []);
  const phamViCoSo = user?.quyen.find((q) => q.doi_tuong === "lich_hen" && q.hanh_dong === "xem")?.pham_vi === "co_so";
  const coSoLoc = phamViCoSo ? user?.coSoId : coSoId || undefined;
  const hopLe = /^\d{4}-\d{2}-\d{2}$/.test(ngay);

  const tongQuan = useApi(() => hopLe ? layTongQuanLichNgay(ngay, coSoLoc) : Promise.resolve(null), [ngay, coSoLoc, hopLe]);
  const lich = useApi(() => hopLe ? layDanhSachLich({
    ngay, coSoId: coSoLoc,
    trangThai: trangThai || undefined, q: tuKhoa || undefined, page: trang, pageSize: CO_TRANG,
  }) : Promise.resolve(null), [ngay, coSoLoc, trangThai, tuKhoa, trang, hopLe]);

  const so = tongQuan.data?.theoTrangThai ?? {};
  const chuyenNgay = (soNgay: number) => {
    const d = new Date(`${ngay}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + soNgay);
    setNgay(d.toISOString().slice(0, 10));
    setTrang(1);
  };
  const taiLai = () => { void lich.tai(); void tongQuan.tai(); };

  return (
    <>
      <TieuDeTrang tieuDe="Lịch hẹn trong ngày" phu="Theo dõi tiếp đón, tình trạng đến khám và mở hồ sơ khách từ cùng một màn hình.">
        <Link className="btn btn-ghost" href="/appointments/all">Xem theo khoảng ngày</Link>
        {can("lich_hen", "them") && can("khach_hang", "xem") && can("co_hoi", "xem") && <button className="btn" onClick={() => setDatLich(true)}>Tạo lịch hẹn</button>}
      </TieuDeTrang>

      <div className="day-toolbar">
        <div className="day-date">
          <button className="btn btn-ghost" onClick={() => chuyenNgay(-1)} aria-label="Ngày trước">‹</button>
          <label className="small muted">Ngày <input className="input" type="date" value={ngay} onChange={(e) => { setNgay(e.target.value); setTrang(1); }} /></label>
          <button className="btn btn-ghost" onClick={() => chuyenNgay(1)} aria-label="Ngày sau">›</button>
          <button className="btn btn-ghost" onClick={() => { setNgay(ngayVN()); setTrang(1); }}>Hôm nay</button>
        </div>
        <div className="day-counts" aria-label="Tổng quan lịch hẹn">
          <span><b>{tongQuan.data?.tong ?? "…"}</b> Tổng lịch</span>
          <span><b>{so.da_den ?? 0}</b> Đã đến</span>
          <span><b>{so.huy ?? 0}</b> Đã hủy</span>
          <span><b>{so.khong_den ?? 0}</b> Không đến</span>
        </div>
      </div>

      <div className="day-slots" aria-label="Lịch theo khung giờ">
        {KHUNG_GIO.map((khung, i) => <div className="day-slot" key={khung}><b>{tongQuan.data?.theoKhungGio[i] ?? "…"}</b><span>{khung}</span></div>)}
      </div>

      <div className="toolbar">
        <input className="input" type="search" placeholder="Tìm tên hoặc số điện thoại khách" aria-label="Tìm khách trong lịch" value={tim} onChange={(e) => { setTim(e.target.value); setTrang(1); }} />
        {!phamViCoSo && <select className="input" value={coSoId} aria-label="Lọc theo cơ sở" onChange={(e) => { setCoSoId(e.target.value); setTrang(1); }}>
          <option value="">Mọi cơ sở được phép xem</option>
          {(coSo.data ?? []).map((c) => <option key={c.co_so_id} value={c.co_so_id}>{c.ten_co_so}</option>)}
        </select>}
        <select className="input" value={trangThai} aria-label="Lọc trạng thái lịch" onChange={(e) => { setTrangThai(e.target.value); setTrang(1); }}>
          <option value="">Mọi trạng thái</option>
          {Object.entries(NHAN_LICH_HEN).map(([ma, nhan]) => <option key={ma} value={ma}>{nhan}</option>)}
        </select>
        <button className="btn btn-ghost" onClick={taiLai}>Làm mới</button>
      </div>

      {!hopLe && <Loi>Vui lòng chọn ngày hợp lệ.</Loi>}
      <Loi thuLai={taiLai}>{coSo.loi || tongQuan.loi || lich.loi}</Loi>
      {lich.dangTai && !lich.data && <DangTai soDong={5} />}
      {lich.data && (lich.data.items.length ? <>
        <BangLichHen ds={lich.data.items} tai={taiLai} />
        <PhanTrang trang={trang} tong={lich.data.total} coTrang={CO_TRANG} doi={setTrang} />
      </> : <Trong>Không có lịch hẹn phù hợp trong ngày này.</Trong>)}
      <DatLichNhanh mo={datLich} dong={() => setDatLich(false)} xong={taiLai} />
    </>
  );
}
