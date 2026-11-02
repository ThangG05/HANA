import assert from "node:assert/strict";
import { test } from "node:test";
import { giamQuaMuc, tinhBaoGia } from "./tinh-tien.js";

test("tính tiền khớp công thức DB: so_luong * don_gia - giam_gia", () => {
  const r = tinhBaoGia([
    { soLuong: 2, donGia: 1_000_000, giamGia: 100_000 },
    { soLuong: 1, donGia: 5_500_000, giamGia: 0 },
  ]);
  assert.deepEqual(r.thanhTien, [1_900_000, 5_500_000]);
  assert.equal(r.tongGoc, 7_500_000);
  assert.equal(r.tongGiam, 100_000);
  assert.equal(r.tong, 7_400_000);
});

test("báo giá rỗng cho tổng 0", () => {
  assert.deepEqual(tinhBaoGia([]), { tongGoc: 0, tongGiam: 0, tong: 0, thanhTien: [] });
});

test("từ chối số lẻ, số âm, số lượng 0, giảm giá vượt thành tiền", () => {
  assert.throws(() => tinhBaoGia([{ soLuong: 1, donGia: 10.5, giamGia: 0 }]), /số nguyên/);
  assert.throws(() => tinhBaoGia([{ soLuong: 1, donGia: -1, giamGia: 0 }]), /không âm/);
  assert.throws(() => tinhBaoGia([{ soLuong: 0, donGia: 100, giamGia: 0 }]), /từ 1/);
  assert.throws(() => tinhBaoGia([{ soLuong: 1, donGia: 100, giamGia: 101 }]), /không được lớn hơn/);
  assert.throws(() => tinhBaoGia([{ soLuong: 1, donGia: Number.NaN, giamGia: 0 }]), /số nguyên/);
});

test("giá trị khổng lồ bị chặn thay vì mất độ chính xác", () => {
  assert.throws(() => tinhBaoGia([{ soLuong: 1000, donGia: Number.MAX_SAFE_INTEGER, giamGia: 0 }]), /quá lớn/);
});

test("giảm giá giữ nguyên độ chính xác ở biên 10%", () => {
  assert.equal(giamQuaMuc(1_000_000, 100_000, 10), false); // đúng 10% là được
  assert.equal(giamQuaMuc(1_000_000, 100_001, 10), true); // hơn 1 đồng là vượt
  assert.equal(giamQuaMuc(0, 0, 10), false);
});
