import { Module } from "@nestjs/common";

import { GeoController } from "./controller/geo.controller";
import { GeoService } from "./service/geo.service";

@Module({
  controllers: [GeoController],
  providers: [GeoService],
  exports: [GeoService],
})
export class GeoModule {}
