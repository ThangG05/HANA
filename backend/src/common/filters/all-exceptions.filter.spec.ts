import assert from "node:assert/strict";
import { test } from "node:test";
import { anhXaLoiDatabase } from "./all-exceptions.filter.js";

test("23P01 (chống trùng lịch) → 409, phân biệt bác sĩ/phòng, ở bất kỳ tầng lồng nào", () => {
  const bacSi = 'conflicting key value violates exclusion constraint "lich_hen_khong_trung_bac_si"';
  const phong = 'conflicting key value violates exclusion constraint "lich_hen_khong_trung_phong"';
  assert.equal(anhXaLoiDatabase(new Error(bacSi))?.code, "TRUNG_LICH_BAC_SI");
  assert.equal(anhXaLoiDatabase({ code: "P2010", meta: { code: "23P01", message: phong } })?.code, "TRUNG_LICH_PHONG");
  assert.equal(anhXaLoiDatabase({ message: "x", cause: { originalCode: "23P01", originalMessage: phong } })?.code, "TRUNG_LICH_PHONG");
  assert.equal(anhXaLoiDatabase({ meta: { driverAdapterError: { cause: { originalCode: "23P01", constraint: "lich_hen_khong_trung_bac_si" } } } })?.status, 409);
  assert.equal(anhXaLoiDatabase({ message: "23P01" })?.code, "TRUNG_LICH");
});

test("mã lỗi Prisma khác được đổi sang mã HTTP phù hợp", () => {
  assert.equal(anhXaLoiDatabase({ code: "P2002", message: "u" })?.status, 409);
  assert.equal(anhXaLoiDatabase({ code: "P2003", message: "f" })?.status, 400);
  assert.equal(anhXaLoiDatabase({ code: "P2025", message: "n" })?.status, 404);
  assert.equal(anhXaLoiDatabase({ message: 'violates check constraint "x_check"' })?.status, 400);
});

test("lỗi lạ không được ánh xạ (sẽ thành 500 chung) và thông báo không lộ SQL", () => {
  assert.equal(anhXaLoiDatabase(new Error("connection refused")), null);
  const m = anhXaLoiDatabase({ code: "P2002", message: 'Unique constraint failed on the fields: (`email`) in table "khach_hang"' });
  assert.ok(m && !/khach_hang|email|table/i.test(m.message));
});

test("không treo khi lỗi có vòng tham chiếu", () => {
  const a: Record<string, unknown> = { message: "a" };
  a["cause"] = a;
  assert.equal(anhXaLoiDatabase(a), null);
});

test("trigger khóa (migration 006) → 409 DA_KHOA, không lộ nội dung gốc", () => {
  const m = anhXaLoiDatabase({ message: "hana_khoa: báo giá đã gửi không được sửa nội dung", code: "23514" });
  assert.equal(m?.status, 409);
  assert.equal(m?.code, "DA_KHOA");
  assert.ok(!/hana_khoa/.test(m!.message));
});
