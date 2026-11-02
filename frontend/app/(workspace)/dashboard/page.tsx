"use client";

import Link from "next/link";
import { useAuth } from "@/src/lib/auth";
import { cuoiNgayIso, dauNgayIso, ngayVN } from "@/src/lib/formatters";
import { NHAN_CO_HOI } from "@/src/lib/labels";
import { useApi } from "@/src/lib/use-api";
import { Loi, TieuDeTrang, Trong } from "@/src/components/ui";
import { layDanhSachLich } from "@/src/features/appointments/api";
import { BangLichHen } from "@/src/features/appointments/BangLichHen";
import { layDanhSachCoHoi } from "@/src/features/opportunities/api";
import { layDanhSachViec } from "@/src/features/tasks/api";
import { DanhSachViec } from "@/src/features/tasks/DanhSachViec";

const DANG_XU_LY = ["moi", "dang_tu_van", "da_hen", "da_kham"];

export default function Dashboard() {
  const { user, can } = useAuth();
  const homNay = ngayVN();
  const coViec = can("cong_viec", "xem");
  const coLich = can("lich_hen", "xem");
  const coCoHoi = can("co_hoi", "xem");

  const viec = useApi(async () => {
    if (!coViec) return null;
    const [dsViec, tre] = await Promise.all([
      layDanhSachViec({ cuaToi: true, trangThai: "cho_lam", pageSize: 8 }),
      layDanhSachViec({ cuaToi: true, quaHan: true, pageSize: 1 }),
    ]);
    const dangLam = await layDanhSachViec({ cuaToi: true, trangThai: "dang_lam", pageSize: 1 });
    return { dsViec, soTre: tre.total, soDangLam: dangLam.total };
  }, [coViec]);

  const lich = useApi(async () => (coLich ? layDanhSachLich({ from: dauNgayIso(homNay), to: cuoiNgayIso(homNay), pageSize: 20 }) : null), [coLich, homNay]);

  const coHoi = useApi(async () => {
    if (!coCoHoi) return null;
    const kq = await Promise.all(DANG_XU_LY.map((t) => layDanhSachCoHoi({ trangThai: t, pageSize: 1 })));
    return DANG_XU_LY.map((t, i) => ({ t, n: kq[i].total }));
  }, [coCoHoi]);

  const lichConHen = lich.data?.items.filter((l) => !["huy", "da_doi_lich"].includes(l.trang_thai)) ?? [];

  return (
    <>
      <TieuDeTrang tieuDe={`Xin chào, ${user?.hoTen}`} phu="Việc cần làm và lịch hẹn hôm nay." />
      <Loi>{viec.loi || lich.loi || coHoi.loi}</Loi>

      <div className="stats">
        {coViec && (
          <>
            <Link className={`stat${(viec.data?.soTre ?? 0) > 0 ? " warn" : ""}`} href="/tasks"><b>{viec.data?.soTre ?? "…"}</b><span>Việc quá hạn</span></Link>
            <Link className="stat" href="/tasks"><b>{viec.data ? viec.data.dsViec.total + viec.data.soDangLam : "…"}</b><span>Việc chưa xong của tôi</span></Link>
          </>
        )}
        {coLich && <Link className="stat" href="/appointments"><b>{lich.data ? lichConHen.length : "…"}</b><span>Lịch hẹn hôm nay</span></Link>}
        {coCoHoi && <Link className="stat" href="/opportunities"><b>{coHoi.data ? coHoi.data.reduce((a, x) => a + x.n, 0) : "…"}</b><span>Cơ hội đang xử lý</span></Link>}
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
