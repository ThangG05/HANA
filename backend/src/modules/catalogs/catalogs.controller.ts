import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { AllowAnyStaff, RequirePermission } from "../../common/decorators/require-permission.decorator.js";
import type { AuthUser } from "../../common/types/auth-user.js";
import { CatalogsService } from "./catalogs.service.js";
import { SuaDichVuDto, TaoDichVuDto } from "./dto/service.dto.js";

@Controller()
export class CatalogsController {
  constructor(private readonly catalogs: CatalogsService) {}

  // Danh mục để đổ vào ô chọn: mọi nhân viên đang hoạt động đều đọc được.
  @Get("services") @AllowAnyStaff()
  dichVu(@CurrentUser() user: AuthUser, @Query("includeInactive") includeInactive?: string) {
    return this.catalogs.dichVu(user, includeInactive === "true");
  }

  @Get("sources") @AllowAnyStaff()
  nguonKhach() { return this.catalogs.nguonKhach(); }

  @Get("facilities") @AllowAnyStaff()
  coSo() { return this.catalogs.coSo(); }

  @Get("staff") @AllowAnyStaff()
  nhanVien(@Query("role") role?: string) { return this.catalogs.nhanVien(role); }

  // Sửa danh mục: chỉ vai trò có quyền (mặc định: quản lý).
  @Post("services") @RequirePermission("dich_vu", "them")
  taoDichVu(@CurrentUser() user: AuthUser, @Body() dto: TaoDichVuDto) { return this.catalogs.taoDichVu(user, dto); }

  @Patch("services/:id") @RequirePermission("dich_vu", "sua")
  suaDichVu(@Param("id", ParseUUIDPipe) id: string, @Body() dto: SuaDichVuDto) { return this.catalogs.suaDichVu(id, dto); }
}
