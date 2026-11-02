import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}

export interface Trang<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function boTrang<T>(items: T[], total: number, p: PaginationDto): Trang<T> {
  return { items, total, page: p.page, pageSize: p.pageSize };
}

export const boQua = (p: PaginationDto) => (p.page - 1) * p.pageSize;
