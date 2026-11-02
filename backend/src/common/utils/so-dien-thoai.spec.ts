import assert from "node:assert/strict";
import { test } from "node:test";
import { chuanHoaSdt, chuanHoaSdtTimKiem } from "./so-dien-thoai.js";

// Các mẫu dưới đây đã được đối chiếu với hàm SQL public.hana_chuan_hoa_sdt: kết quả phải KHỚP.
test("chuanHoaSdt khớp hàm SQL hana_chuan_hoa_sdt", () => {
  const mau: Array<[string | null, string | null]> = [
    ["0901234567", "84901234567"],
    ["090 123 4567", "84901234567"],
    ["0901.234.567", "84901234567"],
    ["+84 901 234 567", "84901234567"],
    ["84901234567", "84901234567"],
    ["0084901234567", "84901234567"],
    ["(090)1234567", "84901234567"],
    ["091234", "091234"],
    ["09012345678", "09012345678"],
    ["abc", null],
    ["", null],
    ["   ", null],
    [null, null],
  ];
  for (const [vao, ra] of mau) assert.equal(chuanHoaSdt(vao), ra, `chuanHoaSdt(${JSON.stringify(vao)})`);
});

test("chuanHoaSdtTimKiem: bỏ qua chuỗi quá ngắn, đổi 0xxx sang 84xxx", () => {
  assert.equal(chuanHoaSdtTimKiem("123"), null);
  assert.equal(chuanHoaSdtTimKiem("0901234567"), "84901234567");
  assert.equal(chuanHoaSdtTimKiem("4567"), "4567");
  assert.equal(chuanHoaSdtTimKiem("+84 901"), "84901");
  assert.equal(chuanHoaSdtTimKiem("0084901"), "84901");
});
