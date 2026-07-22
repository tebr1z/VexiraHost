-- CreateEnum
CREATE TYPE "AddonServiceType" AS ENUM ('LICENSE', 'SSL', 'EMAIL', 'BACKUP');

-- CreateTable
CREATE TABLE "addon_services" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AddonServiceType" NOT NULL,
    "name" TEXT NOT NULL,
    "identifier" TEXT,
    "status" "ServiceStatus" NOT NULL DEFAULT 'PROVISIONING',
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3),
    "provisionedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addon_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "addon_services_userId_idx" ON "addon_services"("userId");

-- AddForeignKey
ALTER TABLE "addon_services" ADD CONSTRAINT "addon_services_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
