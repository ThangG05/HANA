import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto.js";

const PHUONG_THUC = ["tien_mat", "chuyen_khoan", "the"] as const;
const TIEN_TOI_DA = 10_000_000_000;

export class TaoThuTienDto {
  @IsUUID() baoGiaId: string;
  @IsIn(["dat_coc", "thanh_toan"]) loai: "dat_coc" | "thanh_toan";
  /** VND, số nguyên dương. */
  @Type(() => Number) @IsInt() @Min(1) @Max(TIEN_TOI_DA) soTien: number;
  @IsIn(PHUONG_THUC) phuongThuc: (typeof PHUONG_THUC)[number];
  /** Mã giao dịch ngân hàng/POS để chống ghi trùng. Đi kèm benCungCap. */
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) maGiaoDich?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) benCungCap?: string;
  /** true: ghi "chờ xác nhận" (chuyển khoản chưa thấy tiền về). Thu ngân xác nhận sau. */
  @IsOptional() @IsBoolean() choXacNhan?: boolean;
}

export class TaoHoanTienDto {
  /** Khoản thu gốc (đã thành công) cần hoàn. */
  @IsUUID() giaoDichGocId: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(TIEN_TOI_DA) soTien: number;
  @IsIn(PHUONG_THUC) phuongThuc: (typeof PHUONG_THUC)[number];
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) maGiaoDich?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) benCungCap?: string;
}

export class TruyVanCongNoDto extends PaginationDto {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
}
