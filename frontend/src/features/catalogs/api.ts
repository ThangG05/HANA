import { api } from "@/src/lib/api-client";
import type { CoSo, DichVu, NguonKhach, NhanVien } from "./types";

export const layDichVu = () => api<DichVu[]>("/services");
export const layNguon = () => api<NguonKhach[]>("/sources");
export const layCoSo = () => api<CoSo[]>("/facilities");
export const layNhanVien = (role?: string) => api<NhanVien[]>("/staff", { query: { role } });
