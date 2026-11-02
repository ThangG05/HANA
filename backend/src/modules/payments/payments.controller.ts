import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { CurrentUser, DataScope } from "../../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../../common/decorators/require-permission.decorator.js";
import type { AuthUser, PhamVi } from "../../common/types/auth-user.js";
import { TaoHoanTienDto, TaoThuTienDto, TruyVanCongNoDto } from "./dto/payment.dto.js";
import { PaymentsService } from "./payments.service.js";

@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get("opportunities/:coHoiId/payments") @RequirePermission("thanh_toan", "xem")
  theoCoHoi(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("coHoiId", ParseUUIDPipe) coHoiId: string) {
    return this.payments.theoCoHoi(user, pv, coHoiId);
  }

  @Get("payments/receivables") @RequirePermission("thanh_toan", "xem")
  congNo(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Query() q: TruyVanCongNoDto) {
    return this.payments.danhSachCongNo(user, pv, q);
  }

  @Get("payments/pending") @RequirePermission("thanh_toan", "xem")
  choXacNhan(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Query() q: TruyVanCongNoDto) {
    return this.payments.danhSachChoXacNhan(user, pv, q);
  }

  @Post("payments") @RequirePermission("thanh_toan", "them")
  thu(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Body() dto: TaoThuTienDto) {
    return this.payments.thu(user, pv, dto);
  }

  /** Hoàn tiền cần quyền "duyet". */
  @Post("payments/refunds") @RequirePermission("thanh_toan", "duyet")
  hoan(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Body() dto: TaoHoanTienDto) {
    return this.payments.hoan(user, pv, dto);
  }

  @Post("payments/:id/confirm") @RequirePermission("thanh_toan", "sua")
  xacNhan(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string) {
    return this.payments.capNhatChoXacNhan(user, pv, id, "thanh_cong");
  }

  @Post("payments/:id/cancel") @RequirePermission("thanh_toan", "sua")
  huy(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string) {
    return this.payments.capNhatChoXacNhan(user, pv, id, "huy");
  }
}
