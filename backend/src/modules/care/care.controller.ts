import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser, DataScope } from "../../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../../common/decorators/require-permission.decorator.js";
import type { AuthUser, PhamVi } from "../../common/types/auth-user.js";
import { CareService } from "./care.service.js";
import { CareTemplatesService } from "./care-templates.service.js";
import { DanhGiaDto, DoiHanDto, DongCanhBaoDto, HoanThanhChamSocDto, MocDto, SuaMocDto, TaoCanhBaoDto, TaoMauDto, TruyVanCanhBaoDto, TruyVanViecDto, XuLyCanhBaoDto } from "./dto/care.dto.js";

@Controller()
export class CareController {
  constructor(
    private readonly care: CareService,
    private readonly mau: CareTemplatesService,
  ) {}

  // ----- mẫu chăm sóc -----
  @Get("care-templates") @RequirePermission("mau_cham_soc", "xem")
  dsMau(@Query("dichVuId") dichVuId?: string) { return this.mau.danhSach(dichVuId); }

  @Get("care-templates/:id") @RequirePermission("mau_cham_soc", "xem")
  chiTietMau(@Param("id", ParseUUIDPipe) id: string) { return this.mau.chiTiet(id); }

  @Post("care-templates") @RequirePermission("mau_cham_soc", "them")
  taoMau(@CurrentUser() user: AuthUser, @Body() dto: TaoMauDto) { return this.mau.taoNhap(user, dto.dichVuId); }

  @Post("care-templates/:id/milestones") @RequirePermission("mau_cham_soc", "sua")
  themMoc(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: MocDto) { return this.mau.themMoc(user, id, dto); }

  @Patch("care-milestones/:id") @RequirePermission("mau_cham_soc", "sua")
  suaMoc(@Param("id", ParseUUIDPipe) id: string, @Body() dto: SuaMocDto) { return this.mau.suaMoc(id, dto); }

  @Delete("care-milestones/:id") @RequirePermission("mau_cham_soc", "sua")
  xoaMoc(@Param("id", ParseUUIDPipe) id: string) { return this.mau.xoaMoc(id); }

  @Post("care-templates/:id/approve") @RequirePermission("mau_cham_soc", "duyet")
  duyet(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) { return this.mau.duyet(user, id); }

  @Post("care-templates/:id/retire") @RequirePermission("mau_cham_soc", "duyet")
  ngung(@Param("id", ParseUUIDPipe) id: string) { return this.mau.ngung(id); }

  // ----- việc chăm sóc -----
  @Get("opportunities/:coHoiId/care") @RequirePermission("co_hoi", "xem")
  theoCoHoi(@CurrentUser() user: AuthUser, @Param("coHoiId", ParseUUIDPipe) id: string) { return this.care.theoCoHoi(user, id); }

  @Get("care/tasks") @RequirePermission("cham_soc", "xem")
  dsViec(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Query() q: TruyVanViecDto) { return this.care.danhSachViec(user, pv, q); }

  @Post("procedures/:caId/care/generate") @RequirePermission("cham_soc", "them")
  sinhLai(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("caId", ParseUUIDPipe) id: string) { return this.care.sinhLai(user, pv, id); }

  @Post("care/tasks/:id/claim") @RequirePermission("cham_soc", "sua")
  nhan(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string) { return this.care.nhan(user, pv, id); }

  @Patch("care/tasks/:id") @RequirePermission("cham_soc", "sua")
  doiHan(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string, @Body() dto: DoiHanDto) { return this.care.doiHan(user, pv, id, dto.hanThucHien); }

  @Post("care/tasks/:id/complete") @RequirePermission("cham_soc", "sua")
  hoanThanh(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string, @Body() dto: HoanThanhChamSocDto) { return this.care.hoanThanh(user, pv, id, dto); }

  @Post("care/tasks/:id/cancel") @RequirePermission("cham_soc", "sua")
  huy(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string) { return this.care.huy(user, pv, id); }

  // ----- cảnh báo y khoa -----
  @Get("care/alerts") @RequirePermission("canh_bao_y_khoa", "xem")
  dsCanhBao(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Query() q: TruyVanCanhBaoDto) { return this.care.danhSachCanhBao(user, pv, q); }

  @Post("procedures/:caId/alerts") @RequirePermission("canh_bao_y_khoa", "them")
  taoCanhBao(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("caId", ParseUUIDPipe) id: string, @Body() dto: TaoCanhBaoDto) { return this.care.taoCanhBao(user, pv, id, dto); }

  @Post("care/alerts/:id/acknowledge") @RequirePermission("canh_bao_y_khoa", "sua")
  nhanCb(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string) { return this.care.nhanCanhBao(user, pv, id); }

  @Post("care/alerts/:id/handle") @RequirePermission("canh_bao_y_khoa", "sua")
  xuLyCb(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string, @Body() dto: XuLyCanhBaoDto) { return this.care.xuLyCanhBao(user, pv, id, dto); }

  @Post("care/alerts/:id/close") @RequirePermission("canh_bao_y_khoa", "sua")
  dongCb(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("id", ParseUUIDPipe) id: string, @Body() dto: DongCanhBaoDto) { return this.care.dongCanhBao(user, pv, id, dto); }

  // ----- đánh giá -----
  @Post("procedures/:caId/rating") @RequirePermission("danh_gia", "them")
  danhGia(@CurrentUser() user: AuthUser, @DataScope() pv: PhamVi, @Param("caId", ParseUUIDPipe) id: string, @Body() dto: DanhGiaDto) { return this.care.danhGia(user, pv, id, dto); }
}
