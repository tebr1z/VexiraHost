-- AlterTable
ALTER TABLE "hosting_servers" ADD COLUMN "osVersion" TEXT;
ALTER TABLE "hosting_servers" ADD COLUMN "sshUsername" TEXT;
ALTER TABLE "hosting_servers" ADD COLUMN "sshPasswordEnc" TEXT;
ALTER TABLE "hosting_servers" ADD COLUMN "sshPort" INTEGER NOT NULL DEFAULT 22;
