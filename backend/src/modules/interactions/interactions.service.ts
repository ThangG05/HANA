import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { ScopeService } from "../../common/scope.service.js";
import { boQua, boTrang } from "../../common/dto/pagination.dto.js";
import { phamViCua, type AuthUser, type PhamVi } from "../../common/types/auth-user.js";
import { TaoTuongTacDto, TruyVanTuongTac } from "./dto/interaction.dto.js";

@Injectable()
export class InteractionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  async danhSach(user: AuthUser, pv: PhamVi, q: TruyVanTuongTac) {
    const phamVi = await this.scope.tuongTac(user, pv);
    const loc: Prisma.tuong_tacWhereInput = {
      ...(q.khachHangId && { khach_hang_id: q.khachHangId }),
      ...(q.coHoiId && { co_hoi_id: q.coHoiId }),
    };
    const where: Prisma.tuong_tacWhereInput = { AND: [phamVi, loc] };
    const [rows, total] = await Promise.all([
      this.prisma.tuong_tac.findMany({ where, orderBy: { thoi_diem: "desc" }, skip: boQua(q), take: q.pageSize }),
      this.prisma.tuong_tac.count({ where }),
    ]);
    const nv = await this.prisma.nhan_vien.findMany({
      where: { nhan_vien_id: { in: rows.map((r) => r.nhan_vien_id).filter((x): x is string => !!x) } },
      select: { nhan_vien_id: true, ho_ten: true },
    });
    const items = rows.map((r) => ({ ...r, nhan_vien: nv.find((n) => n.nhan_vien_id === r.nhan_vien_id)?.ho_ten ?? null }));
    return boTrang(items, total, q);
  }

  async tao(user: AuthUser, dto: TaoTuongTacDto) {
    // Chống ghi trùng khi tích hợp: cùng (hệ thống nguồn, mã sự kiện) thì trả bản ghi đã có.
    if (!!dto.heThongNguon !== !!dto.maSuKienNgoai) throw new BadRequestException("heThongNguon và maSuKienNgoai phải đi cùng nhau");
    if (dto.heThongNguon && dto.maSuKienNgoai) {
      const daCo = await this.prisma.tuong_tac.findFirst({ where: { he_thong_nguon: dto.heThongNguon, ma_su_kien_ngoai: dto.maSuKienNgoai } });
      if (daCo) return daCo;
    }

    // Phải xem được khách thì mới ghi tương tác cho khách.
    const pvKhach = phamViCua(user, "khach_hang", "xem");
    if (!pvKhach) throw new ForbiddenException("Bạn không có quyền xem khách hàng");
    const khach = await this.prisma.khach_hang.findFirst({
      where: { AND: [{ khach_hang_id: dto.khachHangId }, await this.scope.khachHang(user, pvKhach)] },
      select: { khach_hang_id: true },
    });
    if (!khach) throw new NotFoundException("Không tìm thấy khách hàng");

    if (dto.coHoiId) {
      const pvCoHoi = phamViCua(user, "co_hoi", "xem");
      if (!pvCoHoi) throw new ForbiddenException("Bạn không có quyền xem cơ hội");
      const co = await this.prisma.co_hoi_dich_vu.findFirst({
        where: { AND: [{ co_hoi_id: dto.coHoiId }, await this.scope.coHoi(user, pvCoHoi)] },
        select: { khach_hang_id: true },
      });
      if (!co) throw new NotFoundException("Không tìm thấy cơ hội");
      if (co.khach_hang_id !== dto.khachHangId) throw new BadRequestException("Cơ hội không thuộc khách hàng này");
    }

    const thoiDiem = dto.thoiDiem ? new Date(dto.thoiDiem) : new Date();
    if (thoiDiem.getTime() > Date.now() + 5 * 60_000) throw new BadRequestException("Thời điểm tương tác không được ở tương lai");

    return this.prisma.tuong_tac.create({
      data: {
        khach_hang_id: dto.khachHangId,
        co_hoi_id: dto.coHoiId,
        nhan_vien_id: user.id,
        kenh: dto.kenh,
        chieu: dto.chieu,
        thoi_diem: thoiDiem,
        thoi_luong_giay: dto.thoiLuongGiay,
        noi_dung_tom_tat: dto.noiDungTomTat?.trim() || undefined,
        ket_qua: dto.ketQua?.trim() || undefined,
        la_tu_dong: false,
        he_thong_nguon: dto.heThongNguon,
        ma_su_kien_ngoai: dto.maSuKienNgoai,
        nguoi_tao_id: user.id,
      },
    });
  }
}
