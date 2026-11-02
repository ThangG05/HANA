import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { IS_PUBLIC } from "../decorators/public.decorator.js";
import type { AuthUser, PhamVi } from "../types/auth-user.js";

/**
 * Xác thực mọi request bằng token Supabase (Authorization: Bearer ...).
 * Mặc định TỪ CHỐI: chỉ endpoint gắn @Public() mới được bỏ qua.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly supabase: SupabaseClient;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {
    this.supabase = createClient(config.getOrThrow<string>("SUPABASE_URL"), config.getOrThrow<string>("SUPABASE_ANON_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers["authorization"];
    const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new UnauthorizedException("Thiếu token đăng nhập");

    const { data, error } = await this.supabase.auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedException("Token không hợp lệ hoặc đã hết hạn");

    const nv = await this.prisma.nhan_vien.findUnique({ where: { auth_user_id: data.user.id } });
    if (!nv) throw new ForbiddenException("Tài khoản chưa được liên kết với nhân viên");
    if (nv.trang_thai_tai_khoan !== "hoat_dong") throw new ForbiddenException("Tài khoản đã bị khóa");

    const gan = await this.prisma.nhan_vien_vai_tro.findMany({
      where: { nhan_vien_id: nv.nhan_vien_id },
      select: { vai_tro_id: true },
    });
    const vaiTroIds = gan.map((g) => g.vai_tro_id);

    const [vaiTro, quyen] = await Promise.all([
      this.prisma.vai_tro.findMany({ where: { vai_tro_id: { in: vaiTroIds } }, select: { ma_vai_tro: true } }),
      this.prisma.quyen_vai_tro.findMany({
        where: { vai_tro_id: { in: vaiTroIds } },
        select: { doi_tuong: true, hanh_dong: true, pham_vi: true },
      }),
    ]);

    const user: AuthUser = {
      id: nv.nhan_vien_id,
      hoTen: nv.ho_ten,
      coSoId: nv.co_so_id,
      vaiTro: vaiTro.map((v) => v.ma_vai_tro),
      quyen: quyen.map((q) => ({ doi_tuong: q.doi_tuong, hanh_dong: q.hanh_dong, pham_vi: q.pham_vi as PhamVi })),
    };
    req.user = user;
    return true;
  }
}
