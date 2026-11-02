"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/src/lib/auth";
import { khoangTien, ngay, ngayGio } from "@/src/lib/formatters";
import { NHAN_KENH, nhan } from "@/src/lib/labels";
import { useApi } from "@/src/lib/use-api";
import { TrangThaiCoHoi } from "@/src/components/tags";
import { Loi, TieuDeTrang, Trong } from "@/src/components/ui";
import { layDanhSachLich } from "@/src/features/appointments/api";
import { BangLichHen } from "@/src/features/appointments/BangLichHen";
import { layKhach } from "@/src/features/customers/api";
import { CustomerFormDialog } from "@/src/features/customers/CustomerFormDialog";
import { DongYPanel } from "@/src/features/consents/DongYPanel";
import { layDanhSachTuongTac } from "@/src/features/interactions/api";
import { DanhSachTuongTac } from "@/src/features/interactions/DanhSachTuongTac";
import { TuongTacFormDialog } from "@/src/features/interactions/TuongTacFormDialog";
import { CoHoiFormDialog } from "@/src/features/opportunities/CoHoiFormDialog";
import { layDanhSachViec } from "@/src/features/tasks/api";
import { DanhSachViec } from "@/src/features/tasks/DanhSachViec";
import { ViecFormDialog } from "@/src/features/tasks/ViecFormDialog";

