/**
 * CHỈ để quyết định hiển thị nút nào. Quy tắc thật nằm ở backend (common/utils/trang-thai.ts) và vẫn kiểm tra lại.
 * Nếu backend đổi, sửa cả hai nơi.
 */
export const LICH_HEN_CHUYEN_DUOC: Record<string, string[]> = {
  cho_xac_nhan: ["da_xac_nhan", "huy", "khong_den"],
  da_xac_nhan: ["da_den", "huy", "khong_den"],
  da_den: ["hoan_thanh"],
  hoan_thanh: [],
  huy: [],
  khong_den: [],
  da_doi_lich: [],
};
export const LICH_HEN_CON_HIEU_LUC = ["cho_xac_nhan", "da_xac_nhan", "da_den"];
