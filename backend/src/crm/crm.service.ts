import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

const stages = ["NEW", "CONSULTING", "APPOINTMENT_BOOKED", "EXAMINED", "QUOTED", "WON", "AFTERCARE", "COMPLETED", "NURTURING", "STOPPED"] as const;
const stageTransitions: Record<string, string[]> = {
  NEW: ["CONSULTING", "NURTURING", "STOPPED"],
  CONSULTING: ["APPOINTMENT_BOOKED", "NURTURING", "STOPPED"],
  APPOINTMENT_BOOKED: ["CONSULTING", "EXAMINED", "NURTURING", "STOPPED"],
  EXAMINED: ["QUOTED", "NURTURING", "STOPPED"],
  QUOTED: ["WON", "NURTURING", "STOPPED"],
  WON: ["AFTERCARE", "STOPPED"],
  AFTERCARE: ["COMPLETED"],
  NURTURING: ["CONSULTING", "STOPPED"],
  STOPPED: [],
  COMPLETED: [],
};
const activeAppointmentStatuses = ["BOOKED", "CONFIRMED", "ARRIVED"] as const;
const appointmentTransitions: Record<string, string[]> = {
  BOOKED: ["CONFIRMED", "CANCELLED", "NO_SHOW"], CONFIRMED: ["ARRIVED", "CANCELLED", "NO_SHOW"],
  ARRIVED: ["COMPLETED"], COMPLETED: [], CANCELLED: [], NO_SHOW: [],
};
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Input = Record<string, unknown>;
const text = (value: unknown, field: string, required = true): string | undefined => {
  if (typeof value !== "string" || !value.trim()) {
    if (required) throw new BadRequestException(`${field} là bắt buộc`);
    return undefined;
  }
  return value.trim();
};
const optionalText = (value: unknown, field: string) => text(value, field, false);
const id = (value: unknown, field: string, required = true): string | undefined => {
  const result = text(value, field, required);
  if (result && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) {
    throw new BadRequestException(`${field} không hợp lệ`);
  }
  return result;
};
const date = (value: unknown, field: string, required = true): Date | undefined => {
  const raw = text(value, field, required);
  if (!raw) return undefined;
  const result = new Date(raw);
  if (Number.isNaN(result.getTime())) throw new BadRequestException(`${field} không hợp lệ`);
  return result;
};

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  listServices() { return this.prisma.service.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }); }

  async createService(body: Input) {
    const name = text(body.name, "Tên dịch vụ")!;
    const code = (optionalText(body.code, "Mã dịch vụ") ?? slug(name)).toUpperCase();
    if (!/^[A-Z0-9_-]{2,40}$/.test(code)) throw new BadRequestException("Mã dịch vụ chỉ gồm chữ, số, gạch ngang hoặc gạch dưới");
    try { return await this.prisma.service.create({ data: { name, code, groupName: optionalText(body.groupName, "Nhóm dịch vụ") } }); }
    catch (error) { if (isUniqueConflict(error)) throw new ConflictException("Mã dịch vụ đã được sử dụng"); throw error; }
  }

  async listCustomers(q?: string) {
    const search = q?.trim();
    const phoneSearch = search ? normalizePhone(search) : "";
    return this.prisma.customer.findMany({
      where: search ? { OR: [{ fullName: { contains: search, mode: "insensitive" } }, { emailNormalized: { contains: search.toLowerCase() } }, ...(phoneSearch ? [{ phoneNormalized: { contains: phoneSearch } }] : [])] } : undefined,
      orderBy: { updatedAt: "desc" }, take: 100,
      include: { _count: { select: { cases: true } } },
    });
  }

  async createCustomer(body: Input) {
    const fullName = text(body.fullName, "Họ tên")!;
    const phone = optionalText(body.phone, "Số điện thoại");
    const email = optionalText(body.email, "Email");
    if (!phone && !email) throw new BadRequestException("Cần nhập số điện thoại hoặc email");
    if (phone && !/^[+\d().\s-]{8,20}$/.test(phone)) throw new BadRequestException("Số điện thoại không hợp lệ");
    if (email && !emailPattern.test(email)) throw new BadRequestException("Email không hợp lệ");
    const birthDate = date(body.birthDate, "Ngày sinh", false);
    if (birthDate && birthDate > new Date()) throw new BadRequestException("Ngày sinh không thể ở tương lai");
    const emailNormalized = email?.toLowerCase();
    const potentialDuplicates = await this.prisma.customer.findMany({ where: { OR: [
      ...(phone ? [{ phoneNormalized: normalizePhone(phone) }] : []), ...(emailNormalized ? [{ emailNormalized }] : []),
    ] }, select: { id: true, fullName: true, phone: true }, take: 10 });
    const customer = await this.prisma.customer.create({ data: {
      fullName, phone, phoneNormalized: phone ? normalizePhone(phone) : null, email, emailNormalized,
      zaloId: optionalText(body.zaloId, "Zalo ID"), area: optionalText(body.area, "Khu vực"),
      birthDate,
    } });
    return { ...customer, potentialDuplicates };
  }

  async getCustomer(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: id(customerId, "ID khách hàng")! },
      include: { cases: { include: { service: true, assignedConsultant: { select: { id: true, fullName: true } }, stageHistory: { orderBy: { changedAt: "desc" }, take: 20 } }, orderBy: { updatedAt: "desc" } },
        interactions: { orderBy: { occurredAt: "desc" }, take: 50 }, tasks: { orderBy: { dueAt: "asc" }, take: 50 }, appointments: { orderBy: { startsAt: "desc" }, take: 50 } },
    });
    if (!customer) throw new NotFoundException("Không tìm thấy khách hàng");
    return customer;
  }

  listCases(stage?: string) {
    if (stage && !stages.includes(stage as typeof stages[number])) throw new BadRequestException("Trạng thái cơ hội không hợp lệ");
    return this.prisma.customerCase.findMany({ where: stage ? { stage: stage as typeof stages[number] } : undefined,
      include: { customer: true, service: true, assignedConsultant: { select: { id: true, fullName: true } } }, orderBy: { updatedAt: "desc" }, take: 100 });
  }

  async createCase(body: Input) {
    const customerId = id(body.customerId, "Khách hàng")!;
    const serviceId = id(body.serviceId, "Dịch vụ", false);
    const assignedConsultantId = id(body.assignedConsultantId, "Tư vấn viên", false);
    const source = optionalText(body.source, "Nguồn khách");
    const openedAt = date(body.openedAt, "Ngày tiếp nhận", false);
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
    if (!customer) throw new NotFoundException("Không tìm thấy khách hàng");
    if (serviceId && !await this.prisma.service.findFirst({ where: { id: serviceId, isActive: true }, select: { id: true } })) throw new NotFoundException("Không tìm thấy dịch vụ đang hoạt động");
    if (assignedConsultantId && !await this.prisma.user.findUnique({ where: { id: assignedConsultantId }, select: { id: true } })) throw new NotFoundException("Không tìm thấy nhân viên");
    return this.prisma.$transaction(async (tx) => {
      const customerCase = await tx.customerCase.create({ data: { customerId, serviceId, assignedConsultantId, source, openedAt } });
      await tx.caseStageHistory.create({ data: { caseId: customerCase.id, toStage: "NEW" } });
      return customerCase;
    });
  }

  async changeCaseStage(caseId: string, body: Input) {
    const target = text(body.stage, "Trạng thái")!;
    const reason = optionalText(body.reason, "Lý do");
    if (!stages.includes(target as typeof stages[number])) throw new BadRequestException("Trạng thái cơ hội không hợp lệ");
    try {
      return await this.prisma.$transaction(async (tx) => {
        const current = await tx.customerCase.findUnique({ where: { id: id(caseId, "ID cơ hội")! } });
        if (!current) throw new NotFoundException("Không tìm thấy cơ hội dịch vụ");
        if (!stageTransitions[current.stage].includes(target)) throw new ConflictException(`Không thể chuyển từ ${current.stage} sang ${target}`);
        if (["NURTURING", "STOPPED"].includes(target) && !reason) throw new BadRequestException("Cần ghi lý do khi chuyển sang nuôi dưỡng hoặc ngừng chăm sóc");
        const customerCase = await tx.customerCase.update({ where: { id: current.id }, data: {
          stage: target as typeof stages[number], closedAt: target === "COMPLETED" || target === "STOPPED" ? new Date() : null,
        } });
        await tx.caseStageHistory.create({ data: { caseId: current.id, fromStage: current.stage, toStage: target as typeof stages[number], reason } });
        return customerCase;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) throw error;
      if (isSerializationConflict(error)) throw new ConflictException("Cơ hội vừa được cập nhật bởi người khác. Hãy tải lại rồi thử lại.");
      throw error;
    }
  }

  listInteractions(customerId?: string) {
    return this.prisma.interaction.findMany({ where: customerId ? { customerId: id(customerId, "ID khách hàng")! } : undefined,
      include: { customer: { select: { id: true, fullName: true } }, customerCase: { select: { id: true, stage: true } } }, orderBy: { occurredAt: "desc" }, take: 100 });
  }

  async createInteraction(body: Input) {
    const customerId = id(body.customerId, "Khách hàng")!;
    const caseId = id(body.caseId, "Cơ hội", false);
    const userId = id(body.userId, "Nhân viên", false);
    const channel = text(body.channel, "Kênh")!;
    const direction = text(body.direction, "Chiều tương tác")!;
    if (!["PHONE", "ZALO", "FACEBOOK", "IN_PERSON", "EMAIL", "OTHER"].includes(channel)) throw new BadRequestException("Kênh tương tác không hợp lệ");
    if (!["INBOUND", "OUTBOUND", "INTERNAL"].includes(direction)) throw new BadRequestException("Chiều tương tác không hợp lệ");
    const occurredAt = date(body.occurredAt, "Thời điểm", false);
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
    if (!customer) throw new NotFoundException("Không tìm thấy khách hàng");
    if (caseId) {
      const customerCase = await this.prisma.customerCase.findUnique({ where: { id: caseId }, select: { customerId: true } });
      if (!customerCase || customerCase.customerId !== customerId) throw new BadRequestException("Cơ hội không thuộc khách hàng này");
    }
    return this.prisma.interaction.create({ data: { customerId, caseId, userId, channel: channel as never, direction: direction as never,
      summary: text(body.summary, "Nội dung")!, outcome: optionalText(body.outcome, "Kết quả"), occurredAt } });
  }

  listTasks(status?: string) {
    if (status && !["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)) throw new BadRequestException("Trạng thái công việc không hợp lệ");
    return this.prisma.workTask.findMany({ where: status ? { status: status as never } : undefined,
      include: { customer: { select: { id: true, fullName: true } }, customerCase: { select: { id: true, stage: true } } }, orderBy: [{ status: "asc" }, { dueAt: "asc" }], take: 100 });
  }

  async createTask(body: Input) {
    let customerId = id(body.customerId, "Khách hàng", false);
    const caseId = id(body.caseId, "Cơ hội", false);
    const assigneeId = id(body.assigneeId, "Người phụ trách", false);
    const dueAt = date(body.dueAt, "Hạn xử lý", false);
    if (caseId) {
      const customerCase = await this.prisma.customerCase.findUnique({ where: { id: caseId }, select: { customerId: true } });
      if (!customerCase) throw new NotFoundException("Không tìm thấy cơ hội");
      if (customerId && customerCase.customerId !== customerId) throw new BadRequestException("Cơ hội không thuộc khách hàng này");
      customerId ??= customerCase.customerId;
    }
    if (customerId && !await this.prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } })) throw new NotFoundException("Không tìm thấy khách hàng");
    if (assigneeId && !await this.prisma.user.findUnique({ where: { id: assigneeId }, select: { id: true } })) throw new NotFoundException("Không tìm thấy nhân viên");
    return this.prisma.workTask.create({ data: { customerId, caseId, assigneeId, dueAt, title: text(body.title, "Tiêu đề")!, description: optionalText(body.description, "Mô tả") } });
  }

  async updateTask(taskId: string, body: Input) {
    const status = body.status === undefined ? undefined : text(body.status, "Trạng thái");
    if (status && !["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)) throw new BadRequestException("Trạng thái công việc không hợp lệ");
    const data: Prisma.WorkTaskUpdateInput = {};
    if (status) { data.status = status as never; data.completedAt = status === "COMPLETED" ? new Date() : null; }
    if (body.title !== undefined) data.title = text(body.title, "Tiêu đề");
    if (body.description !== undefined) data.description = optionalText(body.description, "Mô tả");
    if (body.dueAt !== undefined) data.dueAt = date(body.dueAt, "Hạn xử lý");
    try { return await this.prisma.workTask.update({ where: { id: id(taskId, "ID công việc")! }, data }); }
    catch (error) { if (isMissingRecord(error)) throw new NotFoundException("Không tìm thấy công việc"); throw error; }
  }

  listAppointments(from?: string, to?: string) {
    const start = from ? date(from, "Từ ngày")! : undefined;
    const end = to ? date(to, "Đến ngày")! : undefined;
    if (start && end && start >= end) throw new BadRequestException("Khoảng thời gian không hợp lệ");
    return this.prisma.appointment.findMany({ where: { ...(start || end ? { startsAt: { ...(start ? { gte: start } : {}), ...(end ? { lt: end } : {}) } } : {}) },
      include: { customer: { select: { id: true, fullName: true, phone: true } }, customerCase: { select: { id: true, stage: true } } }, orderBy: { startsAt: "asc" }, take: 200 });
  }

  async createAppointment(body: Input) {
    const customerId = id(body.customerId, "Khách hàng")!;
    const caseId = id(body.caseId, "Cơ hội", false);
    const startsAt = date(body.startsAt, "Thời gian bắt đầu")!;
    const endsAt = date(body.endsAt, "Thời gian kết thúc")!;
    const doctorName = optionalText(body.doctorName, "Bác sĩ");
    const roomName = optionalText(body.roomName, "Phòng");
    if (endsAt <= startsAt) throw new BadRequestException("Thời gian kết thúc phải sau thời gian bắt đầu");
    await this.validateCustomerCase(customerId, caseId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const resources = [...(doctorName ? [{ doctorName }] : []), ...(roomName ? [{ roomName }] : [])];
        const clashes = resources.length ? await tx.appointment.findMany({ where: { status: { in: [...activeAppointmentStatuses] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, OR: resources }, select: { id: true, startsAt: true, endsAt: true, doctorName: true, roomName: true } }) : [];
        if (clashes.length) throw new ConflictException("Bác sĩ hoặc phòng đã có lịch trong khoảng thời gian này");
        const appointment = await tx.appointment.create({ data: { customerId, caseId, startsAt, endsAt, doctorName, roomName } });
        await tx.appointmentStatusHistory.create({ data: { appointmentId: appointment.id, toStatus: "BOOKED" } });
        if (caseId) {
          const customerCase = await tx.customerCase.findUnique({ where: { id: caseId }, select: { stage: true } });
          if (customerCase && ["NEW", "CONSULTING"].includes(customerCase.stage)) {
            await tx.customerCase.update({ where: { id: caseId }, data: { stage: "APPOINTMENT_BOOKED" } });
            await tx.caseStageHistory.create({ data: { caseId, fromStage: customerCase.stage, toStage: "APPOINTMENT_BOOKED", reason: "Đặt lịch hẹn" } });
          }
        }
        return appointment;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (isSerializationConflict(error)) throw new ConflictException("Lịch vừa được đặt bởi người khác. Hãy tải lại lịch rồi thử lại.");
      throw error;
    }
  }

  async changeAppointmentStatus(appointmentId: string, body: Input) {
    const target = text(body.status, "Trạng thái")!;
    const reason = optionalText(body.reason, "Lý do");
    if (!["BOOKED", "CONFIRMED", "ARRIVED", "COMPLETED", "CANCELLED", "NO_SHOW"].includes(target)) throw new BadRequestException("Trạng thái lịch hẹn không hợp lệ");
    const appointment = await this.prisma.appointment.findUnique({ where: { id: id(appointmentId, "ID lịch hẹn")! } });
    if (!appointment) throw new NotFoundException("Không tìm thấy lịch hẹn");
    if (!appointmentTransitions[appointment.status].includes(target)) throw new ConflictException(`Không thể chuyển lịch từ ${appointment.status} sang ${target}`);
    if ((target === "CANCELLED" || target === "NO_SHOW") && !reason) throw new BadRequestException("Cần ghi lý do khi hủy hoặc đánh dấu khách không đến");
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({ where: { id: appointment.id }, data: { status: target as never } });
      await tx.appointmentStatusHistory.create({ data: { appointmentId: appointment.id, fromStatus: appointment.status, toStatus: target as never, reason } });
      return updated;
    });
  }

  private async validateCustomerCase(customerId?: string, caseId?: string) {
    if (customerId && !await this.prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } })) throw new NotFoundException("Không tìm thấy khách hàng");
    if (caseId) {
      const customerCase = await this.prisma.customerCase.findUnique({ where: { id: caseId }, select: { customerId: true } });
      if (!customerCase) throw new NotFoundException("Không tìm thấy cơ hội");
      if (customerId && customerCase.customerId !== customerId) throw new BadRequestException("Cơ hội không thuộc khách hàng này");
    }
  }
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("84") ? `0${digits.slice(2)}` : digits;
}
function slug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toUpperCase().slice(0, 40);
}
function isMissingRecord(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === "P2025"; }
function isSerializationConflict(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === "P2034"; }
function isUniqueConflict(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === "P2002"; }
