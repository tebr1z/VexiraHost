-- AlterTable
ALTER TABLE "users"
ADD COLUMN "phone" TEXT,
ADD COLUMN "whatsappNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "invoices"
ADD COLUMN "reminder1dSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "servers"
ADD COLUMN "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "invoices_status_dueDate_idx" ON "invoices"("status", "dueDate");

-- CreateIndex
CREATE INDEX "servers_expiresAt_idx" ON "servers"("expiresAt");
