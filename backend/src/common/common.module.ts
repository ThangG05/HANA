import { Global, Module } from "@nestjs/common";
import { AuditController } from "../audit/audit.controller.js";
import { AuditService } from "../audit/audit.service.js";
import { ScopeService } from "./scope.service.js";

@Global()
@Module({
  controllers: [AuditController],
  providers: [ScopeService, AuditService],
  exports: [ScopeService, AuditService],
})
export class CommonModule {}
