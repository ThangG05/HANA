import { api } from "@/src/lib/api-client";
import type { Trang } from "@/src/lib/types";
import type { CoHoi, CoHoiChiTiet, NhapCoHoi } from "./types";

export const layDanhSachCoHoi = (q: { trangThai?: string; khachHangId?: string; page?: number; pageSize?: number }) => api<Trang<CoHoi>>("/opportunities", { query: q });
export const layCoHoi = (id: string) => api<CoHoiChiTiet>(`/opportunities/${id}`);
export const taoCoHoi = (b: NhapCoHoi) => api<CoHoi>("/opportunities", { method: "POST", body: b });
export const doiTrangThaiCoHoi = (id: string, trangThai: string, lyDo?: string) => api<CoHoi>(`/opportunities/${id}/status`, { method: "PATCH", body: { trangThai, lyDo: lyDo || undefined } });
export const phanCongCoHoi = (id: string, tuVanVienId: string) => api<CoHoi>(`/opportunities/${id}/assign`, { method: "PATCH", body: { tuVanVienId } });
