import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";

export class HangMucDto {
  @IsUUID() dichVuId: string;
  /** Mặc định lấy tên dịch vụ tại thời điểm lập; có thể đặt tên riêng (ví dụ ghi rõ gói). */
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) tenHangMuc?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(1000) soLuong: number;
  /** VND, số nguyên. Trần 10 tỷ để chặn nhập nhầm. */
  @Type(() => Number) @IsInt() @Min(0) @Max(10_000_000_000) donGia: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10_000_000_000_000) giamGia?: number;
}

export class TaoBaoGiaDto {
  @IsUUID() coHoiId: string;
  /** Lần khám làm căn cứ. Phải thuộc cùng cơ hội. */
  @IsUUID() thamKhamId: string;
  @IsOptional() @IsDateString({ strict: true }) hieuLucDen?: string;
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => HangMucDto) hangMuc: HangMucDto[];
}

/** Chỉ sửa được khi báo giá còn là bản nháp. hangMuc (nếu gửi) thay toàn bộ danh sách hạng mục. */
export class SuaBaoGiaDto {
  @IsOptional() @IsUUID() thamKhamId?: string;
  @IsOptional() @IsDateString({ strict: true }) hieuLucDen?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => HangMucDto) hangMuc?: HangMucDto[];
}
