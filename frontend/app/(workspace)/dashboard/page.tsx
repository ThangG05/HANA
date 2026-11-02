"use client";

import Link from "next/link";
import { useAuth } from "@/src/lib/auth";
import { AppIcon } from "@/src/components/AppIcon";
import { ngayVN } from "@/src/lib/formatters";
import { NHAN_CO_HOI } from "@/src/lib/labels";
import { useApi } from "@/src/lib/use-api";
import { Loi, Trong } from "@/src/components/ui";
import { layDanhSachLich, layTongQuanLichNgay } from "@/src/features/appointments/api";
import { BangLichHen } from "@/src/features/appointments/BangLichHen";
import { layDanhSachCoHoi } from "@/src/features/opportunities/api";
import { layDanhSachViec } from "@/src/features/tasks/api";
import { DanhSachViec } from "@/src/features/tasks/DanhSachViec";
import { layChoXacNhan } from "@/src/features/payments/api";
import { layCanhBao, layViec } from "@/src/features/care/api";

const DANG_XU_LY = ["moi", "dang_tu_van", "da_hen", "da_kham"];

export default function Dashboard() {
  const { user, can } = useAuth();
  const homNay = ngayVN();
  const coViec = can("cong_viec", "xem");
  const coLich = can("lich_hen", "xem");
  const coCoHoi = can("co_hoi", "xem");
  const coThanhToan = can("thanh_toan", "xem");
  const coChamSoc = can("cham_soc", "xem");
  const coCanhBao = can("canh_bao_y_khoa", "xem");
  const tenNgay = new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(`${homNay}T12:00:00+07:00`));

  const viec = useApi(async () => {
    if (!coViec) return null;
    const [dsViec, tre] = await Promise.all([
      layDanhSachViec({ cuaToi: true, trangThai: "cho_lam", pageSize: 8 }),
      layDanhSachViec({ cuaToi: true, quaHan: true, pageSize: 1 }),
    ]);
    const dangLam = await layDanhSachViec({ cuaToi: true, trangThai: "dang_lam", pageSize: 1 });
    return { dsViec, soTre: tre.total, soDangLam: dangLam.total };
  }, [coViec]);

  const lich = useApi(async () => (coLich ? layDanhSachLich({ ngay: homNay, pageSize: 20 }) : null), [coLich, homNay]);
  const tongQuanLich = useApi(async () => (coLich ? layTongQuanLichNgay(homNay) : null), [coLich, homNay]);

  const coHoi = useApi(async () => {
    if (!coCoHoi) return null;
    const kq = await Promise.all(DANG_XU_LY.map((t) => layDanhSachCoHoi({ trangThai: t, pageSize: 1 })));
    return DANG_XU_LY.map((t, i) => ({ t, n: kq[i].total }));
  }, [coCoHoi]);
  const choXacNhan = useApi(async () => coThanhToan ? layChoXacNhan({ pageSize: 1 }) : null, [coThanhToan]);
  const chamSocTre = useApi(async () => coChamSoc ? layViec("", true, 1) : null, [coChamSoc]);
  const canhBaoMoi = useApi(async () => coCanhBao ? layCanhBao("moi", 1) : null, [coCanhBao]);

  const lichConHen = lich.data?.items.filter((l) => !["huy", "da_doi_lich"].includes(l.trang_thai)) ?? [];

  return (
    <>
      <section className="dashboard-hero" aria-label="Tổng quan hôm nay">
        <div className="dashboard-hero-content"><span className="eyebrow">KHÔNG GIAN LÀM VIỆC · {tenNgay.toLocaleUpperCase("vi-VN")}</span><h1>Xin chào, {user?.hoTen}</h1><p>Hành trình chăm sóc bắt đầu từ những việc cần làm hôm nay.</p><div className="dashboard-hero-actions">{coViec && <Link className="btn hero-btn" href="/tasks">Xem công việc <AppIcon name="arrow" size={16} /></Link>}{coLich && <Link className="hero-link" href="/appointments">Lịch hôm nay <AppIcon name="arrow" size={15} /></Link>}</div></div>
        <div className="hero-art" aria-hidden="true"><i /><i /><i /></div>
      </section>
      <div className="section-intro"><div><span className="eyebrow">TÌNH HÌNH TRONG NGÀY</span><h2>Cần bạn quan tâm</h2></div><span className="muted small">Số liệu trong phạm vi quyền của bạn</span></div>
      <Loi>{viec.loi || lich.loi || tongQuanLich.loi || coHoi.loi || choXacNhan.loi || chamSocTre.loi || canhBaoMoi.loi}</Loi>

      <div className="stats">
        {coViec && (
          <>
            <Link className={`stat${(viec.data?.soTre ?? 0) > 0 ? " warn" : ""}`} href="/tasks"><span>Việc quá hạn</span><b>{viec.data?.soTre ?? "…"}</b><small>Việc của tôi · đến hôm nay</small></Link>
            <Link className="stat" href="/tasks"><span>Việc chưa xong</span><b>{viec.data ? viec.data.dsViec.total + viec.data.soDangLam : "…"}</b><small>Được giao cho tôi</small></Link>
          </>
        )}
        {coLich && <Link className="stat" href="/appointments"><span>Lịch hẹn hôm nay</span><b>{tongQuanLich.data ? tongQuanLich.data.tong - (tongQuanLich.data.theoTrangThai.huy ?? 0) - (tongQuanLich.data.theoTrangThai.da_doi_lich ?? 0) : "…"}</b><small>Không tính lịch đã hủy/đổi</small></Link>}
        {coCoHoi && <Link className="stat" href="/opportunities"><span>Cơ hội đang xử lý</span><b>{coHoi.data ? coHoi.data.reduce((a, x) => a + x.n, 0) : "…"}</b><small>Giai đoạn mới đến đã khám</small></Link>}
        {coThanhToan && <Link className="stat" href="/payments/pending"><span>Chuyển khoản chờ xác nhận</span><b>{choXacNhan.data?.total ?? "…"}</b><small>Cần đối chiếu tiền thực nhận</small></Link>}
        {coChamSoc && <Link className={`stat${(chamSocTre.data?.total ?? 0) > 0 ? " warn" : ""}`} href="/care"><span>Chăm sóc quá hạn</span><b>{chamSocTre.data?.total ?? "…"}</b><small>Mốc chăm sóc chưa hoàn thành</small></Link>}
        {coCanhBao && <Link className={`stat${(canhBaoMoi.data?.total ?? 0) > 0 ? " warn" : ""}`} href="/care"><span>Cảnh báo y khoa mới</span><b>{canhBaoMoi.data?.total ?? "…"}</b><small>Chưa được bác sĩ tiếp nhận</small></Link>}
      </div>

      <div className="cols">
        <div className="stack">
          {coLich && (
            <section className="panel">
              <div className="panel-head"><h2>Lịch hẹn hôm nay</h2><Link href="/appointments">Xem tất cả</Link></div>
              {lich.data && lichConHen.length === 0 ? <Trong>Hôm nay chưa có lịch hẹn nào.</Trong> : lich.data && <BangLichHen ds={lichConHen} tai={lich.tai} />}
            </section>
          )}
          {coViec && (
            <section className="panel">
              <div className="panel-head"><h2>Việc cần làm</h2><Link href="/tasks">Xem tất cả</Link></div>
              {viec.data && viec.data.dsViec.items.length === 0 ? <Trong>Không còn việc nào chờ làm.</Trong> : viec.data && <DanhSachViec ds={viec.data.dsViec.items} tai={viec.tai} />}
            </section>
          )}
        </div>
        {coCoHoi && (
          <section className="panel">
            <div className="panel-head"><h2>Cơ hội theo giai đoạn</h2></div>
            <ul className="rows">
              {(coHoi.data ?? []).map((x) => (
                <li key={x.t}>
                  <div className="top"><Link href={`/opportunities?trangThai=${x.t}`}>{NHAN_CO_HOI[x.t]}</Link><b>{x.n}</b></div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
