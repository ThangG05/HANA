import { api } from "@/src/lib/api-client";
import type { NhapHoan, NhapThu, TienBaoGia } from "./types";

export const layThanhToanTheoCoHoi = (coHoiId: string) => api<TienBaoGia[]>(`/opportunities/${coHoiId}/payments`);
export const thuTien = (b: NhapThu) => api<unknown>("/payments", { method: "POST", body: b });
export const hoanTien = (b: NhapHoan) => api<unknown>("/payments/refunds", { method: "POST", body: b });
export const xacNhanThu = (id: string) => api<unknown>(`/payments/${id}/confirm`, { method: "POST" });
export const huyChoXacNhan = (id: string) => api<unknown>(`/payments/${id}/cancel`, { method: "POST" });
