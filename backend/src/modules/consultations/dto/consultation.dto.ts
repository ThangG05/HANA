import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

/** Nội dung y khoa: chỉ bác sĩ được xem. Chuỗi rỗng khi sửa = xóa nội dung. */
class NoiDungKham {
  @IsOptional() @IsString() @MaxLength(5000) tienSu?: string;
  @IsOptional() @IsString() @MaxLength(5000) diUng?: string;
  @IsOptional() @IsString() @MaxLength(5000) ketQuaThamKham?: string;
  @IsOptional() @IsString() @MaxLength(5000) phuongAnDeXuat?: string;
  @IsOptional() @IsString() @MaxLength(5000) ketLuanDieuKien?: string;
  /** Mã hồ sơ ở phần mềm bệnh án bên ngoài (nếu có). */
  @IsOptional() @IsString() @MaxLength(100) maHoSoYKhoaNgoai?: string;
}

export class TaoLanKhamDto extends NoiDungKham {
  @IsUUID() coHoiId: string;
  @IsOptional() @IsUUID() lichHenId?: string;
  /** Bỏ trống: lấy chính người đang đăng nhập nếu họ là bác sĩ. */
  @IsOptional() @IsUUID() bacSiId?: string;
  @IsOptional() @IsDateString() thoiDiemKham?: string;
}

export class SuaLanKhamDto extends NoiDungKham {
  @IsOptional() @IsDateString() thoiDiemKham?: string;
}
