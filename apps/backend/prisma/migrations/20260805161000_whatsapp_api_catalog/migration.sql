ALTER TABLE "whatsapp_api_access"
ADD COLUMN IF NOT EXISTS "legacyManualAccess" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "catalog_categories" ("id", "slug", "name", "names", "sortOrder", "isActive", "systemType", "createdAt", "updatedAt")
VALUES
  ('cat_whatsapp_api', 'whatsapp-api', 'WhatsApp API', '{"az":"WhatsApp API","en":"WhatsApp API","tr":"WhatsApp API","ru":"WhatsApp API"}'::jsonb, 45, true, 'WHATSAPP_API', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET
  "systemType" = EXCLUDED."systemType",
  "names" = EXCLUDED."names",
  "updatedAt" = CURRENT_TIMESTAMP;
