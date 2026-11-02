import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class TaoCaDto {
  @IsUUID() baoGiaId: string;
  /** Hạng mục báo giá mà ca này thực hiện. Một hạng mục có thể có nhiều ca (nhiều buổi). */
  @IsUUID() chiTietBaoGiaId: string;
  /** Bỏ trống: lấy chính người đang đăng nhập nếu họ là bác sĩ. */
  @IsOptional() @IsUUID() bacSiId?: string;
  /** Bỏ trống: cơ sở của người đang đăng nhập. */
  @IsOptional() @IsUUID() coSoId?: string;
  @IsOptional() @IsDateString() duKienLuc?: string;
}

export class DoiLichCaDto {
  @IsOptional() @IsDateString() duKienLuc?: string;
  @IsOptional() @IsUUID() bacSiId?: string;
  @IsOptional() @IsUUID() coSoId?: string;
}

/** Nội dung y khoa của ca. Chuỗi rỗng = xóa. Chỉ bác sĩ (quyền ho_so_kham) được ghi. */
export class GhiYKhoaCaDto {
  @IsOptional() @IsString() @MaxLength(5000) kiemTraTruocCa?: string;
  @IsOptional() @IsString() @MaxLength(5000) kyThuatThucHien?: string;
  @IsOptional() @IsString() @MaxLength(5000) huongDanSauCa?: string;
}

export class BatDauCaDto {
  @IsOptional() @IsDateString() batDauLuc?: string;
}

export class HoanThanhCaDto {
  @IsOptional() @IsDateString() ketThucLuc?: string;
}
