import { Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";

import { GlobalExceptionFilter } from "../filters/global-exception.filter";
import { ResponseInterceptor } from "../interceptors/response.interceptor";
import { TimeoutInterceptor } from "../interceptors/timeout.interceptor";

/**
 * Register global providers via a dedicated module pattern.
 * Import in AppModule if using APP_* tokens.
 */
export const globalProviders = [
  { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
  { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
];

@Module({
  providers: globalProviders,
})
export class AppCoreModule {}
