/**
 * Tính tiền báo giá bằng SỐ NGUYÊN VND ở backend (không tin số tổng từ trình duyệt).
 * Công thức khớp cột sinh sẵn trong DB: thanh_tien = so_luong * don_gia - giam_gia.
 */
export interface HangMucTinh {
  soLuong: number;
  donGia: number;
  giamGia: number;
}

export interface KetQuaTinh {
  /** Tổng trước giảm giá. */
  tongGoc: number;
  tongGiam: number;
  /** Tổng phải trả = tongGoc - tongGiam. */
  tong: number;
  thanhTien: number[];
}

export function tinhBaoGia(hangMuc: HangMucTinh[]): KetQuaTinh {
  let tongGoc = 0;
  let tongGiam = 0;
  const thanhTien: number[] = [];
  hangMuc.forEach((h, i) => {
    const dong = `Hạng mục ${i + 1}`;
    for (const [ten, v] of [["số lượng", h.soLuong], ["đơn giá", h.donGia], ["giảm giá", h.giamGia]] as const) {
      if (!Number.isSafeInteger(v) || v < 0) throw new RangeError(`${dong}: ${ten} phải là số nguyên không âm`);
    }
    if (h.soLuong < 1) throw new RangeError(`${dong}: số lượng phải từ 1`);
    const goc = h.soLuong * h.donGia;
    if (!Number.isSafeInteger(goc)) throw new RangeError(`${dong}: giá trị quá lớn`);
    if (h.giamGia > goc) throw new RangeError(`${dong}: giảm giá không được lớn hơn thành tiền`);
    thanhTien.push(goc - h.giamGia);
    tongGoc += goc;
    tongGiam += h.giamGia;
    if (!Number.isSafeInteger(tongGoc)) throw new RangeError("Tổng báo giá quá lớn");
  });
  return { tongGoc, tongGiam, tong: tongGoc - tongGiam, thanhTien };
}

/** Giảm giá có vượt `phanTram`% tổng giá trị không (so sánh số nguyên, không dùng số thực). */
export const giamQuaMuc = (tongGoc: number, tongGiam: number, phanTram: number): boolean => tongGiam * 100 > tongGoc * phanTram;
