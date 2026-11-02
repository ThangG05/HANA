import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

const TOI_DA_GIA = 1_000_000_000_000; // 1.000 tỷ VND, chặn nhập nhầm

export class TaoDichVuDto {
  @IsString() @MinLength(1) @MaxLength(200) tenDichVu: string;
  @IsString() @MinLength(1) @MaxLength(100) nhomDichVu: string;
  @IsOptional() @IsString() @MaxLength(2000) moTa?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(TOI_DA_GIA) giaThamKhaoTu?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(TOI_DA_GIA) giaThamKhaoDen?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(24 * 60) thoiLuongDuKien?: number;
}

export class SuaDichVuDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) tenDichVu?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) nhomDichVu?: string;
  @IsOptional() @IsString() @MaxLength(2000) moTa?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(TOI_DA_GIA) giaThamKhaoTu?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(TOI_DA_GIA) giaThamKhaoDen?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(24 * 60) thoiLuongDuKien?: number;
  /** Ngừng dùng thay vì xóa để giữ lịch sử. */
  @IsOptional() @IsBoolean() dangHoatDong?: boolean;
}
