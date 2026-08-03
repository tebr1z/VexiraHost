-- CreateEnum
CREATE TYPE "DigitalDeliveryMode" AS ENUM ('NONE', 'LICENSE_KEY', 'FILE', 'KEY_AND_FILE');

-- AlterTable
ALTER TABLE "products"
  ADD COLUMN "deliveryMode" "DigitalDeliveryMode" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "isFree" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "licenseKeys" TEXT,
  ADD COLUMN "downloadUrl" TEXT,
  ADD COLUMN "downloadFileName" TEXT,
  ADD COLUMN "promoText" TEXT,
  ADD COLUMN "activationGuideText" TEXT,
  ADD COLUMN "activationGuideImageUrl" TEXT,
  ADD COLUMN "activationGuideVideoUrl" TEXT;
