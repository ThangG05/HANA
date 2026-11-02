"use client";

import { useState } from "react";
import { useAuth } from "@/src/lib/auth";
import { loiToiThongBao } from "@/src/lib/api-client";
import { CAN_LY_DO, LUONG_CHINH, NHAN_CO_HOI, nhan } from "@/src/lib/labels";
import { Loi } from "@/src/components/ui";
import { ReasonDialog } from "@/src/components/ReasonDialog";
import { doiTrangThaiCoHoi } from "./api";
import type { CoHoiChiTiet } from "./types";

/** Thanh hành trình + nút chuyển trạng thái. Danh sách bước hợp lệ lấy từ API (chuyen_duoc_den), không tự suy ở UI. */
export function HanhTrinh({ co, tai }: { co: CoHoiChiTiet; tai: () => void }) {
  const { can } = useAuth();
  const [loi, setLoi] = useState("");
  const [dich, setDich] = useState<string | null>(null);
  const [dang, setDang] = useState(false);

  const trongLuong = (LUONG_CHINH as readonly string[]).includes(co.trang_thai);
  // Với trạng thái nhánh (nuôi dưỡng/ngừng), đánh dấu bước chính xa nhất đã đạt trước đó.
  const daDat = trongLuong
    ? (LUONG_CHINH as readonly string[]).indexOf(co.trang_thai)
    : Math.max(0, ...co.lich_su.map((l) => (LUONG_CHINH as readonly string[]).indexOf(l.trang_thai_moi)));

  async function chuyen(trangThai: string, lyDo?: string) {
    setDang(true);
    setLoi("");
    try {
      await doiTrangThaiCoHoi(co.co_hoi_id, trangThai, lyDo);
      tai();
    } finally {
      setDang(false);
    }
  }

  return (
    <div>
      <ol className={`journey${trongLuong ? "" : " off"}`} aria-label="Hành trình khách hàng">
        {LUONG_CHINH.map((b, i) => (
          <li key={b} className={i < daDat ? "done" : i === daDat ? "now" : "todo"} aria-current={trongLuong && i === daDat ? "step" : undefined}>
            {NHAN_CO_HOI[b]}
          </li>
        ))}
      </ol>
      {!trongLuong && (
        <p className="alert alert-warn" style={{ marginTop: 14, marginBottom: 0 }}>
          Cơ hội đang ở trạng thái <b>{nhan(NHAN_CO_HOI, co.trang_thai)}</b>
          {co.ly_do_chua_chot ? `: ${co.ly_do_chua_chot}` : ""}.
        </p>
      )}
      <Loi>{loi}</Loi>
      {can("co_hoi", "sua") && co.chuyen_duoc_den.length > 0 && (
        <div className="btn-row" style={{ marginTop: 16 }}>
          <span className="muted small">Chuyển sang:</span>
          {co.chuyen_duoc_den.map((t) => {
            const phu = CAN_LY_DO.includes(t);
            return (
              <button
                key={t}
                className={`btn btn-sm ${phu ? "btn-ghost" : ""}`}
                disabled={dang}
                onClick={() => (phu ? setDich(t) : void chuyen(t).catch((e) => setLoi(loiToiThongBao(e))))}
              >
                {nhan(NHAN_CO_HOI, t)}
              </button>
            );
          })}
        </div>
      )}
      <ReasonDialog
        mo={dich !== null}
        dong={() => setDich(null)}
        tieuDe={`Chuyển sang “${nhan(NHAN_CO_HOI, dich)}”`}
        nhan="Lý do"
        batBuoc
        nutXacNhan="Xác nhận"
        xacNhan={async (lyDo) => { if (dich) await chuyen(dich, lyDo); }}
      />
    </div>
  );
}
