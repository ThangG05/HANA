import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { CurrentUser, DataScope } from "../../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../../common/decorators/require-permission.decorator.js";
import type { AuthUser, PhamVi } from "../../common/types/auth-user.js";
import { GhiDongYDto } from "./dto/consent.dto.js";
import { ConsentsService } from "./consents.service.js";

@Controller("customers/:customerId/consents")
export class ConsentsController {
  constructor(private readonly consents: ConsentsService) {}

  @Get() @RequirePermission("khach_hang", "xem")
  danhSach(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("customerId", ParseUUIDPipe) id: string) {
    return this.consents.danhSach(user, pv, id);
  }

  @Post() @RequirePermission("khach_hang", "sua")
  ghi(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("customerId", ParseUUIDPipe) id: string, @Body() dto: GhiDongYDto) {
    return this.consents.ghi(user, pv, id, dto);
  }

  @Post(":consentId/revoke") @RequirePermission("khach_hang", "sua")
  rutLai(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("customerId", ParseUUIDPipe) id: string, @Param("consentId", ParseUUIDPipe) consentId: string) {
    return this.consents.rutLai(user, pv, id, consentId);
  }
}
