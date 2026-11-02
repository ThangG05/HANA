import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthUser, PhamVi } from "../types/auth-user.js";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user as AuthUser,
);

/** Phạm vi dữ liệu rộng nhất mà user có cho quyền của endpoint hiện tại. */
export const DataScope = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().phamVi as PhamVi,
);
