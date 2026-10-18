ALTER TABLE "invoices" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "invoices_idempotencyKey_key" ON "invoices"("idempotencyKey");
