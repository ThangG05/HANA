import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { phamViCua, type AuthUser } from "../../common/types/auth-user.js";
import { SuaDichVuDto, TaoDichVuDto } from "./dto/service.dto.js";

@Injectable()
export class CatalogsService {
  constructor(private readonly prisma: PrismaService) {}

  async dichVu(user: AuthUser, kemNgungDung: boolean) {
    // Chỉ người có quyền sửa danh mục mới xem được dịch vụ đã ngừng.
    const xemTatCa = kemNgungDung && phamViCua(user, "dich_vu", "sua") !== null;
    return this.prisma.dich_vu.findMany({
      where: xemTatCa ? {} : { dang_hoat_dong: true },
      orderBy: [{ nhom_dich_vu: "asc" }, { ten_dich_vu: "asc" }],
    });
  }

  private kiemTraGia(tu?: number | null, den?: number | null) {
    if (tu != null && den != null && tu > den) throw new BadRequestException("Giá tham khảo từ phải nhỏ hơn hoặc bằng giá đến");
  }

  async taoDichVu(user: AuthUser, dto: TaoDichVuDto) {
    this.kiemTraGia(dto.giaThamKhaoTu, dto.giaThamKhaoDen);
    return this.prisma.dich_vu.create({
      data: {
        ten_dich_vu: dto.tenDichVu.trim(),
        nhom_dich_vu: dto.nhomDichVu.trim(),
        mo_ta: dto.moTa,
        gia_tham_khao_tu: dto.giaThamKhaoTu,
        gia_tham_khao_den: dto.giaThamKhaoDen,
        thoi_luong_du_kien: dto.thoiLuongDuKien,
        nguoi_tao_id: user.id,
      },
    });
  }

  async suaDichVu(id: string, dto: SuaDichVuDto) {
    const cu = await this.prisma.dich_vu.findUnique({ where: { dich_vu_id: id } });
    if (!cu) throw new NotFoundException("Không tìm thấy dịch vụ");
    this.kiemTraGia(dto.giaThamKhaoTu ?? (cu.gia_tham_khao_tu == null ? null : Number(cu.gia_tham_khao_tu)), dto.giaThamKhaoDen ?? (cu.gia_tham_khao_den == null ? null : Number(cu.gia_tham_khao_den)));
    return this.prisma.dich_vu.update({
      where: { dich_vu_id: id },
      data: {
        ten_dich_vu: dto.tenDichVu?.trim(),
        nhom_dich_vu: dto.nhomDichVu?.trim(),
        mo_ta: dto.moTa,
        gia_tham_khao_tu: dto.giaThamKhaoTu,
        gia_tham_khao_den: dto.giaThamKhaoDen,
        thoi_luong_du_kien: dto.thoiLuongDuKien,
        dang_hoat_dong: dto.dangHoatDong,
      },
    });
  }

  nguonKhach() {
    return this.prisma.nguon_khach.findMany({ where: { dang_hoat_dong: true }, orderBy: [{ kenh: "asc" }, { ten_chien_dich: "asc" }] });
  }

  coSo() {
    return this.prisma.co_so.findMany({
      select: { co_so_id: true, ten_co_so: true, dia_chi: true, mui_gio: true, gio_hoat_dong: true },
      orderBy: { ten_co_so: "asc" },
    });
  }

  /** Danh sách nhân viên cho ô chọn (không trả thông tin tài khoản đăng nhập). */
  async nhanVien(maVaiTro?: string) {
    const nv = await this.prisma.nhan_vien.findMany({
      where: { trang_thai_tai_khoan: "hoat_dong" },
      select: { nhan_vien_id: true, ho_ten: true, chuc_danh: true, bo_phan: true, co_so_id: true },
      orderBy: { ho_ten: "asc" },
    });
    const [gan, vaiTro] = await Promise.all([
      this.prisma.nhan_vien_vai_tro.findMany({ where: { nhan_vien_id: { in: nv.map((n) => n.nhan_vien_id) } }, select: { nhan_vien_id: true, vai_tro_id: true } }),
      this.prisma.vai_tro.findMany({ select: { vai_tro_id: true, ma_vai_tro: true } }),
    ]);
    const maCuaVaiTro = new Map(vaiTro.map((v) => [v.vai_tro_id, v.ma_vai_tro]));
    const ds = nv.map((n) => ({
      ...n,
      vai_tro: gan.filter((g) => g.nhan_vien_id === n.nhan_vien_id).map((g) => maCuaVaiTro.get(g.vai_tro_id)!).filter(Boolean),
    }));
    return maVaiTro ? ds.filter((n) => n.vai_tro.includes(maVaiTro)) : ds;
  }
}
