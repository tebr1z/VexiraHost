import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import type { AuthUser } from "@vexira/types";

import { CreateDeploymentDto } from "../dto/create-deployment.dto";
import { UpdateDeploymentEnvDto } from "../dto/update-deployment-env.dto";
import { DeployService } from "../service/deploy.service";

import { User } from "@/decorators/user.decorator";

@Controller("hosting/:accountId/deployments")
export class DeployController {
  constructor(private readonly deployService: DeployService) {}

  @Get()
  list(@Param("accountId") accountId: string, @User() user: AuthUser) {
    return this.deployService.list(accountId, user.id);
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

  @Post(":deploymentId/redeploy")
  redeploy(
    @Param("accountId") accountId: string,
    @Param("deploymentId") deploymentId: string,
    @User() user: AuthUser,
  ) {
    return this.deployService.redeploy(accountId, deploymentId, user.id);
  }

  @Patch(":deploymentId/env")
  updateEnv(
    @Param("accountId") accountId: string,
    @Param("deploymentId") deploymentId: string,
    @Body() dto: UpdateDeploymentEnvDto,
    @User() user: AuthUser,
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
}
