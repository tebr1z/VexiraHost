-- Saved-card mandate lifecycle for Epoint recurring payments.
CREATE TYPE "PaymentMethodStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED', 'REVOKED');

ALTER TABLE "payment_methods"
ADD COLUMN "provider" TEXT,
ADD COLUMN "providerTokenEnc" TEXT,
ADD COLUMN "providerTokenHash" TEXT,
ADD COLUMN "status" "PaymentMethodStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "consentAt" TIMESTAMP(3),
ADD COLUMN "consentIp" TEXT,
ADD COLUMN "consentVersion" TEXT,
ADD COLUMN "failureReason" TEXT,
ADD COLUMN "lastUsedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "payment_methods_providerTokenHash_key"
ON "payment_methods"("providerTokenHash");

CREATE INDEX "payment_methods_userId_provider_status_idx"
ON "payment_methods"("userId", "provider", "status");
