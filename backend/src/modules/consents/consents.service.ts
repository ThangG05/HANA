import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { ScopeService } from "../../common/scope.service.js";
import { AuditService } from "../../audit/audit.service.js";
import type { AuthUser, PhamVi } from "../../common/types/auth-user.js";
import { GhiDongYDto } from "./dto/consent.dto.js";

@Injectable()
export class ConsentsService {
  constructor(private readonly prisma: PrismaService, private readonly scope: ScopeService, private readonly audit: AuditService) {}

  private async khachTrongPhamVi(user: AuthUser, pv: PhamVi, id: string) {
    const khach = await this.prisma.khach_hang.findFirst({ where: { AND: [{ khach_hang_id: id }, await this.scope.khachHang(user, pv)] }, select: { khach_hang_id: true } });
    if (!khach) throw new NotFoundException("Không tìm thấy khách hàng");
  }

  async danhSach(user: AuthUser, pv: PhamVi, khachId: string) {
    await this.khachTrongPhamVi(user, pv, khachId);
    const ds = await this.prisma.dong_y.findMany({ where: { khach_hang_id: khachId }, orderBy: { thoi_diem_dong_y: "desc" } });
    await this.audit.ghi(user.id, "dong_y", khachId, "xem");
    return ds.map((d) => ({
      dong_y_id: d.dong_y_id, khach_hang_id: d.khach_hang_id, ca_id: d.ca_id,
      muc_dich: d.muc_dich, trang_thai: d.trang_thai, phien_ban_noi_dung: d.phien_ban_noi_dung,
      thoi_diem_dong_y: d.thoi_diem_dong_y, thoi_diem_rut_lai: d.thoi_diem_rut_lai,
      // Nhân viên chỉ có quyền xem hồ sơ khách không cần xem tham chiếu chứng cứ riêng tư.
      bang_chung: user.quyen.some((q) => q.doi_tuong === "khach_hang" && q.hanh_dong === "sua") ? d.bang_chung : null,
    }));
  }

  async ghi(user: AuthUser, pv: PhamVi, khachId: string, dto: GhiDongYDto) {
    await this.khachTrongPhamVi(user, pv, khachId);
    if (!dto.phienBanNoiDung.trim() || !dto.bangChung.trim()) throw new BadRequestException("Cần phiên bản nội dung và bằng chứng đồng ý");
    if (dto.caId) {
      const ca = await this.prisma.ca_thuc_hien.findFirst({ where: { ca_id: dto.caId, khach_hang_id: khachId }, select: { ca_id: true } });
      if (!ca) throw new BadRequestException("Ca thực hiện không thuộc khách hàng này");
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT khach_hang_id FROM public.khach_hang WHERE khach_hang_id = ${khachId}::uuid FOR UPDATE`;
      const daCo = await tx.dong_y.findFirst({ where: {
        khach_hang_id: khachId, muc_dich: dto.mucDich, ca_id: dto.caId ?? null,
        trang_thai: "dong_y", thoi_diem_rut_lai: null,
      }, select: { dong_y_id: true } });
      if (daCo) throw new ConflictException("Mục đích này đã có đồng ý còn hiệu lực; hãy rút lại trước khi ghi phiên bản mới");
      const banGhi = await tx.dong_y.create({ data: {
        khach_hang_id: khachId, ca_id: dto.caId ?? null, muc_dich: dto.mucDich,
        phien_ban_noi_dung: dto.phienBanNoiDung.trim(), bang_chung: dto.bangChung.trim(),
        nguoi_tao_id: user.id,
      } });
      await this.audit.ghi(user.id, "dong_y", banGhi.dong_y_id, "them", tx);
      return banGhi;
    });
  }

  async rutLai(user: AuthUser, pv: PhamVi, khachId: string, dongYId: string) {
    await this.khachTrongPhamVi(user, pv, khachId);
    return this.prisma.$transaction(async (tx) => {
      const kq = await tx.dong_y.updateMany({ where: {
        dong_y_id: dongYId, khach_hang_id: khachId, trang_thai: "dong_y", thoi_diem_rut_lai: null,
      }, data: { trang_thai: "rut_lai", thoi_diem_rut_lai: new Date() } });
      if (kq.count !== 1) throw new ConflictException("Đồng ý đã được rút hoặc vừa được người khác xử lý");
      await this.audit.ghi(user.id, "dong_y", dongYId, "sua", tx);
      return tx.dong_y.findUniqueOrThrow({ where: { dong_y_id: dongYId } });
    });
  }
}
