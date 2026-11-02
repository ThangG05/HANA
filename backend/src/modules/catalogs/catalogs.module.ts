import { Module } from "@nestjs/common";
import { CatalogsController } from "./catalogs.controller.js";
import { CatalogsService } from "./catalogs.service.js";

@Module({ controllers: [CatalogsController], providers: [CatalogsService] })
export class CatalogsModule {}
