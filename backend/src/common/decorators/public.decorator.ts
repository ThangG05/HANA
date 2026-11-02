import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC = "isPublic";

/** Endpoint không cần đăng nhập (chỉ dùng cho health check). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
