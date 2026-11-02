import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { ScopeService } from "../../common/scope.service.js";
import { boQua, boTrang } from "../../common/dto/pagination.dto.js";
import { phamViCua, type AuthUser, type PhamVi } from "../../common/types/auth-user.js";
import {
  CHUYEN_LICH_HEN,
  hopLe,
  LICH_HEN_CON_HIEU_LUC,
  type TrangThaiCoHoi,
  type TrangThaiLichHen,
} from "../../common/utils/trang-thai.js";
import { DoiLichDto, DoiTrangThaiLichHenDto, TaoLichHenDto, TruyVanLichHen, TruyVanTongQuanLich } from "./dto/appointment.dto.js";

const GIO_TOI_DA = 12;
const CO_HOI_KET_THUC: TrangThaiCoHoi[] = ["hoan_tat", "ngung_cham_soc"];

function khoangNgayVN(ngay: string) {
  const batDau = new Date(`${ngay}T00:00:00+07:00`);
  if (Number.isNaN(batDau.getTime()) || new Date(batDau.getTime() + 7 * 3600_000).toISOString().slice(0, 10) !== ngay) {
    throw new BadRequestException("Ngày không hợp lệ");
  }
  return { gte: batDau, lt: new Date(batDau.getTime() + 24 * 3600_000) };
}

