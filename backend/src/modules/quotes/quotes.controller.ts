import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { CurrentUser, DataScope } from "../../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../../common/decorators/require-permission.decorator.js";
import type { AuthUser, PhamVi } from "../../common/types/auth-user.js";
import { SuaBaoGiaDto, TaoBaoGiaDto } from "./dto/quote.dto.js";
import { QuotesService } from "./quotes.service.js";

@Controller()
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get("opportunities/:coHoiId/quotes") @RequirePermission("bao_gia", "xem")
  theoCoHoi(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("coHoiId", ParseUUIDPipe) coHoiId: string) {
    return this.quotes.theoCoHoi(user, pv, coHoiId);
  }

  @Get("quotes/:id") @RequirePermission("bao_gia", "xem")
  chiTiet(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string) {
    return this.quotes.chiTiet(user, pv, id);
  }

  @Post("quotes") @RequirePermission("bao_gia", "them")
  tao(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Body() dto: TaoBaoGiaDto) {
    return this.quotes.tao(user, pv, dto);
  }

  @Post("quotes/:id/new-version") @RequirePermission("bao_gia", "them")
  phienBanMoi(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string) {
    return this.quotes.taoPhienBanMoi(user, pv, id);
  }

  @Patch("quotes/:id") @RequirePermission("bao_gia", "sua")
  sua(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string, @Body() dto: SuaBaoGiaDto) {
    return this.quotes.sua(user, pv, id, dto);
  }

  @Post("quotes/:id/send") @RequirePermission("bao_gia", "sua")
  gui(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string) {
    return this.quotes.gui(user, pv, id);
  }

  @Post("quotes/:id/accept") @RequirePermission("bao_gia", "sua")
  chapNhan(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string) {
    return this.quotes.chapNhan(user, pv, id);
  }

  @Post("quotes/:id/cancel") @RequirePermission("bao_gia", "sua")
  huy(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string) {
    return this.quotes.huy(user, pv, id);
  }
}
