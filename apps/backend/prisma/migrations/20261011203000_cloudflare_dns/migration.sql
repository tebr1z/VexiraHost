CREATE TYPE "DnsProvider" AS ENUM ('LOCAL', 'CLOUDFLARE');

ALTER TABLE "domains"
ADD COLUMN "dnsProvider" "DnsProvider" NOT NULL DEFAULT 'LOCAL',
ADD COLUMN "dnsZoneRef" TEXT,
ADD COLUMN "dnsProviderStatus" TEXT,
ADD COLUMN "dnsLastSyncedAt" TIMESTAMP(3);

CREATE INDEX "domains_dnsProvider_idx" ON "domains"("dnsProvider");

ALTER TABLE "dns_records"
ADD COLUMN "proxied" BOOLEAN NOT NULL DEFAULT false;
