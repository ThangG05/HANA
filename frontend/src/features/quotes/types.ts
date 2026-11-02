export interface HangMucBaoGia { chi_tiet_bao_gia_id: string; dich_vu_id: string; ten_hang_muc: string; so_luong: number; don_gia: number; giam_gia: number; thanh_tien: number }
export interface BaoGia {
  bao_gia_id: string; co_hoi_id: string; tham_kham_id: string; phien_ban: number;
  trang_thai: "nhap" | "da_gui" | "da_chap_nhan" | "het_han" | "da_thay_the" | "huy";
  ngay_lap: string; hieu_luc_den: string | null; khach_xac_nhan_luc: string | null; nguoi_lap: string | null; da_het_han: boolean;
  tham_kham: { tham_kham_id: string; bac_si: string | null; thoi_diem_kham: string } | null;
  hang_muc: HangMucBaoGia[]; tong_goc: number; tong_giam: number; tong: number;
}
export interface DongNhap { dichVuId: string; soLuong: number; donGia: number; giamGia: number }
