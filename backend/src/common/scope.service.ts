import { Injectable } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AuthUser, PhamVi } from "./types/auth-user.js";

/**
 * Chuyển PHẠM VI quyền (duoc_giao / co_so / toan_bo) thành điều kiện lọc dữ liệu.
 * Mọi service phải truy vấn bằng các điều kiện này — kể cả khi lấy chi tiết theo ID —
 * để người dùng biết ID vẫn không đọc/sửa được bản ghi ngoài phạm vi (trả 404, không lộ sự tồn tại).
 *
 * Lưu ý quy mô: cách làm dùng danh sách ID là đủ cho MVP (vài nghìn bản ghi/người).
 * Khi dữ liệu lớn nên chuyển sang truy vấn con hoặc view.
 */
@Injectable()
export class ScopeService {
  constructor(private readonly prisma: PrismaService) {}

  /** co_so mà user không có cơ sở thì không được mở rộng hơn duoc_giao. */
  private chuanPhamVi(user: AuthUser, pv: PhamVi): PhamVi {
    return pv === "co_so" && !user.coSoId ? "duoc_giao" : pv;
  }

  private async nhanVienCungCoSo(user: AuthUser): Promise<string[]> {
    if (!user.coSoId) return [user.id];
    const rows = await this.prisma.nhan_vien.findMany({ where: { co_so_id: user.coSoId }, select: { nhan_vien_id: true } });
    const ids = rows.map((r) => r.nhan_vien_id);
    return ids.includes(user.id) ? ids : [...ids, user.id];
  }

  /** Bác sĩ thấy cả cơ hội mà mình được xếp lịch hẹn (dù không phải tư vấn viên phụ trách). */
  private async coHoiTheoLichBacSi(user: AuthUser): Promise<string[]> {
    if (!user.vaiTro.includes("bac_si")) return [];
    const rows = await this.prisma.lich_hen.findMany({ where: { bac_si_id: user.id }, select: { co_hoi_id: true }, distinct: ["co_hoi_id"] });
    return rows.map((r) => r.co_hoi_id);
  }

  /** Cơ hội trong phạm vi (id + khách) — nền tảng cho các phạm vi còn lại. */
  private async coHoiTrongPhamVi(user: AuthUser, pv: PhamVi): Promise<{ coHoiIds: string[]; khachIds: string[] }> {
    const p = this.chuanPhamVi(user, pv);
    let where: Prisma.co_hoi_dich_vuWhereInput;
    if (p === "toan_bo") where = {};
    else if (p === "duoc_giao") {
      const cuaBacSi = await this.coHoiTheoLichBacSi(user);
      where = cuaBacSi.length ? { OR: [{ tu_van_vien_id: user.id }, { co_hoi_id: { in: cuaBacSi } }] } : { tu_van_vien_id: user.id };
    } else {
      const staff = await this.nhanVienCungCoSo(user);
      const lich = await this.prisma.lich_hen.findMany({ where: { co_so_id: user.coSoId! }, select: { co_hoi_id: true }, distinct: ["co_hoi_id"] });
      where = { OR: [{ tu_van_vien_id: { in: staff } }, { co_hoi_id: { in: lich.map((l) => l.co_hoi_id) } }] };
    }
    const rows = await this.prisma.co_hoi_dich_vu.findMany({ where, select: { co_hoi_id: true, khach_hang_id: true } });
    return { coHoiIds: rows.map((r) => r.co_hoi_id), khachIds: [...new Set(rows.map((r) => r.khach_hang_id))] };
  }

  async coHoi(user: AuthUser, pv: PhamVi): Promise<Prisma.co_hoi_dich_vuWhereInput> {
    const p = this.chuanPhamVi(user, pv);
    if (p === "toan_bo") return {};
    if (p === "duoc_giao") {
      const cuaBacSi = await this.coHoiTheoLichBacSi(user);
      return cuaBacSi.length ? { OR: [{ tu_van_vien_id: user.id }, { co_hoi_id: { in: cuaBacSi } }] } : { tu_van_vien_id: user.id };
    }
    const { coHoiIds } = await this.coHoiTrongPhamVi(user, p);
    return { co_hoi_id: { in: coHoiIds } };
  }

