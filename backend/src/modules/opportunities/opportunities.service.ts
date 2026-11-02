import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditService } from "../../audit/audit.service.js";
import { ScopeService } from "../../common/scope.service.js";
import { boQua, boTrang } from "../../common/dto/pagination.dto.js";
import { phamViCua, type AuthUser, type PhamVi } from "../../common/types/auth-user.js";
import {
  CAN_LY_DO_CO_HOI,
  COC_TOI_THIEU_PHAN_TRAM_KHI_CHOT,
  CHUYEN_CO_HOI,
  hopLe,
  TRANG_THAI_CO_HOI_CAN_BAO_GIA,
  type TrangThaiCoHoi,
} from "../../common/utils/trang-thai.js";
import { tongHopTien } from "../payments/tong-hop.js";
import { DoiTrangThaiCoHoiDto, PhanCongCoHoiDto, SuaCoHoiDto, TaoCoHoiDto, TruyVanCoHoi } from "./dto/opportunity.dto.js";

const KET_THUC: TrangThaiCoHoi[] = ["hoan_tat", "ngung_cham_soc"];

@Injectable()
export class OpportunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  /** Gắn tên khách, dịch vụ, tư vấn viên để màn hình danh sách không phải gọi thêm API. */
  private async lamGiau<T extends { khach_hang_id: string; dich_vu_id: string; tu_van_vien_id: string | null }>(ds: T[]) {
    const [khach, dichVu, nv] = await Promise.all([
      this.prisma.khach_hang.findMany({ where: { khach_hang_id: { in: ds.map((d) => d.khach_hang_id) } }, select: { khach_hang_id: true, ho_ten: true, so_dien_thoai: true } }),
      this.prisma.dich_vu.findMany({ where: { dich_vu_id: { in: ds.map((d) => d.dich_vu_id) } }, select: { dich_vu_id: true, ten_dich_vu: true, nhom_dich_vu: true } }),
      this.prisma.nhan_vien.findMany({ where: { nhan_vien_id: { in: ds.map((d) => d.tu_van_vien_id).filter((x): x is string => !!x) } }, select: { nhan_vien_id: true, ho_ten: true } }),
    ]);
    return ds.map((d) => ({
      ...d,
      khach_hang: khach.find((k) => k.khach_hang_id === d.khach_hang_id) ?? null,
      dich_vu: dichVu.find((v) => v.dich_vu_id === d.dich_vu_id) ?? null,
      tu_van_vien: nv.find((n) => n.nhan_vien_id === d.tu_van_vien_id) ?? null,
    }));
  }

  async danhSach(user: AuthUser, pv: PhamVi, q: TruyVanCoHoi) {
    const phamVi = await this.scope.coHoi(user, pv);
    const loc: Prisma.co_hoi_dich_vuWhereInput = {
      ...(q.trangThai && { trang_thai: q.trangThai }),
      ...(q.tuVanVienId && { tu_van_vien_id: q.tuVanVienId }),
      ...(q.khachHangId && { khach_hang_id: q.khachHangId }),
      ...(q.dichVuId && { dich_vu_id: q.dichVuId }),
    };
    const where: Prisma.co_hoi_dich_vuWhereInput = { AND: [phamVi, loc] };
    const [items, total] = await Promise.all([
      this.prisma.co_hoi_dich_vu.findMany({ where, orderBy: { ngay_tiep_nhan: "desc" }, skip: boQua(q), take: q.pageSize }),
      this.prisma.co_hoi_dich_vu.count({ where }),
    ]);
    return boTrang(await this.lamGiau(items), total, q);
  }

  private async tim(user: AuthUser, pv: PhamVi, id: string) {
    const phamVi = await this.scope.coHoi(user, pv);
    const co = await this.prisma.co_hoi_dich_vu.findFirst({ where: { AND: [{ co_hoi_id: id }, phamVi] } });
    if (!co) throw new NotFoundException("Không tìm thấy cơ hội");
    return co;
  }

  async chiTiet(user: AuthUser, pv: PhamVi, id: string) {
    const co = await this.tim(user, pv, id);
    const lichSu = await this.prisma.lich_su_trang_thai.findMany({ where: { co_hoi_id: id }, orderBy: { thoi_diem: "asc" } });
    const nv = await this.prisma.nhan_vien.findMany({
      where: { nhan_vien_id: { in: lichSu.map((l) => l.nguoi_thay_doi_id).filter((x): x is string => !!x) } },
      select: { nhan_vien_id: true, ho_ten: true },
    });
    if (pv === "toan_bo") await this.audit.ghi(user.id, "co_hoi", id, "xem");
    const [giau] = await this.lamGiau([co]);
    return {
      ...giau,
      lich_su: lichSu.map((l) => ({ ...l, nguoi_thay_doi: nv.find((n) => n.nhan_vien_id === l.nguoi_thay_doi_id)?.ho_ten ?? null })),
      chuyen_duoc_den: CHUYEN_CO_HOI[co.trang_thai as TrangThaiCoHoi] ?? [],
    };
  }

  private kiemTraNganSach(tu?: number | null, den?: number | null) {
    if (tu != null && den != null && tu > den) throw new BadRequestException("Ngân sách từ phải nhỏ hơn hoặc bằng ngân sách đến");
  }

  /** Nhân viên được giao phải đang hoạt động và nằm trong phạm vi giao việc của người dùng. */
  private async kiemTraNguoiNhan(user: AuthUser, pvDuyet: PhamVi, nguoiNhanId: string) {
    const nv = await this.prisma.nhan_vien.findFirst({ where: { nhan_vien_id: nguoiNhanId, trang_thai_tai_khoan: "hoat_dong" }, select: { nhan_vien_id: true } });
    if (!nv) throw new BadRequestException("Nhân viên được giao không tồn tại hoặc đã bị khóa");
    if (!(await this.scope.duocGiaoCho(user, pvDuyet, nguoiNhanId))) throw new ForbiddenException("Bạn không được giao cho nhân viên này");
  }

  async tao(user: AuthUser, pv: PhamVi, dto: TaoCoHoiDto) {
    // Phải xem được khách thì mới tạo cơ hội cho khách đó.
    const pvKhach = phamViCua(user, "khach_hang", "xem");
    if (!pvKhach) throw new ForbiddenException("Bạn không có quyền xem khách hàng");
    const khach = await this.prisma.khach_hang.findFirst({ where: { AND: [{ khach_hang_id: dto.khachHangId }, await this.scope.khachHang(user, pvKhach)] } });
    if (!khach) throw new NotFoundException("Không tìm thấy khách hàng");

    const dichVu = await this.prisma.dich_vu.findFirst({ where: { dich_vu_id: dto.dichVuId, dang_hoat_dong: true }, select: { dich_vu_id: true } });
    if (!dichVu) throw new BadRequestException("Dịch vụ không tồn tại hoặc đã ngừng");
    if (dto.nguonId && !(await this.prisma.nguon_khach.findUnique({ where: { nguon_id: dto.nguonId } }))) throw new BadRequestException("Nguồn khách không tồn tại");
    this.kiemTraNganSach(dto.nganSachTu, dto.nganSachDen);

    let tuVan = user.id;
    if (dto.tuVanVienId && dto.tuVanVienId !== user.id) {
      const pvDuyet = phamViCua(user, "co_hoi", "duyet");
      if (!pvDuyet) throw new ForbiddenException("Chỉ người có quyền phân công mới giao cơ hội cho người khác");
      await this.kiemTraNguoiNhan(user, pvDuyet, dto.tuVanVienId);
      tuVan = dto.tuVanVienId;
    }

    return this.prisma.$transaction(async (tx) => {
      // Trigger ghi lịch sử đọc người thực hiện và lý do từ biến của transaction này.
      await tx.$queryRaw`select set_config('hana.actor', ${user.id}, true) as a, set_config('hana.ly_do', ${"Tạo cơ hội"}, true) as b`;
      return tx.co_hoi_dich_vu.create({
        data: {
          khach_hang_id: dto.khachHangId,
          dich_vu_id: dto.dichVuId,
          nguon_id: dto.nguonId ?? khach.nguon_dau_tien_id ?? undefined,
          tu_van_vien_id: tuVan,
          mong_muon: dto.mongMuon?.trim() || undefined,
          ngan_sach_tu: dto.nganSachTu,
          ngan_sach_den: dto.nganSachDen,
          thoi_diem_du_kien: dto.thoiDiemDuKien ? new Date(dto.thoiDiemDuKien) : undefined,
          nguoi_tao_id: user.id,
        },
      });
    });
  }

  async sua(user: AuthUser, pv: PhamVi, id: string, dto: SuaCoHoiDto) {
    const cu = await this.tim(user, pv, id);
    if (KET_THUC.includes(cu.trang_thai as TrangThaiCoHoi)) throw new BadRequestException("Cơ hội đã kết thúc, không thể chỉnh sửa");
    if (dto.nguonId && !(await this.prisma.nguon_khach.findUnique({ where: { nguon_id: dto.nguonId } }))) throw new BadRequestException("Nguồn khách không tồn tại");
    this.kiemTraNganSach(
      dto.nganSachTu ?? (cu.ngan_sach_tu == null ? null : Number(cu.ngan_sach_tu)),
      dto.nganSachDen ?? (cu.ngan_sach_den == null ? null : Number(cu.ngan_sach_den)),
    );
    return this.prisma.co_hoi_dich_vu.update({
      where: { co_hoi_id: id },
      data: {
        nguon_id: dto.nguonId,
        mong_muon: dto.mongMuon === undefined ? undefined : dto.mongMuon.trim() || null,
        ngan_sach_tu: dto.nganSachTu,
        ngan_sach_den: dto.nganSachDen,
        thoi_diem_du_kien: dto.thoiDiemDuKien ? new Date(dto.thoiDiemDuKien) : undefined,
      },
    });
  }

  /** Đổi trạng thái: kiểm tra sơ đồ, lý do, và ghi lịch sử (qua trigger) trong CÙNG transaction. */
  async doiTrangThai(user: AuthUser, pv: PhamVi, id: string, dto: DoiTrangThaiCoHoiDto) {
    const cu = await this.tim(user, pv, id);
    const tu = cu.trang_thai as TrangThaiCoHoi;
    const den = dto.trangThai as TrangThaiCoHoi;
    const lyDo = dto.lyDo?.trim() || "";

    if (tu === den) throw new BadRequestException("Cơ hội đã ở trạng thái này");
    if (!hopLe(CHUYEN_CO_HOI, tu, den)) {
      throw new BadRequestException({
        statusCode: 400,
        code: "CHUYEN_TRANG_THAI_KHONG_HOP_LE",
        message: `Không thể chuyển từ "${tu}" sang "${den}"`,
        chuyenDuocDen: CHUYEN_CO_HOI[tu],
      });
    }
    if (TRANG_THAI_CO_HOI_CAN_BAO_GIA.includes(den)) {
      const daChapNhan = await this.prisma.bao_gia.findFirst({ where: { co_hoi_id: id, trang_thai: "da_chap_nhan" }, select: { bao_gia_id: true } });
      if (!daChapNhan) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          code: "CAN_BAO_GIA_DA_CHAP_NHAN",
          message: "Chưa thể chốt: cơ hội cần có một báo giá đã được khách chấp nhận.",
        });
      }
      if (COC_TOI_THIEU_PHAN_TRAM_KHI_CHOT > 0) {
        const t = (await tongHopTien(this.prisma, [daChapNhan.bao_gia_id])).get(daChapNhan.bao_gia_id)!;
        const can = Math.ceil((t.tong * COC_TOI_THIEU_PHAN_TRAM_KHI_CHOT) / 100);
        if (t.thucThu < can) {
          throw new UnprocessableEntityException({
            statusCode: 422,
            code: "CAN_DAT_COC",
            message: `Chưa thể chốt: cần đặt cọc tối thiểu ${COC_TOI_THIEU_PHAN_TRAM_KHI_CHOT}% (${can.toLocaleString("vi-VN")} đ), hiện đã thu ${t.thucThu.toLocaleString("vi-VN")} đ.`,
          });
        }
      }
    }
    if (CAN_LY_DO_CO_HOI.includes(den) && !lyDo) throw new BadRequestException("Cần nhập lý do khi chuyển sang trạng thái này");

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`select set_config('hana.actor', ${user.id}, true) as a, set_config('hana.ly_do', ${lyDo}, true) as b`;
      const bayGio = new Date();
      // Điều kiện trang_thai = cũ: nếu người khác vừa đổi trước, bản cập nhật này không áp dụng (tránh ghi đè lịch sử sai).
      const kq = await tx.co_hoi_dich_vu.updateMany({
        where: { co_hoi_id: id, trang_thai: tu },
        data: {
          trang_thai: den,
          ...(CAN_LY_DO_CO_HOI.includes(den) && { ly_do_chua_chot: lyDo }),
          ...(den === "dang_tu_van" && { ly_do_chua_chot: null }),
          ...(den === "da_chot" && { ngay_chot: bayGio }),
          ...(KET_THUC.includes(den) && { ngay_dong: bayGio }),
        },
      });
      if (kq.count !== 1) throw new ConflictException("Trạng thái vừa được người khác thay đổi, hãy tải lại");
      return tx.co_hoi_dich_vu.findUniqueOrThrow({ where: { co_hoi_id: id } });
    });
  }

  async phanCong(user: AuthUser, pv: PhamVi, id: string, dto: PhanCongCoHoiDto) {
    const cu = await this.tim(user, pv, id);
    if (KET_THUC.includes(cu.trang_thai as TrangThaiCoHoi)) throw new BadRequestException("Cơ hội đã kết thúc, không thể phân công");
    await this.kiemTraNguoiNhan(user, pv, dto.tuVanVienId);
    if (cu.tu_van_vien_id === dto.tuVanVienId) return cu;
    return this.prisma.$transaction(async (tx) => {
      const moi = await tx.co_hoi_dich_vu.update({ where: { co_hoi_id: id }, data: { tu_van_vien_id: dto.tuVanVienId } });
      await this.audit.ghi(user.id, "co_hoi", id, "sua", tx);
      return moi;
    });
  }
}
