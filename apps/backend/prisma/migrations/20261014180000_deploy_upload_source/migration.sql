ALTER TYPE "DeploySource" ADD VALUE IF NOT EXISTS 'UPLOAD';

ALTER TABLE "app_deployments"
ADD COLUMN "sourceArchivePath" TEXT;