  async khachHang(user: AuthUser, pv: PhamVi): Promise<Prisma.khach_hangWhereInput> {
    const p = this.chuanPhamVi(user, pv);
    if (p === "toan_bo") return {};
    const { khachIds } = await this.coHoiTrongPhamVi(user, p);
    if (p === "duoc_giao") return { OR: [{ nhan_vien_phu_trach_id: user.id }, { khach_hang_id: { in: khachIds } }] };
    const staff = await this.nhanVienCungCoSo(user);
    return { OR: [{ nhan_vien_phu_trach_id: { in: staff } }, { khach_hang_id: { in: khachIds } }] };
  }

  async lichHen(user: AuthUser, pv: PhamVi): Promise<Prisma.lich_henWhereInput> {
    const p = this.chuanPhamVi(user, pv);
    if (p === "toan_bo") return {};
    if (p === "co_so") return { co_so_id: user.coSoId! };
    const { coHoiIds } = await this.coHoiTrongPhamVi(user, p);
    return { OR: [{ bac_si_id: user.id }, { co_hoi_id: { in: coHoiIds } }] };
  }

  async congViec(user: AuthUser, pv: PhamVi): Promise<Prisma.cong_viecWhereInput> {
    const p = this.chuanPhamVi(user, pv);
    if (p === "toan_bo") return {};
    if (p === "duoc_giao") return { OR: [{ nguoi_phu_trach_id: user.id }, { nguoi_tao_id: user.id }] };
    const staff = await this.nhanVienCungCoSo(user);
    return { OR: [{ nguoi_phu_trach_id: { in: staff } }, { nguoi_tao_id: { in: staff } }] };
  }

  async tuongTac(user: AuthUser, pv: PhamVi): Promise<Prisma.tuong_tacWhereInput> {
    const p = this.chuanPhamVi(user, pv);
    if (p === "toan_bo") return {};
    const { coHoiIds } = await this.coHoiTrongPhamVi(user, p);
    if (p === "duoc_giao") return { OR: [{ nhan_vien_id: user.id }, { co_hoi_id: { in: coHoiIds } }] };
    const staff = await this.nhanVienCungCoSo(user);
    return { OR: [{ nhan_vien_id: { in: staff } }, { co_hoi_id: { in: coHoiIds } }] };
  }

  /** Lần khám (hồ sơ y khoa): duoc_giao = do chính bác sĩ đó khám; co_so = bác sĩ cùng cơ sở. */
  async lanKham(user: AuthUser, pv: PhamVi): Promise<Prisma.lan_tham_khamWhereInput> {
    const p = this.chuanPhamVi(user, pv);
    if (p === "toan_bo") return {};
    if (p === "duoc_giao") return { bac_si_id: user.id };
    return { bac_si_id: { in: await this.nhanVienCungCoSo(user) } };
  }

  /** Ca thực hiện theo phạm vi hồ sơ y khoa: cùng quy tắc bác sĩ như lanKham (cả hai đều lọc theo bac_si_id). */
  async caThucHien(user: AuthUser, pv: PhamVi): Promise<Prisma.ca_thuc_hienWhereInput> {
    const p = this.chuanPhamVi(user, pv);
    if (p === "toan_bo") return {};
    if (p === "duoc_giao") return { bac_si_id: user.id };
    return { bac_si_id: { in: await this.nhanVienCungCoSo(user) } };
  }

  /** Người dùng có được GIAO việc/cơ hội cho nhân viên `nguoiNhanId` không (duoc_giao: chỉ cho chính mình). */
  async duocGiaoCho(user: AuthUser, pv: PhamVi, nguoiNhanId: string): Promise<boolean> {
    const p = this.chuanPhamVi(user, pv);
    if (nguoiNhanId === user.id || p === "toan_bo") return true;
    if (p === "duoc_giao") return false;
    return (await this.nhanVienCungCoSo(user)).includes(nguoiNhanId);
  }
}
