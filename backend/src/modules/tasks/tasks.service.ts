import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { ScopeService } from "../../common/scope.service.js";
import { boQua, boTrang } from "../../common/dto/pagination.dto.js";
import { phamViCua, type AuthUser, type PhamVi } from "../../common/types/auth-user.js";
import { CHUYEN_CONG_VIEC, hopLe, type TrangThaiCongViec } from "../../common/utils/trang-thai.js";
import { SuaCongViecDto, TaoCongViecDto, TruyVanCongViec } from "./dto/task.dto.js";

const CHUA_XONG: TrangThaiCongViec[] = ["cho_lam", "dang_lam"];

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  async danhSach(user: AuthUser, pv: PhamVi, q: TruyVanCongViec) {
    const phamVi = await this.scope.congViec(user, pv);
    const loc: Prisma.cong_viecWhereInput = {
      ...(q.trangThai && { trang_thai: q.trangThai }),
      ...(q.nguoiPhuTrachId && { nguoi_phu_trach_id: q.nguoiPhuTrachId }),
      ...(q.khachHangId && { khach_hang_id: q.khachHangId }),
      ...(q.cuaToi && { nguoi_phu_trach_id: user.id }),
      ...(q.quaHan && { trang_thai: { in: CHUA_XONG }, han_hoan_thanh: { lt: new Date() } }),
    };
    const where: Prisma.cong_viecWhereInput = { AND: [phamVi, loc] };
    const [rows, total] = await Promise.all([
      this.prisma.cong_viec.findMany({ where, orderBy: { han_hoan_thanh: "asc" }, skip: boQua(q), take: q.pageSize }),
      this.prisma.cong_viec.count({ where }),
    ]);
    const [khach, nv] = await Promise.all([
      this.prisma.khach_hang.findMany({ where: { khach_hang_id: { in: rows.map((r) => r.khach_hang_id) } }, select: { khach_hang_id: true, ho_ten: true } }),
      this.prisma.nhan_vien.findMany({ where: { nhan_vien_id: { in: rows.map((r) => r.nguoi_phu_trach_id).filter((x): x is string => !!x) } }, select: { nhan_vien_id: true, ho_ten: true } }),
    ]);
    const items = rows.map((r) => ({
      ...r,
      khach_hang: khach.find((k) => k.khach_hang_id === r.khach_hang_id)?.ho_ten ?? null,
      nguoi_phu_trach: nv.find((n) => n.nhan_vien_id === r.nguoi_phu_trach_id)?.ho_ten ?? null,
    }));
    return boTrang(items, total, q);
  }

  /** Nhân viên nhận việc phải đang hoạt động và trong phạm vi giao việc của người dùng. */
  private async kiemTraNguoiNhan(user: AuthUser, pv: PhamVi, nguoiNhanId: string) {
    const nv = await this.prisma.nhan_vien.findFirst({ where: { nhan_vien_id: nguoiNhanId, trang_thai_tai_khoan: "hoat_dong" }, select: { nhan_vien_id: true } });
    if (!nv) throw new BadRequestException("Nhân viên nhận việc không tồn tại hoặc đã bị khóa");
    if (!(await this.scope.duocGiaoCho(user, pv, nguoiNhanId))) throw new ForbiddenException("Bạn không được giao việc cho nhân viên này");
  }

  async tao(user: AuthUser, pv: PhamVi, dto: TaoCongViecDto) {
    if (dto.khoaChongTrung) {
      const daCo = await this.prisma.cong_viec.findFirst({ where: { khoa_chong_trung: dto.khoaChongTrung } });
      if (daCo) return daCo;
    }
    if (dto.lichHenId && !dto.coHoiId) throw new BadRequestException("Gắn lịch hẹn thì cần có coHoiId");

    const pvKhach = phamViCua(user, "khach_hang", "xem");
    if (!pvKhach) throw new ForbiddenException("Bạn không có quyền xem khách hàng");
    const khach = await this.prisma.khach_hang.findFirst({
      where: { AND: [{ khach_hang_id: dto.khachHangId }, await this.scope.khachHang(user, pvKhach)] },
      select: { khach_hang_id: true },
    });
    if (!khach) throw new NotFoundException("Không tìm thấy khách hàng");

    if (dto.coHoiId) {
      const co = await this.prisma.co_hoi_dich_vu.findFirst({ where: { co_hoi_id: dto.coHoiId, khach_hang_id: dto.khachHangId }, select: { co_hoi_id: true } });
      if (!co) throw new BadRequestException("Cơ hội không thuộc khách hàng này");
    }
    if (dto.lichHenId) {
      const lich = await this.prisma.lich_hen.findFirst({ where: { lich_hen_id: dto.lichHenId, co_hoi_id: dto.coHoiId, khach_hang_id: dto.khachHangId }, select: { lich_hen_id: true } });
      if (!lich) throw new BadRequestException("Lịch hẹn không thuộc cơ hội/khách hàng này");
    }

    const nguoiNhan = dto.nguoiPhuTrachId ?? user.id;
    if (nguoiNhan !== user.id) await this.kiemTraNguoiNhan(user, pv, nguoiNhan);

    return this.prisma.cong_viec.create({
      data: {
        khach_hang_id: dto.khachHangId,
        co_hoi_id: dto.coHoiId,
        lich_hen_id: dto.lichHenId,
        loai_cong_viec: dto.loaiCongViec.trim(),
        noi_dung: dto.noiDung.trim(),
        nguoi_phu_trach_id: nguoiNhan,
        han_hoan_thanh: new Date(dto.hanHoanThanh),
        muc_uu_tien: dto.mucUuTien,
        khoa_chong_trung: dto.khoaChongTrung,
        nguoi_tao_id: user.id,
      },
    });
  }

  async sua(user: AuthUser, pv: PhamVi, id: string, dto: SuaCongViecDto) {
    const phamVi = await this.scope.congViec(user, pv);
    const cu = await this.prisma.cong_viec.findFirst({ where: { AND: [{ cong_viec_id: id }, phamVi] } });
    if (!cu) throw new NotFoundException("Không tìm thấy công việc");

    const tu = cu.trang_thai as TrangThaiCongViec;
    if (!CHUA_XONG.includes(tu)) throw new BadRequestException("Công việc đã kết thúc, không thể chỉnh sửa");

    const den = (dto.trangThai as TrangThaiCongViec | undefined) ?? tu;
    if (den !== tu && !hopLe(CHUYEN_CONG_VIEC, tu, den)) throw new BadRequestException(`Không thể chuyển từ "${tu}" sang "${den}"`);
    const ketQua = dto.ketQua?.trim() || cu.ket_qua || "";
    if (den === "hoan_thanh" && !ketQua) throw new BadRequestException("Cần nhập kết quả khi hoàn thành công việc");

    if (dto.nguoiPhuTrachId && dto.nguoiPhuTrachId !== cu.nguoi_phu_trach_id) await this.kiemTraNguoiNhan(user, pv, dto.nguoiPhuTrachId);

    return this.prisma.cong_viec.update({
      where: { cong_viec_id: id },
      data: {
        noi_dung: dto.noiDung?.trim(),
        han_hoan_thanh: dto.hanHoanThanh ? new Date(dto.hanHoanThanh) : undefined,
        muc_uu_tien: dto.mucUuTien,
        nguoi_phu_trach_id: dto.nguoiPhuTrachId,
        trang_thai: den !== tu ? den : undefined,
        ket_qua: dto.ketQua === undefined ? undefined : dto.ketQua.trim() || null,
        hoan_thanh_luc: den === "hoan_thanh" ? new Date() : undefined,
      },
    });
  }
}
