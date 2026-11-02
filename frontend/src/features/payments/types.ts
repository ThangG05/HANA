export interface GiaoDich {
  thanh_toan_id: string; loai_giao_dich: "dat_coc" | "thanh_toan" | "hoan_tien"; so_tien: number;
  phuong_thuc: "tien_mat" | "chuyen_khoan" | "the"; trang_thai: "cho_xac_nhan" | "thanh_cong" | "that_bai" | "huy";
  thoi_diem: string; ma_giao_dich: string | null; ben_cung_cap: string | null; giao_dich_goc_id: string | null; thu_ngan: string | null;
}
export interface TienBaoGia {
  bao_gia_id: string; phien_ban: number; trang_thai: string;
  tong_bao_gia: number; tong_thu: number; tong_hoan: number; thuc_thu: number; con_lai: number;
  giao_dich: GiaoDich[];
}
export interface NhapThu { baoGiaId: string; loai: "dat_coc" | "thanh_toan"; soTien: number; phuongThuc: string; maGiaoDich?: string; benCungCap?: string; choXacNhan?: boolean }
export interface NhapHoan { giaoDichGocId: string; soTien: number; phuongThuc: string; maGiaoDich?: string; benCungCap?: string }

export interface CongNo {
  bao_gia_id: string; co_hoi_id: string; phien_ban: number; ngay_lap: string;
  khach_hang: { khach_hang_id: string; ho_ten: string; so_dien_thoai: string | null };
  dich_vu: string | null; tong_bao_gia: number; thuc_thu: number; con_lai: number;
}
export interface SoCongNo { items: CongNo[]; total: number; page: number; pageSize: number; tong_con_no: number }
export interface KhoanChoXacNhan {
  thanh_toan_id: string; so_tien: number; thoi_diem: string;
  ma_giao_dich: string | null; ben_cung_cap: string | null;
  bao_gia_id: string; co_hoi_id: string; dich_vu: string | null;
  khach_hang: { khach_hang_id: string; ho_ten: string; so_dien_thoai: string | null };
}
export interface SoChoXacNhan { items: KhoanChoXacNhan[]; total: number; page: number; pageSize: number }
