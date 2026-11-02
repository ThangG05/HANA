export interface DongY {
  dong_y_id: string; khach_hang_id: string; ca_id: string | null; muc_dich: string;
  trang_thai: string; phien_ban_noi_dung: string; thoi_diem_dong_y: string;
  thoi_diem_rut_lai: string | null; bang_chung: string | null;
}
export interface GhiDongY { mucDich: string; phienBanNoiDung: string; bangChung: string; caId?: string }
