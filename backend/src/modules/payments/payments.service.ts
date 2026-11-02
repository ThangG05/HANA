import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditService } from "../../audit/audit.service.js";
import { ScopeService } from "../../common/scope.service.js";
import type { AuthUser, PhamVi } from "../../common/types/auth-user.js";
import { TaoHoanTienDto, TaoThuTienDto } from "./dto/payment.dto.js";
import { tongHopTien } from "./tong-hop.js";

const so = (v: { toString(): string } | number | string): number => Number(v.toString());
const vnd = (n: number) => `${n.toLocaleString("vi-VN")} đ`;
const loi422 = (code: string, message: string) => new UnprocessableEntityException({ statusCode: 422, code, message });

@Injectable()
export class PaymentsService {
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

  /** Báo giá trong phạm vi: ngoài phạm vi thì 404. */
  private async timBaoGia(user: AuthUser, pv: PhamVi, id: string) {
    const bg = await this.prisma.bao_gia.findUnique({ where: { bao_gia_id: id } });
    if (!bg) throw new NotFoundException("Không tìm thấy báo giá");
    await this.coHoiTrongPhamVi(user, pv, bg.co_hoi_id).catch(() => {
      throw new NotFoundException("Không tìm thấy báo giá");
    });
    return bg;
  }

  private async timGiaoDich(user: AuthUser, pv: PhamVi, id: string) {
    const gd = await this.prisma.thanh_toan.findUnique({ where: { thanh_toan_id: id } });
    if (!gd) throw new NotFoundException("Không tìm thấy giao dịch");
    const bg = await this.timBaoGia(user, pv, gd.bao_gia_id).catch(() => {
      throw new NotFoundException("Không tìm thấy giao dịch");
    });
    return { gd, bg };
  }

  // ---------- đọc ----------

  /** Mọi báo giá của cơ hội có phát sinh tiền (hoặc đang được chấp nhận), kèm giao dịch và số dư. */
  async theoCoHoi(user: AuthUser, pv: PhamVi, coHoiId: string) {
    await this.coHoiTrongPhamVi(user, pv, coHoiId);
    const bgs = await this.prisma.bao_gia.findMany({ where: { co_hoi_id: coHoiId }, orderBy: { phien_ban: "desc" } });
    const ids = bgs.map((b) => b.bao_gia_id);
    const gds = ids.length ? await this.prisma.thanh_toan.findMany({ where: { bao_gia_id: { in: ids } }, orderBy: { thoi_diem: "asc" } }) : [];
    const tien = await tongHopTien(this.prisma, ids);
    const nv = await this.prisma.nhan_vien.findMany({ where: { nhan_vien_id: { in: [...new Set(gds.map((g) => g.thu_ngan_id).filter((x): x is string => !!x))] } }, select: { nhan_vien_id: true, ho_ten: true } });
    return bgs
      .filter((b) => b.trang_thai === "da_chap_nhan" || gds.some((g) => g.bao_gia_id === b.bao_gia_id))
      .map((b) => {
        const t = tien.get(b.bao_gia_id)!;
        return {
          bao_gia_id: b.bao_gia_id,
          phien_ban: b.phien_ban,
          trang_thai: b.trang_thai,
          tong_bao_gia: t.tong,
          tong_thu: t.thu,
          tong_hoan: t.hoan,
          thuc_thu: t.thucThu,
          con_lai: t.conLai,
          giao_dich: gds.filter((g) => g.bao_gia_id === b.bao_gia_id).map((g) => ({
            thanh_toan_id: g.thanh_toan_id,
            loai_giao_dich: g.loai_giao_dich,
            so_tien: so(g.so_tien),
            phuong_thuc: g.phuong_thuc,
            trang_thai: g.trang_thai,
            thoi_diem: g.thoi_diem,
            ma_giao_dich: g.ma_giao_dich,
            ben_cung_cap: g.ben_cung_cap,
            giao_dich_goc_id: g.giao_dich_goc_id,
            thu_ngan: nv.find((n) => n.nhan_vien_id === g.thu_ngan_id)?.ho_ten ?? null,
          })),
        };
      });
  }

  // ---------- ghi ----------

  private kiemTraMa(dto: { maGiaoDich?: string; benCungCap?: string }) {
    if (dto.maGiaoDich && !dto.benCungCap) throw new BadRequestException("Nhập ngân hàng/đơn vị đi kèm mã giao dịch");
  }

