/**
 * Máy trạng thái. Theo sơ đồ ĐỀ XUẤT (mục 2.2 tài liệu phân tích) — cần Hana phê duyệt.
 * Đổi quy tắc ở đây, không rải rác trong controller/UI.
 */

export const TRANG_THAI_CO_HOI = [
  "moi",
  "dang_tu_van",
  "da_hen",
  "da_kham",
  "da_chot",
  "dang_hau_phau",
  "hoan_tat",
  "can_nuoi_duong",
  "ngung_cham_soc",
] as const;
export type TrangThaiCoHoi = (typeof TRANG_THAI_CO_HOI)[number];

export const CHUYEN_CO_HOI: Record<TrangThaiCoHoi, TrangThaiCoHoi[]> = {
  moi: ["dang_tu_van", "can_nuoi_duong", "ngung_cham_soc"],
  dang_tu_van: ["da_hen", "can_nuoi_duong", "ngung_cham_soc"],
  da_hen: ["da_kham", "dang_tu_van", "can_nuoi_duong", "ngung_cham_soc"],
  da_kham: ["da_chot", "can_nuoi_duong", "ngung_cham_soc"],
  da_chot: ["dang_hau_phau"],
  dang_hau_phau: ["hoan_tat"],
  can_nuoi_duong: ["dang_tu_van", "ngung_cham_soc"],
  hoan_tat: [],
  ngung_cham_soc: [],
};

/** Các trạng thái bắt buộc có lý do khi chuyển tới. */
export const CAN_LY_DO_CO_HOI: TrangThaiCoHoi[] = ["can_nuoi_duong", "ngung_cham_soc"];

/**
 * Chuyển sang các trạng thái này cần có báo giá ĐÃ CHẤP NHẬN của cơ hội.
 * Chưa bắt buộc cọc: Hana chưa chốt Q03 (khi chốt thì thêm điều kiện ở opportunities.service).
 */
export const TRANG_THAI_CO_HOI_CAN_BAO_GIA: TrangThaiCoHoi[] = ["da_chot"];

export const TRANG_THAI_LICH_HEN = [
  "cho_xac_nhan",
  "da_xac_nhan",
  "da_den",
  "hoan_thanh",
  "huy",
  "khong_den",
  "da_doi_lich",
] as const;
export type TrangThaiLichHen = (typeof TRANG_THAI_LICH_HEN)[number];

/** Lịch còn hiệu lực = còn chiếm bác sĩ/phòng (khớp điều kiện WHERE của ràng buộc chống trùng ở migration 002). */
export const LICH_HEN_CON_HIEU_LUC: TrangThaiLichHen[] = ["cho_xac_nhan", "da_xac_nhan", "da_den"];

/** "da_doi_lich" chỉ được tạo qua endpoint đổi lịch, không đổi tay. */
export const CHUYEN_LICH_HEN: Record<TrangThaiLichHen, TrangThaiLichHen[]> = {
  cho_xac_nhan: ["da_xac_nhan", "huy", "khong_den"],
  da_xac_nhan: ["da_den", "huy", "khong_den"],
  da_den: ["hoan_thanh"],
  hoan_thanh: [],
  huy: [],
  khong_den: [],
  da_doi_lich: [],
};

export const TRANG_THAI_CONG_VIEC = ["cho_lam", "dang_lam", "hoan_thanh", "huy"] as const;
export type TrangThaiCongViec = (typeof TRANG_THAI_CONG_VIEC)[number];

export const CHUYEN_CONG_VIEC: Record<TrangThaiCongViec, TrangThaiCongViec[]> = {
  cho_lam: ["dang_lam", "hoan_thanh", "huy"],
  dang_lam: ["cho_lam", "hoan_thanh", "huy"],
  hoan_thanh: [],
  huy: [],
};

export const hopLe = <T extends string>(bang: Record<T, T[]>, tu: T, den: T): boolean => bang[tu]?.includes(den) ?? false;

export const TRANG_THAI_BAO_GIA = ["nhap", "da_gui", "da_chap_nhan", "het_han", "da_thay_the", "huy"] as const;
export type TrangThaiBaoGia = (typeof TRANG_THAI_BAO_GIA)[number];

/** Phải GIỐNG trigger hana_khoa_bao_gia trong migration 006 (DB là rào chắn cuối cùng). */
export const CHUYEN_BAO_GIA: Record<TrangThaiBaoGia, TrangThaiBaoGia[]> = {
  nhap: ["da_gui", "huy"],
  da_gui: ["da_chap_nhan", "het_han", "da_thay_the", "huy"],
  da_chap_nhan: ["da_thay_the"],
  het_han: [],
  da_thay_the: [],
  huy: [],
};

/** Tư vấn viên được giảm tối đa bấy nhiêu % tổng giá trị báo giá; vượt cần quyền bao_gia.duyet. Hana chưa chốt mức này. */
export const NGUONG_GIAM_GIA_PHAN_TRAM = 10;
/** Báo giá gửi mà chưa nhập hạn thì mặc định có hiệu lực bấy nhiêu ngày. Hana chưa chốt. */
export const HIEU_LUC_MAC_DINH_NGAY = 14;

/**
 * Tiền cọc tối thiểu (% giá trị báo giá đã chấp nhận) để chuyển cơ hội sang "Đã chốt". 0 = không yêu cầu.
 * [CẦN CHỐT với Hana - câu Q03]. Đổi số này là đủ, không cần sửa nơi khác.
 */
export const COC_TOI_THIEU_PHAN_TRAM_KHI_CHOT = 0;

export type TrangThaiCa = "du_kien" | "hoan" | "dang_thuc_hien" | "hoan_thanh" | "huy";

/** Chuyển trạng thái ca hợp lệ. PHẢI khớp trigger hana_khoa_ca_thuc_hien (migration 009). */
export const CHUYEN_CA: Record<TrangThaiCa, TrangThaiCa[]> = {
  du_kien: ["hoan", "dang_thuc_hien", "huy"],
  hoan: ["du_kien", "huy"],
  dang_thuc_hien: ["hoan_thanh"],
  hoan_thanh: [],
  huy: [],
};

/** Cơ hội phải ở một trong các trạng thái này mới được bắt đầu ca (đã chốt hoặc đang hậu phẫu). */
export const TRANG_THAI_CO_HOI_DUOC_BAT_DAU_CA = ["da_chot", "dang_hau_phau"];

/** Tiền đã thu tối thiểu (% giá trị báo giá) để bắt đầu ca. 0 = không yêu cầu. [CẦN CHỐT với Hana] */
export const COC_TOI_THIEU_PHAN_TRAM_KHI_BAT_DAU_CA = 0;
