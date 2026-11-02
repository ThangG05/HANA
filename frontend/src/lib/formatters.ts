const MUI_GIO = "Asia/Ho_Chi_Minh";

const dtf = new Intl.DateTimeFormat("vi-VN", { timeZone: MUI_GIO, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
const df = new Intl.DateTimeFormat("vi-VN", { timeZone: MUI_GIO, day: "2-digit", month: "2-digit", year: "numeric" });
const tf = new Intl.DateTimeFormat("vi-VN", { timeZone: MUI_GIO, hour: "2-digit", minute: "2-digit", hour12: false });

/** Giá trị rỗng hoặc không đọc được → "—", để một ô dữ liệu hỏng không làm sập cả trang. */
const dinhDang = (f: Intl.DateTimeFormat, iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : f.format(d);
};
export const ngayGio = (iso?: string | null) => dinhDang(dtf, iso);
export const ngay = (iso?: string | null) => dinhDang(df, iso);
export const gio = (iso?: string | null) => dinhDang(tf, iso);

/** Ô nhập datetime-local ("YYYY-MM-DDTHH:mm", giờ Việt Nam) → ISO có múi giờ để gửi lên API. */
export const nhapSangIso = (v: string) => `${v}:00+07:00`;

/** ISO → giá trị cho ô datetime-local theo giờ Việt Nam. */
export function isoSangNhap(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000);
  return d.toISOString().slice(0, 16);
}

/** "YYYY-MM-DD" của ngày hiện tại (giờ Việt Nam) cộng thêm n ngày. */
export function ngayVN(congNgay = 0): string {
  const d = new Date(Date.now() + 7 * 3600_000 + congNgay * 86400_000);
  return d.toISOString().slice(0, 10);
}
export const dauNgayIso = (yyyyMmDd: string) => `${yyyyMmDd}T00:00:00+07:00`;
export const cuoiNgayIso = (yyyyMmDd: string) => `${yyyyMmDd}T23:59:59+07:00`;

const vnd = new Intl.NumberFormat("vi-VN");
export const tien = (n?: number | string | null) => (n === null || n === undefined || n === "" ? "—" : `${vnd.format(Number(n))} đ`);
export function khoangTien(tu?: number | string | null, den?: number | string | null) {
  if (tu == null && den == null) return "—";
  if (tu != null && den != null) return `${vnd.format(Number(tu))} – ${vnd.format(Number(den))} đ`;
  return tien(tu ?? den);
}

export const quaHan = (iso: string, trangThai: string) => !["hoan_thanh", "huy"].includes(trangThai) && new Date(iso).getTime() < Date.now();
