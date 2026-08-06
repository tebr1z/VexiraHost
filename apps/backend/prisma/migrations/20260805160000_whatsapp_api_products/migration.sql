-- WhatsApp API product category (enum values must be committed before use)
ALTER TYPE "ProductCategory" ADD VALUE IF NOT EXISTS 'WHATSAPP_API';
ALTER TYPE "AddonServiceType" ADD VALUE IF NOT EXISTS 'WHATSAPP_API';
