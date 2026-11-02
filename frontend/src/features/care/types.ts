export interface Viec {
  cham_soc_id: string; ca_id: string; moc_id: string | null; co_hoi_id: string | null; khach_hang_id: string | null; khach_hang: string | null; so_dien_thoai: string | null;
  ten_hang_muc: string | null; bac_si: string | null; noi_dung: string | null; loai_lien_he: string | null;
  han_thuc_hien: string; trang_thai: "cho_thuc_hien" | "hoan_thanh" | "huy"; nguoi_phu_trach_id: string | null; nguoi_phu_trach: string | null;
  thoi_diem_thuc_te: string | null; phan_hoi: string | null; huong_xu_ly: string | null; qua_han: boolean;
}
export interface CanhBao {
  canh_bao_id: string; ca_id: string; co_hoi_id: string | null; khach_hang: string | null; so_dien_thoai: string | null; bac_si_id: string | null; bac_si: string | null; bac_si_nhan: string | null;
  mo_ta: string; muc_uu_tien: "binh_thuong" | "cao" | "khan_cap"; trang_thai: "moi" | "da_nhan" | "dang_xu_ly" | "da_dong";
  thoi_diem_bao: string; thoi_diem_tiep_nhan: string | null; huong_xu_ly: string | null; thoi_diem_dong: string | null;
}
export interface DanhGia { danh_gia_id: string; ca_id: string | null; diem: number; thang_diem: number; nhan_xet: string | null }
export interface ChamSocCoHoi {
  ca_hoan_thanh: { ca_id: string; ten_hang_muc: string | null; ket_thuc_luc: string | null; bac_si_id: string }[];
  viec: Viec[]; canh_bao: CanhBao[]; danh_gia: DanhGia[];
}
export interface Trang<T> { items: T[]; total: number; page: number; pageSize: number }
export interface Moc { moc_id: string; khoang_thoi_gian_sau_ca: number; don_vi: "ngay" | "tuan" | "thang"; noi_dung: string; loai_lien_he: "goi_dien" | "nhan_tin" | "tai_kham"; vai_tro: string | null }
export interface Mau { mau_id: string; dich_vu_id: string; ten_dich_vu: string | null; phien_ban: number; trang_thai: "nhap" | "da_duyet" | "ngung_dung"; nguoi_duyet: string | null; ngay_duyet: string | null; moc: Moc[] }
export type MucUuTien = CanhBao["muc_uu_tien"];
