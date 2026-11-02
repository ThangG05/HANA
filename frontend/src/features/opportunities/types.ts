export interface CoHoi {
  co_hoi_id: string;
  khach_hang_id: string;
  dich_vu_id: string;
  nguon_id: string | null;
  tu_van_vien_id: string | null;
  mong_muon: string | null;
  ngan_sach_tu: string | null;
  ngan_sach_den: string | null;
  thoi_diem_du_kien: string | null;
  trang_thai: string;
  ly_do_chua_chot: string | null;
  ngay_tiep_nhan: string;
  ngay_cap_nhat: string;
  khach_hang?: { khach_hang_id: string; ho_ten: string; so_dien_thoai: string | null } | null;
  dich_vu?: { dich_vu_id: string; ten_dich_vu: string; nhom_dich_vu: string } | null;
  tu_van_vien?: { nhan_vien_id: string; ho_ten: string } | null;
}
export interface LichSuTrangThai {
  lich_su_id: string;
  trang_thai_cu: string | null;
  trang_thai_moi: string;
  thoi_diem: string;
  ly_do: string | null;
  nguoi_thay_doi: string | null;
}
export interface CoHoiChiTiet extends CoHoi { lich_su: LichSuTrangThai[]; chuyen_duoc_den: string[] }

export interface NhapCoHoi {
  khachHangId: string;
  dichVuId: string;
  nguonId?: string;
  mongMuon?: string;
  nganSachTu?: number;
  nganSachDen?: number;
}
