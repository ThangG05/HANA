"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/src/lib/auth";
import { loiToiThongBao } from "@/src/lib/api-client";
import { ngayGio } from "@/src/lib/formatters";
import { useApi } from "@/src/lib/use-api";
import { Dialog, Loi, Nhan, Trong, Truong } from "@/src/components/ui";
import { layHoSoKham, layKhamTheoCoHoi, suaLanKham, taoLanKham } from "./api";
import type { NhapKham } from "./types";

const TRUONG: Array<[keyof NhapKham, string]> = [
  ["tienSu", "Tiền sử"], ["diUng", "Dị ứng"], ["ketQuaThamKham", "Kết quả thăm khám"],
  ["phuongAnDeXuat", "Phương án đề xuất"], ["ketLuanDieuKien", "Kết luận / điều kiện thực hiện"], ["maHoSoYKhoaNgoai", "Mã hồ sơ bệnh án ngoài"],
];

/** Danh sách lần khám của một cơ hội. Nội dung y khoa chỉ mở cho người có quyền hồ sơ khám. */
export function KhamPanel({ coHoiId, ketThuc, xong }: { coHoiId: string; ketThuc: boolean; xong: () => void }) {
  const { can } = useAuth();
  const ds = useApi(() => layKhamTheoCoHoi(coHoiId), [coHoiId]);
  const [form, setForm] = useState<{ id?: string } | null>(null);
  const duocThem = can("ho_so_kham", "them") && !ketThuc;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Lần khám</h2>
        {duocThem && <button className="btn btn-ghost btn-sm" onClick={() => setForm({})}>Ghi lần khám</button>}
      </div>
      <Loi>{ds.loi}</Loi>
      {ds.data && ds.data.length === 0 && <Trong>Chưa có lần khám nào. Bác sĩ ghi lần khám sau khi khám xong để tư vấn viên lập báo giá.</Trong>}
      <ul className="rows">
        {(ds.data ?? []).map((k) => (
          <li key={k.tham_kham_id}>
            <div className="top">
              <b>{k.bac_si ?? "Bác sĩ"}</b>
              <span className="when">{ngayGio(k.thoi_diem_kham)}</span>
            </div>
            <div className="muted small">
              {k.xem_duoc_y_khoa
                ? can("ho_so_kham", "sua") && <button className="btn btn-ghost btn-sm" onClick={() => setForm({ id: k.tham_kham_id })}>Mở hồ sơ</button>
                : <Nhan ten="Nội dung y khoa chỉ bác sĩ xem được" />}
            </div>
          </li>
        ))}
      </ul>
      <KhamFormDialog key={form?.id ?? "moi"} mo={!!form} id={form?.id} coHoiId={coHoiId} dong={() => setForm(null)} xong={() => { void ds.tai(); xong(); }} />
    </section>
  );
}

function KhamFormDialog({ mo, id, coHoiId, dong, xong }: { mo: boolean; id?: string; coHoiId: string; dong: () => void; xong: () => void }) {
  const [v, setV] = useState<NhapKham>({});
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);

  useEffect(() => {
    if (!mo) return;
    setV({}); setLoi("");
    if (!id) return;
    layHoSoKham(id).then((h) => setV({
      tienSu: h.tien_su ?? "", diUng: h.di_ung ?? "", ketQuaThamKham: h.ket_qua_tham_kham ?? "",
      phuongAnDeXuat: h.phuong_an_de_xuat ?? "", ketLuanDieuKien: h.ket_luan_dieu_kien ?? "", maHoSoYKhoaNgoai: h.ma_ho_so_y_khoa_ngoai ?? "",
    })).catch((e) => setLoi(loiToiThongBao(e)));
  }, [mo, id]);

  async function gui(e: FormEvent) {
    e.preventDefault();
    setDang(true); setLoi("");
    try {
      if (id) await suaLanKham(id, v); else await taoLanKham({ ...v, coHoiId });
      xong(); dong();
    } catch (err) { setLoi(loiToiThongBao(err)); } finally { setDang(false); }
  }

  return (
    <Dialog mo={mo} dong={dong} tieuDe={id ? "Hồ sơ lần khám" : "Ghi lần khám"} rong>
      <form className="form" onSubmit={gui}>
        <div className="field-full"><Loi>{loi}</Loi></div>
        {TRUONG.map(([k, ten]) => (
          <Truong key={k} nhan={ten} rong={k !== "maHoSoYKhoaNgoai"}>
            {k === "maHoSoYKhoaNgoai"
              ? <input maxLength={100} value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
              : <textarea rows={3} maxLength={5000} value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} />}
          </Truong>
        ))}
        <p className="muted small field-full">Mỗi lần mở hoặc sửa hồ sơ đều được ghi nhật ký truy cập. Hồ sơ không sửa được sau khi có báo giá đã gửi cho khách.</p>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={dong}>Đóng</button>
          <button className="btn" disabled={dang}>{dang ? "Đang lưu…" : "Lưu hồ sơ"}</button>
        </div>
      </form>
    </Dialog>
  );
}
