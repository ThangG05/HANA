import { api } from "@/src/lib/api-client";
import type { Trang } from "@/src/lib/types";
import type { NhapTuongTac, TuongTac } from "./types";

export const layDanhSachTuongTac = (q: { khachHangId?: string; coHoiId?: string; page?: number; pageSize?: number }) => api<Trang<TuongTac>>("/interactions", { query: q });
export const taoTuongTac = (b: NhapTuongTac) => api<TuongTac>("/interactions", { method: "POST", body: b });
