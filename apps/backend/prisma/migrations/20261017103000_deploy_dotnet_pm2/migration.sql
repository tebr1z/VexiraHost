ALTER TYPE "DeployStack" ADD VALUE IF NOT EXISTS 'DOTNET';

CREATE TYPE "DeployRuntime" AS ENUM ('PM2', 'DOCKER');

ALTER TABLE "app_deployments"
ADD COLUMN "runtime" "DeployRuntime" NOT NULL DEFAULT 'DOCKER';
