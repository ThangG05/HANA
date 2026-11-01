import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CrmService } from "./crm.service.js";

@Controller()
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get("customers") listCustomers(@Query("q") q?: string) { return this.crm.listCustomers(q); }
  @Get("services") listServices() { return this.crm.listServices(); }
  @Post("services") createService(@Body() body: Record<string, unknown>) { return this.crm.createService(body); }
  @Post("customers") createCustomer(@Body() body: Record<string, unknown>) { return this.crm.createCustomer(body); }
  @Get("customers/:id") getCustomer(@Param("id") id: string) { return this.crm.getCustomer(id); }
  @Get("cases") listCases(@Query("stage") stage?: string) { return this.crm.listCases(stage); }
  @Post("cases") createCase(@Body() body: Record<string, unknown>) { return this.crm.createCase(body); }
  @Patch("cases/:id/stage") changeCaseStage(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.crm.changeCaseStage(id, body);
  }
  @Get("interactions") listInteractions(@Query("customerId") customerId?: string) {
    return this.crm.listInteractions(customerId);
  }
  @Post("interactions") createInteraction(@Body() body: Record<string, unknown>) {
    return this.crm.createInteraction(body);
  }
  @Get("tasks") listTasks(@Query("status") status?: string) { return this.crm.listTasks(status); }
  @Post("tasks") createTask(@Body() body: Record<string, unknown>) { return this.crm.createTask(body); }
  @Patch("tasks/:id") updateTask(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.crm.updateTask(id, body);
  }
  @Get("appointments") listAppointments(@Query("from") from?: string, @Query("to") to?: string) {
    return this.crm.listAppointments(from, to);
  }
  @Post("appointments") createAppointment(@Body() body: Record<string, unknown>) {
    return this.crm.createAppointment(body);
  }
  @Patch("appointments/:id/status") changeAppointmentStatus(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.crm.changeAppointmentStatus(id, body);
  }
}
