-- CreateTable
CREATE TABLE "whatsapp_api_access" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "monthlyLimit" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_api_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_api_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastFour" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_api_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_api_usage_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "whatsapp_message_logs" ADD COLUMN "apiKeyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_api_access_userId_key" ON "whatsapp_api_access"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_api_keys_keyHash_key" ON "whatsapp_api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "whatsapp_api_keys_userId_isActive_idx" ON "whatsapp_api_keys"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_api_usage_userId_periodStart_key" ON "whatsapp_api_usage"("userId", "periodStart");

-- CreateIndex
CREATE INDEX "whatsapp_api_usage_periodStart_idx" ON "whatsapp_api_usage"("periodStart");

-- CreateIndex
CREATE INDEX "whatsapp_message_logs_apiKeyId_idx" ON "whatsapp_message_logs"("apiKeyId");

-- AddForeignKey
ALTER TABLE "whatsapp_api_access" ADD CONSTRAINT "whatsapp_api_access_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_api_keys" ADD CONSTRAINT "whatsapp_api_keys_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_api_usage" ADD CONSTRAINT "whatsapp_api_usage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_message_logs" ADD CONSTRAINT "whatsapp_message_logs_apiKeyId_fkey"
FOREIGN KEY ("apiKeyId") REFERENCES "whatsapp_api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
