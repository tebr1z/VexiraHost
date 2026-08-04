-- CreateEnum
CREATE TYPE "WhatsappSessionStatus" AS ENUM ('DISCONNECTED', 'QR_READY', 'CONNECTING', 'CONNECTED');

-- CreateEnum
CREATE TYPE "WhatsappMessageStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "whatsapp_sessions" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "status" "WhatsappSessionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "phoneNumber" TEXT,
    "displayName" TEXT,
    "lastQrAt" TIMESTAMP(3),
    "lastConnectedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_message_logs" (
    "id" TEXT NOT NULL,
    "toPhone" TEXT NOT NULL,
    "userId" TEXT,
    "body" TEXT NOT NULL,
    "status" "WhatsappMessageStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_message_logs_createdAt_idx" ON "whatsapp_message_logs"("createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_message_logs_userId_idx" ON "whatsapp_message_logs"("userId");

-- Seed singleton session row
INSERT INTO "whatsapp_sessions" ("id", "status", "updatedAt", "createdAt")
VALUES ('default', 'DISCONNECTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
