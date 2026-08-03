-- Marketing opt-in + campaign emails
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "marketingOptIn" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "marketingOptInAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "unsubscribeToken" TEXT;

UPDATE "users"
SET "unsubscribeToken" = encode(gen_random_bytes(24), 'hex')
WHERE "unsubscribeToken" IS NULL;

UPDATE "users"
SET "marketingOptInAt" = COALESCE("marketingOptInAt", "createdAt")
WHERE "marketingOptIn" = true AND "marketingOptInAt" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_unsubscribeToken_key" ON "users"("unsubscribeToken");

DO $$ BEGIN
  CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SENDING', 'SENT', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "campaigns" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "campaigns_status_idx" ON "campaigns"("status");
