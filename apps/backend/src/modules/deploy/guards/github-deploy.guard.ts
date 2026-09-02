import type { ExecutionContext } from "@nestjs/common";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

import { OauthConfigService } from "@/modules/auth/service/oauth-config.service";

@Injectable()
export class GitHubDeployAuthGuard extends AuthGuard("github-deploy") {
  constructor(private readonly oauthConfigService: OauthConfigService) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const config = await this.oauthConfigService.resolveGitHub();
    if (!config.clientId || !config.clientSecret) {
      throw new ServiceUnavailableException(
        "GitHub OAuth is not configured. Set Client ID and Client Secret in Admin → System.",
      );
    }
    return super.canActivate(context) as boolean | Promise<boolean>;
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
