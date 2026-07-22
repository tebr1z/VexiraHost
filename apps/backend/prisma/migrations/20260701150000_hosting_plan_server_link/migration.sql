-- AlterTable
ALTER TABLE "hosting_plans" ADD COLUMN "serverId" TEXT;

-- CreateIndex
CREATE INDEX "hosting_plans_serverId_idx" ON "hosting_plans"("serverId");

-- AddForeignKey
ALTER TABLE "hosting_plans" ADD CONSTRAINT "hosting_plans_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "hosting_servers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
