import { api } from "@/src/lib/api-client";
import type { BaoGia, DongNhap } from "./types";

export const layBaoGiaTheoCoHoi = (coHoiId: string) => api<BaoGia[]>(`/opportunities/${coHoiId}/quotes`);
export const taoBaoGia = (b: { coHoiId: string; thamKhamId: string; hieuLucDen?: string; hangMuc: DongNhap[] }) => api<BaoGia>("/quotes", { method: "POST", body: b });
export const suaBaoGia = (id: string, b: { thamKhamId?: string; hieuLucDen?: string; hangMuc?: DongNhap[] }) => api<BaoGia>(`/quotes/${id}`, { method: "PATCH", body: b });
export const taoPhienBanMoi = (id: string) => api<BaoGia>(`/quotes/${id}/new-version`, { method: "POST" });
export const guiBaoGia = (id: string) => api<BaoGia>(`/quotes/${id}/send`, { method: "POST" });
export const chapNhanBaoGia = (id: string) => api<BaoGia>(`/quotes/${id}/accept`, { method: "POST" });
export const huyBaoGia = (id: string) => api<BaoGia>(`/quotes/${id}/cancel`, { method: "POST" });
