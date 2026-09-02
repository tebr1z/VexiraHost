import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import {
  buildGitHubAuthenticatedCloneUrl,
  isGitHubRepoUrl,
  normalizeGitHubRepoUrl,
} from "../utils/github-clone.util";

import { PrismaService } from "@/database/database.module";
import { decryptSecret, encryptSecret } from "@/utils/crypto.util";

export type GitHubDeployState = {
  userId: string;
  returnTo: string;
  typ: "github-deploy";
};

export type GitHubDeployProfile = {
  accessToken: string;
  githubUserId: string;
  githubLogin: string;
  scope?: string;
};

export type GitHubRepoSummary = {
  id: number;
  fullName: string;
  name: string;
  private: boolean;
  defaultBranch: string;
  cloneUrl: string;
  htmlUrl: string;
  updatedAt: string;
};

@Injectable()
export class GitHubDeployService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  assertConfigured(): void {
    if (!this.configService.get<string>("oauth.github.clientId")) {
      throw new BadRequestException(
        "GitHub OAuth is not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to backend .env",
      );
    }
  }

  createConnectState(userId: string, returnTo: string): string {
    return this.jwtService.sign(
      { userId, returnTo, typ: "github-deploy" } satisfies GitHubDeployState,
      { expiresIn: "15m" },
    );
  }

  verifyConnectState(state: string): GitHubDeployState {
    try {
      const payload = this.jwtService.verify<GitHubDeployState>(state);
      if (payload.typ !== "github-deploy" || !payload.userId || !payload.returnTo) {
        throw new Error("Invalid state");
      }
      return payload;
    } catch {
      throw new BadRequestException("Invalid or expired GitHub connect state");
    }
  }

  buildOAuthStartUrl(state: string): string {
    const apiBase = this.configService
      .get<string>("APP_API_URL", "http://localhost:4000/api/v1")
      .replace(/\/$/, "");
    return `${apiBase}/deploy/github/oauth?state=${encodeURIComponent(state)}`;
  }

  async saveConnection(userId: string, profile: GitHubDeployProfile): Promise<void> {
    await this.prisma.userGitHubConnection.upsert({
      where: { userId },
      create: {
        userId,
        githubUserId: profile.githubUserId,
        githubLogin: profile.githubLogin,
        accessTokenEnc: encryptSecret(profile.accessToken),
        scope: profile.scope ?? null,
      },
      update: {
        githubUserId: profile.githubUserId,
        githubLogin: profile.githubLogin,
        accessTokenEnc: encryptSecret(profile.accessToken),
        scope: profile.scope ?? null,
      },
    });
  }

  async getStatus(userId: string) {
    const row = await this.prisma.userGitHubConnection.findUnique({ where: { userId } });
    if (!row) {
      return { connected: false as const };
    }
    return {
      connected: true as const,
      githubLogin: row.githubLogin,
      connectedAt: row.connectedAt,
    };
  }

  async disconnect(userId: string): Promise<void> {
    await this.prisma.userGitHubConnection.deleteMany({ where: { userId } });
  }

  async listRepos(
    userId: string,
    page = 1,
  ): Promise<{ repos: GitHubRepoSummary[]; hasMore: boolean }> {
    const token = await this.getAccessToken(userId);
    const perPage = 30;
    const response = await fetch(
      `https://api.github.com/user/repos?sort=updated&per_page=${perPage}&page=${page}&affiliation=owner,collaborator,organization_member`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (!response.ok) {
      if (response.status === 401) {
        await this.disconnect(userId);
        throw new BadRequestException("GitHub token expired. Please reconnect GitHub.");
      }
      throw new BadRequestException("Could not load GitHub repositories");
    }

    const data = (await response.json()) as Array<{
      id: number;
      full_name: string;
      name: string;
      private: boolean;
      default_branch: string;
      clone_url: string;
      html_url: string;
      updated_at: string;
    }>;

    return {
      repos: data.map((repo) => ({
        id: repo.id,
        fullName: repo.full_name,
        name: repo.name,
        private: repo.private,
        defaultBranch: repo.default_branch,
        cloneUrl: repo.clone_url,
        htmlUrl: repo.html_url,
        updatedAt: repo.updated_at,
      })),
      hasMore: data.length === perPage,
    };
  }

  async resolveCloneUrl(userId: string, repoUrl: string): Promise<string> {
    if (!isGitHubRepoUrl(repoUrl)) {
      return repoUrl;
    }

    const connection = await this.prisma.userGitHubConnection.findUnique({ where: { userId } });
    if (!connection) {
      return repoUrl;
    }

    const token = decryptSecret(connection.accessTokenEnc);
    return buildGitHubAuthenticatedCloneUrl(repoUrl, token);
  }

  resolveRepoUrlFromSelection(fullName: string): string {
    return normalizeGitHubRepoUrl(fullName);
  }

  private async getAccessToken(userId: string): Promise<string> {
    const row = await this.prisma.userGitHubConnection.findUnique({ where: { userId } });
    if (!row) {
      throw new NotFoundException("GitHub is not connected");
    }
    return decryptSecret(row.accessTokenEnc);
  }
}
