import { Module } from "@nestjs/common";
import { CareController } from "./care.controller.js";
import { CareService } from "./care.service.js";
import { CareTemplatesService } from "./care-templates.service.js";

@Module({ controllers: [CareController], providers: [CareService, CareTemplatesService] })
export class CareModule {}
