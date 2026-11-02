import { Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto.js";

export const KENH_TUONG_TAC = ["dien_thoai", "hotline", "zalo", "messenger", "facebook", "tiktok", "website", "truc_tiep", "email", "khac"];

export class TaoTuongTacDto {
  @IsUUID() khachHangId: string;
  @IsOptional() @IsUUID() coHoiId?: string;
  @IsIn(KENH_TUONG_TAC) kenh: string;
  /** den = khách liên hệ vào, di = nhân viên liên hệ ra. */
  @IsIn(["den", "di"]) chieu: string;
  @IsOptional() @IsDateString() thoiDiem?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(24 * 3600) thoiLuongGiay?: number;
  /** Chỉ ghi nội dung tư vấn thông thường. KHÔNG ghi tiền sử bệnh/chi tiết y khoa vào đây. */
  @IsOptional() @IsString() @MaxLength(2000) noiDungTomTat?: string;
  @IsOptional() @IsString() @MaxLength(500) ketQua?: string;
  /** Cặp (heThongNguon, maSuKienNgoai) chống ghi trùng khi tích hợp form/tổng đài: gửi lại cùng mã thì trả bản ghi cũ. */
  @IsOptional() @IsString() @MaxLength(50) heThongNguon?: string;
  @IsOptional() @IsString() @MaxLength(200) maSuKienNgoai?: string;
}

export class TruyVanTuongTac extends PaginationDto {
  @IsOptional() @IsUUID() khachHangId?: string;
  @IsOptional() @IsUUID() coHoiId?: string;
}