/** Hạn "trong ngày" theo giờ Việt Nam (UTC+7): 23:59 hôm nay, nhưng tối thiểu 2 giờ kể từ bây giờ. */
export function hanTrongNgayVN(bayGio: Date): Date {
  const lech = 7 * 3600_000;
  const vn = new Date(bayGio.getTime() + lech);
  const cuoiNgay = Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate(), 23, 59, 0) - lech;
  return new Date(Math.max(cuoiNgay, bayGio.getTime() + 2 * 3600_000));
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  async danhSach(user: AuthUser, pv: PhamVi, q: TruyVanLichHen) {
    const phamVi = await this.scope.lichHen(user, pv);
    const loc: Prisma.lich_henWhereInput = {
      ...(q.ngay ? { bat_dau: khoangNgayVN(q.ngay) } : {
        ...(q.from && { bat_dau: { gte: new Date(q.from) } }),
        ...(q.to && { ket_thuc: { lte: new Date(q.to) } }),
      }),
      ...(q.bacSiId && { bac_si_id: q.bacSiId }),
      ...(q.coSoId && { co_so_id: q.coSoId }),
      ...(q.coHoiId && { co_hoi_id: q.coHoiId }),
      ...(q.khachHangId && { khach_hang_id: q.khachHangId }),
      ...(q.q?.trim() && { khach_hang: { OR: [
        { ho_ten: { contains: q.q.trim(), mode: "insensitive" } },
        { so_dien_thoai: { contains: q.q.trim() } },
      ] } }),
      ...(q.trangThai && { trang_thai: q.trangThai }),
    };
    const where: Prisma.lich_henWhereInput = { AND: [phamVi, loc] };
    const [rows, total] = await Promise.all([
      this.prisma.lich_hen.findMany({ where, orderBy: { bat_dau: "asc" }, skip: boQua(q), take: q.pageSize }),
      this.prisma.lich_hen.count({ where }),
    ]);
    return boTrang(await this.lamGiau(rows), total, q);
  }

  async tongQuanNgay(user: AuthUser, pv: PhamVi, q: TruyVanTongQuanLich) {
    const where: Prisma.lich_henWhereInput = { AND: [await this.scope.lichHen(user, pv), {
      bat_dau: khoangNgayVN(q.ngay),
      ...(q.coSoId && { co_so_id: q.coSoId }),
    }] };
    const [trangThai, mocGio] = await Promise.all([
      this.prisma.lich_hen.groupBy({ by: ["trang_thai"], where, _count: { _all: true } }),
      this.prisma.lich_hen.findMany({ where, select: { bat_dau: true, trang_thai: true } }),
    ]);
    const theoTrangThai = Object.fromEntries(trangThai.map((x) => [x.trang_thai, x._count._all]));
    const theoKhungGio = [0, 0, 0, 0];
    for (const lich of mocGio) {
      if (lich.trang_thai === "huy" || lich.trang_thai === "da_doi_lich") continue;
      const gio = lich.bat_dau.getUTCHours() + 7;
      const gioVN = gio >= 24 ? gio - 24 : gio;
      const viTri = gioVN < 10 ? 0 : gioVN < 13 ? 1 : gioVN < 17 ? 2 : 3;
      theoKhungGio[viTri] += 1;
    }
    return { tong: mocGio.length, theoTrangThai, theoKhungGio };
  }

  async chiTiet(user: AuthUser, pv: PhamVi, id: string) {
    const lich = await this.tim(user, pv, id);
    const [giau] = await this.lamGiau([lich]);
    return giau;
  }

  private async lamGiau<T extends { khach_hang_id: string; bac_si_id: string | null; co_so_id: string }>(ds: T[]) {
    const [khach, nv, coSo] = await Promise.all([
      this.prisma.khach_hang.findMany({ where: { khach_hang_id: { in: ds.map((d) => d.khach_hang_id) } }, select: { khach_hang_id: true, ho_ten: true, so_dien_thoai: true } }),
      this.prisma.nhan_vien.findMany({ where: { nhan_vien_id: { in: ds.map((d) => d.bac_si_id).filter((x): x is string => !!x) } }, select: { nhan_vien_id: true, ho_ten: true } }),
      this.prisma.co_so.findMany({ where: { co_so_id: { in: ds.map((d) => d.co_so_id) } }, select: { co_so_id: true, ten_co_so: true } }),
    ]);
    return ds.map((d) => ({
      ...d,
      khach_hang: khach.find((k) => k.khach_hang_id === d.khach_hang_id) ?? null,
      bac_si: nv.find((n) => n.nhan_vien_id === d.bac_si_id)?.ho_ten ?? null,
      co_so: coSo.find((c) => c.co_so_id === d.co_so_id)?.ten_co_so ?? null,
    }));
  }

  private async tim(user: AuthUser, pv: PhamVi, id: string) {
    const phamVi = await this.scope.lichHen(user, pv);
    const lich = await this.prisma.lich_hen.findFirst({ where: { AND: [{ lich_hen_id: id }, phamVi] } });
    if (!lich) throw new NotFoundException("Không tìm thấy lịch hẹn");
    return lich;
  }

  private kiemTraKhungGio(batDau: Date, ketThuc: Date) {
    if (Number.isNaN(batDau.getTime()) || Number.isNaN(ketThuc.getTime())) throw new BadRequestException("Thời gian không hợp lệ");
    if (ketThuc <= batDau) throw new BadRequestException("Giờ kết thúc phải sau giờ bắt đầu");
    if (ketThuc.getTime() - batDau.getTime() > GIO_TOI_DA * 3600_000) throw new BadRequestException(`Một lịch hẹn không dài quá ${GIO_TOI_DA} giờ`);
  }

  private async kiemTraBacSi(bacSiId: string) {
    const nv = await this.prisma.nhan_vien.findFirst({ where: { nhan_vien_id: bacSiId, trang_thai_tai_khoan: "hoat_dong" }, select: { nhan_vien_id: true } });
    if (!nv) throw new BadRequestException("Bác sĩ không tồn tại hoặc đã bị khóa");
    const vt = await this.prisma.vai_tro.findUnique({ where: { ma_vai_tro: "bac_si" }, select: { vai_tro_id: true } });
    const gan = vt ? await this.prisma.nhan_vien_vai_tro.findFirst({ where: { nhan_vien_id: bacSiId, vai_tro_id: vt.vai_tro_id }, select: { nhan_vien_id: true } }) : null;
    if (!gan) throw new BadRequestException("Nhân viên được chọn không có vai trò bác sĩ");
  }

  /**
   * Kiểm tra trước để có thông báo rõ ràng. Đây KHÔNG phải rào chắn cuối cùng:
   * hai người đặt cùng lúc vẫn bị chặn bởi ràng buộc EXCLUDE trong database (migration 002 → lỗi 23P01 → 409).
   */
  private async kiemTraTrung(
    db: Pick<PrismaService, "lich_hen">,
    p: { bacSiId?: string | null; coSoId: string; phong?: string | null; batDau: Date; ketThuc: Date },
  ) {
    const chong: Prisma.lich_henWhereInput = {
      trang_thai: { in: LICH_HEN_CON_HIEU_LUC },
      bat_dau: { lt: p.ketThuc },
      ket_thuc: { gt: p.batDau },
    };
    if (p.bacSiId) {
      const t = await db.lich_hen.findFirst({ where: { ...chong, bac_si_id: p.bacSiId }, select: { lich_hen_id: true } });
      if (t) throw new ConflictException({ statusCode: 409, code: "TRUNG_LICH_BAC_SI", message: "Trùng lịch bác sĩ trong khung giờ này" });
    }
    if (p.phong) {
      const t = await db.lich_hen.findFirst({ where: { ...chong, co_so_id: p.coSoId, phong: p.phong }, select: { lich_hen_id: true } });
      if (t) throw new ConflictException({ statusCode: 409, code: "TRUNG_LICH_PHONG", message: "Trùng lịch phòng trong khung giờ này" });
    }
  }

  private kiemTraCoSo(user: AuthUser, pv: PhamVi, coSoId: string) {
    if (pv === "co_so" && coSoId !== user.coSoId) throw new ForbiddenException("Bạn chỉ được đặt lịch cho cơ sở của mình");
  }

  /** Nhắc nhân viên xác nhận/liên hệ khách; tin gửi khách là luồng khác, chỉ bật khi đã có kênh được duyệt. */
  private async taoViecNhac(db: Pick<PrismaService, "cong_viec">, p: {
    lichId: string; khachId: string; coHoiId: string; batDau: Date; nguoiNhanId: string; nguoiTaoId: string;
  }) {
    for (const [moc, soGio] of [["1-ngay", 24], ["2-gio", 2]] as const) {
      const han = new Date(p.batDau.getTime() - soGio * 3600_000);
      if (han.getTime() <= Date.now()) continue;
      await db.cong_viec.create({ data: {
        khach_hang_id: p.khachId, co_hoi_id: p.coHoiId, lich_hen_id: p.lichId,
        loai_cong_viec: "nhac_lich", noi_dung: `Liên hệ nhắc khách trước lịch hẹn ${soGio === 24 ? "1 ngày" : "2 giờ"}`,
        nguoi_phu_trach_id: p.nguoiNhanId, han_hoan_thanh: han, muc_uu_tien: "binh_thuong",
        khoa_chong_trung: `nhac-lich:${p.lichId}:${moc}`, nguoi_tao_id: p.nguoiTaoId,
      } });
    }
  }

  async tao(user: AuthUser, pv: PhamVi, dto: TaoLichHenDto) {
    const pvCoHoi = phamViCua(user, "co_hoi", "xem");
    if (!pvCoHoi) throw new ForbiddenException("Bạn không có quyền xem cơ hội");
    const coHoi = await this.prisma.co_hoi_dich_vu.findFirst({ where: { AND: [{ co_hoi_id: dto.coHoiId }, await this.scope.coHoi(user, pvCoHoi)] } });
    if (!coHoi) throw new NotFoundException("Không tìm thấy cơ hội");
    if (CO_HOI_KET_THUC.includes(coHoi.trang_thai as TrangThaiCoHoi)) throw new BadRequestException("Cơ hội đã kết thúc, không thể đặt lịch");

    if (!(await this.prisma.co_so.findUnique({ where: { co_so_id: dto.coSoId }, select: { co_so_id: true } }))) throw new BadRequestException("Cơ sở không tồn tại");
    this.kiemTraCoSo(user, pv, dto.coSoId);

    const batDau = new Date(dto.batDau);
    const ketThuc = new Date(dto.ketThuc);
    this.kiemTraKhungGio(batDau, ketThuc);
    if (dto.bacSiId) await this.kiemTraBacSi(dto.bacSiId);

    const phong = dto.phong?.trim() || null;
    await this.kiemTraTrung(this.prisma, { bacSiId: dto.bacSiId, coSoId: dto.coSoId, phong, batDau, ketThuc });

    return this.prisma.$transaction(async (tx) => {
      const lich = await tx.lich_hen.create({ data: {
        khach_hang_id: coHoi.khach_hang_id,
        co_hoi_id: coHoi.co_hoi_id,
        co_so_id: dto.coSoId,
        bac_si_id: dto.bacSiId,
        phong,
        loai_lich_hen: dto.loaiLichHen ?? "kham",
        bat_dau: batDau,
        ket_thuc: ketThuc,
        nguoi_tao_id: user.id,
      } });
      await this.taoViecNhac(tx, {
        lichId: lich.lich_hen_id, khachId: lich.khach_hang_id, coHoiId: lich.co_hoi_id,
        batDau, nguoiNhanId: coHoi.tu_van_vien_id ?? user.id, nguoiTaoId: user.id,
      });
      return lich;
    });
  }

  async doiTrangThai(user: AuthUser, pv: PhamVi, id: string, dto: DoiTrangThaiLichHenDto) {
    const cu = await this.tim(user, pv, id);
    const tu = cu.trang_thai as TrangThaiLichHen;
    const den = dto.trangThai as TrangThaiLichHen;
    const lyDo = dto.lyDo?.trim() || "";

    if (tu === den) throw new BadRequestException("Lịch hẹn đã ở trạng thái này");
    if (!hopLe(CHUYEN_LICH_HEN, tu, den)) {
      throw new BadRequestException({
        statusCode: 400,
        code: "CHUYEN_TRANG_THAI_KHONG_HOP_LE",
        message: `Không thể chuyển từ "${tu}" sang "${den}"`,
        chuyenDuocDen: CHUYEN_LICH_HEN[tu],
      });
    }
    if (den === "huy" && !lyDo) throw new BadRequestException("Cần nhập lý do hủy lịch");

    return this.prisma.$transaction(async (tx) => {
      const bayGio = new Date();
      const kq = await tx.lich_hen.updateMany({
        where: { lich_hen_id: id, trang_thai: tu },
        data: {
          trang_thai: den,
          ...(den === "huy" && { ly_do_huy: lyDo }),
          ...(den === "da_den" && { thoi_diem_den: bayGio }),
        },
      });
      if (kq.count !== 1) throw new ConflictException("Lịch hẹn vừa được người khác thay đổi, hãy tải lại");

      if (["da_den", "hoan_thanh", "huy", "khong_den"].includes(den)) {
        await tx.cong_viec.updateMany({ where: {
          lich_hen_id: id, khoa_chong_trung: { startsWith: `nhac-lich:${id}:` },
          trang_thai: { in: ["cho_lam", "dang_lam"] },
        }, data: { trang_thai: "huy", ket_qua: "Lịch hẹn đã đổi trạng thái" } });
      }

      // Khách không đến: nhắc tư vấn viên gọi sắp xếp lại trong ngày (quy trình mục 7). Khóa chống trùng → chạy lại không tạo thêm.
      if (den === "khong_den") {
        const khoa = `hen-lai:${id}`;
        if (!(await tx.cong_viec.findFirst({ where: { khoa_chong_trung: khoa }, select: { cong_viec_id: true } }))) {
          const coHoi = await tx.co_hoi_dich_vu.findUnique({ where: { co_hoi_id: cu.co_hoi_id }, select: { tu_van_vien_id: true } });
          await tx.cong_viec.create({
            data: {
              khach_hang_id: cu.khach_hang_id,
              co_hoi_id: cu.co_hoi_id,
              lich_hen_id: cu.lich_hen_id,
              loai_cong_viec: "goi_hen_lai",
              noi_dung: "Khách không đến lịch hẹn: gọi sắp xếp lại lịch",
              nguoi_phu_trach_id: coHoi?.tu_van_vien_id ?? user.id,
              han_hoan_thanh: hanTrongNgayVN(bayGio),
              muc_uu_tien: "cao",
              khoa_chong_trung: khoa,
              nguoi_tao_id: user.id,
            },
          });
        }
      }
      return tx.lich_hen.findUniqueOrThrow({ where: { lich_hen_id: id } });
    });
  }

  /** Đổi lịch: giữ lịch cũ (đánh dấu da_doi_lich), tạo lịch mới trỏ về lịch cũ, chuyển việc nhắc đang mở sang lịch mới. */
  async doiLich(user: AuthUser, pv: PhamVi, id: string, dto: DoiLichDto) {
    const cu = await this.tim(user, pv, id);
    const tu = cu.trang_thai as TrangThaiLichHen;
    if (tu !== "cho_xac_nhan" && tu !== "da_xac_nhan") throw new BadRequestException("Chỉ đổi được lịch đang chờ xác nhận hoặc đã xác nhận");

    const coSoId = dto.coSoId ?? cu.co_so_id;
    const bacSiId = dto.bacSiId ?? cu.bac_si_id;
    const phong = dto.phong === undefined ? cu.phong : dto.phong.trim() || null;
    const batDau = new Date(dto.batDau);
    const ketThuc = new Date(dto.ketThuc);
    this.kiemTraKhungGio(batDau, ketThuc);
    if (dto.coSoId && !(await this.prisma.co_so.findUnique({ where: { co_so_id: dto.coSoId }, select: { co_so_id: true } }))) throw new BadRequestException("Cơ sở không tồn tại");
    this.kiemTraCoSo(user, pv, coSoId);
    if (dto.bacSiId && dto.bacSiId !== cu.bac_si_id) await this.kiemTraBacSi(dto.bacSiId);

    // Trong một transaction: nếu lịch mới bị từ chối (trùng), lịch cũ trở lại như ban đầu.
    return this.prisma.$transaction(async (tx) => {
      const kq = await tx.lich_hen.updateMany({
        where: { lich_hen_id: id, trang_thai: tu },
        data: { trang_thai: "da_doi_lich", ly_do_huy: `Đổi lịch${dto.lyDo?.trim() ? `: ${dto.lyDo.trim()}` : ""}` },
      });
      if (kq.count !== 1) throw new ConflictException("Lịch hẹn vừa được người khác thay đổi, hãy tải lại");

      // Lịch cũ đã nhả khung giờ nên có thể dời sang khung giờ chồng lên chính nó.
      await this.kiemTraTrung(tx, { bacSiId, coSoId, phong, batDau, ketThuc });

      const moi = await tx.lich_hen.create({
        data: {
          khach_hang_id: cu.khach_hang_id,
          co_hoi_id: cu.co_hoi_id,
          co_so_id: coSoId,
          bac_si_id: bacSiId,
          phong,
          loai_lich_hen: cu.loai_lich_hen,
          bat_dau: batDau,
          ket_thuc: ketThuc,
          lich_hen_truoc_id: cu.lich_hen_id,
          nguoi_tao_id: user.id,
        },
      });
      await tx.cong_viec.updateMany({ where: {
        lich_hen_id: cu.lich_hen_id, khoa_chong_trung: { startsWith: `nhac-lich:${cu.lich_hen_id}:` },
        trang_thai: { in: ["cho_lam", "dang_lam"] },
      }, data: { trang_thai: "huy", ket_qua: "Đã đổi lịch hẹn" } });
      await tx.cong_viec.updateMany({
        where: { lich_hen_id: cu.lich_hen_id, trang_thai: { in: ["cho_lam", "dang_lam"] } },
        data: { lich_hen_id: moi.lich_hen_id },
      });
      const coHoi = await tx.co_hoi_dich_vu.findUnique({ where: { co_hoi_id: cu.co_hoi_id }, select: { tu_van_vien_id: true } });
      await this.taoViecNhac(tx, {
        lichId: moi.lich_hen_id, khachId: moi.khach_hang_id, coHoiId: moi.co_hoi_id,
        batDau, nguoiNhanId: coHoi?.tu_van_vien_id ?? user.id, nguoiTaoId: user.id,
      });
      return moi;
    });
  }
}
