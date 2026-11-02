import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditService } from "../../audit/audit.service.js";
import { ScopeService } from "../../common/scope.service.js";
import { phamViCua, type AuthUser, type PhamVi } from "../../common/types/auth-user.js";
import { SuaLanKhamDto, TaoLanKhamDto } from "./dto/consultation.dto.js";

const CO_HOI_KET_THUC = ["hoan_tat", "ngung_cham_soc"];
/** undefined = không đổi; chuỗi rỗng = xóa (null); còn lại = giá trị đã trim. */
const chuoi = (v: string | undefined): string | null | undefined => (v === undefined ? undefined : v.trim() === "" ? null : v.trim());

/**
 * Lần khám. Nội dung y khoa (tiền sử, dị ứng, kết quả, phương án, kết luận) chỉ trả cho người có quyền
 * ho_so_kham và trong phạm vi; mọi lần xem/ghi đều vào nhật ký truy cập. Người khác chỉ thấy "đã có lần khám".
 */
@Injectable()
export class ConsultationsService {
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

  /** Danh sách tóm tắt các lần khám của một cơ hội: KHÔNG có nội dung y khoa. */
  async theoCoHoi(user: AuthUser, pv: PhamVi, coHoiId: string) {
    await this.coHoiTrongPhamVi(user, pv, coHoiId);
    const ds = await this.prisma.lan_tham_kham.findMany({
      where: { co_hoi_id: coHoiId },
      orderBy: { thoi_diem_kham: "desc" },
      select: { tham_kham_id: true, co_hoi_id: true, lich_hen_id: true, bac_si_id: true, thoi_diem_kham: true },
    });
    const pvYKhoa = phamViCua(user, "ho_so_kham", "xem");
    const xemDuoc = pvYKhoa && ds.length
      ? await this.prisma.lan_tham_kham.findMany({ where: { AND: [{ tham_kham_id: { in: ds.map((d) => d.tham_kham_id) } }, await this.scope.lanKham(user, pvYKhoa)] }, select: { tham_kham_id: true } })
      : [];
    const nv = await this.prisma.nhan_vien.findMany({ where: { nhan_vien_id: { in: ds.map((d) => d.bac_si_id) } }, select: { nhan_vien_id: true, ho_ten: true } });
    return ds.map((d) => ({
      ...d,
      bac_si: nv.find((n) => n.nhan_vien_id === d.bac_si_id)?.ho_ten ?? null,
      xem_duoc_y_khoa: xemDuoc.some((x) => x.tham_kham_id === d.tham_kham_id),
    }));
  }

  /** Hồ sơ đầy đủ (có nội dung y khoa). Ghi nhật ký mỗi lần xem. */
  async chiTiet(user: AuthUser, pv: PhamVi, id: string) {
    const kham = await this.prisma.lan_tham_kham.findFirst({ where: { AND: [{ tham_kham_id: id }, await this.scope.lanKham(user, pv)] } });
    if (!kham) throw new NotFoundException("Không tìm thấy hồ sơ khám");
    await this.audit.ghi(user.id, "lan_tham_kham", id, "xem");
    return kham;
  }

  private async kiemTraBacSi(bacSiId: string) {
    const nv = await this.prisma.nhan_vien.findFirst({ where: { nhan_vien_id: bacSiId, trang_thai_tai_khoan: "hoat_dong" }, select: { nhan_vien_id: true } });
    if (!nv) throw new BadRequestException("Bác sĩ không tồn tại hoặc đã bị khóa");
    const vt = await this.prisma.vai_tro.findUnique({ where: { ma_vai_tro: "bac_si" }, select: { vai_tro_id: true } });
    const gan = vt ? await this.prisma.nhan_vien_vai_tro.findFirst({ where: { nhan_vien_id: bacSiId, vai_tro_id: vt.vai_tro_id }, select: { nhan_vien_id: true } }) : null;
    if (!gan) throw new BadRequestException("Nhân viên được chọn không có vai trò bác sĩ");
  }

