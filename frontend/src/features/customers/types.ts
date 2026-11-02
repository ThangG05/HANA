import type { CoHoi } from "../opportunities/types";

export interface KhachHang {
  khach_hang_id: string;
  ho_ten: string;
  ngay_sinh: string | null;
  so_dien_thoai: string | null;
  email: string | null;
  zalo_id: string | null;
  khu_vuc: string | null;
  kenh_lien_he_uu_tien: string | null;
  khung_gio_lien_he: string | null;
  nguon_dau_tien_id: string | null;
  nhan_vien_phu_trach_id: string | null;
  ngay_tao: string;
}
export interface KhachHangChiTiet extends KhachHang { co_hoi?: CoHoi[] }
export interface KhachTrung { khach_hang_id: string; ho_ten: string; so_dien_thoai: string | null; email: string | null }

export interface NhapKhachHang {
  hoTen: string;
  soDienThoai?: string;
  email?: string;
  zaloId?: string;
  ngaySinh?: string;
  khuVuc?: string;
  kenhLienHeUuTien?: string;
  khungGioLienHe?: string;
  nguonDauTienId?: string;
  xacNhanTrungSo?: boolean;
}
