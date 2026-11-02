import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module.js";
import { HealthController } from "./health.controller.js";
import { AuthModule } from "./auth/auth.module.js";
import { CommonModule } from "./common/common.module.js";
import { AuthGuard } from "./common/guards/auth.guard.js";
import { PermissionGuard } from "./common/guards/permission.guard.js";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter.js";
import { CatalogsModule } from "./modules/catalogs/catalogs.module.js";
import { CustomersModule } from "./modules/customers/customers.module.js";
import { OpportunitiesModule } from "./modules/opportunities/opportunities.module.js";
import { InteractionsModule } from "./modules/interactions/interactions.module.js";
import { TasksModule } from "./modules/tasks/tasks.module.js";
import { AppointmentsModule } from "./modules/appointments/appointments.module.js";
import { ConsultationsModule } from "./modules/consultations/consultations.module.js";
import { PaymentsModule } from "./modules/payments/payments.module.js";
import { CareModule } from "./modules/care/care.module.js";
import { ProceduresModule } from "./modules/procedures/procedures.module.js";
import { QuotesModule } from "./modules/quotes/quotes.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: "../.env" }),
    PrismaModule,
    CommonModule,
    AuthModule,
    CatalogsModule,
    CustomersModule,
    OpportunitiesModule,
    InteractionsModule,
    TasksModule,
    AppointmentsModule,
    ConsultationsModule,
    QuotesModule, PaymentsModule, ProceduresModule, CareModule,
  ],
  controllers: [HealthController],
  providers: [
    // Thứ tự khai báo = thứ tự chạy: xác thực trước, kiểm tra quyền sau.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
