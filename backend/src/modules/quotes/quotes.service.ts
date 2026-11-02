import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditService } from "../../audit/audit.service.js";
import { ScopeService } from "../../common/scope.service.js";
import { phamViCua, type AuthUser, type PhamVi } from "../../common/types/auth-user.js";
import { HIEU_LUC_MAC_DINH_NGAY, NGUONG_GIAM_GIA_PHAN_TRAM, type TrangThaiBaoGia } from "../../common/utils/trang-thai.js";
import { HangMucDto, SuaBaoGiaDto, TaoBaoGiaDto } from "./dto/quote.dto.js";
import { tongHopTien } from "../payments/tong-hop.js";
import { giamQuaMuc, tinhBaoGia } from "./tinh-tien.js";

const NGAY_MS = 86_400_000;
const CO_HOI_KET_THUC = ["hoan_tat", "ngung_cham_soc"];
const so = (v: { toString(): string } | number | string): number => Number(v.toString());

interface HangMucDaTinh { dich_vu_id: string; ten: string; so_luong: number; don_gia: number; giam_gia: number }

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  // ---------- đọc ----------

  /** Cơ hội trong phạm vi của quyền hiện tại, nếu không thì 404 (không lộ sự tồn tại). */
  private async coHoiTrongPhamVi(user: AuthUser, pv: PhamVi, coHoiId: string) {
    const co = await this.prisma.co_hoi_dich_vu.findFirst({ where: { AND: [{ co_hoi_id: coHoiId }, await this.scope.coHoi(user, pv)] } });
    if (!co) throw new NotFoundException("Không tìm thấy cơ hội");
    return co;
  }

  private async timBaoGia(user: AuthUser, pv: PhamVi, id: string) {
    const bg = await this.prisma.bao_gia.findUnique({ where: { bao_gia_id: id } });
    if (!bg) throw new NotFoundException("Không tìm thấy báo giá");
    const coHoi = await this.coHoiTrongPhamVi(user, pv, bg.co_hoi_id).catch(() => {
      throw new NotFoundException("Không tìm thấy báo giá");
    });
    return { bg, coHoi };
  }

  /** Gắn hạng mục, tổng tiền và thông tin lần khám (chỉ tóm tắt, KHÔNG có nội dung y khoa). */
  private async lamGiau(ds: Array<NonNullable<Awaited<ReturnType<PrismaService["bao_gia"]["findUnique"]>>>>) {
    if (ds.length === 0) return [];
    const ids = ds.map((b) => b.bao_gia_id);
    const [items, kham] = await Promise.all([
      this.prisma.chi_tiet_bao_gia.findMany({ where: { bao_gia_id: { in: ids } }, orderBy: { ngay_tao: "asc" } }),
      this.prisma.lan_tham_kham.findMany({ where: { tham_kham_id: { in: ds.map((b) => b.tham_kham_id) } }, select: { tham_kham_id: true, bac_si_id: true, thoi_diem_kham: true } }),
    ]);
    const nguoiIds = [...new Set([...ds.map((b) => b.nguoi_lap_id), ...kham.map((k) => k.bac_si_id)].filter((x): x is string => !!x))];
    const nv = await this.prisma.nhan_vien.findMany({ where: { nhan_vien_id: { in: nguoiIds } }, select: { nhan_vien_id: true, ho_ten: true } });
    const ten = (id: string | null) => nv.find((n) => n.nhan_vien_id === id)?.ho_ten ?? null;
    const bayGio = Date.now();
    return ds.map((b) => {
      const hm = items.filter((i) => i.bao_gia_id === b.bao_gia_id).map((i) => ({
        chi_tiet_bao_gia_id: i.chi_tiet_bao_gia_id,
        dich_vu_id: i.dich_vu_id,
        ten_hang_muc: i.ten_hang_muc_tai_thoi_diem_bao_gia,
        so_luong: i.so_luong,
        don_gia: so(i.don_gia),
        giam_gia: so(i.giam_gia),
        // Cột sinh sẵn có thể được Prisma khai báo tùy chọn: nếu thiếu thì tính lại bằng đúng công thức của DB.
        thanh_tien: i.thanh_tien == null ? i.so_luong * so(i.don_gia) - so(i.giam_gia) : so(i.thanh_tien),
      }));
      const tien = tinhBaoGia(hm.map((h) => ({ soLuong: h.so_luong, donGia: h.don_gia, giamGia: h.giam_gia })));
      const k = kham.find((x) => x.tham_kham_id === b.tham_kham_id);
      return {
        bao_gia_id: b.bao_gia_id,
        co_hoi_id: b.co_hoi_id,
        tham_kham_id: b.tham_kham_id,
        phien_ban: b.phien_ban,
        trang_thai: b.trang_thai,
        ngay_lap: b.ngay_lap,
        hieu_luc_den: b.hieu_luc_den,
        khach_xac_nhan_luc: b.khach_xac_nhan_luc,
        nguoi_lap: ten(b.nguoi_lap_id),
        // Báo giá đã gửi nhưng quá hạn: coi như hết hạn khi hiển thị và khi chấp nhận.
        da_het_han: b.trang_thai === "da_gui" && !!b.hieu_luc_den && b.hieu_luc_den.getTime() < bayGio,
        tham_kham: k ? { tham_kham_id: k.tham_kham_id, bac_si: ten(k.bac_si_id), thoi_diem_kham: k.thoi_diem_kham } : null,
        hang_muc: hm,
        tong_goc: tien.tongGoc,
        tong_giam: tien.tongGiam,
        tong: tien.tong,
      };
    });
  }

  async theoCoHoi(user: AuthUser, pv: PhamVi, coHoiId: string) {
    await this.coHoiTrongPhamVi(user, pv, coHoiId);
    const ds = await this.prisma.bao_gia.findMany({ where: { co_hoi_id: coHoiId }, orderBy: { phien_ban: "desc" } });
    return this.lamGiau(ds);
  }

  async chiTiet(user: AuthUser, pv: PhamVi, id: string) {
    const { bg } = await this.timBaoGia(user, pv, id);
    return (await this.lamGiau([bg]))[0];
  }

  // ---------- chuẩn bị dữ liệu ghi ----------

  /** Kiểm tra hạng mục và chụp lại tên/giá tại thời điểm lập. Tiền do backend tính lại, không nhận số tổng từ client. */
  private async chuanBiHangMuc(hangMuc: HangMucDto[]): Promise<HangMucDaTinh[]> {
    const ids = [...new Set(hangMuc.map((h) => h.dichVuId))];
    const dv = await this.prisma.dich_vu.findMany({ where: { dich_vu_id: { in: ids } }, select: { dich_vu_id: true, ten_dich_vu: true, dang_hoat_dong: true } });
    const ds = hangMuc.map((h) => {
      const d = dv.find((x) => x.dich_vu_id === h.dichVuId);
      if (!d) throw new BadRequestException("Có dịch vụ trong báo giá không tồn tại");
      if (!d.dang_hoat_dong) throw new BadRequestException(`Dịch vụ “${d.ten_dich_vu}” đã ngừng sử dụng`);
      return { dich_vu_id: d.dich_vu_id, ten: (h.tenHangMuc ?? d.ten_dich_vu).trim(), so_luong: h.soLuong, don_gia: h.donGia, giam_gia: h.giamGia ?? 0 };
    });
    try {
      tinhBaoGia(ds.map((h) => ({ soLuong: h.so_luong, donGia: h.don_gia, giamGia: h.giam_gia })));
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    return ds;
  }

  private async kiemTraKham(thamKhamId: string, coHoiId: string) {
    const k = await this.prisma.lan_tham_kham.findFirst({ where: { tham_kham_id: thamKhamId, co_hoi_id: coHoiId }, select: { tham_kham_id: true } });
    if (!k) throw new BadRequestException("Lần khám không tồn tại hoặc không thuộc cơ hội này");
  }

  private kiemTraHieuLuc(hieuLucDen?: string | null): Date | null {
    if (!hieuLucDen) return null;
    const d = new Date(hieuLucDen);
    if (Number.isNaN(d.getTime())) throw new BadRequestException("Hạn hiệu lực không hợp lệ");
    if (d.getTime() <= Date.now()) throw new BadRequestException("Hạn hiệu lực phải ở tương lai");
    return d;
  }

  private async phienBanTiepTheo(db: Pick<PrismaService, "bao_gia">, coHoiId: string): Promise<number> {
    const moiNhat = await db.bao_gia.findFirst({ where: { co_hoi_id: coHoiId }, orderBy: { phien_ban: "desc" }, select: { phien_ban: true } });
    return (moiNhat?.phien_ban ?? 0) + 1;
  }

  private async khongCoBanNhap(coHoiId: string) {
    const nhap = await this.prisma.bao_gia.findFirst({ where: { co_hoi_id: coHoiId, trang_thai: "nhap" }, select: { phien_ban: true } });
    if (nhap) {
      throw new ConflictException({
        statusCode: 409,
        code: "DA_CO_BAN_NHAP",
        message: `Cơ hội đang có bản nháp phiên bản ${nhap.phien_ban}. Hoàn tất hoặc hủy bản nháp đó trước.`,
      });
    }
  }

  private async ghiHangMuc(db: Pick<PrismaService, "chi_tiet_bao_gia">, baoGiaId: string, hm: HangMucDaTinh[], nguoiId: string) {
    if (hm.length === 0) return;
    await db.chi_tiet_bao_gia.createMany({
      data: hm.map((h) => ({
        bao_gia_id: baoGiaId,
        dich_vu_id: h.dich_vu_id,
        ten_hang_muc_tai_thoi_diem_bao_gia: h.ten,
        so_luong: h.so_luong,
        don_gia: h.don_gia,
        giam_gia: h.giam_gia,
        nguoi_tao_id: nguoiId,
      })),
    });
  }

  // ---------- ghi ----------

  async tao(user: AuthUser, pv: PhamVi, dto: TaoBaoGiaDto) {
    const coHoi = await this.coHoiTrongPhamVi(user, pv, dto.coHoiId);
    if (CO_HOI_KET_THUC.includes(coHoi.trang_thai)) throw new BadRequestException("Cơ hội đã kết thúc, không thể lập báo giá");
    await this.kiemTraKham(dto.thamKhamId, dto.coHoiId);
    const hieuLuc = this.kiemTraHieuLuc(dto.hieuLucDen);
    const hm = await this.chuanBiHangMuc(dto.hangMuc);
    await this.khongCoBanNhap(dto.coHoiId);

    const id = await this.prisma.$transaction(async (tx) => {
      const bg = await tx.bao_gia.create({
        data: {
          co_hoi_id: dto.coHoiId,
          tham_kham_id: dto.thamKhamId,
          phien_ban: await this.phienBanTiepTheo(tx, dto.coHoiId),
          hieu_luc_den: hieuLuc,
          nguoi_lap_id: user.id,
          nguoi_tao_id: user.id,
        },
      });
      await this.ghiHangMuc(tx, bg.bao_gia_id, hm, user.id);
      return bg.bao_gia_id;
    });
    return this.chiTiet(user, pv, id);
  }

  /** Bản mới từ một báo giá đã gửi/chấp nhận/hết hạn…: sao chép hạng mục để chỉnh, bản cũ giữ nguyên. */
  async taoPhienBanMoi(user: AuthUser, pv: PhamVi, id: string) {
    const { bg, coHoi } = await this.timBaoGia(user, pv, id);
    if (CO_HOI_KET_THUC.includes(coHoi.trang_thai)) throw new BadRequestException("Cơ hội đã kết thúc, không thể lập báo giá");
    if (bg.trang_thai === "nhap") throw new BadRequestException("Báo giá này vẫn là bản nháp, hãy sửa trực tiếp");
    await this.khongCoBanNhap(bg.co_hoi_id);

    const cu = await this.prisma.chi_tiet_bao_gia.findMany({ where: { bao_gia_id: bg.bao_gia_id }, orderBy: { ngay_tao: "asc" } });
    const hm: HangMucDaTinh[] = cu.map((i) => ({ dich_vu_id: i.dich_vu_id, ten: i.ten_hang_muc_tai_thoi_diem_bao_gia, so_luong: i.so_luong, don_gia: so(i.don_gia), giam_gia: so(i.giam_gia) }));
    const moiId = await this.prisma.$transaction(async (tx) => {
      const moi = await tx.bao_gia.create({
        data: {
          co_hoi_id: bg.co_hoi_id,
          tham_kham_id: bg.tham_kham_id,
          phien_ban: await this.phienBanTiepTheo(tx, bg.co_hoi_id),
          nguoi_lap_id: user.id,
          nguoi_tao_id: user.id,
        },
      });
      await this.ghiHangMuc(tx, moi.bao_gia_id, hm, user.id);
      return moi.bao_gia_id;
    });
    return this.chiTiet(user, pv, moiId);
  }

  private choPhepSuaNhap(trangThai: string) {
    if (trangThai !== "nhap") {
      throw new ConflictException({ statusCode: 409, code: "DA_KHOA", message: "Báo giá đã gửi, không sửa được. Hãy tạo phiên bản mới." });
    }
  }

  async sua(user: AuthUser, pv: PhamVi, id: string, dto: SuaBaoGiaDto) {
    const { bg } = await this.timBaoGia(user, pv, id);
    this.choPhepSuaNhap(bg.trang_thai);
    if (dto.thamKhamId) await this.kiemTraKham(dto.thamKhamId, bg.co_hoi_id);
    const hieuLuc = this.kiemTraHieuLuc(dto.hieuLucDen);
    const hm = dto.hangMuc ? await this.chuanBiHangMuc(dto.hangMuc) : null;

    await this.prisma.$transaction(async (tx) => {
      // Điều kiện trang_thai = nhap: nếu vừa có người gửi thì không ghi đè.
      const kq = await tx.bao_gia.updateMany({
        where: { bao_gia_id: id, trang_thai: "nhap" },
        data: { ...(dto.thamKhamId && { tham_kham_id: dto.thamKhamId }), ...(hieuLuc && { hieu_luc_den: hieuLuc }) },
      });
      if (kq.count !== 1) throw new ConflictException("Báo giá vừa được người khác thay đổi, hãy tải lại");
      if (hm) {
        await tx.chi_tiet_bao_gia.deleteMany({ where: { bao_gia_id: id } });
        await this.ghiHangMuc(tx, id, hm, user.id);
      }
    });
    return this.chiTiet(user, pv, id);
  }

  async gui(user: AuthUser, pv: PhamVi, id: string) {
    const { bg, coHoi } = await this.timBaoGia(user, pv, id);
    if (bg.trang_thai !== "nhap") throw new UnprocessableEntityException({ statusCode: 422, code: "TRANG_THAI_KHONG_HOP_LE", message: "Chỉ gửi được báo giá đang ở trạng thái nháp" });
    if (CO_HOI_KET_THUC.includes(coHoi.trang_thai)) throw new BadRequestException("Cơ hội đã kết thúc, không thể gửi báo giá");

    const items = await this.prisma.chi_tiet_bao_gia.findMany({ where: { bao_gia_id: id } });
    if (items.length === 0) throw new BadRequestException("Báo giá chưa có hạng mục nào");
    const tien = tinhBaoGia(items.map((i) => ({ soLuong: i.so_luong, donGia: so(i.don_gia), giamGia: so(i.giam_gia) })));
    if (tien.tong <= 0) throw new BadRequestException("Tổng báo giá phải lớn hơn 0");

    if (giamQuaMuc(tien.tongGoc, tien.tongGiam, NGUONG_GIAM_GIA_PHAN_TRAM) && phamViCua(user, "bao_gia", "duyet") === null) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "GIAM_GIA_VUOT_MUC",
        message: `Giảm giá vượt ${NGUONG_GIAM_GIA_PHAN_TRAM}% tổng giá trị, cần quản lý duyệt và gửi.`,
      });
    }

    const bayGio = new Date();
    let hieuLuc = bg.hieu_luc_den;
    if (hieuLuc && hieuLuc.getTime() <= bayGio.getTime()) throw new BadRequestException("Hạn hiệu lực đã qua, hãy đặt hạn mới trước khi gửi");
    hieuLuc ??= new Date(bayGio.getTime() + HIEU_LUC_MAC_DINH_NGAY * NGAY_MS);

    await this.prisma.$transaction(async (tx) => {
      const kq = await tx.bao_gia.updateMany({ where: { bao_gia_id: id, trang_thai: "nhap" }, data: { trang_thai: "da_gui", hieu_luc_den: hieuLuc } });
      if (kq.count !== 1) throw new ConflictException("Báo giá vừa được người khác thay đổi, hãy tải lại");
      // Bản gửi trước đó (chưa được chấp nhận) bị thay thế bởi bản mới.
      await tx.bao_gia.updateMany({ where: { co_hoi_id: bg.co_hoi_id, trang_thai: "da_gui", bao_gia_id: { not: id } }, data: { trang_thai: "da_thay_the" } });
    });
    await this.audit.ghi(user.id, "bao_gia", id, "sua");
    return this.chiTiet(user, pv, id);
  }

  async chapNhan(user: AuthUser, pv: PhamVi, id: string) {
    const { bg, coHoi } = await this.timBaoGia(user, pv, id);
    if (bg.trang_thai !== "da_gui") throw new UnprocessableEntityException({ statusCode: 422, code: "TRANG_THAI_KHONG_HOP_LE", message: "Chỉ chấp nhận được báo giá đã gửi cho khách" });
    if (CO_HOI_KET_THUC.includes(coHoi.trang_thai)) throw new BadRequestException("Cơ hội đã kết thúc");

    const bayGio = new Date();
    if (bg.hieu_luc_den && bg.hieu_luc_den.getTime() < bayGio.getTime()) {
      // Ghi nhận hết hạn rồi mới báo lỗi (nằm ngoài transaction để không bị hoàn tác).
      await this.prisma.bao_gia.updateMany({ where: { bao_gia_id: id, trang_thai: "da_gui" }, data: { trang_thai: "het_han" } });
      throw new UnprocessableEntityException({ statusCode: 422, code: "BAO_GIA_HET_HAN", message: "Báo giá đã hết hạn. Hãy tạo phiên bản mới." });
    }

    // Bản cũ đã thu tiền: không thay thế ngầm, tránh tiền nằm ở báo giá không còn hiệu lực.
    const cu = await this.prisma.bao_gia.findMany({ where: { co_hoi_id: bg.co_hoi_id, trang_thai: "da_chap_nhan", bao_gia_id: { not: id } }, select: { bao_gia_id: true } });
    const tien = await tongHopTien(this.prisma, cu.map((c) => c.bao_gia_id));
    if ([...tien.values()].some((t) => t.thucThu > 0)) {
      throw new UnprocessableEntityException({ statusCode: 422, code: "BAO_GIA_CU_DA_THU_TIEN", message: "Báo giá đang hiệu lực đã thu tiền. Hãy hoàn tiền trước khi chấp nhận phiên bản mới." });
    }

    await this.prisma.$transaction(async (tx) => {
      // Mỗi cơ hội chỉ có một bản được chấp nhận: bản chấp nhận trước đó trở thành "đã thay thế".
      await tx.bao_gia.updateMany({ where: { co_hoi_id: bg.co_hoi_id, trang_thai: "da_chap_nhan", bao_gia_id: { not: id } }, data: { trang_thai: "da_thay_the" } });
      const kq = await tx.bao_gia.updateMany({ where: { bao_gia_id: id, trang_thai: "da_gui" }, data: { trang_thai: "da_chap_nhan", khach_xac_nhan_luc: bayGio } });
      if (kq.count !== 1) throw new ConflictException("Báo giá vừa được người khác thay đổi, hãy tải lại");
    });
    await this.audit.ghi(user.id, "bao_gia", id, "sua");
    return this.chiTiet(user, pv, id);
  }

  async huy(user: AuthUser, pv: PhamVi, id: string) {
    const { bg } = await this.timBaoGia(user, pv, id);
    if (!["nhap", "da_gui"].includes(bg.trang_thai as TrangThaiBaoGia)) {
      throw new UnprocessableEntityException({ statusCode: 422, code: "TRANG_THAI_KHONG_HOP_LE", message: "Chỉ hủy được báo giá nháp hoặc đã gửi. Báo giá đã chấp nhận chỉ được thay bằng phiên bản mới." });
    }
    const kq = await this.prisma.bao_gia.updateMany({ where: { bao_gia_id: id, trang_thai: bg.trang_thai }, data: { trang_thai: "huy" } });
    if (kq.count !== 1) throw new ConflictException("Báo giá vừa được người khác thay đổi, hãy tải lại");
    await this.audit.ghi(user.id, "bao_gia", id, "sua");
    return this.chiTiet(user, pv, id);
  }
}
