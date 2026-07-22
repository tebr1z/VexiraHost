import { Module } from "@nestjs/common";

import { AdminCmsController } from "./controller/admin-cms.controller";
import { CmsController } from "./controller/cms.controller";
import { CmsRepository } from "./repository/cms.repository";
import { AdminCmsService } from "./service/admin-cms.service";
import { CmsService } from "./service/cms.service";

@Module({
  controllers: [CmsController, AdminCmsController],
  providers: [CmsService, AdminCmsService, CmsRepository],
  exports: [CmsService, AdminCmsService],
})
export class CmsModule {}
