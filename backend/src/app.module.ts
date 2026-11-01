import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module.js";
import { HealthController } from "./health.controller.js";
import { CrmModule } from "./crm/crm.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: "../.env" }),
    PrismaModule,
    CrmModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