  async thu(user: AuthUser, pv: PhamVi, dto: TaoThuTienDto) {
    this.kiemTraMa(dto);
    if (dto.choXacNhan && dto.phuongThuc !== "chuyen_khoan") throw new BadRequestException("Chỉ chuyển khoản mới ghi ở trạng thái chờ xác nhận");
    const bg = await this.timBaoGia(user, pv, dto.baoGiaId);
    if (bg.trang_thai !== "da_chap_nhan") throw loi422("BAO_GIA_CHUA_CHAP_NHAN", "Chỉ thu tiền trên báo giá đã được khách chấp nhận.");
    const t = (await tongHopTien(this.prisma, [bg.bao_gia_id])).get(bg.bao_gia_id)!;
    if (dto.soTien > t.conLai) throw loi422("THU_VUOT_BAO_GIA", `Số tiền vượt phần còn lại của báo giá (${vnd(Math.max(t.conLai, 0))}).`);

    const gd = await this.prisma.thanh_toan.create({
      data: {
        bao_gia_id: bg.bao_gia_id,
        loai_giao_dich: dto.loai,
        so_tien: dto.soTien,
        phuong_thuc: dto.phuongThuc,
        trang_thai: dto.choXacNhan ? "cho_xac_nhan" : "thanh_cong",
        ma_giao_dich: dto.maGiaoDich ?? null,
        ben_cung_cap: dto.benCungCap ?? null,
        thu_ngan_id: user.id,
        nguoi_tao_id: user.id,
      },
    });
    await this.audit.ghi(user.id, "thanh_toan", gd.thanh_toan_id, "them");
    return this.moTa(gd);
  }

  async hoan(user: AuthUser, pv: PhamVi, dto: TaoHoanTienDto) {
    this.kiemTraMa(dto);
    const { gd: goc } = await this.timGiaoDich(user, pv, dto.giaoDichGocId);
    if (goc.loai_giao_dich === "hoan_tien" || goc.trang_thai !== "thanh_cong") throw loi422("GOC_KHONG_HOP_LE", "Chỉ hoàn tiền cho khoản thu đã thành công.");
    const daHoan = (await this.prisma.thanh_toan.findMany({ where: { giao_dich_goc_id: goc.thanh_toan_id, trang_thai: "thanh_cong" } })).reduce((a, g) => a + so(g.so_tien), 0);
    const conHoan = so(goc.so_tien) - daHoan;
    if (dto.soTien > conHoan) throw loi422("HOAN_VUOT_KHOAN_THU", `Số tiền hoàn vượt phần còn có thể hoàn của khoản thu này (${vnd(conHoan)}).`);

    const gd = await this.prisma.thanh_toan.create({
      data: {
        bao_gia_id: goc.bao_gia_id,
        loai_giao_dich: "hoan_tien",
        giao_dich_goc_id: goc.thanh_toan_id,
        so_tien: dto.soTien,
        phuong_thuc: dto.phuongThuc,
        trang_thai: "thanh_cong",
        ma_giao_dich: dto.maGiaoDich ?? null,
        ben_cung_cap: dto.benCungCap ?? null,
        thu_ngan_id: user.id,
        nguoi_tao_id: user.id,
      },
    });
    await this.audit.ghi(user.id, "thanh_toan", gd.thanh_toan_id, "them");
    return this.moTa(gd);
  }

  /** Chuyển khoản chờ xác nhận → thành công (tiền đã về) hoặc → hủy/thất bại. */
  async capNhatChoXacNhan(user: AuthUser, pv: PhamVi, id: string, den: "thanh_cong" | "that_bai" | "huy") {
    const { gd, bg } = await this.timGiaoDich(user, pv, id);
    if (gd.trang_thai !== "cho_xac_nhan") throw loi422("TRANG_THAI_KHONG_HOP_LE", "Chỉ xử lý được giao dịch đang chờ xác nhận.");
    if (den === "thanh_cong") {
      if (bg.trang_thai !== "da_chap_nhan") throw loi422("BAO_GIA_CHUA_CHAP_NHAN", "Báo giá không còn ở trạng thái đã chấp nhận, không xác nhận thu được.");
      const t = (await tongHopTien(this.prisma, [bg.bao_gia_id])).get(bg.bao_gia_id)!;
      if (so(gd.so_tien) > t.conLai) throw loi422("THU_VUOT_BAO_GIA", `Số tiền vượt phần còn lại của báo giá (${vnd(Math.max(t.conLai, 0))}).`);
    }
    const kq = await this.prisma.thanh_toan.updateMany({ where: { thanh_toan_id: id, trang_thai: "cho_xac_nhan" }, data: { trang_thai: den } });
    if (kq.count !== 1) throw new ConflictException("Giao dịch vừa được người khác xử lý, hãy tải lại");
    await this.audit.ghi(user.id, "thanh_toan", id, "sua");
    return this.moTa(await this.prisma.thanh_toan.findUniqueOrThrow({ where: { thanh_toan_id: id } }));
  }

  private moTa(g: { thanh_toan_id: string; bao_gia_id: string; loai_giao_dich: string; so_tien: { toString(): string }; phuong_thuc: string; trang_thai: string; thoi_diem: Date }) {
    return { thanh_toan_id: g.thanh_toan_id, bao_gia_id: g.bao_gia_id, loai_giao_dich: g.loai_giao_dich, so_tien: so(g.so_tien), phuong_thuc: g.phuong_thuc, trang_thai: g.trang_thai, thoi_diem: g.thoi_diem };
  }
}
