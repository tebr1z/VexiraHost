import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";

import { appConfig } from "./config/app.config";
import { databaseConfig } from "./config/database.config";
import { jwtConfig } from "./config/jwt.config";
import { redisConfig } from "./config/redis.config";
import { storageConfig } from "./config/storage.config";
import { oauthConfig } from "./config/oauth.config";
import { registrarConfig } from "./config/registrar.config";
import { proxmoxConfig } from "./config/proxmox.config";
import { paymentConfig } from "./config/payment.config";
import { AppCoreModule } from "./common/app-core.module";
import { DatabaseModule } from "./database/database.module";
import { QueueModule } from "./queue/queue.module";
import { StorageModule } from "./shared/storage/storage.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { HostingModule } from "./modules/hosting/hosting.module";
import { DomainsModule } from "./modules/domains/domains.module";
import { BillingModule } from "./modules/billing/billing.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { TicketsModule } from "./modules/tickets/tickets.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { LicensesModule } from "./modules/licenses/licenses.module";
import { ServersModule } from "./modules/servers/servers.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AuditModule } from "./modules/audit/audit.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { NavigationModule } from "./modules/navigation/navigation.module";
import { CmsModule } from "./modules/cms/cms.module";
import { GeoModule } from "./modules/geo/geo.module";
import { HealthController } from "./common/health/health.controller";

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
        redact: ["req.headers.authorization"],
      },
    }),
    DatabaseModule,
    QueueModule,
    StorageModule,
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
    GeoModule,
    AppCoreModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
