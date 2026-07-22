import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { LocalStorageProvider } from "./providers/local.storage";
import { R2StorageProvider } from "./providers/r2.storage";
import { S3StorageProvider } from "./providers/s3.storage";
import { STORAGE_PROVIDER } from "./storage.interface";

@Global()
@Module({
  providers: [
    LocalStorageProvider,
    S3StorageProvider,
    R2StorageProvider,
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService, LocalStorageProvider, S3StorageProvider, R2StorageProvider],
      useFactory: (
        configService: ConfigService,
        local: LocalStorageProvider,
        s3: S3StorageProvider,
        r2: R2StorageProvider,
      ) => {
        const driver = configService.get<string>("storage.driver", "local");
        switch (driver) {
          case "s3":
            return s3;
          case "r2":
            return r2;
          default:
            return local;
        }
      },
    },
  ],
  exports: [STORAGE_PROVIDER, LocalStorageProvider, S3StorageProvider, R2StorageProvider],
})
export class StorageModule {}