export default function CustomerDetail() {
  const { customerId } = useParams<{ customerId: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const [sua, setSua] = useState(false);
  const [taoCoHoi, setTaoCoHoi] = useState(false);
  const [taoViec, setTaoViec] = useState(false);
  const [taoTT, setTaoTT] = useState(false);

  const kh = useApi(() => layKhach(customerId), [customerId]);
  const tt = useApi(() => (can("tuong_tac", "xem") ? layDanhSachTuongTac({ khachHangId: customerId, pageSize: 20 }) : Promise.resolve(null)), [customerId]);
  const viec = useApi(() => (can("cong_viec", "xem") ? layDanhSachViec({ khachHangId: customerId, pageSize: 50 }) : Promise.resolve(null)), [customerId]);
  const lich = useApi(() => (can("lich_hen", "xem") ? layDanhSachLich({ khachHangId: customerId, pageSize: 50 }) : Promise.resolve(null)), [customerId]);

  if (kh.loi) return <><Loi>{kh.loi}</Loi><Link href="/customers">← Về danh sách khách hàng</Link></>;
  const k = kh.data;
  if (!k) return <p className="muted">Đang tải…</p>;

  return (
    <>
      <TieuDeTrang tieuDe={k.ho_ten} phu={[k.so_dien_thoai, k.email].filter(Boolean).join(" · ") || "Chưa có thông tin liên hệ"}>
        {can("khach_hang", "sua") && <button className="btn btn-ghost" onClick={() => setSua(true)}>Sửa hồ sơ</button>}
        {can("co_hoi", "them") && <button className="btn" onClick={() => setTaoCoHoi(true)}>Tạo cơ hội</button>}
      </TieuDeTrang>

      <div className="record-summary" id="tong-quan" aria-label="Tổng quan hồ sơ khách hàng">
        <div><span>Cơ hội dịch vụ</span><b>{k.co_hoi?.length ?? 0}</b></div>
        {lich.data && <div><span>Lịch hẹn</span><b>{lich.data.total}</b></div>}
        {tt.data && <div><span>Lần liên hệ</span><b>{tt.data.total}</b></div>}
        {viec.data && <div><span>Công việc</span><b>{viec.data.total}</b></div>}
      </div>

      <nav className="record-nav" aria-label="Các phần của hồ sơ khách hàng">
        <a href="#tong-quan">Tổng quan</a>
        {k.co_hoi && <a href="#co-hoi">Cơ hội</a>}
        {lich.data && <a href="#lich-hen">Lịch hẹn</a>}
        {tt.data && <a href="#lien-he">Tương tác</a>}
        <a href="#thong-tin">Thông tin</a>
        <a href="#dong-y">Đồng ý</a>
        {viec.data && <a href="#cong-viec">Công việc</a>}
      </nav>

      <div className="cols">
        <div className="stack">
          {k.co_hoi && (
            <section className="panel" id="co-hoi">
              <div className="panel-head"><h2>Cơ hội dịch vụ</h2></div>
              {k.co_hoi.length === 0 ? (
                <Trong>Khách chưa có cơ hội nào.</Trong>
              ) : (
                <ul className="rows">
                  {k.co_hoi.map((c) => (
                    <li key={c.co_hoi_id}>
                      <div className="top">
                        <Link href={`/opportunities/${c.co_hoi_id}`}><b>Cơ hội ngày {ngay(c.ngay_tiep_nhan)}</b></Link>
                        <TrangThaiCoHoi v={c.trang_thai} />
                      </div>
                      <div className="muted small">{[c.mong_muon, (c.ngan_sach_tu || c.ngan_sach_den) && `Ngân sách ${khoangTien(c.ngan_sach_tu, c.ngan_sach_den)}`].filter(Boolean).join(" · ")}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {lich.data && (
            <section className="panel" id="lich-hen">
              <div className="panel-head"><h2>Lịch hẹn</h2></div>
              {lich.data.items.length === 0 ? <Trong>Chưa có lịch hẹn. Đặt lịch từ trang chi tiết cơ hội.</Trong> : <BangLichHen ds={lich.data.items} tai={lich.tai} hienKhach={false} />}
            </section>
          )}
          {tt.data && (
            <section className="panel" id="lien-he">
              <div className="panel-head">
                <h2>Lịch sử liên hệ</h2>
                {can("tuong_tac", "them") && <button className="btn btn-ghost btn-sm" onClick={() => setTaoTT(true)}>Ghi nhận liên hệ</button>}
              </div>
              {tt.data.items.length === 0 ? <Trong>Chưa ghi nhận lần liên hệ nào.</Trong> : <DanhSachTuongTac ds={tt.data.items} />}
            </section>
          )}
        </div>

        <div className="stack">
          <DongYPanel khachId={k.khach_hang_id} />
          <section className="panel" id="thong-tin">
            <div className="panel-head"><h2>Thông tin</h2></div>
            <dl className="kv">
              <dt>Điện thoại</dt><dd>{k.so_dien_thoai ?? "—"}</dd>
              <dt>Email</dt><dd>{k.email ?? "—"}</dd>
              <dt>Zalo</dt><dd>{k.zalo_id ?? "—"}</dd>
              <dt>Ngày sinh</dt><dd>{ngay(k.ngay_sinh)}</dd>
              <dt>Khu vực</dt><dd>{k.khu_vuc ?? "—"}</dd>
              <dt>Kênh ưu tiên</dt><dd>{nhan(NHAN_KENH, k.kenh_lien_he_uu_tien)}</dd>
              <dt>Khung giờ</dt><dd>{k.khung_gio_lien_he ?? "—"}</dd>
              <dt>Tạo lúc</dt><dd>{ngayGio(k.ngay_tao)}</dd>
            </dl>
          </section>
          {viec.data && (
            <section className="panel" id="cong-viec">
              <div className="panel-head">
                <h2>Công việc</h2>
                {can("cong_viec", "them") && <button className="btn btn-ghost btn-sm" onClick={() => setTaoViec(true)}>Thêm việc</button>}
              </div>
              {viec.data.items.length === 0 ? <Trong>Chưa có công việc nào.</Trong> : <DanhSachViec ds={viec.data.items} tai={viec.tai} hienKhach={false} />}
            </section>
          )}
        </div>
      </div>

      <CustomerFormDialog mo={sua} dong={() => setSua(false)} khach={k} xong={() => void kh.tai()} />
      <CoHoiFormDialog mo={taoCoHoi} dong={() => setTaoCoHoi(false)} khachHangId={k.khach_hang_id} xong={(c) => router.push(`/opportunities/${c.co_hoi_id}`)} />
      <ViecFormDialog mo={taoViec} dong={() => setTaoViec(false)} khachHangId={k.khach_hang_id} xong={() => void viec.tai()} />
      <TuongTacFormDialog mo={taoTT} dong={() => setTaoTT(false)} khachHangId={k.khach_hang_id} xong={() => void tt.tai()} />
    </>
  );
}
