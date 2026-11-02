import { api } from "@/src/lib/api-client";
import type { Trang } from "@/src/lib/types";
import type { CongViec, NhapCongViec } from "./types";

export const layDanhSachViec = (q: { trangThai?: string; cuaToi?: boolean; quaHan?: boolean; khachHangId?: string; page?: number; pageSize?: number }) => api<Trang<CongViec>>("/tasks", { query: q });
export const taoViec = (b: NhapCongViec) => api<CongViec>("/tasks", { method: "POST", body: b });
export const suaViec = (id: string, b: { trangThai?: string; ketQua?: string; hanHoanThanh?: string; noiDung?: string }) => api<CongViec>(`/tasks/${id}`, { method: "PATCH", body: b });
