import { Body, Controller, Delete, Get, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AuthUser } from "@vexira/types";
import type { Request, Response } from "express";

import { GitHubDeployAuthGuard } from "../guards/github-deploy.guard";
import { GitHubDeployService, type GitHubDeployProfile } from "../service/github-deploy.service";

import { Public } from "@/decorators/auth.decorators";
import { User } from "@/decorators/user.decorator";

@Controller("deploy/github")
export class GitHubDeployController {
  constructor(
    private readonly githubDeploy: GitHubDeployService,
    private readonly configService: ConfigService,
  ) {}

  @Get("status")
  status(@User() user: AuthUser) {
    return this.githubDeploy.getStatus(user.id);
  }

  @Post("connect-url")
  connectUrl(@User() user: AuthUser, @Body() body: { returnTo?: string }) {
    this.githubDeploy.assertConfigured();
    const appUrl = this.configService
      .get<string>("APP_URL", "http://localhost:3000")
      .replace(/\/$/, "");
    const returnTo = body.returnTo?.trim() || `${appUrl}/dashboard/hosting`;
    const state = this.githubDeploy.createConnectState(user.id, returnTo);
    return { url: this.githubDeploy.buildOAuthStartUrl(state) };
  }

  @Get("repos")
  listRepos(@User() user: AuthUser, @Query("page") page?: string) {
    const pageNum = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
    return this.githubDeploy.listRepos(user.id, pageNum);
  }

  @Delete("connection")
  disconnect(@User() user: AuthUser) {
    return this.githubDeploy.disconnect(user.id).then(() => ({ ok: true }));
  }

  @Public()
  @Get("oauth")
  @UseGuards(GitHubDeployAuthGuard)
  oauthStart() {
    // Passport redirects to GitHub
  }

  @Public()
  @Get("oauth/callback")
  @UseGuards(GitHubDeployAuthGuard)
  async oauthCallback(
    @Req()
    req: Request & {
      user: GitHubDeployProfile;
      query?: { state?: string; error?: string; error_description?: string };
    },
    @Res() res: Response,
  ) {
    const appUrl = this.configService
      .get<string>("APP_URL", "http://localhost:3000")
      .replace(/\/$/, "");

    if (req.query?.error) {
      const detail = req.query.error_description ?? req.query.error;
      res.redirect(`${appUrl}/dashboard/hosting?githubError=${encodeURIComponent(String(detail))}`);
      return;
    }

    const stateRaw = typeof req.query?.state === "string" ? req.query.state : "";
    try {
      const state = this.githubDeploy.verifyConnectState(stateRaw);
      await this.githubDeploy.saveConnection(state.userId, req.user);
      const separator = state.returnTo.includes("?") ? "&" : "?";
      res.redirect(`${state.returnTo}${separator}github=connected`);
    } catch {
      res.redirect(`${appUrl}/dashboard/hosting?githubError=invalid_state`);
    }
  }
}
