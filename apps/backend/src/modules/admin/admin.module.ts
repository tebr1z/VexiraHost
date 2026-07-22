import { Module } from "@nestjs/common";



import { RolesGuard } from "@/guards/roles.guard";

import { AuthModule } from "@/modules/auth/auth.module";
import { DomainsModule } from "@/modules/domains/domains.module";

import { HostingModule } from "@/modules/hosting/hosting.module";
import { PaymentsModule } from "@/modules/payments/payments.module";

import { TicketsModule } from "@/modules/tickets/tickets.module";



import { AdminCatalogController } from "./controller/admin-catalog.controller";

import { AdminDomainsController } from "./controller/admin-domains.controller";

import { AdminHostingController } from "./controller/admin-hosting.controller";

import { AdminSystemController } from "./controller/admin-system.controller";

import { AdminController } from "./controller/admin.controller";

import { AdminCatalogRepository } from "./repository/admin-catalog.repository";

import { AdminRepository } from "./repository/admin.repository";

import { AdminCatalogService } from "./service/admin-catalog.service";

import { AdminDomainsService } from "./service/admin-domains.service";

import {

  AdminPaymentsRepository,

  AdminSystemRepository,

  AdminSystemService,

} from "./service/admin-system.service";

import { AdminService } from "./service/admin.service";



@Module({

  imports: [AuthModule, HostingModule, DomainsModule, TicketsModule, PaymentsModule],

  controllers: [

    AdminController,

    AdminHostingController,

    AdminCatalogController,

    AdminDomainsController,

    AdminSystemController,

  ],

  providers: [

    AdminService,

    AdminCatalogService,

    AdminDomainsService,

    AdminSystemService,

    AdminRepository,

    AdminCatalogRepository,

    AdminSystemRepository,

    AdminPaymentsRepository,

    RolesGuard,

  ],

  exports: [AdminService, AdminCatalogService, AdminDomainsService, AdminSystemService],

})

export class AdminModule {}


