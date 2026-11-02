export type TrangThaiCa = "du_kien" | "hoan" | "dang_thuc_hien" | "hoan_thanh" | "huy";
export interface Ca {
  ca_id: string; co_hoi_id: string; bao_gia_id: string; chi_tiet_bao_gia_id: string; ten_hang_muc: string | null;
  bac_si_id: string; bac_si: string | null; co_so_id: string; co_so: string | null;
  du_kien_luc: string | null; bat_dau_luc: string | null; ket_thuc_luc: string | null;
  trang_thai: TrangThaiCa; nguoi_ban_giao: string | null; xem_duoc_y_khoa: boolean;
  kiem_tra_truoc_ca?: string | null; ky_thuat_thuc_hien?: string | null; huong_dan_sau_ca?: string | null;
}
