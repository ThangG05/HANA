import type { PrismaService } from "../../prisma/prisma.service.js";
import { hanTuMoc } from "./cham-soc.chung.js";

/**
 * Sinh các việc chăm sóc cho một ca đã hoàn thành theo mẫu ĐÃ DUYỆT của dịch vụ. Chạy lại bao nhiêu lần cũng không nhân đôi
 * (mỗi cặp ca + mốc chỉ một việc; mẫu mới được duyệt sau đó không đụng tới việc đã sinh).
 * Trả số việc mới được tạo; 0 nếu dịch vụ chưa có mẫu đã duyệt hoặc đã sinh đủ.
 */
export async function sinhLichChamSoc(prisma: PrismaService, caId: string, nguoiTaoId: string | null): Promise<number> {
  const ca = await prisma.ca_thuc_hien.findUnique({ where: { ca_id: caId } });
  if (!ca || ca.trang_thai !== "hoan_thanh" || !ca.ket_thuc_luc) return 0;
  const hm = await prisma.chi_tiet_bao_gia.findUnique({ where: { chi_tiet_bao_gia_id: ca.chi_tiet_bao_gia_id }, select: { dich_vu_id: true } });
  if (!hm) return 0;
  const mau = await prisma.mau_cham_soc.findFirst({ where: { dich_vu_id: hm.dich_vu_id, trang_thai: "da_duyet" } });
  if (!mau) return 0;
  const moc = await prisma.moc_cham_soc.findMany({ where: { mau_id: mau.mau_id }, orderBy: [{ ngay_tao: "asc" }] });
  const daCo = new Set((await prisma.cham_soc_sau_ca.findMany({ where: { ca_id: caId }, select: { moc_id: true } })).map((r) => r.moc_id));
  let moi = 0;
  for (const m of moc) {
    if (daCo.has(m.moc_id)) continue;
    try {
      await prisma.cham_soc_sau_ca.create({
        data: { ca_id: caId, moc_id: m.moc_id, han_thuc_hien: hanTuMoc(ca.ket_thuc_luc, m.khoang_thoi_gian_sau_ca, m.don_vi), nguoi_tao_id: nguoiTaoId },
      });
      moi++;
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002" && (e as { code?: string }).code !== "23505") throw e; // người khác vừa sinh: bỏ qua
    }
  }
  return moi;
}
