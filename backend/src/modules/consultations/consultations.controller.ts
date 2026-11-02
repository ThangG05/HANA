import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { CurrentUser, DataScope } from "../../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../../common/decorators/require-permission.decorator.js";
import type { AuthUser, PhamVi } from "../../common/types/auth-user.js";
import { ConsultationsService } from "./consultations.service.js";
import { SuaLanKhamDto, TaoLanKhamDto } from "./dto/consultation.dto.js";

@Controller()
export class ConsultationsController {
  constructor(private readonly consultations: ConsultationsService) {}

  /** Tóm tắt (không có nội dung y khoa): tư vấn viên dùng để biết cơ hội đã khám chưa và chọn lần khám khi lập báo giá. */
  @Get("opportunities/:coHoiId/examinations") @RequirePermission("co_hoi", "xem")
  theoCoHoi(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("coHoiId", ParseUUIDPipe) coHoiId: string) {
    return this.consultations.theoCoHoi(user, pv, coHoiId);
  }

  @Get("examinations/:id") @RequirePermission("ho_so_kham", "xem")
  chiTiet(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string) {
    return this.consultations.chiTiet(user, pv, id);
  }

  @Post("examinations") @RequirePermission("ho_so_kham", "them")
  tao(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Body() dto: TaoLanKhamDto) {
    return this.consultations.tao(user, pv, dto);
  }

  @Patch("examinations/:id") @RequirePermission("ho_so_kham", "sua")
  sua(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string, @Body() dto: SuaLanKhamDto) {
    return this.consultations.sua(user, pv, id, dto);
  }
}
