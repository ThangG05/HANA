export interface TomTatKham { tham_kham_id: string; co_hoi_id: string; lich_hen_id: string | null; bac_si_id: string; bac_si: string | null; thoi_diem_kham: string; xem_duoc_y_khoa: boolean }
export interface HoSoKham {
  tham_kham_id: string; co_hoi_id: string; lich_hen_id: string | null; bac_si_id: string; thoi_diem_kham: string;
  tien_su: string | null; di_ung: string | null; ket_qua_tham_kham: string | null; phuong_an_de_xuat: string | null; ket_luan_dieu_kien: string | null; ma_ho_so_y_khoa_ngoai: string | null;
}
export interface NhapKham { tienSu?: string; diUng?: string; ketQuaThamKham?: string; phuongAnDeXuat?: string; ketLuanDieuKien?: string; maHoSoYKhoaNgoai?: string }
