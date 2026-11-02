import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC } from "../decorators/public.decorator.js";
import { ANY_STAFF_KEY, PERMISSION_KEY } from "../decorators/require-permission.decorator.js";
import { phamViCua, type AuthUser } from "../types/auth-user.js";

/**
 * Kiểm tra quyền theo (đối tượng, hành động) và gắn phạm vi dữ liệu rộng nhất vào request.phamVi.
 * Endpoint chưa khai báo quyền thì KHÔNG ai gọi được (mặc định từ chối).
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest();
    const user: AuthUser | undefined = req.user;
    if (!user) throw new UnauthorizedException();

    if (this.reflector.getAllAndOverride<boolean>(ANY_STAFF_KEY, targets)) return true;

    const need = this.reflector.getAllAndOverride<{ doiTuong: string; hanhDong: string }>(PERMISSION_KEY, targets);
    if (!need) throw new ForbiddenException("Endpoint chưa khai báo quyền truy cập");

    const phamVi = phamViCua(user, need.doiTuong, need.hanhDong);
    if (!phamVi) throw new ForbiddenException("Bạn không có quyền thực hiện thao tác này");

    req.phamVi = phamVi;
    return true;
  }
}
