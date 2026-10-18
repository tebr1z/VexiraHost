ALTER TABLE "managed_servers"
ADD COLUMN "installedFeatures" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
