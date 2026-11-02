import { api } from "@/src/lib/api-client";
import type { HoSoKham, NhapKham, TomTatKham } from "./types";

export const layKhamTheoCoHoi = (coHoiId: string) => api<TomTatKham[]>(`/opportunities/${coHoiId}/examinations`);
export const layHoSoKham = (id: string) => api<HoSoKham>(`/examinations/${id}`);
export const taoLanKham = (b: NhapKham & { coHoiId: string; lichHenId?: string }) => api<HoSoKham>("/examinations", { method: "POST", body: b });
export const suaLanKham = (id: string, b: NhapKham) => api<HoSoKham>(`/examinations/${id}`, { method: "PATCH", body: b });
