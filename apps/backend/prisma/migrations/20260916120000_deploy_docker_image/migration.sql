-- AlterEnum (ADD VALUE cannot run inside a Prisma transaction on some Postgres versions)
COMMIT;
ALTER TYPE "DeployStack" ADD VALUE 'DOCKER';
BEGIN;

-- CreateEnum
CREATE TYPE "DeploySource" AS ENUM ('GIT', 'DOCKER_IMAGE');

-- AlterTable
ALTER TABLE "app_deployments" ADD COLUMN "source" "DeploySource" NOT NULL DEFAULT 'GIT';
ALTER TABLE "app_deployments" ADD COLUMN "imageRef" TEXT;
ALTER TABLE "app_deployments" ALTER COLUMN "repoUrl" SET DEFAULT '';
