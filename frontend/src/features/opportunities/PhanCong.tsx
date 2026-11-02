"use client";

import { useState } from "react";
import { loiToiThongBao } from "@/src/lib/api-client";
import { useApi } from "@/src/lib/use-api";
import { Loi } from "@/src/components/ui";
import { layNhanVien } from "../catalogs/api";
import { phanCongCoHoi } from "./api";
import type { CoHoiChiTiet } from "./types";

export function PhanCong({ co, tai }: { co: CoHoiChiTiet; tai: () => void }) {
  const ds = useApi(() => layNhanVien(), []);
  const [chon, setChon] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);

  async function gui() {
    setDang(true);
    setLoi("");
    try {
      await phanCongCoHoi(co.co_hoi_id, chon);
      setChon("");
      tai();
    } catch (e) {
      setLoi(loiToiThongBao(e));
    } finally {
      setDang(false);
    }
  }

  return (
    <div>
      <Loi>{loi}</Loi>
      <div className="btn-row">
        <select className="input" style={{ maxWidth: 240 }} value={chon} onChange={(e) => setChon(e.target.value)} aria-label="Chọn tư vấn viên">
          <option value="">Giao cho…</option>
          {(ds.data ?? []).filter((n) => n.nhan_vien_id !== co.tu_van_vien_id).map((n) => <option key={n.nhan_vien_id} value={n.nhan_vien_id}>{n.ho_ten}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" disabled={!chon || dang} onClick={() => void gui()}>Giao</button>
      </div>
    </div>
  );
}
