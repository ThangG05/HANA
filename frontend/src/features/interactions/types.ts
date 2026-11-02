export interface TuongTac {
  tuong_tac_id: string;
  khach_hang_id: string;
  co_hoi_id: string | null;
  kenh: string;
  chieu: string;
  thoi_diem: string;
  noi_dung_tom_tat: string | null;
  ket_qua: string | null;
  nhan_vien: string | null;
}
export interface NhapTuongTac { khachHangId: string; coHoiId?: string; kenh: string; chieu: string; noiDungTomTat?: string; ketQua?: string }
