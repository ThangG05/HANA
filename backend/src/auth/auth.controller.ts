import { Controller, Get } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { AllowAnyStaff } from "../common/decorators/require-permission.decorator.js";
import type { AuthUser } from "../common/types/auth-user.js";

@Controller("auth")
export class AuthController {
  /** Thông tin người đang đăng nhập: dùng cho frontend ẩn/hiện menu (quyền thật vẫn kiểm tra ở backend). */
  @Get("me")
  @AllowAnyStaff()
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
