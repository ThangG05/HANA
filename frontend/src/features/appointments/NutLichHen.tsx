"use client";

import { useState } from "react";
import { useAuth } from "@/src/lib/auth";
import { loiToiThongBao } from "@/src/lib/api-client";
import { NHAN_LICH_HEN, nhan } from "@/src/lib/labels";
import { ReasonDialog } from "@/src/components/ReasonDialog";
import { doiTrangThaiLich } from "./api";
import { LICH_HEN_CHUYEN_DUOC, LICH_HEN_CON_HIEU_LUC } from "./transitions";
import type { LichHen } from "./types";

const NHAN_NUT: Record<string, string> = { da_xac_nhan: "Xác nhận", da_den: "Khách đã đến", hoan_thanh: "Hoàn thành", huy: "Hủy lịch", khong_den: "Không đến" };

export function NutLichHen({ lich, tai, doiLich, baoLoi }: { lich: LichHen; tai: () => void; doiLich: (l: LichHen) => void; baoLoi: (m: string) => void }) {
  const { can } = useAuth();
  const [huy, setHuy] = useState(false);
  if (!can("lich_hen", "sua")) return null;
  const tiep = LICH_HEN_CHUYEN_DUOC[lich.trang_thai] ?? [];

  return (
    <div className="btn-row">
      {tiep.map((t) =>
        t === "huy" ? (
          <button key={t} className="btn btn-danger btn-sm" onClick={() => setHuy(true)}>{NHAN_NUT[t]}</button>
        ) : (
          <button
            key={t}
            className="btn btn-ghost btn-sm"
            title={nhan(NHAN_LICH_HEN, t)}
            onClick={() => doiTrangThaiLich(lich.lich_hen_id, t).then(tai).catch((e) => baoLoi(loiToiThongBao(e)))}
          >
            {NHAN_NUT[t] ?? nhan(NHAN_LICH_HEN, t)}
          </button>
        ),
      )}
      {LICH_HEN_CON_HIEU_LUC.includes(lich.trang_thai) && <button className="btn btn-ghost btn-sm" onClick={() => doiLich(lich)}>Đổi lịch</button>}
      <ReasonDialog
        mo={huy}
        dong={() => setHuy(false)}
        tieuDe="Hủy lịch hẹn"
        nhan="Lý do hủy"
        batBuoc
        nutXacNhan="Hủy lịch"
        xacNhan={async (lyDo) => { await doiTrangThaiLich(lich.lich_hen_id, "huy", lyDo); tai(); }}
      />
    </div>
  );
}
