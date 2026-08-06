import { Module } from "@nestjs/common";

import { AdminCatalogCategoryController } from "./controller/admin-catalog-category.controller";
import { AdminCatalogController } from "./controller/admin-catalog.controller";
import { AdminCustomerDomainsController } from "./controller/admin-customer-domains.controller";
import { AdminDomainsController } from "./controller/admin-domains.controller";
import { AdminHostingController } from "./controller/admin-hosting.controller";
import { AdminPromoController } from "./controller/admin-promo.controller";
import { AdminSystemController } from "./controller/admin-system.controller";
import { AdminController } from "./controller/admin.controller";
import { AdminCatalogCategoryRepository } from "./repository/admin-catalog-category.repository";
import { AdminCatalogRepository } from "./repository/admin-catalog.repository";
import { AdminPromoRepository } from "./repository/admin-promo.repository";
import { AdminRepository } from "./repository/admin.repository";
import { AdminCatalogCategoryService } from "./service/admin-catalog-category.service";
import { AdminCatalogService } from "./service/admin-catalog.service";
import { AdminCustomerDomainsService } from "./service/admin-customer-domains.service";
import { AdminCustomerHostingService } from "./service/admin-customer-hosting.service";
import { AdminDomainsService } from "./service/admin-domains.service";
import { AdminPromoService } from "./service/admin-promo.service";
import {
  AdminPaymentsRepository,
  AdminSystemRepository,
  AdminSystemService,
} from "./service/admin-system.service";
import { AdminService } from "./service/admin.service";

import { RolesGuard } from "@/guards/roles.guard";
import { AuthModule } from "@/modules/auth/auth.module";
import { DomainsModule } from "@/modules/domains/domains.module";
import { HostingModule } from "@/modules/hosting/hosting.module";
import { LicensesModule } from "@/modules/licenses/licenses.module";
import { PaymentsModule } from "@/modules/payments/payments.module";
import { TicketsModule } from "@/modules/tickets/tickets.module";
import { WhatsappModule } from "@/modules/whatsapp/whatsapp.module";

@Module({
  imports: [
    AuthModule,
    HostingModule,
    LicensesModule,
    WhatsappModule,
    DomainsModule,
    TicketsModule,
    PaymentsModule,
  ],
  controllers: [
    AdminController,
    AdminHostingController,
    AdminCatalogController,
    AdminCatalogCategoryController,
    AdminDomainsController,
    AdminPromoController,
    AdminCustomerDomainsController,
    AdminSystemController,
  ],
  providers: [
    AdminService,
    AdminCatalogService,
    AdminCatalogCategoryService,
    AdminDomainsService,
    AdminCustomerDomainsService,
    AdminCustomerHostingService,
    AdminPromoService,
    AdminSystemService,
    AdminRepository,
    AdminCatalogRepository,
    AdminCatalogCategoryRepository,
    AdminPromoRepository,
    AdminSystemRepository,
    AdminPaymentsRepository,
    RolesGuard,
  ],
  exports: [
    AdminService,
    AdminCatalogService,
    AdminCatalogCategoryService,
    AdminDomainsService,
    AdminPromoService,
    AdminSystemService,
  ],
})
export class AdminModule {}
