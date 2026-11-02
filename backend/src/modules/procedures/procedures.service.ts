import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditService } from "../../audit/audit.service.js";
import { ScopeService } from "../../common/scope.service.js";
import { phamViCua, type AuthUser, type PhamVi } from "../../common/types/auth-user.js";
import { CHUYEN_CA, COC_TOI_THIEU_PHAN_TRAM_KHI_BAT_DAU_CA, TRANG_THAI_CO_HOI_DUOC_BAT_DAU_CA, type TrangThaiCa } from "../../common/utils/trang-thai.js";
import { sinhLichChamSoc } from "../care/cham-soc.sinh-lich.js";
import { tongHopTien } from "../payments/tong-hop.js";
import { BatDauCaDto, DoiLichCaDto, GhiYKhoaCaDto, HoanThanhCaDto, TaoCaDto } from "./dto/procedure.dto.js";

const CO_HOI_KET_THUC = ["hoan_tat", "ngung_cham_soc"];
const chuoi = (v: string | undefined): string | null | undefined => (v === undefined ? undefined : v.trim() === "" ? null : v.trim());
const trong = (v: string | null | undefined) => !v || v.trim() === "";
const loi422 = (code: string, message: string) => new UnprocessableEntityException({ statusCode: 422, code, message });

type CaRow = NonNullable<Awaited<ReturnType<PrismaService["ca_thuc_hien"]["findUnique"]>>>;

/**
 * Ca thực hiện. Lịch/trạng thái ai có quyền xem cơ hội đều thấy; nội dung y khoa của ca (kiểm tra trước ca,
 * kỹ thuật, hướng dẫn sau ca) theo quyền ho_so_kham và phạm vi bác sĩ, mọi lần xem/ghi đều vào nhật ký truy cập.
 */
