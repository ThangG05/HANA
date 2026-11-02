/**
 * Chuẩn hóa số điện thoại VN. PHẢI khớp hàm SQL public.hana_chuan_hoa_sdt
 * (cột khach_hang.so_dien_thoai_chuan do database tự sinh, KHÔNG được ghi từ code).
 *  - 0901234567      -> 84901234567
 *  - 0084901234567   -> 84901234567
 *  - các dạng khác   -> giữ nguyên phần chữ số
 */
export function chuanHoaSdt(sdt: string | null | undefined): string | null {
  if (sdt == null || sdt.trim() === "") return null;
  const so = sdt.replace(/[^0-9]/g, "");
  if (/^0[0-9]{9}$/.test(so)) return "84" + so.slice(1);
  if (/^0084[0-9]{9}$/.test(so)) return so.slice(2);
  return so === "" ? null : so;
}

/** Dạng dùng để tìm kiếm một phần số điện thoại (người dùng gõ 0901..., 84901..., hoặc vài số cuối). */
export function chuanHoaSdtTimKiem(q: string): string | null {
  const so = q.replace(/[^0-9]/g, "");
  if (so.length < 4) return null;
  if (so.startsWith("00")) return so.slice(2);
  if (so.startsWith("0")) return "84" + so.slice(1);
  return so;
}
