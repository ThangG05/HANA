import { Controller, Get, Query } from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";
import { PaginationDto, boQua, boTrang } from "../common/dto/pagination.dto.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { PrismaService } from "../prisma/prisma.service.js";

class TruyVanNhatKy extends PaginationDto {
  @IsOptional() @IsString() doiTuong?: string;
  @IsOptional() @IsString() maBanGhi?: string;
}

@Controller("audit-logs")
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermission("nhat_ky", "xem")
  async danhSach(@Query() q: TruyVanNhatKy) {
    const where = { ...(q.doiTuong && { doi_tuong: q.doiTuong }), ...(q.maBanGhi && { ma_ban_ghi: q.maBanGhi }) };
    const [items, total] = await Promise.all([
      this.prisma.nhat_ky_truy_cap.findMany({ where, orderBy: { thoi_diem: "desc" }, skip: boQua(q), take: q.pageSize }),
      this.prisma.nhat_ky_truy_cap.count({ where }),
    ]);
    return boTrang(items, total, q);
  }
}
