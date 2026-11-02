import { Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto.js";
import { TRANG_THAI_CO_HOI } from "../../../common/utils/trang-thai.js";

const TOI_DA_TIEN = 1_000_000_000_000;

export class TaoCoHoiDto {
  @IsUUID() khachHangId: string;
  @IsUUID() dichVuId: string;
  @IsOptional() @IsUUID() nguonId?: string;
  /** Mặc định là người tạo. Giao cho người khác cần quyền phân công (co_hoi.duyet). */
  @IsOptional() @IsUUID() tuVanVienId?: string;
  @IsOptional() @IsString() @MaxLength(2000) mongMuon?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(TOI_DA_TIEN) nganSachTu?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(TOI_DA_TIEN) nganSachDen?: number;
  @IsOptional() @IsDateString({ strict: true }) thoiDiemDuKien?: string;
}

/** Cố ý KHÔNG có trường trạng thái: đổi trạng thái chỉ qua PATCH :id/status. */
export class SuaCoHoiDto {
  @IsOptional() @IsUUID() nguonId?: string;
  @IsOptional() @IsString() @MaxLength(2000) mongMuon?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(TOI_DA_TIEN) nganSachTu?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(TOI_DA_TIEN) nganSachDen?: number;
  @IsOptional() @IsDateString({ strict: true }) thoiDiemDuKien?: string;
}

export class DoiTrangThaiCoHoiDto {
  @IsIn(TRANG_THAI_CO_HOI as unknown as string[]) trangThai: string;
  @IsOptional() @IsString() @MaxLength(500) lyDo?: string;
}

export class PhanCongCoHoiDto {
  @IsUUID() tuVanVienId: string;
}

export class TruyVanCoHoi extends PaginationDto {
  @IsOptional() @IsIn(TRANG_THAI_CO_HOI as unknown as string[]) trangThai?: string;
  @IsOptional() @IsUUID() tuVanVienId?: string;
  @IsOptional() @IsUUID() khachHangId?: string;
  @IsOptional() @IsUUID() dichVuId?: string;
}
