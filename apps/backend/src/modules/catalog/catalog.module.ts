import { Module } from "@nestjs/common";

import { CatalogController } from "./controller/catalog.controller";
import { CatalogRepository } from "./repository/catalog.repository";
import { CatalogService } from "./service/catalog.service";

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, CatalogRepository],
  exports: [CatalogService],
})
export class CatalogModule {}
