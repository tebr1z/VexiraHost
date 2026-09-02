import type { ExecutionContext } from "@nestjs/common";
import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class GitHubDeployAuthGuard extends AuthGuard("github-deploy") {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.configService.get<string>("oauth.github.clientId")) {
      throw new BadRequestException(
        "GitHub OAuth is not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to backend .env",
      );
    }
    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<{ query?: { state?: string; code?: string } }>();
    const options: { session: false; state?: string } = { session: false };
    if (!request.query?.code && typeof request.query?.state === "string") {
      options.state = request.query.state;
    }
    return options;
  }
}
