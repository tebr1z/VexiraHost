-- User prepaid balance
ALTER TABLE "users" ADD COLUMN "accountBalance" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "balanceCurrency" TEXT NOT NULL DEFAULT 'USD';

-- Balance ledger
CREATE TYPE "BalanceTxnType" AS ENUM ('ADMIN_CREDIT', 'INVOICE_PAYMENT', 'ADJUSTMENT');

CREATE TABLE "balance_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "type" "BalanceTxnType" NOT NULL,
    "note" TEXT,
    "invoiceId" TEXT,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "balance_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "balance_transactions_userId_idx" ON "balance_transactions"("userId");
CREATE INDEX "balance_transactions_invoiceId_idx" ON "balance_transactions"("invoiceId");

ALTER TABLE "balance_transactions" ADD CONSTRAINT "balance_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Domain billing fields
ALTER TABLE "domains" ADD COLUMN "billingAmount" DECIMAL(10,2);
ALTER TABLE "domains" ADD COLUMN "billingCurrency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "domains" ADD COLUMN "graceEndsAt" TIMESTAMP(3);
ALTER TABLE "domains" ADD COLUMN "renewalInvoiceId" TEXT;

CREATE INDEX "domains_expiresAt_idx" ON "domains"("expiresAt");
CREATE INDEX "domains_graceEndsAt_idx" ON "domains"("graceEndsAt");

-- Invoice ↔ domain
ALTER TABLE "invoices" ADD COLUMN "domainId" TEXT;
CREATE INDEX "invoices_domainId_idx" ON "invoices"("domainId");
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE SET NULL ON UPDATE CASCADE;
