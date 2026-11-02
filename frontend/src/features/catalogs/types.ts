export interface DichVu { dich_vu_id: string; ten_dich_vu: string; nhom_dich_vu: string; gia_tham_khao_tu: string | null; gia_tham_khao_den: string | null; thoi_luong_du_kien: number | null }
export interface NguonKhach { nguon_id: string; kenh: string; ten_chien_dich: string | null }
export interface CoSo { co_so_id: string; ten_co_so: string; dia_chi: string | null }
export interface NhanVien { nhan_vien_id: string; ho_ten: string; chuc_danh: string | null; vai_tro: string[]; co_so_id: string | null }
