import type { PrismaService } from "../../prisma/prisma.service.js";

const so = (v: { toString(): string } | number | string): number => Number(v.toString());

export interface TienBaoGia {
  tong: number;
  thu: number;
  hoan: number;
  thucThu: number;
  conLai: number;
}

/**
 * Tiền theo từng báo giá: tổng giá trị, thu thành công, hoàn thành công, thực thu, còn phải thu.
 * Chỉ giao dịch 'thanh_cong' được tính. Số nguyên VND, cộng trong JS (không dùng số thực).
 */
export async function tongHopTien(db: Pick<PrismaService, "chi_tiet_bao_gia" | "thanh_toan">, ids: string[]): Promise<Map<string, TienBaoGia>> {
  const kq = new Map<string, TienBaoGia>();
  if (ids.length === 0) return kq;
  const [hm, gd] = await Promise.all([
    db.chi_tiet_bao_gia.findMany({ where: { bao_gia_id: { in: ids } } }),
    db.thanh_toan.findMany({ where: { bao_gia_id: { in: ids }, trang_thai: "thanh_cong" } }),
  ]);
  for (const id of ids) {
    const tong = hm.filter((h) => h.bao_gia_id === id).reduce((a, h) => a + (h.thanh_tien == null ? h.so_luong * so(h.don_gia) - so(h.giam_gia) : so(h.thanh_tien)), 0);
    const moi = gd.filter((g) => g.bao_gia_id === id);
    const thu = moi.filter((g) => g.loai_giao_dich !== "hoan_tien").reduce((a, g) => a + so(g.so_tien), 0);
    const hoan = moi.filter((g) => g.loai_giao_dich === "hoan_tien").reduce((a, g) => a + so(g.so_tien), 0);
    kq.set(id, { tong, thu, hoan, thucThu: thu - hoan, conLai: tong - thu });
  }
  return kq;
}
