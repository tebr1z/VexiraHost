import { DnsProvider, DomainManagementMode, DomainStatus } from "@prisma/client";

import { PowerDnsProvider } from "../providers/powerdns.provider";

import { AuthoritativeDnsService } from "./authoritative-dns.service";

import { PrismaService } from "@/database/database.module";

describe("AuthoritativeDnsService", () => {
  it("routes a newly provisioned domain to the selected Plesk server IP", async () => {
    const createdDomain = {
      id: "domain-1",
      userId: "user-1",
      name: "example.com",
      tld: "com",
      status: DomainStatus.ACTIVE,
      managementMode: DomainManagementMode.MANUAL,
      registrarSource: "external-hosting",
      adminNotes: null,
      registrarRef: null,
      registeredAt: null,
      expiresAt: null,
      autoRenew: true,
      nameservers: ["ns1.vexirahost.com", "ns2.vexirahost.com"],
      dnsProvider: DnsProvider.POWERDNS,
      dnsZoneRef: "example.com",
      dnsProviderStatus: "provisioning",
      dnsLastSyncedAt: null,
      nsGlueRecords: [],
      billingAmount: null,
      billingCurrency: "USD",
      graceEndsAt: null,
      renewalInvoiceId: null,
      expiredAt: null,
      lateFeeAppliedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      dnsRecords: [],
    };
    const tx = {
      dnsRecord: { deleteMany: jest.fn(), createMany: jest.fn() },
      domain: { update: jest.fn() },
    };
    const prisma = {
      domain: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(createdDomain),
      },
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<void>) => callback(tx)),
    } as unknown as PrismaService;
    const powerDns = {
      isConfigured: jest.fn().mockReturnValue(true),
      getNameservers: jest.fn().mockReturnValue(["ns1.vexirahost.com", "ns2.vexirahost.com"]),
      replaceRecords: jest.fn().mockResolvedValue(undefined),
    } as unknown as PowerDnsProvider;
    const service = new AuthoritativeDnsService(prisma, powerDns);

    await service.provisionHostingZone({
      userId: "user-1",
      domainName: "example.com",
      serverAddress: "203.0.113.10:8443",
    });

    expect(powerDns.replaceRecords).toHaveBeenCalledWith(
      "example.com",
      expect.arrayContaining([
        expect.objectContaining({ type: "A", name: "@", value: "203.0.113.10" }),
        expect.objectContaining({ type: "CNAME", name: "www", value: "example.com" }),
        expect.objectContaining({ type: "MX", value: "mail.example.com", priority: 10 }),
      ]),
    );
    expect(tx.domain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "domain-1" },
        data: expect.objectContaining({ dnsProvider: DnsProvider.POWERDNS }),
      }),
    );
  });
});
