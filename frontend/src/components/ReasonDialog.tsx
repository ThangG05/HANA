"use client";

import { FormEvent, useState } from "react";
import { loiToiThongBao } from "@/src/lib/api-client";
import { Dialog, Loi, Truong } from "./ui";

/** Hộp thoại hỏi lý do/ghi chú trước khi thực hiện một hành động. */
export function ReasonDialog({ mo, dong, tieuDe, nhan, batBuoc, nutXacNhan, xacNhan }: {
  mo: boolean;
  dong: () => void;
  tieuDe: string;
  nhan: string;
  batBuoc: boolean;
  nutXacNhan: string;
  xacNhan: (lyDo: string) => Promise<void>;
}) {
  const [lyDo, setLyDo] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);

  async function gui(e: FormEvent) {
    e.preventDefault();
    if (batBuoc && !lyDo.trim()) return setLoi(`Nhập ${nhan.toLowerCase()} trước khi tiếp tục.`);
    setDang(true);
    setLoi("");
    try {
      await xacNhan(lyDo.trim());
      setLyDo("");
      dong();
    } catch (err) {
      setLoi(loiToiThongBao(err));
    } finally {
      setDang(false);
    }
  }

  return (
    <Dialog mo={mo} dong={dong} tieuDe={tieuDe}>
      <form className="form" onSubmit={gui}>
        <div className="field-full"><Loi>{loi}</Loi></div>
        <Truong nhan={batBuoc ? nhan : `${nhan} (không bắt buộc)`} rong>
          <textarea rows={3} value={lyDo} onChange={(e) => setLyDo(e.target.value)} maxLength={500} autoFocus />
        </Truong>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={dong}>Quay lại</button>
          <button className="btn" disabled={dang}>{dang ? "Đang lưu…" : nutXacNhan}</button>
        </div>
      </form>
    </Dialog>
  );
}
