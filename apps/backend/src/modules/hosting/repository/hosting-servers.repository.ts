import { Injectable } from "@nestjs/common";
import { ServiceStatus } from "@prisma/client";
import type { HostingPanel, HostingServer } from "@prisma/client";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class HostingServersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.hostingServer.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: {
        _count: {
          select: {
            accounts: {
              where: { status: ServiceStatus.ACTIVE },
            },
          },
        },
      },
    });
  }

  findById(id: string) {
    return this.prisma.hostingServer.findUnique({ where: { id } });
  }

  countAll() {
    return this.prisma.hostingServer.count();
  }

  findDefaultForPanel(panel: HostingPanel) {
    return this.prisma.hostingServer.findFirst({
      where: { isActive: true, panel, isDefault: true },
    });
  }

  findFirstActiveForPanel(panel: HostingPanel) {
    return this.prisma.hostingServer.findFirst({
      where: { isActive: true, panel },
      orderBy: [{ isDefault: "desc" }, { accountCount: "asc" }, { createdAt: "asc" }],
    });
  }

  async resolveServerForPanel(panel: HostingPanel): Promise<HostingServer | null> {
    return (
      (await this.findDefaultForPanel(panel)) ?? (await this.findFirstActiveForPanel(panel))
    );
  }

  create(data: {
    name: string;
    hostname: string;
    ipAddress: string;
    panel: HostingPanel;
    whmUsername: string;
    whmPasswordEnc: string;
    apiTokenEnc?: string;
    isDefault?: boolean;
    isActive?: boolean;
    maxAccounts?: number;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.hostingServer.count();
      const isDefault = data.isDefault ?? count === 0;

      if (isDefault) {
        await tx.hostingServer.updateMany({
          where: { panel: data.panel },
          data: { isDefault: false },
        });
      }

      return tx.hostingServer.create({
        data: {
          ...data,
          isDefault,
        },
      });
    });
  }

  update(
    id: string,
    data: Partial<{
      name: string;
      hostname: string;
      ipAddress: string;
      panel: HostingPanel;
      whmUsername: string;
      whmPasswordEnc: string;
      apiTokenEnc: string | null;
      isDefault: boolean;
      isActive: boolean;
      maxAccounts: number | null;
      lastCheckedAt: Date;
      lastConnectionOk: boolean | null;
    }>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        const current = await tx.hostingServer.findUnique({ where: { id } });
        if (current) {
          await tx.hostingServer.updateMany({
            where: { panel: data.panel ?? current.panel, id: { not: id } },
            data: { isDefault: false },
          });
        }
      }

      return tx.hostingServer.update({ where: { id }, data });
    });
  }

  delete(id: string) {
    return this.prisma.hostingServer.delete({ where: { id } });
  }

  countAccounts(serverId: string) {
    return this.prisma.hostingAccount.count({ where: { serverId } });
  }

  incrementAccountCount(serverId: string) {
    return this.prisma.hostingServer.update({
      where: { id: serverId },
      data: { accountCount: { increment: 1 } },
    });
  }

  decrementAccountCount(serverId: string) {
    return this.prisma.hostingServer.update({
      where: { id: serverId },
      data: { accountCount: { decrement: 1 } },
    });
  }

  findActiveByPanel(panel: HostingPanel) {
    return this.prisma.hostingServer.findMany({
      where: { isActive: true, panel },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
  }

  findAccountById(id: string) {
    return this.prisma.hostingAccount.findUnique({
      where: { id },
      include: {
        plan: true,
        server: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            preferredCurrency: true,
          },
        },
      },
    });
  }

  updateAccount(
    id: string,
    data: {
      status?: ServiceStatus;
      serverId?: string | null;
      panelUrl?: string | null;
      panelRef?: string | null;
    },
  ) {
    return this.prisma.hostingAccount.update({
      where: { id },
      data,
      include: {
        plan: true,
        server: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }

  deleteAccount(id: string) {
    return this.prisma.hostingAccount.delete({ where: { id } });
  }

  findAllAccounts() {
    return this.prisma.hostingAccount.findMany({
      include: {
        plan: true,
        server: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  findAccountsByServerId(serverId: string, activeOnly = false) {
    return this.prisma.hostingAccount.findMany({
      where: {
        serverId,
        ...(activeOnly ? { status: ServiceStatus.ACTIVE } : {}),
      },
      include: {
        plan: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
