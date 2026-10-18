import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { RegistrarProvider } from "../interfaces/registrar-provider.interface";
import { MockRegistrarProvider } from "../providers/mock-registrar.provider";
import { NameSiloRegistrarProvider } from "../providers/namesilo-registrar.provider";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class RegistrarService implements RegistrarProvider {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mock: MockRegistrarProvider,
    private readonly namesilo: NameSiloRegistrarProvider,
  ) {}

  private async provider(): Promise<RegistrarProvider> {
    const stored = await this.prisma.systemSetting.findUnique({
      where: { key: "registrar_provider" },
      select: { value: true },
    });
    const name = (stored?.value ?? this.config.get<string>("registrar.provider") ?? "mock")
      .trim()
      .toLowerCase();
    if (name === "mock") return this.mock;
    if (name === "namesilo" || name === "real") {
      if (!this.namesilo.isConfigured()) {
        throw new ServiceUnavailableException("NameSilo registrar credentials are not configured");
      }
      return this.namesilo;
    }
    throw new ServiceUnavailableException(`Unsupported registrar provider: ${name}`);
  }

  async search(query: string) {
    return (await this.provider()).search(query);
  }

  async register(domain: string) {
    return (await this.provider()).register(domain);
  }

  async initiateTransfer(domain: string, authCode: string) {
    return (await this.provider()).initiateTransfer(domain, authCode);
  }

  async renew(domain: string, years = 1) {
    const provider = await this.provider();
    if (!provider.renew) throw new ServiceUnavailableException("Registrar renewal is unavailable");
    return provider.renew(domain, years);
  }

  async updateNameservers(domain: string, nameservers: string[]) {
    const provider = await this.provider();
    if (!provider.updateNameservers) {
      throw new ServiceUnavailableException("Registrar nameserver updates are unavailable");
    }
    return provider.updateNameservers(domain, nameservers);
  }

  async registerGlue(domain: string, host: string, ip: string) {
    const provider = await this.provider();
    if (!provider.registerGlue) {
      throw new ServiceUnavailableException("Registrar glue updates are unavailable");
    }
    return provider.registerGlue(domain, host, ip);
  }

  defaultDnsRecords(domain: string) {
    return this.namesilo.defaultDnsRecords(domain);
  }
}
