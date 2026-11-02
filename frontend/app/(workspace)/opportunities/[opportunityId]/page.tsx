"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/src/lib/auth";
import { khoangTien, ngay, ngayGio } from "@/src/lib/formatters";
import { NHAN_CO_HOI, nhan } from "@/src/lib/labels";
import { useApi } from "@/src/lib/use-api";
import { TrangThaiCoHoi } from "@/src/components/tags";
import { Loi, TieuDeTrang, Trong } from "@/src/components/ui";
import { layDanhSachLich } from "@/src/features/appointments/api";
import { BangLichHen } from "@/src/features/appointments/BangLichHen";
import { LichHenFormDialog } from "@/src/features/appointments/LichHenFormDialog";
import { layDanhSachTuongTac } from "@/src/features/interactions/api";
import { DanhSachTuongTac } from "@/src/features/interactions/DanhSachTuongTac";
import { TuongTacFormDialog } from "@/src/features/interactions/TuongTacFormDialog";
import { layCoHoi } from "@/src/features/opportunities/api";
import { HanhTrinh } from "@/src/features/opportunities/HanhTrinh";
import { PhanCong } from "@/src/features/opportunities/PhanCong";
import { KhamPanel } from "@/src/features/consultations/KhamPanel";
import { ChamSocPanel } from "@/src/features/care/ChamSocPanel";
import { CaPanel } from "@/src/features/procedures/CaPanel";
import { ThanhToanPanel } from "@/src/features/payments/ThanhToanPanel";
import { BaoGiaPanel } from "@/src/features/quotes/BaoGiaPanel";
import { layDanhSachViec } from "@/src/features/tasks/api";
import { DanhSachViec } from "@/src/features/tasks/DanhSachViec";
import { ViecFormDialog } from "@/src/features/tasks/ViecFormDialog";

const KET_THUC = ["hoan_tat", "ngung_cham_soc"];

