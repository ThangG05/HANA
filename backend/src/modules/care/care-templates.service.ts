import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { AuthUser } from "../../common/types/auth-user.js";
import { MocDto, SuaMocDto } from "./dto/care.dto.js";

const loi422 = (code: string, message: string) => new UnprocessableEntityException({ statusCode: 422, code, message });
const khoa = (message: string) => new ConflictException({ statusCode: 409, code: "DA_KHOA", message });

/** Mẫu chăm sóc theo dịch vụ: soạn nháp → duyệt → dùng để sinh lịch cho ca hoàn thành. Mẫu đã duyệt không sửa, muốn đổi thì tạo phiên bản mới. */
@Injectable()
export class CareTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  private async lamGiau(ds: Array<{ mau_id: string; dich_vu_id: string; nguoi_duyet_id: string | null }>) {
    if (ds.length === 0) return [];
    const [dv, moc, nv] = await Promise.all([
      this.prisma.dich_vu.findMany({ where: { dich_vu_id: { in: [...new Set(ds.map((m) => m.dich_vu_id))] } }, select: { dich_vu_id: true, ten_dich_vu: true } }),
      this.prisma.moc_cham_soc.findMany({ where: { mau_id: { in: ds.map((m) => m.mau_id) } }, orderBy: [{ ngay_tao: "asc" }] }),
      this.prisma.nhan_vien.findMany({ where: { nhan_vien_id: { in: ds.map((m) => m.nguoi_duyet_id).filter((x): x is string => !!x) } }, select: { nhan_vien_id: true, ho_ten: true } }),
    ]);
    const vt = await this.prisma.vai_tro.findMany({ select: { vai_tro_id: true, ma_vai_tro: true } });
    return ds.map((m) => ({
      ...m,
      ten_dich_vu: dv.find((d) => d.dich_vu_id === m.dich_vu_id)?.ten_dich_vu ?? null,
      nguoi_duyet: nv.find((n) => n.nhan_vien_id === m.nguoi_duyet_id)?.ho_ten ?? null,
      moc: moc
        .filter((x) => x.mau_id === m.mau_id)
        .sort((a, b) => tinhNgay(a.khoang_thoi_gian_sau_ca, a.don_vi) - tinhNgay(b.khoang_thoi_gian_sau_ca, b.don_vi))
        .map((x) => ({ ...x, vai_tro: vt.find((v) => v.vai_tro_id === x.vai_tro_phu_trach)?.ma_vai_tro ?? null })),
    }));
  }

  async danhSach(dichVuId?: string) {
    const ds = await this.prisma.mau_cham_soc.findMany({ where: dichVuId ? { dich_vu_id: dichVuId } : {}, orderBy: [{ dich_vu_id: "asc" }, { phien_ban: "desc" }] });
    return this.lamGiau(ds);
  }

  async chiTiet(id: string) {
    const m = await this.prisma.mau_cham_soc.findUnique({ where: { mau_id: id } });
    if (!m) throw new NotFoundException("Không tìm thấy mẫu chăm sóc");
    return (await this.lamGiau([m]))[0];
  }

  /** Tạo bản nháp mới; nếu dịch vụ đã có mẫu thì chép mốc của phiên bản gần nhất để sửa tiếp. */
  async taoNhap(user: AuthUser, dichVuId: string) {
    const dv = await this.prisma.dich_vu.findUnique({ where: { dich_vu_id: dichVuId }, select: { dich_vu_id: true } });
    if (!dv) throw new BadRequestException("Dịch vụ không tồn tại");
    const dangNhap = await this.prisma.mau_cham_soc.findFirst({ where: { dich_vu_id: dichVuId, trang_thai: "nhap" } });
    if (dangNhap) throw new ConflictException({ statusCode: 409, code: "DA_CO_BAN_NHAP", message: "Dịch vụ này đang có một bản nháp, hãy sửa hoặc duyệt bản đó." });
    const cu = await this.prisma.mau_cham_soc.findFirst({ where: { dich_vu_id: dichVuId }, orderBy: [{ phien_ban: "desc" }] });
    const id = await this.prisma.$transaction(async (tx) => {
      const mau = await tx.mau_cham_soc.create({ data: { dich_vu_id: dichVuId, phien_ban: (cu?.phien_ban ?? 0) + 1, nguoi_tao_id: user.id } });
      if (cu) {
        const moc = await tx.moc_cham_soc.findMany({ where: { mau_id: cu.mau_id }, orderBy: [{ ngay_tao: "asc" }] });
        for (const m of moc) {
          await tx.moc_cham_soc.create({
            data: { mau_id: mau.mau_id, khoang_thoi_gian_sau_ca: m.khoang_thoi_gian_sau_ca, don_vi: m.don_vi, noi_dung: m.noi_dung, loai_lien_he: m.loai_lien_he, vai_tro_phu_trach: m.vai_tro_phu_trach, nguoi_tao_id: user.id },
          });
        }
      }
      return mau.mau_id;
    });
    return this.chiTiet(id);
  }

  private async vaiTroId(ma?: string) {
    if (!ma) return undefined;
    const v = await this.prisma.vai_tro.findUnique({ where: { ma_vai_tro: ma }, select: { vai_tro_id: true } });
    if (!v) throw new BadRequestException("Vai trò phụ trách không tồn tại");
    return v.vai_tro_id;
  }

  private async mauNhap(id: string) {
    const m = await this.prisma.mau_cham_soc.findUnique({ where: { mau_id: id } });
    if (!m) throw new NotFoundException("Không tìm thấy mẫu chăm sóc");
    if (m.trang_thai !== "nhap") throw khoa("Mẫu đã duyệt hoặc đã ngừng dùng, hãy tạo phiên bản mới để sửa.");
    return m;
  }

  async themMoc(user: AuthUser, mauId: string, dto: MocDto) {
    await this.mauNhap(mauId);
    await this.prisma.moc_cham_soc.create({
      data: { mau_id: mauId, khoang_thoi_gian_sau_ca: dto.khoangThoiGian, don_vi: dto.donVi, noi_dung: dto.noiDung.trim(), loai_lien_he: dto.loaiLienHe, vai_tro_phu_trach: await this.vaiTroId(dto.vaiTroPhuTrach), nguoi_tao_id: user.id },
    });
    return this.chiTiet(mauId);
  }

  async suaMoc(mocId: string, dto: SuaMocDto) {
    const moc = await this.prisma.moc_cham_soc.findUnique({ where: { moc_id: mocId } });
    if (!moc) throw new NotFoundException("Không tìm thấy mốc chăm sóc");
    await this.mauNhap(moc.mau_id);
    await this.prisma.moc_cham_soc.update({
      where: { moc_id: mocId },
      data: {
        khoang_thoi_gian_sau_ca: dto.khoangThoiGian, don_vi: dto.donVi, noi_dung: dto.noiDung?.trim(), loai_lien_he: dto.loaiLienHe,
        vai_tro_phu_trach: dto.vaiTroPhuTrach === undefined ? undefined : (await this.vaiTroId(dto.vaiTroPhuTrach)) ?? null,
        ngay_cap_nhat: new Date(),
      },
    });
    return this.chiTiet(moc.mau_id);
  }

  async xoaMoc(mocId: string) {
    const moc = await this.prisma.moc_cham_soc.findUnique({ where: { moc_id: mocId } });
    if (!moc) throw new NotFoundException("Không tìm thấy mốc chăm sóc");
    await this.mauNhap(moc.mau_id);
    const dung = await this.prisma.cham_soc_sau_ca.count({ where: { moc_id: mocId } });
    if (dung > 0) throw khoa("Mốc này đã sinh việc chăm sóc, không xóa được.");
    await this.prisma.moc_cham_soc.deleteMany({ where: { moc_id: mocId } });
    return this.chiTiet(moc.mau_id);
  }

  /** Duyệt bản nháp: bản đã duyệt trước đó của dịch vụ tự ngừng dùng. Việc đã sinh cho các ca cũ vẫn giữ nguyên. */
  async duyet(user: AuthUser, id: string) {
    const m = await this.mauNhap(id);
    const soMoc = await this.prisma.moc_cham_soc.count({ where: { mau_id: id } });
    if (soMoc === 0) throw loi422("MAU_RONG", "Mẫu cần có ít nhất một mốc trước khi duyệt.");
    await this.prisma.$transaction(async (tx) => {
      await tx.mau_cham_soc.updateMany({ where: { dich_vu_id: m.dich_vu_id, trang_thai: "da_duyet" }, data: { trang_thai: "ngung_dung", ngay_cap_nhat: new Date() } });
      const kq = await tx.mau_cham_soc.updateMany({ where: { mau_id: id, trang_thai: "nhap" }, data: { trang_thai: "da_duyet", nguoi_duyet_id: user.id, ngay_duyet: new Date(), ngay_cap_nhat: new Date() } });
      if (kq.count !== 1) throw new ConflictException("Mẫu vừa được người khác thay đổi, hãy tải lại");
    });
    return this.chiTiet(id);
  }

  /** Bỏ bản nháp hoặc ngừng dùng bản đã duyệt. */
  async ngung(id: string) {
    const m = await this.prisma.mau_cham_soc.findUnique({ where: { mau_id: id } });
    if (!m) throw new NotFoundException("Không tìm thấy mẫu chăm sóc");
    if (m.trang_thai === "ngung_dung") throw loi422("TRANG_THAI_KHONG_HOP_LE", "Mẫu đã ngừng dùng.");
    await this.prisma.mau_cham_soc.update({ where: { mau_id: id }, data: { trang_thai: "ngung_dung", ngay_cap_nhat: new Date() } });
    return this.chiTiet(id);
  }
}

const tinhNgay = (n: number, donVi: string) => n * (donVi === "thang" ? 30 : donVi === "tuan" ? 7 : 1);