  async tao(user: AuthUser, pv: PhamVi, dto: TaoLanKhamDto) {
    const pvCoHoi = phamViCua(user, "co_hoi", "xem");
    if (!pvCoHoi) throw new ForbiddenException("Bạn không có quyền xem cơ hội");
    const coHoi = await this.coHoiTrongPhamVi(user, pvCoHoi, dto.coHoiId);
    if (CO_HOI_KET_THUC.includes(coHoi.trang_thai)) throw new BadRequestException("Cơ hội đã kết thúc, không thể ghi lần khám");

    const bacSiId = dto.bacSiId ?? (user.vaiTro.includes("bac_si") ? user.id : undefined);
    if (!bacSiId) throw new BadRequestException("Chọn bác sĩ khám");
    if (!(await this.scope.duocGiaoCho(user, pv, bacSiId))) throw new ForbiddenException("Bạn không được ghi lần khám thay cho bác sĩ này");
    await this.kiemTraBacSi(bacSiId);

    if (dto.lichHenId) {
      const lich = await this.prisma.lich_hen.findFirst({ where: { lich_hen_id: dto.lichHenId, co_hoi_id: dto.coHoiId }, select: { lich_hen_id: true } });
      if (!lich) throw new BadRequestException("Lịch hẹn không tồn tại hoặc không thuộc cơ hội này");
    }
    const kham = await this.prisma.lan_tham_kham.create({
      data: {
        khach_hang_id: coHoi.khach_hang_id,
        co_hoi_id: dto.coHoiId,
        lich_hen_id: dto.lichHenId ?? null,
        bac_si_id: bacSiId,
        ...(dto.thoiDiemKham && { thoi_diem_kham: new Date(dto.thoiDiemKham) }),
        tien_su: chuoi(dto.tienSu),
        di_ung: chuoi(dto.diUng),
        ket_qua_tham_kham: chuoi(dto.ketQuaThamKham),
        phuong_an_de_xuat: chuoi(dto.phuongAnDeXuat),
        ket_luan_dieu_kien: chuoi(dto.ketLuanDieuKien),
        ma_ho_so_y_khoa_ngoai: chuoi(dto.maHoSoYKhoaNgoai),
        nguoi_tao_id: user.id,
      },
    });
    await this.audit.ghi(user.id, "lan_tham_kham", kham.tham_kham_id, "them");
    return kham;
  }

  async sua(user: AuthUser, pv: PhamVi, id: string, dto: SuaLanKhamDto) {
    const cu = await this.prisma.lan_tham_kham.findFirst({ where: { AND: [{ tham_kham_id: id }, await this.scope.lanKham(user, pv)] } });
    if (!cu) throw new NotFoundException("Không tìm thấy hồ sơ khám");
    const daBaoGia = await this.prisma.bao_gia.findFirst({ where: { tham_kham_id: id, trang_thai: { in: ["da_gui", "da_chap_nhan"] } }, select: { bao_gia_id: true } });
    if (daBaoGia) {
      throw new ConflictException({ statusCode: 409, code: "DA_KHOA", message: "Lần khám này đã có báo giá được gửi, không sửa được. Hãy ghi một lần khám mới." });
    }
    const kham = await this.prisma.lan_tham_kham.update({
      where: { tham_kham_id: id },
      data: {
        ...(dto.thoiDiemKham && { thoi_diem_kham: new Date(dto.thoiDiemKham) }),
        tien_su: chuoi(dto.tienSu),
        di_ung: chuoi(dto.diUng),
        ket_qua_tham_kham: chuoi(dto.ketQuaThamKham),
        phuong_an_de_xuat: chuoi(dto.phuongAnDeXuat),
        ket_luan_dieu_kien: chuoi(dto.ketLuanDieuKien),
        ma_ho_so_y_khoa_ngoai: chuoi(dto.maHoSoYKhoaNgoai),
      },
    });
    await this.audit.ghi(user.id, "lan_tham_kham", id, "sua");
    return kham;
  }
}
