export interface CongViec {
  cong_viec_id: string;
  khach_hang_id: string;
  co_hoi_id: string | null;
  lich_hen_id: string | null;
  loai_cong_viec: string;
  noi_dung: string;
  nguoi_phu_trach_id: string | null;
  han_hoan_thanh: string;
  muc_uu_tien: string;
  trang_thai: string;
  hoan_thanh_luc: string | null;
  ket_qua: string | null;
  khach_hang: string | null;
  nguoi_phu_trach: string | null;
}
export interface NhapCongViec { khachHangId: string; coHoiId?: string; loaiCongViec: string; noiDung: string; nguoiPhuTrachId?: string; hanHoanThanh: string; mucUuTien?: string }
