import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { CurrentUser, DataScope } from "../../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../../common/decorators/require-permission.decorator.js";
import type { AuthUser, PhamVi } from "../../common/types/auth-user.js";
import { BatDauCaDto, DoiLichCaDto, GhiYKhoaCaDto, HoanThanhCaDto, TaoCaDto } from "./dto/procedure.dto.js";
import { ProceduresService } from "./procedures.service.js";

@Controller()
export class ProceduresController {
  constructor(private readonly procedures: ProceduresService) {}

  /** Danh sách ca của cơ hội (không có nội dung y khoa). */
  @Get("opportunities/:coHoiId/procedures") @RequirePermission("co_hoi", "xem")
  theoCoHoi(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("coHoiId", ParseUUIDPipe) coHoiId: string) {
    return this.procedures.theoCoHoi(user, pv, coHoiId);
  }

  @Get("procedures/:id") @RequirePermission("ca_thuc_hien", "xem")
  chiTiet(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.procedures.chiTiet(user, id);
  }

  @Post("procedures") @RequirePermission("ca_thuc_hien", "them")
  tao(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Body() dto: TaoCaDto) {
    return this.procedures.tao(user, pv, dto);
  }

  @Patch("procedures/:id") @RequirePermission("ca_thuc_hien", "sua")
  doiLich(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string, @Body() dto: DoiLichCaDto) {
    return this.procedures.doiLich(user, pv, id, dto);
  }

  @Post("procedures/:id/postpone") @RequirePermission("ca_thuc_hien", "sua")
  hoan(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string) {
    return this.procedures.hoan(user, pv, id);
  }

  @Post("procedures/:id/cancel") @RequirePermission("ca_thuc_hien", "sua")
  huy(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string) {
    return this.procedures.huy(user, pv, id);
  }

  /** Nội dung y khoa của ca: quyền ho_so_kham. */
  @Patch("procedures/:id/medical") @RequirePermission("ho_so_kham", "sua")
  ghiYKhoa(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string, @Body() dto: GhiYKhoaCaDto) {
    return this.procedures.ghiYKhoa(user, pv, id, dto);
  }

  @Post("procedures/:id/start") @RequirePermission("ho_so_kham", "sua")
  batDau(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string, @Body() dto: BatDauCaDto) {
    return this.procedures.batDau(user, pv, id, dto);
  }

  @Post("procedures/:id/complete") @RequirePermission("ho_so_kham", "sua")
  hoanThanh(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string, @Body() dto: HoanThanhCaDto) {
    return this.procedures.hoanThanh(user, pv, id, dto);
  }
}
