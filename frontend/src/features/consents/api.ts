import { api } from "@/src/lib/api-client";
import type { DongY, GhiDongY } from "./types";

export const layDongY = (khachId: string) => api<DongY[]>(`/customers/${khachId}/consents`);
export const ghiDongY = (khachId: string, b: GhiDongY) => api<DongY>(`/customers/${khachId}/consents`, { method: "POST", body: b });
export const rutLaiDongY = (khachId: string, id: string) => api<DongY>(`/customers/${khachId}/consents/${id}/revoke`, { method: "POST" });
