import { api } from "@/src/lib/api-client";
import type { Ca } from "./types";

export const layCaTheoCoHoi = (coHoiId: string) => api<Ca[]>(`/opportunities/${coHoiId}/procedures`);
export const layCa = (id: string) => api<Ca>(`/procedures/${id}`);
export const taoCa = (b: { baoGiaId: string; chiTietBaoGiaId: string; bacSiId?: string; coSoId?: string; duKienLuc?: string }) => api<Ca>("/procedures", { method: "POST", body: b });
export const doiLichCa = (id: string, b: { duKienLuc?: string; bacSiId?: string; coSoId?: string }) => api<Ca>(`/procedures/${id}`, { method: "PATCH", body: b });
export const hoanCa = (id: string) => api<Ca>(`/procedures/${id}/postpone`, { method: "POST" });
export const huyCa = (id: string) => api<Ca>(`/procedures/${id}/cancel`, { method: "POST" });
export const ghiYKhoaCa = (id: string, b: { kiemTraTruocCa?: string; kyThuatThucHien?: string; huongDanSauCa?: string }) => api<Ca>(`/procedures/${id}/medical`, { method: "PATCH", body: b });
export const batDauCa = (id: string) => api<Ca>(`/procedures/${id}/start`, { method: "POST", body: {} });
export const hoanThanhCa = (id: string) => api<Ca>(`/procedures/${id}/complete`, { method: "POST", body: {} });
