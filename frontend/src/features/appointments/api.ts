import { api } from "@/src/lib/api-client";
import type { Trang } from "@/src/lib/types";
import type { LichHen, NhapDoiLich, NhapLichHen } from "./types";

export const layDanhSachLich = (q: { from?: string; to?: string; trangThai?: string; coHoiId?: string; khachHangId?: string; page?: number; pageSize?: number }) => api<Trang<LichHen>>("/appointments", { query: q });
export const taoLich = (b: NhapLichHen) => api<LichHen>("/appointments", { method: "POST", body: b });
export const doiTrangThaiLich = (id: string, trangThai: string, lyDo?: string) => api<LichHen>(`/appointments/${id}/status`, { method: "PATCH", body: { trangThai, lyDo: lyDo || undefined } });
export const doiLich = (id: string, b: NhapDoiLich) => api<LichHen>(`/appointments/${id}/reschedule`, { method: "POST", body: b });
