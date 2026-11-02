import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser, DataScope } from "../../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../../common/decorators/require-permission.decorator.js";
import type { AuthUser, PhamVi } from "../../common/types/auth-user.js";
import { DoiTrangThaiCoHoiDto, PhanCongCoHoiDto, SuaCoHoiDto, TaoCoHoiDto, TruyVanCoHoi } from "./dto/opportunity.dto.js";
import { OpportunitiesService } from "./opportunities.service.js";

@Controller("opportunities")
export class OpportunitiesController {
  constructor(private readonly opportunities: OpportunitiesService) {}

  @Get() @RequirePermission("co_hoi", "xem")
  danhSach(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Query() q: TruyVanCoHoi) {
    return this.opportunities.danhSach(user, pv, q);
  }

  @Get(":id") @RequirePermission("co_hoi", "xem")
  chiTiet(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string) {
    return this.opportunities.chiTiet(user, pv, id);
  }

  @Post() @RequirePermission("co_hoi", "them")
  tao(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Body() dto: TaoCoHoiDto) {
    return this.opportunities.tao(user, pv, dto);
  }

  @Patch(":id") @RequirePermission("co_hoi", "sua")
  sua(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string, @Body() dto: SuaCoHoiDto) {
    return this.opportunities.sua(user, pv, id, dto);
  }

  @Patch(":id/status") @RequirePermission("co_hoi", "sua")
  doiTrangThai(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string, @Body() dto: DoiTrangThaiCoHoiDto) {
    return this.opportunities.doiTrangThai(user, pv, id, dto);
  }

  /** Phân công: cần quyền riêng co_hoi.duyet (mặc định chỉ quản lý). */
  @Patch(":id/assign") @RequirePermission("co_hoi", "duyet")
  phanCong(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string, @Body() dto: PhanCongCoHoiDto) {
    return this.opportunities.phanCong(user, pv, id, dto);
  }
}
