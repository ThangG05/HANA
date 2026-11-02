import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto.js";
import { TRANG_THAI_LICH_HEN } from "../../../common/utils/trang-thai.js";

const LOAI = ["kham", "thuc_hien", "tai_kham"];

export class TaoLichHenDto {
  /** Mọi lịch hẹn phải thuộc một cơ hội; khách được suy ra từ cơ hội. */
  @IsUUID() coHoiId: string;
  @IsUUID() coSoId: string;
  @IsOptional() @IsUUID() bacSiId?: string;
  @IsOptional() @IsString() @MaxLength(50) phong?: string;
  @IsOptional() @IsIn(LOAI) loaiLichHen?: string;
  @IsDateString() batDau: string;
  @IsDateString() ketThuc: string;
}

export class DoiTrangThaiLichHenDto {
  /** da_doi_lich không đặt tay được: dùng POST :id/reschedule. */
  @IsIn((TRANG_THAI_LICH_HEN as unknown as string[]).filter((t) => t !== "da_doi_lich")) trangThai: string;
  /** Bắt buộc khi hủy. */
  @IsOptional() @IsString() @MaxLength(500) lyDo?: string;
}

export class DoiLichDto {
  @IsDateString() batDau: string;
  @IsDateString() ketThuc: string;
  @IsOptional() @IsUUID() coSoId?: string;
  @IsOptional() @IsUUID() bacSiId?: string;
  @IsOptional() @IsString() @MaxLength(50) phong?: string;
  @IsOptional() @IsString() @MaxLength(500) lyDo?: string;
}

export class TruyVanLichHen extends PaginationDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsUUID() bacSiId?: string;
  @IsOptional() @IsUUID() coSoId?: string;
  @IsOptional() @IsUUID() coHoiId?: string;
  @IsOptional() @IsUUID() khachHangId?: string;
  @IsOptional() @IsIn(TRANG_THAI_LICH_HEN as unknown as string[]) trangThai?: string;
}
