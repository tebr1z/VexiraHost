import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { catchError, throwError, timeout } from "rxjs";

const GLOBAL_REQUEST_TIMEOUT_MS = 15000;

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(GLOBAL_REQUEST_TIMEOUT_MS),
      catchError((error: unknown) => {
        if (error && typeof error === "object" && "name" in error && error.name === "TimeoutError") {
          return throwError(() => new RequestTimeoutException("Request timed out"));
        }
        return throwError(() => error);
      }),
    );
  }
}