export default function OpportunityDetail() {
  const { opportunityId } = useParams<{ opportunityId: string }>();
  const { can } = useAuth();
  const [datLich, setDatLich] = useState(false);
  const [taoViec, setTaoViec] = useState(false);
  const [taoTT, setTaoTT] = useState(false);

  const co = useApi(() => layCoHoi(opportunityId), [opportunityId]);
  const lich = useApi(() => (can("lich_hen", "xem") ? layDanhSachLich({ coHoiId: opportunityId, pageSize: 50 }) : Promise.resolve(null)), [opportunityId]);
  const tt = useApi(() => (can("tuong_tac", "xem") ? layDanhSachTuongTac({ coHoiId: opportunityId, pageSize: 20 }) : Promise.resolve(null)), [opportunityId]);
  // API công việc lọc theo khách hàng; lọc tiếp theo cơ hội ở đây.
  const khachId = co.data?.khach_hang_id;
  const viec = useApi(async () => {
    if (!khachId || !can("cong_viec", "xem")) return null;
    const r = await layDanhSachViec({ khachHangId: khachId, pageSize: 100 });
    return r.items.filter((v) => v.co_hoi_id === opportunityId);
  }, [khachId, opportunityId]);

  if (co.loi) return <><Loi>{co.loi}</Loi><Link href="/opportunities">← Về danh sách cơ hội</Link></>;
  const c = co.data;
  if (!c) return <p className="muted">Đang tải…</p>;
  const ketThuc = KET_THUC.includes(c.trang_thai);

  return (
    <>
      <TieuDeTrang tieuDe={c.khach_hang?.ho_ten ?? "Cơ hội"} phu={`${c.dich_vu?.ten_dich_vu ?? ""} · tiếp nhận ${ngay(c.ngay_tiep_nhan)}`}>
        <TrangThaiCoHoi v={c.trang_thai} />
        <Link className="btn btn-ghost" href={`/customers/${c.khach_hang_id}`}>Hồ sơ khách</Link>
      </TieuDeTrang>

      <nav className="record-nav" aria-label="Quy trình dịch vụ">
        {lich.data && <a href="#lich-hen">Lịch hẹn</a>}
        {can("co_hoi", "xem") && <a href="#tham-kham">Thăm khám</a>}
        {can("bao_gia", "xem") && <a href="#bao-gia">Báo giá</a>}
        {can("ca_thuc_hien", "xem") && <a href="#ca-thuc-hien">Thực hiện</a>}
        {can("thanh_toan", "xem") && <a href="#thanh-toan">Thanh toán</a>}
        {can("co_hoi", "xem") && <a href="#cham-soc">Chăm sóc</a>}
      </nav>

      <section className="panel">
        <HanhTrinh co={c} tai={() => void co.tai()} />
      </section>

      <div className="cols" style={{ marginTop: 16 }}>
        <div className="stack">
          {lich.data && (
            <section className="panel" id="lich-hen">
              <div className="panel-head">
                <h2>Lịch hẹn</h2>
                {can("lich_hen", "them") && !ketThuc && <button className="btn btn-ghost btn-sm" onClick={() => setDatLich(true)}>Đặt lịch</button>}
              </div>
              {lich.data.items.length === 0 ? <Trong>Chưa có lịch hẹn cho cơ hội này.</Trong> : <BangLichHen ds={lich.data.items} tai={() => { void lich.tai(); void co.tai(); }} hienKhach={false} />}
            </section>
          )}
          {can("co_hoi", "xem") && <div id="tham-kham"><KhamPanel coHoiId={c.co_hoi_id} ketThuc={ketThuc} xong={() => void co.tai()} /></div>}
          {can("bao_gia", "xem") && <div id="bao-gia"><BaoGiaPanel coHoiId={c.co_hoi_id} ketThuc={ketThuc} xong={() => void co.tai()} /></div>}
          {can("ca_thuc_hien", "xem") && <div id="ca-thuc-hien"><CaPanel coHoiId={c.co_hoi_id} xong={() => void co.tai()} /></div>}
          {can("co_hoi", "xem") && <div id="cham-soc"><ChamSocPanel coHoiId={c.co_hoi_id} xong={() => void co.tai()} /></div>}
          {can("thanh_toan", "xem") && <div id="thanh-toan"><ThanhToanPanel coHoiId={c.co_hoi_id} xong={() => void co.tai()} /></div>}
          {viec.data && (
            <section className="panel">
              <div className="panel-head">
                <h2>Công việc</h2>
                {can("cong_viec", "them") && <button className="btn btn-ghost btn-sm" onClick={() => setTaoViec(true)}>Thêm việc</button>}
              </div>
              {viec.data.length === 0 ? <Trong>Chưa có công việc nào cho cơ hội này.</Trong> : <DanhSachViec ds={viec.data} tai={() => void viec.tai()} hienKhach={false} />}
            </section>
          )}
          {tt.data && (
            <section className="panel">
              <div className="panel-head">
                <h2>Lịch sử liên hệ</h2>
                {can("tuong_tac", "them") && <button className="btn btn-ghost btn-sm" onClick={() => setTaoTT(true)}>Ghi nhận liên hệ</button>}
              </div>
              {tt.data.items.length === 0 ? <Trong>Chưa ghi nhận lần liên hệ nào.</Trong> : <DanhSachTuongTac ds={tt.data.items} />}
            </section>
          )}
        </div>

        <div className="stack">
          <section className="panel">
            <div className="panel-head"><h2>Thông tin</h2></div>
            <dl className="kv">
              <dt>Dịch vụ</dt><dd>{c.dich_vu?.ten_dich_vu ?? "—"}</dd>
              <dt>Mong muốn</dt><dd>{c.mong_muon ?? "—"}</dd>
              <dt>Ngân sách</dt><dd>{khoangTien(c.ngan_sach_tu, c.ngan_sach_den)}</dd>
              <dt>Dự kiến</dt><dd>{ngay(c.thoi_diem_du_kien)}</dd>
              <dt>Tư vấn viên</dt><dd>{c.tu_van_vien?.ho_ten ?? "Chưa giao"}</dd>
              <dt>Điện thoại</dt><dd>{c.khach_hang?.so_dien_thoai ?? "—"}</dd>
            </dl>
            {can("co_hoi", "duyet") && !ketThuc && (
              <div style={{ marginTop: 14 }}>
                <p className="muted small" style={{ marginBottom: 6 }}>Giao lại cho tư vấn viên khác</p>
                <PhanCong co={c} tai={() => void co.tai()} />
              </div>
            )}
          </section>
          <section className="panel">
            <div className="panel-head"><h2>Lịch sử trạng thái</h2></div>
            <ul className="rows">
              {[...c.lich_su].reverse().map((l) => (
                <li key={l.lich_su_id}>
                  <div className="top">
                    <b>{l.trang_thai_cu ? `${nhan(NHAN_CO_HOI, l.trang_thai_cu)} → ` : ""}{nhan(NHAN_CO_HOI, l.trang_thai_moi)}</b>
                    <span className="when">{ngayGio(l.thoi_diem)}</span>
                  </div>
                  <div className="muted small">{[l.nguoi_thay_doi, l.ly_do].filter(Boolean).join(" · ")}</div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <LichHenFormDialog mo={datLich} dong={() => setDatLich(false)} coHoiId={c.co_hoi_id} xong={() => { void lich.tai(); void co.tai(); }} />
      <ViecFormDialog mo={taoViec} dong={() => setTaoViec(false)} khachHangId={c.khach_hang_id} coHoiId={c.co_hoi_id} xong={() => void viec.tai()} />
      <TuongTacFormDialog mo={taoTT} dong={() => setTaoTT(false)} khachHangId={c.khach_hang_id} coHoiId={c.co_hoi_id} xong={() => void tt.tai()} />
    </>
  );
}
