import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditService } from "../../audit/audit.service.js";
import { ScopeService } from "../../common/scope.service.js";
import { boQua, boTrang } from "../../common/dto/pagination.dto.js";
import { phamViCua, type AuthUser, type PhamVi } from "../../common/types/auth-user.js";
import { CanhBaoMoiDto, DanhGiaDto, DongCanhBaoDto, HoanThanhChamSocDto, TaoCanhBaoDto, TruyVanCanhBaoDto, TruyVanViecDto, XuLyCanhBaoDto } from "./dto/care.dto.js";
import { sinhLichChamSoc } from "./cham-soc.sinh-lich.js";

const loi422 = (code: string, message: string) => new UnprocessableEntityException({ statusCode: 422, code, message });
const khong = (v: string | null | undefined) => !v || v.trim() === "";

/**
 * Chăm sóc sau ca. Một người thấy ca khi: ca nằm trong cơ hội thuộc phạm vi của họ, hoặc họ là bác sĩ của ca,
 * hoặc (phạm vi cơ sở) ca thực hiện ở cơ sở của họ, hoặc việc được giao cho chính họ.
 */
@Injectable()
export class CareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  /** null = mọi ca; ngược lại danh sách ca_id được phép. */
  private async caTrongPhamVi(user: AuthUser, pv: PhamVi): Promise<string[] | null> {
    if (pv === "toan_bo") return null;
    const pvCoHoi = phamViCua(user, "co_hoi", "xem");
    const ids = new Set<string>();
    const dieuKien: Prisma.ca_thuc_hienWhereInput[] = [{ bac_si_id: user.id }];
    if (pv === "co_so" && user.coSoId) dieuKien.push({ co_so_id: user.coSoId });
    if (pvCoHoi) {
      const co = await this.prisma.co_hoi_dich_vu.findMany({ where: await this.scope.coHoi(user, pvCoHoi), select: { co_hoi_id: true } });
      if (co.length) dieuKien.push({ co_hoi_id: { in: co.map((c) => c.co_hoi_id) } });
    }
    for (const c of await this.prisma.ca_thuc_hien.findMany({ where: { OR: dieuKien }, select: { ca_id: true } })) ids.add(c.ca_id);
    for (const v of await this.prisma.cham_soc_sau_ca.findMany({ where: { nguoi_phu_trach_id: user.id }, select: { ca_id: true } })) ids.add(v.ca_id);
    return [...ids];
  }

  private async layCa(user: AuthUser, pv: PhamVi, caId: string) {
    const ca = await this.prisma.ca_thuc_hien.findUnique({ where: { ca_id: caId } });
    const cho = await this.caTrongPhamVi(user, pv);
    if (!ca || (cho && !cho.includes(caId))) throw new NotFoundException("Không tìm thấy ca thực hiện");
    return ca;
  }

  // ---------- làm giàu dữ liệu ----------

  private async lamGiauViec(ds: Array<{ cham_soc_id: string; ca_id: string; moc_id: string | null; nguoi_phu_trach_id: string | null; han_thuc_hien: Date; trang_thai: string }>) {
    if (ds.length === 0) return [];
    const [ca, moc, nv] = await Promise.all([
      this.prisma.ca_thuc_hien.findMany({ where: { ca_id: { in: [...new Set(ds.map((d) => d.ca_id))] } } }),
      this.prisma.moc_cham_soc.findMany({ where: { moc_id: { in: ds.map((d) => d.moc_id).filter((x): x is string => !!x) } } }),
      this.prisma.nhan_vien.findMany({ where: { nhan_vien_id: { in: ds.map((d) => d.nguoi_phu_trach_id).filter((x): x is string => !!x) } }, select: { nhan_vien_id: true, ho_ten: true } }),
    ]);
    const kh = await this.prisma.khach_hang.findMany({ where: { khach_hang_id: { in: [...new Set(ca.map((c) => c.khach_hang_id))] } }, select: { khach_hang_id: true, ho_ten: true, so_dien_thoai: true } });
    const hm = await this.prisma.chi_tiet_bao_gia.findMany({ where: { chi_tiet_bao_gia_id: { in: ca.map((c) => c.chi_tiet_bao_gia_id) } }, select: { chi_tiet_bao_gia_id: true, ten_hang_muc_tai_thoi_diem_bao_gia: true } });
    const bs = await this.prisma.nhan_vien.findMany({ where: { nhan_vien_id: { in: [...new Set(ca.map((c) => c.bac_si_id))] } }, select: { nhan_vien_id: true, ho_ten: true } });
    const bayGio = Date.now();
    return ds.map((d) => {
      const c = ca.find((x) => x.ca_id === d.ca_id);
      const m = moc.find((x) => x.moc_id === d.moc_id);
      const k = kh.find((x) => x.khach_hang_id === c?.khach_hang_id);
      return {
        ...d,
        co_hoi_id: c?.co_hoi_id ?? null,
        khach_hang_id: c?.khach_hang_id ?? null,
        khach_hang: k?.ho_ten ?? null,
        so_dien_thoai: k?.so_dien_thoai ?? null,
        ten_hang_muc: hm.find((h) => h.chi_tiet_bao_gia_id === c?.chi_tiet_bao_gia_id)?.ten_hang_muc_tai_thoi_diem_bao_gia ?? null,
        bac_si: bs.find((b) => b.nhan_vien_id === c?.bac_si_id)?.ho_ten ?? null,
        noi_dung: m?.noi_dung ?? null,
        loai_lien_he: m?.loai_lien_he ?? null,
        nguoi_phu_trach: nv.find((n) => n.nhan_vien_id === d.nguoi_phu_trach_id)?.ho_ten ?? null,
        qua_han: d.trang_thai === "cho_thuc_hien" && d.han_thuc_hien.getTime() < bayGio,
      };
    });
  }

  private async lamGiauCanhBao<T extends { canh_bao_id: string; ca_id: string; bac_si_nhan_id: string | null }>(ds: T[]) {
    if (ds.length === 0) return [];
    const ca = await this.prisma.ca_thuc_hien.findMany({ where: { ca_id: { in: [...new Set(ds.map((d) => d.ca_id))] } } });
    const kh = await this.prisma.khach_hang.findMany({ where: { khach_hang_id: { in: [...new Set(ca.map((c) => c.khach_hang_id))] } }, select: { khach_hang_id: true, ho_ten: true, so_dien_thoai: true } });
    const nv = await this.prisma.nhan_vien.findMany({ where: { nhan_vien_id: { in: [...new Set([...ca.map((c) => c.bac_si_id), ...ds.map((d) => d.bac_si_nhan_id).filter((x): x is string => !!x)])] } }, select: { nhan_vien_id: true, ho_ten: true } });
    return ds.map((d) => {
      const c = ca.find((x) => x.ca_id === d.ca_id);
      const k = kh.find((x) => x.khach_hang_id === c?.khach_hang_id);
      return {
        ...d,
        co_hoi_id: c?.co_hoi_id ?? null,
        khach_hang: k?.ho_ten ?? null,
        so_dien_thoai: k?.so_dien_thoai ?? null,
        bac_si_id: c?.bac_si_id ?? null,
        bac_si: nv.find((n) => n.nhan_vien_id === c?.bac_si_id)?.ho_ten ?? null,
        bac_si_nhan: nv.find((n) => n.nhan_vien_id === d.bac_si_nhan_id)?.ho_ten ?? null,
      };
    });
  }

  // ---------- đọc ----------

  /** Mọi thứ về chăm sóc của một cơ hội; mỗi phần chỉ có khi người xem có quyền tương ứng. */
  async theoCoHoi(user: AuthUser, coHoiId: string) {
    const pvCoHoi = phamViCua(user, "co_hoi", "xem");
    if (!pvCoHoi) throw new ForbiddenException("Bạn không có quyền xem cơ hội");
    const co = await this.prisma.co_hoi_dich_vu.findFirst({ where: { AND: [{ co_hoi_id: coHoiId }, await this.scope.coHoi(user, pvCoHoi)] } });
    if (!co) throw new NotFoundException("Không tìm thấy cơ hội");
    const caDs = await this.prisma.ca_thuc_hien.findMany({ where: { co_hoi_id: coHoiId, trang_thai: "hoan_thanh" }, orderBy: [{ ngay_tao: "asc" }] });
    const lay = async <R>(doiTuong: string, f: (cho: string[]) => Promise<R[]>): Promise<R[]> => {
      const pv = phamViCua(user, doiTuong, "xem");
      if (!pv || caDs.length === 0) return [];
      const cho = await this.caTrongPhamVi(user, pv);
      const ids = caDs.map((c) => c.ca_id).filter((id) => !cho || cho.includes(id));
      return ids.length ? f(ids) : [];
    };
    const [viec, canhBao, danhGia] = await Promise.all([
      lay("cham_soc", async (ids) => this.lamGiauViec(await this.prisma.cham_soc_sau_ca.findMany({ where: { ca_id: { in: ids } }, orderBy: [{ han_thuc_hien: "asc" }] }))),
      lay("canh_bao_y_khoa", async (ids) => this.lamGiauCanhBao(await this.prisma.canh_bao_y_khoa.findMany({ where: { ca_id: { in: ids } }, orderBy: [{ thoi_diem_bao: "desc" }] }))),
      lay("danh_gia", (ids) => this.prisma.danh_gia.findMany({ where: { ca_id: { in: ids } } })),
    ]);
    const ten = await this.prisma.chi_tiet_bao_gia.findMany({ where: { chi_tiet_bao_gia_id: { in: caDs.map((c) => c.chi_tiet_bao_gia_id) } }, select: { chi_tiet_bao_gia_id: true, ten_hang_muc_tai_thoi_diem_bao_gia: true } });
    return {
      ca_hoan_thanh: caDs.map((c) => ({ ca_id: c.ca_id, ten_hang_muc: ten.find((t) => t.chi_tiet_bao_gia_id === c.chi_tiet_bao_gia_id)?.ten_hang_muc_tai_thoi_diem_bao_gia ?? null, ket_thuc_luc: c.ket_thuc_luc, bac_si_id: c.bac_si_id })),
      viec,
      canh_bao: canhBao,
      danh_gia: danhGia,
    };
  }

  async danhSachViec(user: AuthUser, pv: PhamVi, q: TruyVanViecDto) {
    const cho = await this.caTrongPhamVi(user, pv);
    const where: Prisma.cham_soc_sau_caWhereInput = {
      ...(cho ? { ca_id: { in: cho } } : {}),
      ...(q.trangThai ? { trang_thai: q.trangThai } : {}),
      ...(q.quaHan ? { trang_thai: "cho_thuc_hien", han_thuc_hien: { lt: new Date() } } : {}),
    };
    const [tong, ds] = await Promise.all([
      this.prisma.cham_soc_sau_ca.count({ where }),
      this.prisma.cham_soc_sau_ca.findMany({ where, orderBy: [{ han_thuc_hien: "asc" }], skip: boQua(q), take: q.pageSize }),
    ]);
    return boTrang(await this.lamGiauViec(ds), tong, q);
  }

  async danhSachCanhBao(user: AuthUser, pv: PhamVi, q: TruyVanCanhBaoDto) {
    const cho = await this.caTrongPhamVi(user, pv);
    const where: Prisma.canh_bao_y_khoaWhereInput = { ...(cho ? { ca_id: { in: cho } } : {}), ...(q.trangThai ? { trang_thai: q.trangThai } : {}) };
    const [tong, ds] = await Promise.all([
      this.prisma.canh_bao_y_khoa.count({ where }),
      this.prisma.canh_bao_y_khoa.findMany({ where, orderBy: [{ thoi_diem_bao: "desc" }], skip: boQua(q), take: q.pageSize }),
    ]);
    return boTrang(await this.lamGiauCanhBao(ds), tong, q);
  }

  // ---------- việc chăm sóc ----------

  /** Sinh lại lịch chăm sóc của một ca (an toàn chạy nhiều lần), dùng khi mẫu được duyệt sau khi ca đã xong. */
  async sinhLai(user: AuthUser, pv: PhamVi, caId: string) {
    const ca = await this.layCa(user, pv, caId);
    if (ca.trang_thai !== "hoan_thanh") throw loi422("CA_CHUA_HOAN_THANH", "Chỉ sinh lịch chăm sóc cho ca đã hoàn thành.");
    const moi = await sinhLichChamSoc(this.prisma, caId, user.id);
    if (moi > 0) await this.audit.ghi(user.id, "cham_soc_sau_ca", caId, "them");
    return { so_viec_moi: moi };
  }

  private async layViec(user: AuthUser, pv: PhamVi, id: string) {
    const v = await this.prisma.cham_soc_sau_ca.findUnique({ where: { cham_soc_id: id } });
    const cho = v ? await this.caTrongPhamVi(user, pv) : null;
    if (!v || (cho && !cho.includes(v.ca_id))) throw new NotFoundException("Không tìm thấy việc chăm sóc");
    return v;
  }

  private async layViecMo(user: AuthUser, pv: PhamVi, id: string) {
    const v = await this.layViec(user, pv, id);
    if (v.trang_thai !== "cho_thuc_hien") throw new ConflictException({ statusCode: 409, code: "DA_KHOA", message: "Việc chăm sóc đã kết thúc, không sửa được." });
    return v;
  }

  /** Nhận việc về mình. Việc đã có người khác nhận thì không giành lại được. */
  async nhan(user: AuthUser, pv: PhamVi, id: string) {
    const v = await this.layViecMo(user, pv, id);
    if (v.nguoi_phu_trach_id && v.nguoi_phu_trach_id !== user.id) throw loi422("DA_CO_NGUOI_NHAN", "Việc này đã có người khác nhận.");
    const kq = await this.prisma.cham_soc_sau_ca.updateMany({ where: { cham_soc_id: id, trang_thai: "cho_thuc_hien", OR: [{ nguoi_phu_trach_id: null }, { nguoi_phu_trach_id: user.id }] }, data: { nguoi_phu_trach_id: user.id, ngay_cap_nhat: new Date() } });
    if (kq.count !== 1) throw new ConflictException("Việc vừa được người khác thay đổi, hãy tải lại");
    await this.audit.ghi(user.id, "cham_soc_sau_ca", id, "sua");
    return (await this.lamGiauViec([await this.prisma.cham_soc_sau_ca.findUniqueOrThrow({ where: { cham_soc_id: id } })]))[0];
  }

  async doiHan(user: AuthUser, pv: PhamVi, id: string, han: string) {
    await this.layViecMo(user, pv, id);
    const d = new Date(han);
    if (Number.isNaN(d.getTime())) throw new BadRequestException("Hạn thực hiện không hợp lệ");
    await this.prisma.cham_soc_sau_ca.updateMany({ where: { cham_soc_id: id, trang_thai: "cho_thuc_hien" }, data: { han_thuc_hien: d, ngay_cap_nhat: new Date() } });
    await this.audit.ghi(user.id, "cham_soc_sau_ca", id, "sua");
    return (await this.lamGiauViec([await this.prisma.cham_soc_sau_ca.findUniqueOrThrow({ where: { cham_soc_id: id } })]))[0];
  }

  async huy(user: AuthUser, pv: PhamVi, id: string) {
    await this.layViecMo(user, pv, id);
    const kq = await this.prisma.cham_soc_sau_ca.updateMany({ where: { cham_soc_id: id, trang_thai: "cho_thuc_hien" }, data: { trang_thai: "huy", ngay_cap_nhat: new Date() } });
    if (kq.count !== 1) throw new ConflictException("Việc vừa được người khác thay đổi, hãy tải lại");
    await this.audit.ghi(user.id, "cham_soc_sau_ca", id, "sua");
    return (await this.lamGiauViec([await this.prisma.cham_soc_sau_ca.findUniqueOrThrow({ where: { cham_soc_id: id } })]))[0];
  }

  /** Ghi kết quả liên hệ. Có triệu chứng bất thường thì báo bác sĩ luôn trong cùng giao dịch. */
  async hoanThanh(user: AuthUser, pv: PhamVi, id: string, dto: HoanThanhChamSocDto) {
    const v = await this.layViecMo(user, pv, id);
    if (v.nguoi_phu_trach_id && v.nguoi_phu_trach_id !== user.id && pv !== "toan_bo") throw loi422("DA_CO_NGUOI_NHAN", "Việc này đã có người khác nhận.");
    if (khong(dto.phanHoi)) throw new BadRequestException("Cần ghi phản hồi của khách");
    if (dto.canhBao && !phamViCua(user, "canh_bao_y_khoa", "them")) throw new ForbiddenException("Bạn không có quyền báo cảnh báo cho bác sĩ");
    await this.prisma.$transaction(async (tx) => {
      const kq = await tx.cham_soc_sau_ca.updateMany({
        where: { cham_soc_id: id, trang_thai: "cho_thuc_hien" },
        data: { trang_thai: "hoan_thanh", nguoi_phu_trach_id: user.id, thoi_diem_thuc_te: new Date(), phan_hoi: dto.phanHoi.trim(), huong_xu_ly: dto.huongXuLy?.trim() || null, ngay_cap_nhat: new Date() },
      });
      if (kq.count !== 1) throw new ConflictException("Việc vừa được người khác thay đổi, hãy tải lại");
      if (dto.canhBao) await this.taoCanhBaoTrong(tx, user, v.ca_id, dto.canhBao);
      await this.audit.ghi(user.id, "cham_soc_sau_ca", id, "sua", tx);
    });
    return (await this.lamGiauViec([await this.prisma.cham_soc_sau_ca.findUniqueOrThrow({ where: { cham_soc_id: id } })]))[0];
  }

  // ---------- cảnh báo y khoa ----------

  private async taoCanhBaoTrong(tx: Pick<PrismaService, "canh_bao_y_khoa" | "nhat_ky_truy_cap">, user: AuthUser, caId: string, dto: CanhBaoMoiDto) {
    const cb = await tx.canh_bao_y_khoa.create({ data: { ca_id: caId, mo_ta: dto.moTa.trim(), muc_uu_tien: dto.mucUuTien ?? "cao", nguoi_tao_id: user.id } });
    await this.audit.ghi(user.id, "canh_bao_y_khoa", cb.canh_bao_id, "them", tx);
    return cb;
  }

  async taoCanhBao(user: AuthUser, pv: PhamVi, caId: string, dto: TaoCanhBaoDto) {
    const ca = await this.layCa(user, pv, caId);
    if (ca.trang_thai !== "hoan_thanh") throw loi422("CA_CHUA_HOAN_THANH", "Chỉ báo cảnh báo cho ca đã hoàn thành.");
    const cb = await this.taoCanhBaoTrong(this.prisma, user, caId, dto);
    return (await this.lamGiauCanhBao([cb]))[0];
  }

  /** Chỉ bác sĩ phụ trách ca được nhận/xử lý/đóng cảnh báo của ca đó. */
  private async layCanhBaoCuaToi(user: AuthUser, pv: PhamVi, id: string) {
    const cb = await this.prisma.canh_bao_y_khoa.findUnique({ where: { canh_bao_id: id } });
    const cho = cb ? await this.caTrongPhamVi(user, pv) : null;
    if (!cb || (cho && !cho.includes(cb.ca_id))) throw new NotFoundException("Không tìm thấy cảnh báo");
    const ca = await this.prisma.ca_thuc_hien.findUniqueOrThrow({ where: { ca_id: cb.ca_id } });
    if (ca.bac_si_id !== user.id) throw new ForbiddenException("Chỉ bác sĩ phụ trách ca mới xử lý cảnh báo này");
    if (cb.trang_thai === "da_dong") throw new ConflictException({ statusCode: 409, code: "DA_KHOA", message: "Cảnh báo đã đóng, không sửa được." });
    return cb;
  }

  private async chuyenCanhBao(user: AuthUser, cb: { canh_bao_id: string; trang_thai: string }, den: string, data: { bac_si_nhan_id?: string; thoi_diem_tiep_nhan?: Date; huong_xu_ly?: string | null; thoi_diem_dong?: Date }) {
    const hop: Record<string, string[]> = { moi: ["da_nhan"], da_nhan: ["dang_xu_ly", "da_dong"], dang_xu_ly: ["da_dong"] };
    if (!hop[cb.trang_thai]?.includes(den)) throw loi422("TRANG_THAI_KHONG_HOP_LE", `Cảnh báo đang "${cb.trang_thai}", không chuyển sang "${den}" được.`);
    const kq = await this.prisma.canh_bao_y_khoa.updateMany({ where: { canh_bao_id: cb.canh_bao_id, trang_thai: cb.trang_thai }, data: { trang_thai: den, ngay_cap_nhat: new Date(), ...data } });
    if (kq.count !== 1) throw new ConflictException("Cảnh báo vừa được người khác thay đổi, hãy tải lại");
    await this.audit.ghi(user.id, "canh_bao_y_khoa", cb.canh_bao_id, "sua");
    return (await this.lamGiauCanhBao([await this.prisma.canh_bao_y_khoa.findUniqueOrThrow({ where: { canh_bao_id: cb.canh_bao_id } })]))[0];
  }

  async nhanCanhBao(user: AuthUser, pv: PhamVi, id: string) {
    const cb = await this.layCanhBaoCuaToi(user, pv, id);
    return this.chuyenCanhBao(user, cb, "da_nhan", { bac_si_nhan_id: user.id, thoi_diem_tiep_nhan: new Date() });
  }

  async xuLyCanhBao(user: AuthUser, pv: PhamVi, id: string, dto: XuLyCanhBaoDto) {
    const cb = await this.layCanhBaoCuaToi(user, pv, id);
    return this.chuyenCanhBao(user, cb, "dang_xu_ly", { huong_xu_ly: dto.huongXuLy?.trim() || null });
  }

  async dongCanhBao(user: AuthUser, pv: PhamVi, id: string, dto: DongCanhBaoDto) {
    const cb = await this.layCanhBaoCuaToi(user, pv, id);
    if (khong(dto.huongXuLy)) throw new BadRequestException("Cần ghi hướng xử lý khi đóng cảnh báo");
    return this.chuyenCanhBao(user, cb, "da_dong", { huong_xu_ly: dto.huongXuLy.trim(), thoi_diem_dong: new Date() });
  }

  // ---------- đánh giá ----------

  async danhGia(user: AuthUser, pv: PhamVi, caId: string, dto: DanhGiaDto) {
    const ca = await this.layCa(user, pv, caId);
    if (ca.trang_thai !== "hoan_thanh") throw loi422("CA_CHUA_HOAN_THANH", "Chỉ đánh giá ca đã hoàn thành.");
    const thang = dto.thangDiem ?? 5;
    if (dto.diem > thang) throw new BadRequestException("Điểm không được lớn hơn thang điểm");
    if (await this.prisma.danh_gia.findFirst({ where: { ca_id: caId } })) throw new ConflictException({ statusCode: 409, code: "DA_DANH_GIA", message: "Ca này đã có đánh giá." });
    const dg = await this.prisma.danh_gia.create({ data: { khach_hang_id: ca.khach_hang_id, ca_id: caId, diem: dto.diem, thang_diem: thang, nhan_xet: dto.nhanXet?.trim() || null, nguoi_xu_ly_id: user.id, nguoi_tao_id: user.id } });
    await this.audit.ghi(user.id, "danh_gia", dg.danh_gia_id, "them");
    return dg;
  }
}
