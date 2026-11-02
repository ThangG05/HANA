import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { CurrentUser, DataScope } from "../../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../../common/decorators/require-permission.decorator.js";
import type { AuthUser, PhamVi } from "../../common/types/auth-user.js";
import { TaoTuongTacDto, TruyVanTuongTac } from "./dto/interaction.dto.js";
import { InteractionsService } from "./interactions.service.js";

@Controller("interactions")
export class InteractionsController {
  constructor(private readonly interactions: InteractionsService) {}

  @Get() @RequirePermission("tuong_tac", "xem")
  danhSach(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Query() q: TruyVanTuongTac) {
    return this.interactions.danhSach(user, pv, q);
  }

  @Post() @RequirePermission("tuong_tac", "them")
  tao(@CurrentUser() user: AuthUser, @Body() dto: TaoTuongTacDto) {
    return this.interactions.tao(user, dto);
  }
}