@Injectable()
export class ProceduresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  private async coHoiTrongPhamVi(user: AuthUser, pv: PhamVi, coHoiId: string) {
    const co = await this.prisma.co_hoi_dich_vu.findFirst({ where: { AND: [{ co_hoi_id: coHoiId }, await this.scope.coHoi(user, pv)] } });
    if (!co) throw new NotFoundException("Không tìm thấy cơ hội");
    return co;
  }

  /** Ca mà người dùng được XEM: cơ hội của nó nằm trong phạm vi xem cơ hội. Ngoài phạm vi thì 404. */
  private async timCaDeXem(user: AuthUser, id: string) {
    const ca = await this.prisma.ca_thuc_hien.findUnique({ where: { ca_id: id } });
    const pvCoHoi = phamViCua(user, "co_hoi", "xem");
    if (!ca || !pvCoHoi) throw new NotFoundException("Không tìm thấy ca thực hiện");
    await this.coHoiTrongPhamVi(user, pvCoHoi, ca.co_hoi_id).catch(() => {
      throw new NotFoundException("Không tìm thấy ca thực hiện");
    });
    return ca;
  }

  /** Ca mà người dùng được THAY ĐỔI theo phạm vi của quyền (dựa trên bác sĩ phụ trách ca). */
  private async timCaDeSua(user: AuthUser, pv: PhamVi, id: string) {
    const ca = await this.prisma.ca_thuc_hien.findFirst({ where: { AND: [{ ca_id: id }, await this.scope.caThucHien(user, pv)] } });
    if (!ca) throw new NotFoundException("Không tìm thấy ca thực hiện");
    return ca;
  }

  private choPhep(ca: CaRow, den: TrangThaiCa) {
    if (!CHUYEN_CA[ca.trang_thai as TrangThaiCa]?.includes(den)) {
      throw loi422("TRANG_THAI_KHONG_HOP_LE", `Ca đang ở trạng thái "${ca.trang_thai}", không chuyển sang "${den}" được.`);
    }
  }

  // ---------- đọc ----------

  private async lamGiau(ds: CaRow[], user: AuthUser) {
    if (ds.length === 0) return [];
    const [hm, nv, cs] = await Promise.all([
      this.prisma.chi_tiet_bao_gia.findMany({ where: { chi_tiet_bao_gia_id: { in: ds.map((c) => c.chi_tiet_bao_gia_id) } }, select: { chi_tiet_bao_gia_id: true, ten_hang_muc_tai_thoi_diem_bao_gia: true } }),
      this.prisma.nhan_vien.findMany({ where: { nhan_vien_id: { in: [...new Set(ds.flatMap((c) => [c.bac_si_id, c.nguoi_ban_giao_id]).filter((x): x is string => !!x))] } }, select: { nhan_vien_id: true, ho_ten: true } }),
      this.prisma.co_so.findMany({ where: { co_so_id: { in: [...new Set(ds.map((c) => c.co_so_id))] } }, select: { co_so_id: true, ten_co_so: true } }),
    ]);
    const pvYK = phamViCua(user, "ho_so_kham", "xem");
    const xemDuoc = pvYK ? await this.prisma.ca_thuc_hien.findMany({ where: { AND: [{ ca_id: { in: ds.map((c) => c.ca_id) } }, await this.scope.caThucHien(user, pvYK)] }, select: { ca_id: true } }) : [];
    return ds.map((c) => ({
      ca_id: c.ca_id,
      co_hoi_id: c.co_hoi_id,
      bao_gia_id: c.bao_gia_id,
      chi_tiet_bao_gia_id: c.chi_tiet_bao_gia_id,
      ten_hang_muc: hm.find((h) => h.chi_tiet_bao_gia_id === c.chi_tiet_bao_gia_id)?.ten_hang_muc_tai_thoi_diem_bao_gia ?? null,
      bac_si_id: c.bac_si_id,
      bac_si: nv.find((n) => n.nhan_vien_id === c.bac_si_id)?.ho_ten ?? null,
      co_so_id: c.co_so_id,
      co_so: cs.find((s) => s.co_so_id === c.co_so_id)?.ten_co_so ?? null,
      du_kien_luc: c.du_kien_luc,
      bat_dau_luc: c.bat_dau_luc,
      ket_thuc_luc: c.ket_thuc_luc,
      trang_thai: c.trang_thai,
      nguoi_ban_giao: nv.find((n) => n.nhan_vien_id === c.nguoi_ban_giao_id)?.ho_ten ?? null,
      xem_duoc_y_khoa: xemDuoc.some((x) => x.ca_id === c.ca_id),
    }));
  }

  /** Danh sách ca của một cơ hội: KHÔNG có nội dung y khoa. */
  async theoCoHoi(user: AuthUser, pv: PhamVi, coHoiId: string) {
    await this.coHoiTrongPhamVi(user, pv, coHoiId);
    const ds = await this.prisma.ca_thuc_hien.findMany({ where: { co_hoi_id: coHoiId }, orderBy: [{ ngay_tao: "asc" }] });
    return this.lamGiau(ds, user);
  }

  /** Chi tiết ca; phần y khoa chỉ có khi người xem có quyền (và được ghi nhật ký). */
  async chiTiet(user: AuthUser, id: string) {
    const ca = await this.timCaDeXem(user, id);
    const [co] = await this.lamGiau([ca], user);
    if (!co.xem_duoc_y_khoa) return co;
    await this.audit.ghi(user.id, "ca_thuc_hien", id, "xem");
    return { ...co, kiem_tra_truoc_ca: ca.kiem_tra_truoc_ca, ky_thuat_thuc_hien: ca.ky_thuat_thuc_hien, huong_dan_sau_ca: ca.huong_dan_sau_ca };
  }

  // ---------- ghi ----------

  private async kiemTraBacSi(bacSiId: string) {
    const nv = await this.prisma.nhan_vien.findFirst({ where: { nhan_vien_id: bacSiId, trang_thai_tai_khoan: "hoat_dong" }, select: { nhan_vien_id: true } });
    if (!nv) throw new BadRequestException("Bác sĩ không tồn tại hoặc đã bị khóa");
    const vt = await this.prisma.vai_tro.findUnique({ where: { ma_vai_tro: "bac_si" }, select: { vai_tro_id: true } });
    const gan = vt ? await this.prisma.nhan_vien_vai_tro.findFirst({ where: { nhan_vien_id: bacSiId, vai_tro_id: vt.vai_tro_id }, select: { nhan_vien_id: true } }) : null;
    if (!gan) throw new BadRequestException("Nhân viên được chọn không có vai trò bác sĩ");
  }

  private async kiemTraCoSo(coSoId: string) {
    if (!(await this.prisma.co_so.findUnique({ where: { co_so_id: coSoId }, select: { co_so_id: true } }))) throw new BadRequestException("Cơ sở không tồn tại");
  }

  async tao(user: AuthUser, pv: PhamVi, dto: TaoCaDto) {
    const pvCoHoi = phamViCua(user, "co_hoi", "xem");
    if (!pvCoHoi) throw new ForbiddenException("Bạn không có quyền xem cơ hội");
    const bg = await this.prisma.bao_gia.findUnique({ where: { bao_gia_id: dto.baoGiaId } });
    if (!bg) throw new NotFoundException("Không tìm thấy báo giá");
    const coHoi = await this.coHoiTrongPhamVi(user, pvCoHoi, bg.co_hoi_id).catch(() => {
      throw new NotFoundException("Không tìm thấy báo giá");
    });
    if (CO_HOI_KET_THUC.includes(coHoi.trang_thai)) throw new BadRequestException("Cơ hội đã kết thúc, không thể lập ca");
    if (bg.trang_thai !== "da_chap_nhan") throw loi422("BAO_GIA_CHUA_CHAP_NHAN", "Chỉ lập ca trên báo giá đã được khách chấp nhận.");
    const hm = await this.prisma.chi_tiet_bao_gia.findFirst({ where: { chi_tiet_bao_gia_id: dto.chiTietBaoGiaId, bao_gia_id: bg.bao_gia_id }, select: { chi_tiet_bao_gia_id: true } });
    if (!hm) throw new BadRequestException("Hạng mục không thuộc báo giá này");

    const bacSiId = dto.bacSiId ?? (user.vaiTro.includes("bac_si") ? user.id : undefined);
    if (!bacSiId) throw new BadRequestException("Chọn bác sĩ thực hiện");
    if (!(await this.scope.duocGiaoCho(user, pv, bacSiId))) throw new ForbiddenException("Bạn không được lập ca cho bác sĩ này");
    await this.kiemTraBacSi(bacSiId);
    const coSoId = dto.coSoId ?? user.coSoId;
    if (!coSoId) throw new BadRequestException("Chọn cơ sở thực hiện");
    await this.kiemTraCoSo(coSoId);

    const ca = await this.prisma.ca_thuc_hien.create({
      data: {
        khach_hang_id: coHoi.khach_hang_id, co_hoi_id: coHoi.co_hoi_id, tham_kham_id: bg.tham_kham_id, bao_gia_id: bg.bao_gia_id,
        chi_tiet_bao_gia_id: dto.chiTietBaoGiaId, bac_si_id: bacSiId, co_so_id: coSoId,
        du_kien_luc: dto.duKienLuc ? new Date(dto.duKienLuc) : null, nguoi_tao_id: user.id,
      },
    });
    await this.audit.ghi(user.id, "ca_thuc_hien", ca.ca_id, "them");
    return (await this.lamGiau([ca], user))[0];
  }

  async doiLich(user: AuthUser, pv: PhamVi, id: string, dto: DoiLichCaDto) {
    const ca = await this.timCaDeSua(user, pv, id);
    if (!["du_kien", "hoan"].includes(ca.trang_thai)) throw loi422("TRANG_THAI_KHONG_HOP_LE", "Chỉ đổi lịch được khi ca đang dự kiến hoặc hoãn.");
    if (dto.bacSiId && dto.bacSiId !== ca.bac_si_id) {
      if (!(await this.scope.duocGiaoCho(user, pv, dto.bacSiId))) throw new ForbiddenException("Bạn không được giao ca cho bác sĩ này");
      await this.kiemTraBacSi(dto.bacSiId);
    }
    if (dto.coSoId) await this.kiemTraCoSo(dto.coSoId);
    const kq = await this.prisma.ca_thuc_hien.updateMany({
      where: { ca_id: id, trang_thai: ca.trang_thai },
      data: {
        ...(dto.duKienLuc && { du_kien_luc: new Date(dto.duKienLuc) }),
        ...(dto.bacSiId && { bac_si_id: dto.bacSiId }),
        ...(dto.coSoId && { co_so_id: dto.coSoId }),
        ...(ca.trang_thai === "hoan" && { trang_thai: "du_kien" }),
      },
    });
    if (kq.count !== 1) throw new ConflictException("Ca vừa được người khác thay đổi, hãy tải lại");
    await this.audit.ghi(user.id, "ca_thuc_hien", id, "sua");
    return (await this.lamGiau([await this.prisma.ca_thuc_hien.findUniqueOrThrow({ where: { ca_id: id } })], user))[0];
  }

  private async chuyen(user: AuthUser, ca: CaRow, den: TrangThaiCa, them: Record<string, unknown> = {}) {
    this.choPhep(ca, den);
    const kq = await this.prisma.ca_thuc_hien.updateMany({ where: { ca_id: ca.ca_id, trang_thai: ca.trang_thai }, data: { trang_thai: den, ...them } });
    if (kq.count !== 1) throw new ConflictException("Ca vừa được người khác thay đổi, hãy tải lại");
    await this.audit.ghi(user.id, "ca_thuc_hien", ca.ca_id, "sua");
    return (await this.lamGiau([await this.prisma.ca_thuc_hien.findUniqueOrThrow({ where: { ca_id: ca.ca_id } })], user))[0];
  }

  async hoan(user: AuthUser, pv: PhamVi, id: string) {
    return this.chuyen(user, await this.timCaDeSua(user, pv, id), "hoan");
  }

  async huy(user: AuthUser, pv: PhamVi, id: string) {
    return this.chuyen(user, await this.timCaDeSua(user, pv, id), "huy");
  }

  /** Ghi nội dung y khoa của ca (quyền ho_so_kham). Không sửa kiểm tra trước ca sau khi đã bắt đầu. */
  async ghiYKhoa(user: AuthUser, pv: PhamVi, id: string, dto: GhiYKhoaCaDto) {
    const ca = await this.timCaDeSua(user, pv, id);
    if (["hoan_thanh", "huy"].includes(ca.trang_thai)) throw new ConflictException({ statusCode: 409, code: "DA_KHOA", message: "Ca đã kết thúc, không sửa được." });
    if (ca.trang_thai === "dang_thuc_hien" && dto.kiemTraTruocCa !== undefined) {
      throw new ConflictException({ statusCode: 409, code: "DA_KHOA", message: "Ca đã bắt đầu, không sửa được phần kiểm tra trước ca." });
    }
    await this.prisma.ca_thuc_hien.update({
      where: { ca_id: id },
      data: { kiem_tra_truoc_ca: chuoi(dto.kiemTraTruocCa), ky_thuat_thuc_hien: chuoi(dto.kyThuatThucHien), huong_dan_sau_ca: chuoi(dto.huongDanSauCa) },
    });
    await this.audit.ghi(user.id, "ca_thuc_hien", id, "sua");
    return this.chiTiet(user, id);
  }

  async batDau(user: AuthUser, pv: PhamVi, id: string, dto: BatDauCaDto) {
    const ca = await this.timCaDeSua(user, pv, id);
    this.choPhep(ca, "dang_thuc_hien");
    if (trong(ca.kiem_tra_truoc_ca)) throw loi422("CAN_KIEM_TRA_TRUOC_CA", "Cần ghi kiểm tra trước ca trước khi bắt đầu.");
    const [bg, coHoi] = await Promise.all([
      this.prisma.bao_gia.findUniqueOrThrow({ where: { bao_gia_id: ca.bao_gia_id } }),
      this.prisma.co_hoi_dich_vu.findUniqueOrThrow({ where: { co_hoi_id: ca.co_hoi_id } }),
    ]);
    if (bg.trang_thai !== "da_chap_nhan") throw loi422("BAO_GIA_KHONG_CON_HIEU_LUC", "Báo giá của ca này không còn hiệu lực (đã được thay bằng phiên bản khác). Hủy ca và lập lại trên báo giá mới.");
    if (!TRANG_THAI_CO_HOI_DUOC_BAT_DAU_CA.includes(coHoi.trang_thai)) throw loi422("CO_HOI_CHUA_CHOT", "Cơ hội chưa ở trạng thái Đã chốt, chưa bắt đầu ca được.");
    if (COC_TOI_THIEU_PHAN_TRAM_KHI_BAT_DAU_CA > 0) {
      const t = (await tongHopTien(this.prisma, [bg.bao_gia_id])).get(bg.bao_gia_id)!;
      const can = Math.ceil((t.tong * COC_TOI_THIEU_PHAN_TRAM_KHI_BAT_DAU_CA) / 100);
      if (t.thucThu < can) throw loi422("CAN_THANH_TOAN", `Chưa thể bắt đầu ca: cần thu tối thiểu ${COC_TOI_THIEU_PHAN_TRAM_KHI_BAT_DAU_CA}% (${can.toLocaleString("vi-VN")} đ), hiện đã thu ${t.thucThu.toLocaleString("vi-VN")} đ.`);
    }
    return this.chuyen(user, ca, "dang_thuc_hien", { bat_dau_luc: dto.batDauLuc ? new Date(dto.batDauLuc) : new Date() });
  }

  async hoanThanh(user: AuthUser, pv: PhamVi, id: string, dto: HoanThanhCaDto) {
    const ca = await this.timCaDeSua(user, pv, id);
    this.choPhep(ca, "hoan_thanh");
    if (trong(ca.ky_thuat_thuc_hien) || trong(ca.huong_dan_sau_ca)) throw loi422("CAN_GHI_CHEP_CA", "Cần ghi kỹ thuật thực hiện và hướng dẫn sau ca trước khi hoàn thành.");
    const ketThuc = dto.ketThucLuc ? new Date(dto.ketThucLuc) : new Date();
    if (!ca.bat_dau_luc || ketThuc.getTime() <= ca.bat_dau_luc.getTime()) throw new BadRequestException("Giờ kết thúc phải sau giờ bắt đầu");
    const kq = await this.chuyen(user, ca, "hoan_thanh", { ket_thuc_luc: ketThuc, nguoi_ban_giao_id: user.id });
    // Sinh lịch chăm sóc theo mẫu đã duyệt. Lỗi ở đây không làm mất việc hoàn thành ca; có thể sinh lại bằng POST procedures/:id/care/generate.
    try { await sinhLichChamSoc(this.prisma, ca.ca_id, user.id); } catch (e) { console.error("Không sinh được lịch chăm sóc cho ca", ca.ca_id, e); }
    return kq;
  }
}
