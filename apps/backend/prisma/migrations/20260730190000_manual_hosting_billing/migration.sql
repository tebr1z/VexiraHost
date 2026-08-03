-- AlterTable
ALTER TABLE "hosting_accounts" ADD COLUMN "billingAmount" DECIMAL(10,2);
ALTER TABLE "hosting_accounts" ADD COLUMN "billingCurrency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "hosting_accounts" ADD COLUMN "graceEndsAt" TIMESTAMP(3);
ALTER TABLE "hosting_accounts" ADD COLUMN "renewalInvoiceId" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "hostingAccountId" TEXT;

-- CreateIndex
CREATE INDEX "hosting_accounts_expiresAt_idx" ON "hosting_accounts"("expiresAt");
CREATE INDEX "hosting_accounts_graceEndsAt_idx" ON "hosting_accounts"("graceEndsAt");
CREATE INDEX "invoices_hostingAccountId_idx" ON "invoices"("hostingAccountId");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_hostingAccountId_fkey" FOREIGN KEY ("hostingAccountId") REFERENCES "hosting_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
