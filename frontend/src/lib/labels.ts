export const NHAN_CO_HOI: Record<string, string> = {
  moi: "Mới",
  dang_tu_van: "Đang tư vấn",
  da_hen: "Đã hẹn",
  da_kham: "Đã khám",
  da_chot: "Đã chốt",
  dang_hau_phau: "Đang hậu phẫu",
  hoan_tat: "Hoàn tất",
  can_nuoi_duong: "Cần nuôi dưỡng",
  ngung_cham_soc: "Ngừng chăm sóc",
};
/** Luồng chính của hành trình khách hàng, theo thứ tự. */
export const LUONG_CHINH = ["moi", "dang_tu_van", "da_hen", "da_kham", "da_chot", "dang_hau_phau", "hoan_tat"] as const;
export const CAN_LY_DO = ["can_nuoi_duong", "ngung_cham_soc"];

export const NHAN_LICH_HEN: Record<string, string> = {
  cho_xac_nhan: "Chờ xác nhận",
  da_xac_nhan: "Đã xác nhận",
  da_den: "Đã đến",
  hoan_thanh: "Hoàn thành",
  huy: "Đã hủy",
  khong_den: "Không đến",
  da_doi_lich: "Đã đổi lịch",
};
export const NHAN_LOAI_LICH: Record<string, string> = { kham: "Khám", thuc_hien: "Thực hiện", tai_kham: "Tái khám" };

export const NHAN_CONG_VIEC: Record<string, string> = { cho_lam: "Chờ làm", dang_lam: "Đang làm", hoan_thanh: "Hoàn thành", huy: "Đã hủy" };
export const NHAN_UU_TIEN: Record<string, string> = { thap: "Thấp", binh_thuong: "Bình thường", cao: "Cao", khan_cap: "Khẩn cấp" };
export const LOAI_CONG_VIEC: Record<string, string> = { goi_lai: "Gọi lại", nhac_lich: "Nhắc lịch", gui_bao_gia: "Gửi báo giá", cham_soc: "Chăm sóc", khac: "Khác" };

export const NHAN_KENH: Record<string, string> = {
  dien_thoai: "Điện thoại",
  hotline: "Hotline",
  zalo: "Zalo",
  messenger: "Messenger",
  facebook: "Facebook",
  tiktok: "TikTok",
  website: "Website",
  truc_tiep: "Trực tiếp",
  email: "Email",
  khac: "Khác",
};
export const NHAN_VAI_TRO: Record<string, string> = {
  quan_ly: "Quản lý",
  tu_van: "Tư vấn viên",
  le_tan: "Lễ tân",
  bac_si: "Bác sĩ",
  dieu_duong_cskh: "Điều dưỡng / CSKH",
  thu_ngan: "Thu ngân",
};

export const nhan = (bang: Record<string, string>, k?: string | null) => (k ? (bang[k] ?? k) : "—");
