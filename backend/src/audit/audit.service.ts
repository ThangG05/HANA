import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

export type HanhDongNhatKy = "xem" | "them" | "sua" | "xoa" | "tai_xuong" | "xuat";

/** Cho phép truyền cả PrismaService lẫn client giao dịch ($transaction) để ghi nhật ký cùng transaction. */
type Ghi = Pick<PrismaService, "nhat_ky_truy_cap">;

/**
 * Nhật ký truy cập chỉ ghi nối tiếp (DB cấm UPDATE/DELETE).
 * Ghi: người, đối tượng, mã bản ghi, hành động, thời điểm. KHÔNG ghi nội dung dữ liệu (tránh lộ y khoa/tài chính).
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async ghi(nguoiDungId: string, doiTuong: string, maBanGhi: string, hanhDong: HanhDongNhatKy, client?: Ghi): Promise<void> {
    await (client ?? this.prisma).nhat_ky_truy_cap.create({
      data: { nguoi_dung_id: nguoiDungId, doi_tuong: doiTuong, ma_ban_ghi: maBanGhi, hanh_dong: hanhDong },
    });
  }
}
