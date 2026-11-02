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
