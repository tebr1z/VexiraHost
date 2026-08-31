import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { DeployRepository } from "../repository/deploy.repository";

import type { DeployConfig } from "@/config/deploy.config";

@Injectable()
export class PortAllocationService {
  constructor(
    private readonly deployRepository: DeployRepository,
    private readonly configService: ConfigService,
  ) {}

  private get deployConfig(): DeployConfig {
    return this.configService.get<DeployConfig>("deploy")!;
  }

  async allocate(serverId: string): Promise<number> {
    const { portMin, portMax } = this.deployConfig;
    const used = await this.deployRepository.listUsedPortsOnServer(serverId);
    const usedSet = new Set(used);

    for (let port = portMin; port <= portMax; port += 1) {
      if (!usedSet.has(port)) return port;
    }

    throw new BadRequestException(`No free deploy ports between ${portMin} and ${portMax}`);
  }
}
