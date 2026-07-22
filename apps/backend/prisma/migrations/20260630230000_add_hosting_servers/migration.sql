-- AlterTable
ALTER TABLE "products" ADD COLUMN "hostingPlanSlug" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN "metadata" JSONB;

-- CreateTable
CREATE TABLE "hosting_servers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "panel" "HostingPanel" NOT NULL,
    "whmUsername" TEXT NOT NULL,
    "whmPasswordEnc" TEXT NOT NULL,
    "apiTokenEnc" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxAccounts" INTEGER,
    "accountCount" INTEGER NOT NULL DEFAULT 0,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hosting_servers_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "hosting_accounts" ADD COLUMN "serverId" TEXT,
ADD COLUMN "orderId" TEXT,
ADD COLUMN "panelPasswordEnc" TEXT;

-- CreateIndex
CREATE INDEX "hosting_accounts_serverId_idx" ON "hosting_accounts"("serverId");

-- CreateIndex
CREATE INDEX "hosting_accounts_orderId_idx" ON "hosting_accounts"("orderId");

-- AddForeignKey
ALTER TABLE "hosting_accounts" ADD CONSTRAINT "hosting_accounts_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "hosting_servers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hosting_accounts" ADD CONSTRAINT "hosting_accounts_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
