import { SetMetadata } from "@nestjs/common";

export const PERMISSION_KEY = "permission";
export const ANY_STAFF_KEY = "anyStaff";

export type HanhDong = "xem" | "them" | "sua" | "xoa" | "xuat" | "duyet";

/** Yêu cầu quyền (đối tượng, hành động). Phạm vi dữ liệu được gắn vào request.phamVi. */
export const RequirePermission = (doiTuong: string, hanhDong: HanhDong) =>
  SetMetadata(PERMISSION_KEY, { doiTuong, hanhDong });

/** Chỉ cần là nhân viên đang hoạt động (ví dụ: danh mục cho ô chọn, xem thông tin của mình). */
export const AllowAnyStaff = () => SetMetadata(ANY_STAFF_KEY, true);
