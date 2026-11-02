import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";

interface Mapped {
  status: number;
  message: string;
  code?: string;
}

/**
 * Gom MỌI chuỗi nằm trong đối tượng lỗi (kể cả lồng trong meta/cause/driverAdapterError) để dò mã lỗi Postgres.
 * Prisma + driver adapter đặt mã gốc (23P01...) ở các chỗ khác nhau tùy phiên bản, nên quét toàn bộ cây thay vì đoán đường dẫn.
 * Chuỗi này chỉ dùng để so khớp, KHÔNG BAO GIỜ trả về cho client.
 */
function dauVetLoi(e: unknown, daGap = new WeakSet<object>(), sau = 0): string {
  if (e == null) return "";
  if (typeof e !== "object") return String(e);
  if (daGap.has(e) || sau > 6) return "";
  daGap.add(e);
  const phan: string[] = [];
  // getOwnPropertyNames lấy cả message/code không liệt kê được của Error.
  for (const k of Object.getOwnPropertyNames(e)) {
    if (k === "stack") continue;
    phan.push(dauVetLoi((e as Record<string, unknown>)[k], daGap, sau + 1));
  }
  return phan.join(" | ");
}

/** Chuyển lỗi database thành lỗi API an toàn: không lộ SQL, tên bảng hay stack trace. */
export function anhXaLoiDatabase(e: unknown): Mapped | null {
  const s = dauVetLoi(e);
  const code = (e as { code?: string } | null)?.code;

  if (/23P01|exclusion constraint/i.test(s)) {
    if (/khong_trung_bac_si/.test(s)) return { status: 409, code: "TRUNG_LICH_BAC_SI", message: "Trùng lịch bác sĩ trong khung giờ này" };
    if (/khong_trung_phong/.test(s)) return { status: 409, code: "TRUNG_LICH_PHONG", message: "Trùng lịch phòng trong khung giờ này" };
    return { status: 409, code: "TRUNG_LICH", message: "Trùng lịch bác sĩ/phòng" };
  }
  if (code === "P2002" || /23505|unique constraint/i.test(s)) {
    return { status: 409, code: "TRUNG_DU_LIEU", message: "Dữ liệu đã tồn tại (trùng khóa duy nhất)" };
  }
  if (code === "P2003" || /23503|foreign key/i.test(s)) {
    return { status: 400, code: "THAM_CHIEU_SAI", message: "Dữ liệu tham chiếu không hợp lệ hoặc đang được sử dụng" };
  }
  // Trigger khóa ở migration 006 (báo giá/hạng mục/lần khám đã gửi). Thông báo của trigger không trả cho client.
  if (/hana_khoa:/.test(s)) {
    // Thông báo do chính trigger của ta viết (tiếng Việt, không chứa SQL/tên bảng) nên trả được cho người dùng.
    const nd = s.match(/hana_khoa:\s*([^|\n]+)/)?.[1]?.trim();
    return { status: 409, code: "DA_KHOA", message: nd ? `${nd[0].toUpperCase()}${nd.slice(1)}.` : "Dữ liệu này đã khóa, không sửa được." };
  }
  if (/23514|check constraint/i.test(s)) {
    return { status: 400, code: "DU_LIEU_KHONG_HOP_LE", message: "Dữ liệu không thỏa ràng buộc của hệ thống" };
  }
  if (/23502|not-null|null value in column/i.test(s)) {
    return { status: 400, code: "THIEU_DU_LIEU", message: "Thiếu dữ liệu bắt buộc" };
  }
  if (code === "P2025") return { status: 404, code: "KHONG_TIM_THAY", message: "Không tìm thấy bản ghi" };
  if (/22P02|invalid input syntax for type uuid/i.test(s)) {
    return { status: 400, code: "ID_KHONG_HOP_LE", message: "Mã định danh không hợp lệ" };
  }
  return null;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("API");

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      res.status(status).json(typeof body === "string" ? { statusCode: status, message: body } : body);
      return;
    }

    const mapped = anhXaLoiDatabase(exception);
    if (mapped) {
      res.status(mapped.status).json({ statusCode: mapped.status, code: mapped.code, message: mapped.message });
      return;
    }

    // Lỗi không lường trước: chỉ ghi tên + message ở server, không trả chi tiết và không log dữ liệu request.
    const err = exception as Error;
    this.logger.error(`${err?.name ?? "Error"}: ${err?.message ?? String(exception)}`);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ statusCode: 500, message: "Lỗi hệ thống, vui lòng thử lại sau" });
  }
}
