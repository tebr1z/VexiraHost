import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ApiErrorCode } from "@vexira/types";
import type { Request, Response } from "express";

type Locale = "tr" | "en" | "ru" | "az";

const SUPPORTED_LOCALES: Locale[] = ["tr", "en", "ru", "az"];

const ERROR_MESSAGES: Record<ApiErrorCode, Record<Locale, string>> = {
  [ApiErrorCode.BAD_REQUEST]: {
    tr: "Gecersiz istek.",
    en: "Invalid request.",
    ru: "Некорректный запрос.",
    az: "Yanlis sorgu.",
  },
  [ApiErrorCode.VALIDATION_ERROR]: {
    tr: "Dogrulama hatasi.",
    en: "Validation error.",
    ru: "Ошибка валидации.",
    az: "Validasiya xetasi.",
  },
  [ApiErrorCode.UNAUTHORIZED]: {
    tr: "Yetkilendirme gerekli.",
    en: "Authorization required.",
    ru: "Требуется авторизация.",
    az: "Yetkilendirme teleb olunur.",
  },
  [ApiErrorCode.FORBIDDEN]: {
    tr: "Bu islem icin yetkiniz yok.",
    en: "You do not have permission for this action.",
    ru: "Недостаточно прав для этого действия.",
    az: "Bu emeliyyat ucun icazeniz yoxdur.",
  },
  [ApiErrorCode.NOT_FOUND]: {
    tr: "Kaynak bulunamadi.",
    en: "Resource not found.",
    ru: "Ресурс не найден.",
    az: "Resurs tapilmadi.",
  },
  [ApiErrorCode.CONFLICT]: {
    tr: "Istek mevcut durumla cakisiyor.",
    en: "Request conflicts with current state.",
    ru: "Запрос конфликтует с текущим состоянием.",
    az: "Sorgu movcud veziyyetle ziddiyyet teskil edir.",
  },
  [ApiErrorCode.RATE_LIMITED]: {
    tr: "Cok fazla istek gonderildi.",
    en: "Too many requests.",
    ru: "Слишком много запросов.",
    az: "Cox sayda sorgu gonderilib.",
  },
  [ApiErrorCode.REQUEST_TIMEOUT]: {
    tr: "Istek zaman asimina ugradi.",
    en: "Request timed out.",
    ru: "Превышено время ожидания запроса.",
    az: "Sorgu vaxt asimina dusdu.",
  },
  [ApiErrorCode.SERVICE_UNAVAILABLE]: {
    tr: "Servis gecici olarak kullanilamiyor.",
    en: "Service temporarily unavailable.",
    ru: "Сервис временно недоступен.",
    az: "Xidmet muveqqeti olaraq elcatan deyil.",
  },
  [ApiErrorCode.INTERNAL_ERROR]: {
    tr: "Sunucu hatasi olustu.",
    en: "Internal server error.",
    ru: "Внутренняя ошибка сервера.",
    az: "Server daxili xetasi bas verdi.",
  },
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly forceLocalizedStatuses = new Set<number>([
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.REQUEST_TIMEOUT,
    HttpStatus.TOO_MANY_REQUESTS,
    HttpStatus.SERVICE_UNAVAILABLE,
    HttpStatus.BAD_GATEWAY,
    HttpStatus.GATEWAY_TIMEOUT,
  ]);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== "http") {
      this.logger.error("Non-HTTP exception captured", exception instanceof Error ? exception.stack : undefined);
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const locale = this.resolveLocale(request);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = ApiErrorCode.INTERNAL_ERROR;
    let message: string | string[] | undefined;
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string | string[] | undefined) ?? message;
        details = resp.details as Record<string, unknown> | undefined;
      }

      code = this.mapStatusToCode(status);
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    const fallbackMessage = this.defaultMessage(code, locale);
    const useFallbackMessage =
      status >= HttpStatus.INTERNAL_SERVER_ERROR || this.forceLocalizedStatuses.has(status);
    const normalizedMessage =
      useFallbackMessage
        ? fallbackMessage
        : typeof message === "string"
        ? message
        : Array.isArray(message)
          ? message.join("; ")
          : fallbackMessage;

    const appStatus = this.mapCodeToAppStatus(code);
    response.status(status).json({
      success: false,
      error: {
        status: appStatus,
        code,
        message: normalizedMessage,
        details,
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private resolveLocale(request: Request): Locale {
    const header = request.headers["accept-language"];
    const value = Array.isArray(header) ? header[0] : header;
    const firstToken = value?.split(",")[0]?.trim().toLowerCase() ?? "";
    const short = firstToken.split("-")[0] as Locale;
    return SUPPORTED_LOCALES.includes(short) ? short : "tr";
  }

  private defaultMessage(code: ApiErrorCode, locale: Locale): string {
    return ERROR_MESSAGES[code]?.[locale] ?? ERROR_MESSAGES[ApiErrorCode.INTERNAL_ERROR][locale];
  }

  private mapCodeToAppStatus(code: ApiErrorCode): number {
    switch (code) {
      case ApiErrorCode.BAD_REQUEST:
      case ApiErrorCode.VALIDATION_ERROR:
      case ApiErrorCode.UNAUTHORIZED:
      case ApiErrorCode.FORBIDDEN:
        return 101; // invalid request / authorization issue
      case ApiErrorCode.NOT_FOUND:
        return 104;
      case ApiErrorCode.CONFLICT:
        return 109;
      case ApiErrorCode.RATE_LIMITED:
        return 129;
      case ApiErrorCode.REQUEST_TIMEOUT:
        return 130;
      case ApiErrorCode.SERVICE_UNAVAILABLE:
        return 1503;
      case ApiErrorCode.INTERNAL_ERROR:
      default:
        return 1500;
    }
  }

  private mapStatusToCode(status: number): ApiErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ApiErrorCode.BAD_REQUEST;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ApiErrorCode.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ApiErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ApiErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ApiErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ApiErrorCode.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ApiErrorCode.RATE_LIMITED;
      case HttpStatus.REQUEST_TIMEOUT:
      case HttpStatus.GATEWAY_TIMEOUT:
        return ApiErrorCode.REQUEST_TIMEOUT;
      case HttpStatus.SERVICE_UNAVAILABLE:
      case HttpStatus.BAD_GATEWAY:
        return ApiErrorCode.SERVICE_UNAVAILABLE;
      default:
        return ApiErrorCode.INTERNAL_ERROR;
    }
  }
}
