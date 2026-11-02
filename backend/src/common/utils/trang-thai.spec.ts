import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CAN_LY_DO_CO_HOI,
  CHUYEN_CO_HOI,
  CHUYEN_CONG_VIEC,
  CHUYEN_LICH_HEN,
  hopLe,
  LICH_HEN_CON_HIEU_LUC,
  TRANG_THAI_CO_HOI,
  TRANG_THAI_CO_HOI_CAN_BAO_GIA,
  CHUYEN_BAO_GIA,
  TRANG_THAI_BAO_GIA,
  TRANG_THAI_CONG_VIEC,
  TRANG_THAI_LICH_HEN,
} from "./trang-thai.js";

test("mọi trạng thái đều có khai báo chuyển đổi và chỉ trỏ tới trạng thái tồn tại", () => {
  for (const [bang, tatCa] of [
    [CHUYEN_CO_HOI, TRANG_THAI_CO_HOI],
    [CHUYEN_LICH_HEN, TRANG_THAI_LICH_HEN],
    [CHUYEN_CONG_VIEC, TRANG_THAI_CONG_VIEC],
  ] as const) {
    assert.deepEqual(Object.keys(bang).sort(), [...tatCa].sort());
    for (const dich of Object.values(bang) as string[][]) for (const d of dich) assert.ok((tatCa as readonly string[]).includes(d), d);
  }
});

test("cơ hội: luồng chính đi đúng thứ tự, không nhảy cóc", () => {
  const luong = ["moi", "dang_tu_van", "da_hen", "da_kham", "da_chot", "dang_hau_phau", "hoan_tat"] as const;
  for (let i = 0; i < luong.length - 1; i++) assert.ok(hopLe(CHUYEN_CO_HOI, luong[i], luong[i + 1]), `${luong[i]} → ${luong[i + 1]}`);
  assert.equal(hopLe(CHUYEN_CO_HOI, "moi", "da_hen"), false);
  assert.equal(hopLe(CHUYEN_CO_HOI, "da_kham", "dang_hau_phau"), false);
});

test("cơ hội: trạng thái kết thúc không đi tiếp được; nuôi dưỡng quay lại tư vấn được", () => {
  assert.deepEqual(CHUYEN_CO_HOI.hoan_tat, []);
  assert.deepEqual(CHUYEN_CO_HOI.ngung_cham_soc, []);
  assert.ok(hopLe(CHUYEN_CO_HOI, "can_nuoi_duong", "dang_tu_van"));
});

test("'Đã chốt' cần báo giá đã chấp nhận và nuôi dưỡng/ngừng bắt buộc lý do", () => {
  assert.deepEqual(TRANG_THAI_CO_HOI_CAN_BAO_GIA, ["da_chot"]);
  assert.deepEqual([...CAN_LY_DO_CO_HOI].sort(), ["can_nuoi_duong", "ngung_cham_soc"]);
});

test("lịch hẹn: không ai chuyển tay sang 'da_doi_lich'; lịch còn hiệu lực khớp ràng buộc DB", () => {
  for (const dich of Object.values(CHUYEN_LICH_HEN)) assert.ok(!dich.includes("da_doi_lich"));
  // Phải giống điều kiện WHERE của ràng buộc EXCLUDE trong migration 002_chong_trung_lich.sql.
  assert.deepEqual([...LICH_HEN_CON_HIEU_LUC].sort(), ["cho_xac_nhan", "da_den", "da_xac_nhan"]);
});

test("công việc: đã hoàn thành/hủy là kết thúc", () => {
  assert.deepEqual(CHUYEN_CONG_VIEC.hoan_thanh, []);
  assert.deepEqual(CHUYEN_CONG_VIEC.huy, []);
});

test("báo giá: bản đã chấp nhận chỉ đi tiếp sang 'đã thay thế'; trạng thái kết thúc không đi tiếp", () => {
  assert.deepEqual(Object.keys(CHUYEN_BAO_GIA).sort(), [...TRANG_THAI_BAO_GIA].sort());
  assert.deepEqual(CHUYEN_BAO_GIA.da_chap_nhan, ["da_thay_the"]);
  for (const t of ["het_han", "da_thay_the", "huy"] as const) assert.deepEqual(CHUYEN_BAO_GIA[t], []);
  assert.ok(hopLe(CHUYEN_BAO_GIA, "nhap", "da_gui"));
  assert.equal(hopLe(CHUYEN_BAO_GIA, "nhap", "da_chap_nhan"), false);
});
