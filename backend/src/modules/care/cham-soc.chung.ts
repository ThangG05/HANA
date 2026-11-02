export type DonViMoc = "ngay" | "tuan" | "thang";

/** Hạn thực hiện = giờ kết thúc ca + khoảng thời gian của mốc (tháng tính theo lịch, ngày/tuần theo 24 giờ). */
export function hanTuMoc(ketThuc: Date, khoang: number, donVi: string): Date {
  const d = new Date(ketThuc.getTime());
  if (donVi === "thang") {
    d.setUTCMonth(d.getUTCMonth() + khoang);
    return d;
  }
  d.setUTCDate(d.getUTCDate() + khoang * (donVi === "tuan" ? 7 : 1));
  return d;
}
