import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser, DataScope } from "../../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../../common/decorators/require-permission.decorator.js";
import type { AuthUser, PhamVi } from "../../common/types/auth-user.js";
import { AppointmentsService } from "./appointments.service.js";
import { DoiLichDto, DoiTrangThaiLichHenDto, TaoLichHenDto, TruyVanLichHen, TruyVanTongQuanLich } from "./dto/appointment.dto.js";

@Controller("appointments")
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get() @RequirePermission("lich_hen", "xem")
  danhSach(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Query() q: TruyVanLichHen) {
    return this.appointments.danhSach(user, pv, q);
  }

  @Get("day-summary") @RequirePermission("lich_hen", "xem")
  tongQuanNgay(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Query() q: TruyVanTongQuanLich) {
    return this.appointments.tongQuanNgay(user, pv, q);
  }

  @Get(":id") @RequirePermission("lich_hen", "xem")
  chiTiet(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string) {
    return this.appointments.chiTiet(user, pv, id);
  }

  @Post() @RequirePermission("lich_hen", "them")
  tao(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Body() dto: TaoLichHenDto) {
    return this.appointments.tao(user, pv, dto);
  }

  @Patch(":id/status") @RequirePermission("lich_hen", "sua")
  doiTrangThai(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string, @Body() dto: DoiTrangThaiLichHenDto) {
    return this.appointments.doiTrangThai(user, pv, id, dto);
  }

  @Post(":id/reschedule") @RequirePermission("lich_hen", "sua")
  doiLich(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string, @Body() dto: DoiLichDto) {
    return this.appointments.doiLich(user, pv, id, dto);
  }
}
