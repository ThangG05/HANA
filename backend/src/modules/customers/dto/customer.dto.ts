import { IsBoolean, IsDateString, IsEmail, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateIf } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto.js";

const khacRong = (_: unknown, v: unknown) => typeof v === "string" && v.trim() !== "";
const coGiaTri = (o: Record<string, unknown>, k: string) => khacRong(null, o[k]);

/** Trường chung. Chuỗi rỗng "" nghĩa là xóa giá trị (khi sửa). */
class KhachHangChung {
  @ValidateIf((o) => coGiaTri(o, "soDienThoai")) @Matches(/^[0-9+().\s-]{6,20}$/, { message: "Số điện thoại không hợp lệ" })
  @IsOptional() soDienThoai?: string;

  @ValidateIf((o) => coGiaTri(o, "email")) @IsEmail({}, { message: "Email không hợp lệ" }) @MaxLength(200)
  @IsOptional() email?: string;

  @IsOptional() @IsString() @MaxLength(100) zaloId?: string;

  @ValidateIf((o) => coGiaTri(o, "ngaySinh")) @IsDateString({ strict: true }, { message: "Ngày sinh phải dạng YYYY-MM-DD" })
  @IsOptional() ngaySinh?: string;

  @IsOptional() @IsString() @MaxLength(200) khuVuc?: string;
  @IsOptional() @IsString() @MaxLength(50) kenhLienHeUuTien?: string;
  @IsOptional() @IsString() @MaxLength(100) khungGioLienHe?: string;

  @IsOptional() @IsUUID() nguonDauTienId?: string;
  @IsOptional() @IsUUID() khachGioiThieuId?: string;

  /** Phải gửi true để tạo/sửa khi số điện thoại/email trùng hồ sơ khác (người thân dùng chung số). */
  @IsOptional() @IsBoolean() xacNhanTrungSo?: boolean;
}

export class TaoKhachHangDto extends KhachHangChung {
  @IsString() @MinLength(1) @MaxLength(200) hoTen: string;
}

export class SuaKhachHangDto extends KhachHangChung {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) hoTen?: string;
}

export class TruyVanKhachHang extends PaginationDto {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
}
