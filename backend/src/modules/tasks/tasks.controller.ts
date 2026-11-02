import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser, DataScope } from "../../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../../common/decorators/require-permission.decorator.js";
import type { AuthUser, PhamVi } from "../../common/types/auth-user.js";
import { SuaCongViecDto, TaoCongViecDto, TruyVanCongViec } from "./dto/task.dto.js";
import { TasksService } from "./tasks.service.js";

@Controller("tasks")
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get() @RequirePermission("cong_viec", "xem")
  danhSach(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Query() q: TruyVanCongViec) {
    return this.tasks.danhSach(user, pv, q);
  }

  @Post() @RequirePermission("cong_viec", "them")
  tao(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Body() dto: TaoCongViecDto) {
    return this.tasks.tao(user, pv, dto);
  }

  @Patch(":id") @RequirePermission("cong_viec", "sua")
  sua(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string, @Body() dto: SuaCongViecDto) {
    return this.tasks.sua(user, pv, id, dto);
  }
}
