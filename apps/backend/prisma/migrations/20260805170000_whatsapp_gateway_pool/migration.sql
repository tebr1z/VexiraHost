CREATE TABLE "whatsapp_gateway_accounts" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "WhatsappSessionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "phoneNumber" TEXT,
    "displayName" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3),
    "lastQrAt" TIMESTAMP(3),
    "lastConnectedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whatsapp_gateway_accounts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "whatsapp_gateway_accounts_isEnabled_status_sentCount_idx"
ON "whatsapp_gateway_accounts"("isEnabled", "status", "sentCount");

ALTER TABLE "whatsapp_message_logs" ADD COLUMN "gatewayAccountId" TEXT;
CREATE INDEX "whatsapp_message_logs_gatewayAccountId_idx"
ON "whatsapp_message_logs"("gatewayAccountId");
ALTER TABLE "whatsapp_message_logs"
ADD CONSTRAINT "whatsapp_message_logs_gatewayAccountId_fkey"
FOREIGN KEY ("gatewayAccountId") REFERENCES "whatsapp_gateway_accounts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "whatsapp_gateway_accounts" (
  "id", "label", "status", "phoneNumber", "displayName", "lastQrAt",
  "lastConnectedAt", "lastError", "updatedAt", "createdAt"
)
SELECT
  'primary', 'Primary WhatsApp', "status", "phoneNumber", "displayName", "lastQrAt",
  "lastConnectedAt", "lastError", CURRENT_TIMESTAMP, "createdAt"
FROM "whatsapp_sessions"
WHERE "id" = 'default'
ON CONFLICT ("id") DO NOTHING;
