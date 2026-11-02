export interface LichHen {
  lich_hen_id: string;
  khach_hang_id: string;
  co_hoi_id: string;
  co_so_id: string;
  bac_si_id: string | null;
  phong: string | null;
  loai_lich_hen: string;
  bat_dau: string;
  ket_thuc: string;
  trang_thai: string;
  ly_do_huy: string | null;
  khach_hang: { khach_hang_id: string; ho_ten: string; so_dien_thoai: string | null } | null;
  bac_si: string | null;
  co_so: string | null;
}
export interface NhapLichHen { coHoiId: string; coSoId: string; bacSiId?: string; phong?: string; loaiLichHen?: string; batDau: string; ketThuc: string }
export interface NhapDoiLich { batDau: string; ketThuc: string; coSoId?: string; bacSiId?: string; phong?: string; lyDo?: string }
