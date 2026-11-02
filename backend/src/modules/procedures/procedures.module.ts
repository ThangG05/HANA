import { Module } from "@nestjs/common";
import { ProceduresController } from "./procedures.controller.js";
import { ProceduresService } from "./procedures.service.js";

@Module({ controllers: [ProceduresController], providers: [ProceduresService] })
export class ProceduresModule {}
