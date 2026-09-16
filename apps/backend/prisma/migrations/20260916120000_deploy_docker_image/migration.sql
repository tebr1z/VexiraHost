-- PostgreSQL 16 allows ADD VALUE inside a Prisma transaction (do not COMMIT mid-migration).
ALTER TYPE "DeployStack" ADD VALUE IF NOT EXISTS 'DOCKER';

DO $$ BEGIN
  CREATE TYPE "DeploySource" AS ENUM ('GIT', 'DOCKER_IMAGE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "app_deployments" ADD COLUMN IF NOT EXISTS "source" "DeploySource" NOT NULL DEFAULT 'GIT';
ALTER TABLE "app_deployments" ADD COLUMN IF NOT EXISTS "imageRef" TEXT;
ALTER TABLE "app_deployments" ALTER COLUMN "repoUrl" SET DEFAULT '';
