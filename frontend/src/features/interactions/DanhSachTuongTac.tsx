import { ngayGio } from "@/src/lib/formatters";
import { NHAN_KENH, nhan } from "@/src/lib/labels";
import type { TuongTac } from "./types";

export function DanhSachTuongTac({ ds }: { ds: TuongTac[] }) {
  return (
    <ul className="rows">
      {ds.map((t) => (
        <li key={t.tuong_tac_id}>
          <div className="top">
            <b>{nhan(NHAN_KENH, t.kenh)} · {t.chieu === "den" ? "Khách liên hệ" : "Nhân viên liên hệ"}</b>
            <span className="when">{ngayGio(t.thoi_diem)}</span>
          </div>
          {t.noi_dung_tom_tat && <div>{t.noi_dung_tom_tat}</div>}
          <div className="muted small">{[t.nhan_vien, t.ket_qua && `Kết quả: ${t.ket_qua}`].filter(Boolean).join(" · ")}</div>
        </li>
      ))}
    </ul>
  );
}
