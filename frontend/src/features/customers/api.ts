import { api } from "@/src/lib/api-client";
import type { Trang } from "@/src/lib/types";
import type { KhachHang, KhachHangChiTiet, NhapKhachHang } from "./types";

export const layDanhSachKhach = (q: { q?: string; page?: number; pageSize?: number }) => api<Trang<KhachHang>>("/customers", { query: q });
export const layKhach = (id: string) => api<KhachHangChiTiet>(`/customers/${id}`);
export const taoKhach = (b: NhapKhachHang) => api<KhachHang>("/customers", { method: "POST", body: b });
export const suaKhach = (id: string, b: Partial<NhapKhachHang>) => api<KhachHang>(`/customers/${id}`, { method: "PATCH", body: b });
