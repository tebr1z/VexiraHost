import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthUser } from "@vexira/types";

export const User = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    return request.user;
  },
);
