import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser, DataScope } from "../../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../../common/decorators/require-permission.decorator.js";
import type { AuthUser, PhamVi } from "../../common/types/auth-user.js";
import { CustomersService } from "./customers.service.js";
import { SuaKhachHangDto, TaoKhachHangDto, TruyVanKhachHang } from "./dto/customer.dto.js";

@Controller("customers")
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get() @RequirePermission("khach_hang", "xem")
  danhSach(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Query() q: TruyVanKhachHang) {
    return this.customers.danhSach(user, pv, q);
  }

  @Get(":id") @RequirePermission("khach_hang", "xem")
  chiTiet(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string) {
    return this.customers.chiTiet(user, pv, id);
  }

  @Post() @RequirePermission("khach_hang", "them")
  tao(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Body() dto: TaoKhachHangDto) {
    return this.customers.tao(user, pv, dto);
  }

  @Patch(":id") @RequirePermission("khach_hang", "sua")
  sua(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string, @Body() dto: SuaKhachHangDto) {
    return this.customers.sua(user, pv, id, dto);
  }
}
