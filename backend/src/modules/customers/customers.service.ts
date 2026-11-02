import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditService } from "../../audit/audit.service.js";
import { ScopeService } from "../../common/scope.service.js";
import { boQua, boTrang } from "../../common/dto/pagination.dto.js";
import { chuanHoaSdt, chuanHoaSdtTimKiem } from "../../common/utils/so-dien-thoai.js";
import { phamViCua, type AuthUser, type PhamVi } from "../../common/types/auth-user.js";
import { SuaKhachHangDto, TaoKhachHangDto, TruyVanKhachHang } from "./dto/customer.dto.js";

/** undefined = không đổi; chuỗi rỗng = xóa (null); còn lại = giá trị đã trim. */
const chuoi = (v: string | undefined): string | null | undefined => (v === undefined ? undefined : v.trim() === "" ? null : v.trim());

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  async danhSach(user: AuthUser, pv: PhamVi, q: TruyVanKhachHang) {
    const phamVi = await this.scope.khachHang(user, pv);
    const tim: Prisma.khach_hangWhereInput[] = [];
    const tuKhoa = q.q?.trim();
    if (tuKhoa) {
      tim.push({ ho_ten: { contains: tuKhoa, mode: "insensitive" } }, { email: { contains: tuKhoa, mode: "insensitive" } }, { zalo_id: { contains: tuKhoa, mode: "insensitive" } });
      const sdt = chuanHoaSdtTimKiem(tuKhoa);
      if (sdt) tim.push({ so_dien_thoai_chuan: { contains: sdt } });
    }
    const where: Prisma.khach_hangWhereInput = { AND: [phamVi, tim.length ? { OR: tim } : {}] };
    const [items, total] = await Promise.all([
      this.prisma.khach_hang.findMany({ where, orderBy: { ngay_tao: "desc" }, skip: boQua(q), take: q.pageSize }),
      this.prisma.khach_hang.count({ where }),
    ]);
    return boTrang(items, total, q);
  }

  async chiTiet(user: AuthUser, pv: PhamVi, id: string) {
    const phamVi = await this.scope.khachHang(user, pv);
    const khach = await this.prisma.khach_hang.findFirst({ where: { AND: [{ khach_hang_id: id }, phamVi] } });
    if (!khach) throw new NotFoundException("Không tìm thấy khách hàng");

    // Cơ hội của khách: chỉ trả phần user được xem (và chỉ khi có quyền xem cơ hội).
    const pvCoHoi = phamViCua(user, "co_hoi", "xem");
    const coHoi = pvCoHoi
      ? await this.prisma.co_hoi_dich_vu.findMany({
          where: { AND: [{ khach_hang_id: id }, await this.scope.coHoi(user, pvCoHoi)] },
          orderBy: { ngay_tiep_nhan: "desc" },
        })
      : undefined;

    // Xem diện rộng (toàn hệ thống) phải để lại dấu vết.
    if (pv === "toan_bo") await this.audit.ghi(user.id, "khach_hang", id, "xem");
    return { ...khach, co_hoi: coHoi };
  }

  /** Tìm hồ sơ trùng số điện thoại (đã chuẩn hóa) hoặc email, loại trừ `loaiTruId`. */
  private async timTrung(sdt: string | null | undefined, email: string | null | undefined, loaiTruId?: string): Promise<string[]> {
    const dieuKien: Prisma.khach_hangWhereInput[] = [];
    const chuan = chuanHoaSdt(sdt);
    if (chuan) dieuKien.push({ so_dien_thoai_chuan: chuan });
    if (email) dieuKien.push({ email: { equals: email, mode: "insensitive" } });
    if (!dieuKien.length) return [];
    const rows = await this.prisma.khach_hang.findMany({
      where: { AND: [{ OR: dieuKien }, loaiTruId ? { NOT: { khach_hang_id: loaiTruId } } : {}] },
      select: { khach_hang_id: true },
    });
    return rows.map((r) => r.khach_hang_id);
  }

  /** Báo trùng. Hồ sơ ngoài phạm vi chỉ được báo là "có trùng", không lộ danh tính. */
  private async baoTrung(user: AuthUser, pv: PhamVi, trungIds: string[]): Promise<never> {
    const phamVi = await this.scope.khachHang(user, pv);
    const trongPhamVi = await this.prisma.khach_hang.findMany({
      where: { AND: [{ khach_hang_id: { in: trungIds } }, phamVi] },
      select: { khach_hang_id: true, ho_ten: true, so_dien_thoai: true, email: true },
    });
    throw new ConflictException({
      statusCode: 409,
      code: "TRUNG_KHACH",
      message: "Số điện thoại hoặc email đã có trong hồ sơ khác. Nếu là người thân dùng chung, gửi lại với xacNhanTrungSo = true.",
      khachTrung: trongPhamVi,
      soHoSoNgoaiPhamVi: trungIds.length - trongPhamVi.length,
    });
  }

  private async kiemTraThamChieu(user: AuthUser, pv: PhamVi, nguonId?: string, gioiThieuId?: string, chinhId?: string) {
    if (nguonId && !(await this.prisma.nguon_khach.findUnique({ where: { nguon_id: nguonId } }))) {
      throw new BadRequestException("Nguồn khách không tồn tại");
    }
    if (gioiThieuId) {
      if (gioiThieuId === chinhId) throw new BadRequestException("Khách không thể tự giới thiệu chính mình");
      const phamVi = await this.scope.khachHang(user, pv);
      const co = await this.prisma.khach_hang.findFirst({ where: { AND: [{ khach_hang_id: gioiThieuId }, phamVi] }, select: { khach_hang_id: true } });
      if (!co) throw new BadRequestException("Khách giới thiệu không tồn tại");
    }
  }

  async tao(user: AuthUser, pv: PhamVi, dto: TaoKhachHangDto) {
    const sdt = chuoi(dto.soDienThoai);
    const email = chuoi(dto.email);
    const zalo = chuoi(dto.zaloId);
    if (!sdt && !email && !zalo) throw new BadRequestException("Cần ít nhất một kênh liên hệ: số điện thoại, email hoặc Zalo");

    await this.kiemTraThamChieu(user, pv, dto.nguonDauTienId, dto.khachGioiThieuId);
    const trung = await this.timTrung(sdt, email);
    if (trung.length && !dto.xacNhanTrungSo) await this.baoTrung(user, pv, trung);

    return this.prisma.khach_hang.create({
      data: {
        ho_ten: dto.hoTen.trim(),
        so_dien_thoai: sdt,
        email,
        zalo_id: zalo,
        ngay_sinh: dto.ngaySinh ? new Date(dto.ngaySinh) : undefined,
        khu_vuc: chuoi(dto.khuVuc),
        kenh_lien_he_uu_tien: chuoi(dto.kenhLienHeUuTien),
        khung_gio_lien_he: chuoi(dto.khungGioLienHe),
        nguon_dau_tien_id: dto.nguonDauTienId,
        khach_gioi_thieu_id: dto.khachGioiThieuId,
        // Người tạo là người phụ trách mặc định để họ thấy được hồ sơ trong phạm vi "được giao".
        nhan_vien_phu_trach_id: user.id,
        nguoi_tao_id: user.id,
      },
    });
  }

  async sua(user: AuthUser, pv: PhamVi, id: string, dto: SuaKhachHangDto) {
    const phamVi = await this.scope.khachHang(user, pv);
    const cu = await this.prisma.khach_hang.findFirst({ where: { AND: [{ khach_hang_id: id }, phamVi] } });
    if (!cu) throw new NotFoundException("Không tìm thấy khách hàng");

    const sdt = chuoi(dto.soDienThoai);
    const email = chuoi(dto.email);
    const zalo = chuoi(dto.zaloId);
    const sdtMoi = sdt === undefined ? cu.so_dien_thoai : sdt;
    const emailMoi = email === undefined ? cu.email : email;
    const zaloMoi = zalo === undefined ? cu.zalo_id : zalo;
    if (!sdtMoi && !emailMoi && !zaloMoi) throw new BadRequestException("Hồ sơ phải còn ít nhất một kênh liên hệ");

    await this.kiemTraThamChieu(user, pv, dto.nguonDauTienId, dto.khachGioiThieuId, id);
    if ((sdt !== undefined || email !== undefined) && !dto.xacNhanTrungSo) {
      const trung = await this.timTrung(sdtMoi, emailMoi, id);
      if (trung.length) await this.baoTrung(user, pv, trung);
    }

    return this.prisma.khach_hang.update({
      where: { khach_hang_id: id },
      data: {
        ho_ten: dto.hoTen?.trim(),
        so_dien_thoai: sdt,
        email,
        zalo_id: zalo,
        ngay_sinh: dto.ngaySinh === undefined ? undefined : dto.ngaySinh.trim() === "" ? null : new Date(dto.ngaySinh),
        khu_vuc: chuoi(dto.khuVuc),
        kenh_lien_he_uu_tien: chuoi(dto.kenhLienHeUuTien),
        khung_gio_lien_he: chuoi(dto.khungGioLienHe),
        nguon_dau_tien_id: dto.nguonDauTienId,
        khach_gioi_thieu_id: dto.khachGioiThieuId,
      },
    });
  }
}
