import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { extname, resolve } from "node:path";

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { AuthUser } from "@vexira/types";
import { diskStorage } from "multer";

import { CreateDeploymentDto, CreateUploadDeploymentDto } from "../dto/create-deployment.dto";
import { UpdateDeploymentEnvDto } from "../dto/update-deployment-env.dto";
import { DeployService } from "../service/deploy.service";

import { User } from "@/decorators/user.decorator";

const DEPLOY_UPLOAD_ROOT = resolve(process.cwd(), "storage", "deploy-uploads");
mkdirSync(DEPLOY_UPLOAD_ROOT, { recursive: true });

@Controller("hosting/:accountId/deployments")
export class DeployController {
  constructor(private readonly deployService: DeployService) {}

  @Get()
  list(@Param("accountId") accountId: string, @User() user: AuthUser) {
    return this.deployService.list(accountId, user.id);
  }

  @Get("resources")
  resources(@Param("accountId") accountId: string, @User() user: AuthUser) {
    return this.deployService.resources(accountId, user.id);
  }

  @Get(":deploymentId")
  get(
    @Param("accountId") accountId: string,
    @Param("deploymentId") deploymentId: string,
    @User() user: AuthUser,
  ) {
    return this.deployService.get(accountId, deploymentId, user.id);
  }

  @Post()
  create(
    @Param("accountId") accountId: string,
    @Body() dto: CreateDeploymentDto,
    @User() user: AuthUser,
  ) {
    return this.deployService.create(accountId, user.id, dto);
  }

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: DEPLOY_UPLOAD_ROOT,
        filename: (_req, file, callback) =>
          callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: { files: 1, fileSize: 2 * 1024 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (extname(file.originalname).toLowerCase() !== ".zip") {
          callback(new BadRequestException("Only .zip source archives are accepted"), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  createFromUpload(
    @Param("accountId") accountId: string,
    @Body() dto: CreateUploadDeploymentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @User() user: AuthUser,
  ) {
    return this.deployService.createFromUpload(accountId, user.id, dto, file);
  }

  @Post(":deploymentId/redeploy")
  redeploy(
    @Param("accountId") accountId: string,
    @Param("deploymentId") deploymentId: string,
    @User() user: AuthUser,
  ) {
    return this.deployService.redeploy(accountId, deploymentId, user.id);
  }

  @Delete(":deploymentId")
  remove(
    @Param("accountId") accountId: string,
    @Param("deploymentId") deploymentId: string,
    @User() user: AuthUser,
  ) {
    return this.deployService.remove(accountId, deploymentId, user.id);
  }

  @Patch(":deploymentId/env")
  updateEnv(
    @Param("accountId") accountId: string,
    @Param("deploymentId") deploymentId: string,
    @User() user: AuthUser,
    @Body() dto: UpdateDeploymentEnvDto,
  ) {
    return this.deployService.updateEnv(accountId, deploymentId, user.id, dto);
  }

  @Post(":deploymentId/health")
  checkHealth(
    @Param("accountId") accountId: string,
    @Param("deploymentId") deploymentId: string,
    @User() user: AuthUser,
  ) {
    return this.deployService.checkHealth(accountId, deploymentId, user.id);
  }

  @Get(":deploymentId/container-logs")
  containerLogs(
    @Param("accountId") accountId: string,
    @Param("deploymentId") deploymentId: string,
    @User() user: AuthUser,
    @Query("lines") lines?: string,
  ) {
    const parsed = lines ? Number.parseInt(lines, 10) : 100;
    return this.deployService.getContainerLogs(
      accountId,
      deploymentId,
      user.id,
      Number.isFinite(parsed) ? parsed : 100,
    );
  }
}
