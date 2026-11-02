import { Transform } from "class-transformer";
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto.js";
import { TRANG_THAI_CONG_VIEC } from "../../../common/utils/trang-thai.js";

export const MUC_UU_TIEN = ["thap", "binh_thuong", "cao", "khan_cap"];

export class TaoCongViecDto {
  @IsUUID() khachHangId: string;
  @IsOptional() @IsUUID() coHoiId?: string;
  /** Gắn lịch hẹn thì bắt buộc có coHoiId. */
  @IsOptional() @IsUUID() lichHenId?: string;
  @IsString() @MinLength(1) @MaxLength(50) loaiCongViec: string;
  @IsString() @MinLength(1) @MaxLength(1000) noiDung: string;
  /** Mặc định là người tạo. Người chỉ có phạm vi "được giao" chỉ được giao cho chính mình. */
  @IsOptional() @IsUUID() nguoiPhuTrachId?: string;
  @IsDateString() hanHoanThanh: string;
  @IsOptional() @IsIn(MUC_UU_TIEN) mucUuTien?: string;
  /** Khóa chống trùng cho tác vụ tự động: gửi lại cùng khóa thì trả việc cũ, không tạo mới. */
  @IsOptional() @IsString() @MaxLength(200) khoaChongTrung?: string;
}

export class SuaCongViecDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(1000) noiDung?: string;
  @IsOptional() @IsDateString() hanHoanThanh?: string;
  @IsOptional() @IsIn(MUC_UU_TIEN) mucUuTien?: string;
  @IsOptional() @IsUUID() nguoiPhuTrachId?: string;
  @IsOptional() @IsIn(TRANG_THAI_CONG_VIEC as unknown as string[]) trangThai?: string;
  /** Bắt buộc khi chuyển sang hoan_thanh. */
  @IsOptional() @IsString() @MaxLength(1000) ketQua?: string;
}

const boolTuQuery = ({ value }: { value: unknown }) => (value === "true" || value === true ? true : value === "false" || value === false ? false : value);

export class TruyVanCongViec extends PaginationDto {
  @IsOptional() @IsIn(TRANG_THAI_CONG_VIEC as unknown as string[]) trangThai?: string;
  @IsOptional() @IsUUID() nguoiPhuTrachId?: string;
  @IsOptional() @IsUUID() khachHangId?: string;
  /** Chỉ việc chưa xong và đã quá hạn. */
  @IsOptional() @Transform(boolTuQuery) @IsBoolean() quaHan?: boolean;
  /** Chỉ việc của tôi. */
  @IsOptional() @Transform(boolTuQuery) @IsBoolean() cuaToi?: boolean;
  @IsOptional() @Transform(boolTuQuery) @IsBoolean() chuaXong?: boolean;
  /** Khoảng hạn công việc, ISO có timezone. Dùng để phân nhóm hôm nay/sắp tới trên server. */
  @IsOptional() @IsDateString() hanTu?: string;
  @IsOptional() @IsDateString() hanDen?: string;
}
