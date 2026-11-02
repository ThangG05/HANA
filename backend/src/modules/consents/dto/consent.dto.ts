import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class GhiDongYDto {
  @IsIn(["thuc_hien_dich_vu", "luu_anh", "truyen_thong", "marketing"]) mucDich: string;
  @IsString() @MinLength(1) @MaxLength(100) phienBanNoiDung: string;
  /** Mã phiếu/chữ ký/tài liệu làm bằng chứng. Không ghi nội dung y khoa vào đây. */
  @IsString() @MinLength(3) @MaxLength(500) bangChung: string;
  @IsOptional() @IsUUID() caId?: string;
}
