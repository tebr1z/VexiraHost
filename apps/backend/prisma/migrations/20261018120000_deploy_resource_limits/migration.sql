ALTER TABLE "hosting_plans"
  ADD COLUMN "autoDeployCpuPercent" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "autoDeployMemoryMb" INTEGER NOT NULL DEFAULT 1024;

ALTER TABLE "hosting_plans"
  ADD CONSTRAINT "hosting_plans_deploy_cpu_range" CHECK ("autoDeployCpuPercent" BETWEEN 10 AND 3200),
  ADD CONSTRAINT "hosting_plans_deploy_memory_range" CHECK ("autoDeployMemoryMb" BETWEEN 128 AND 262144);
