-- CreateTable
CREATE TABLE "nav_groups" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "labels" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nav_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nav_items" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "labels" JSONB NOT NULL,
    "href" TEXT NOT NULL,
    "pathMatch" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nav_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nav_groups_key_key" ON "nav_groups"("key");

-- CreateIndex
CREATE INDEX "nav_items_groupId_idx" ON "nav_items"("groupId");

-- AddForeignKey
ALTER TABLE "nav_items" ADD CONSTRAINT "nav_items_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "nav_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
