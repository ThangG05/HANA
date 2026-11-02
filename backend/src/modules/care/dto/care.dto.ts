import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto.js";

export const LOAI_LIEN_HE = ["goi_dien", "nhan_tin", "tai_kham"] as const;
export const DON_VI_MOC = ["ngay", "tuan", "thang"] as const;

export class TaoMauDto {
  @IsUUID() dichVuId: string;
}

export class MocDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(120) khoangThoiGian: number;
  @IsIn(DON_VI_MOC) donVi: (typeof DON_VI_MOC)[number];
  @IsString() @MinLength(1) @MaxLength(1000) noiDung: string;
  @IsIn(LOAI_LIEN_HE) loaiLienHe: (typeof LOAI_LIEN_HE)[number];
  /** Mã vai trò phụ trách (ví dụ dieu_duong_cskh); bỏ trống = ai trong cơ sở cũng nhận được. */
  @IsOptional() @IsString() @MaxLength(50) vaiTroPhuTrach?: string;
}

export class SuaMocDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(120) khoangThoiGian?: number;
  @IsOptional() @IsIn(DON_VI_MOC) donVi?: (typeof DON_VI_MOC)[number];
  @IsOptional() @IsString() @MinLength(1) @MaxLength(1000) noiDung?: string;
  @IsOptional() @IsIn(LOAI_LIEN_HE) loaiLienHe?: (typeof LOAI_LIEN_HE)[number];
  @IsOptional() @IsString() @MaxLength(50) vaiTroPhuTrach?: string;
}

export class CanhBaoMoiDto {
  @IsString() @MinLength(3) @MaxLength(2000) moTa: string;
  @IsOptional() @IsIn(["binh_thuong", "cao", "khan_cap"]) mucUuTien?: "binh_thuong" | "cao" | "khan_cap";
}

export class HoanThanhChamSocDto {
  @IsString() @MinLength(1) @MaxLength(3000) phanHoi: string;
  @IsOptional() @IsString() @MaxLength(3000) huongXuLy?: string;
  /** Có triệu chứng bất thường: báo luôn cho bác sĩ phụ trách ca trong cùng một lần lưu. */
  @IsOptional() @Type(() => CanhBaoMoiDto) canhBao?: CanhBaoMoiDto;
}

export class TaoCanhBaoDto {
  @IsString() @MinLength(3) @MaxLength(2000) moTa: string;
  @IsOptional() @IsIn(["binh_thuong", "cao", "khan_cap"]) mucUuTien?: "binh_thuong" | "cao" | "khan_cap";
}

export class XuLyCanhBaoDto {
  @IsOptional() @IsString() @MaxLength(3000) huongXuLy?: string;
}

export class DongCanhBaoDto {
  @IsString() @MinLength(1) @MaxLength(3000) huongXuLy: string;
}

export class DoiHanDto {
  @IsString() hanThucHien: string;
}

export class DanhGiaDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(10) diem: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10) thangDiem?: number;
  @IsOptional() @IsString() @MaxLength(2000) nhanXet?: string;
}

export class TruyVanViecDto extends PaginationDto {
  @IsOptional() @IsIn(["cho_thuc_hien", "hoan_thanh", "huy"]) trangThai?: string;
  /** "1" = chỉ việc đã quá hạn. */
  @IsOptional() @IsIn(["1"]) quaHan?: string;
}

export class TruyVanCanhBaoDto extends PaginationDto {
  @IsOptional() @IsIn(["moi", "da_nhan", "dang_xu_ly", "da_dong"]) trangThai?: string;
}
