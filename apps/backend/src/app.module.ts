import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";

import { AppCoreModule } from "./common/app-core.module";
import { HealthController } from "./common/health/health.controller";
import { appConfig } from "./config/app.config";
import { databaseConfig } from "./config/database.config";
import { jwtConfig } from "./config/jwt.config";
import { oauthConfig } from "./config/oauth.config";
import { paymentConfig } from "./config/payment.config";
import { proxmoxConfig } from "./config/proxmox.config";
import { redisConfig } from "./config/redis.config";
import { registrarConfig } from "./config/registrar.config";
import { storageConfig } from "./config/storage.config";
import { DatabaseModule } from "./database/database.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BillingModule } from "./modules/billing/billing.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { CmsModule } from "./modules/cms/cms.module";
import { ContactModule } from "./modules/contact/contact.module";
import { DomainsModule } from "./modules/domains/domains.module";
import { GeoModule } from "./modules/geo/geo.module";
import { HostingModule } from "./modules/hosting/hosting.module";
import { LicensesModule } from "./modules/licenses/licenses.module";
import { LifecycleModule } from "./modules/lifecycle/lifecycle.module";
import { MarketingModule } from "./modules/marketing/marketing.module";
import { NavigationModule } from "./modules/navigation/navigation.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ServersModule } from "./modules/servers/servers.module";
import { TicketsModule } from "./modules/tickets/tickets.module";
import { UsersModule } from "./modules/users/users.module";
import { WhatsappModule } from "./modules/whatsapp/whatsapp.module";
import { QueueModule } from "./queue/queue.module";
import { PricingModule } from "./shared/pricing/pricing.module";
import { StaffAlertsModule } from "./shared/staff-alerts/staff-alerts.module";
import { StorageModule } from "./shared/storage/storage.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        redisConfig,
        storageConfig,
        oauthConfig,
        registrarConfig,
        proxmoxConfig,
        paymentConfig,
      ],
      envFilePath: [".env.local", ".env"],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? "info",
        transport:
          process.env.NODE_ENV !== "production"
            ? { target: "pino-pretty", options: { colorize: true } }
            : undefined,
        redact: ["req.headers.authorization", "req.headers.x-api-key"],
      },
    }),
    DatabaseModule,
    QueueModule,
    StorageModule,
    PricingModule,
    StaffAlertsModule,
    AuthModule,
    UsersModule,
    OrdersModule,
    HostingModule,
    DomainsModule,
    BillingModule,
    PaymentsModule,
    TicketsModule,
    NotificationsModule,
    LicensesModule,
    ServersModule,
    AdminModule,
    AuditModule,
    CatalogModule,
    NavigationModule,
    CmsModule,
    ContactModule,
    GeoModule,
    MarketingModule,
    WhatsappModule,
    LifecycleModule,
    AppCoreModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
