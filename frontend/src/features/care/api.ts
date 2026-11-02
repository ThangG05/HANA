import { api } from "@/src/lib/api-client";
import type { CanhBao, ChamSocCoHoi, DanhGia, Mau, MucUuTien, Trang, Viec } from "./types";

export const layChamSocTheoCoHoi = (coHoiId: string) => api<ChamSocCoHoi>(`/opportunities/${coHoiId}/care`);
export const layViec = (trangThai: string, quaHan: boolean, page: number) => api<Trang<Viec>>("/care/tasks", { query: { trangThai: quaHan ? undefined : trangThai || undefined, quaHan: quaHan ? "1" : undefined, page: String(page), pageSize: "20" } });
export const sinhLichChamSoc = (caId: string) => api<{ so_viec_moi: number }>(`/procedures/${caId}/care/generate`, { method: "POST" });
export const nhanViec = (id: string) => api<Viec>(`/care/tasks/${id}/claim`, { method: "POST" });
export const huyViec = (id: string) => api<Viec>(`/care/tasks/${id}/cancel`, { method: "POST" });
export const hoanThanhViec = (id: string, b: { phanHoi: string; huongXuLy?: string; canhBao?: { moTa: string; mucUuTien: MucUuTien } }) => api<Viec>(`/care/tasks/${id}/complete`, { method: "POST", body: b });
export const layCanhBao = (trangThai: string, page: number) => api<Trang<CanhBao>>("/care/alerts", { query: { trangThai: trangThai || undefined, page: String(page), pageSize: "20" } });
export const baoBacSi = (caId: string, b: { moTa: string; mucUuTien: MucUuTien }) => api<CanhBao>(`/procedures/${caId}/alerts`, { method: "POST", body: b });
export const nhanCanhBao = (id: string) => api<CanhBao>(`/care/alerts/${id}/acknowledge`, { method: "POST" });
export const xuLyCanhBao = (id: string, huongXuLy?: string) => api<CanhBao>(`/care/alerts/${id}/handle`, { method: "POST", body: { huongXuLy } });
export const dongCanhBao = (id: string, huongXuLy: string) => api<CanhBao>(`/care/alerts/${id}/close`, { method: "POST", body: { huongXuLy } });
export const danhGiaCa = (caId: string, b: { diem: number; thangDiem?: number; nhanXet?: string }) => api<DanhGia>(`/procedures/${caId}/rating`, { method: "POST", body: b });

export const layMau = () => api<Mau[]>("/care-templates");
export const taoMauNhap = (dichVuId: string) => api<Mau>("/care-templates", { method: "POST", body: { dichVuId } });
export const themMoc = (mauId: string, b: { khoangThoiGian: number; donVi: string; noiDung: string; loaiLienHe: string; vaiTroPhuTrach?: string }) => api<Mau>(`/care-templates/${mauId}/milestones`, { method: "POST", body: b });
export const xoaMoc = (mocId: string) => api<Mau>(`/care-milestones/${mocId}`, { method: "DELETE" });
export const duyetMau = (id: string) => api<Mau>(`/care-templates/${id}/approve`, { method: "POST" });
export const ngungMau = (id: string) => api<Mau>(`/care-templates/${id}/retire`, { method: "POST" });
