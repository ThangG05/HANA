export type PhamVi = "duoc_giao" | "co_so" | "toan_bo";

export interface Quyen {
  doi_tuong: string;
  hanh_dong: string;
  pham_vi: PhamVi;
}

/** Người dùng đã đăng nhập, được AuthGuard gắn vào request. */
export interface AuthUser {
  id: string; // nhan_vien_id
  hoTen: string;
  coSoId: string | null;
  vaiTro: string[];
  quyen: Quyen[];
}

/** Thứ tự từ phạm vi rộng nhất đến hẹp nhất. */
export const PHAM_VI_RONG_NHAT_TRUOC: PhamVi[] = ["toan_bo", "co_so", "duoc_giao"];

/** Trả về phạm vi rộng nhất mà user có cho (đối tượng, hành động), hoặc null nếu không có quyền. */
export function phamViCua(user: AuthUser, doiTuong: string, hanhDong: string): PhamVi | null {
  const co = user.quyen
    .filter((q) => q.doi_tuong === doiTuong && q.hanh_dong === hanhDong)
    .map((q) => q.pham_vi);
  return PHAM_VI_RONG_NHAT_TRUOC.find((p) => co.includes(p)) ?? null;
}
