-- CreateTable
CREATE TABLE "catalog_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "names" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemType" "ProductCategory",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_categories_slug_key" ON "catalog_categories"("slug");

-- CreateIndex
CREATE INDEX "catalog_categories_isActive_sortOrder_idx" ON "catalog_categories"("isActive", "sortOrder");

-- AlterTable
ALTER TABLE "products" ADD COLUMN "catalogCategoryId" TEXT;

-- CreateIndex
CREATE INDEX "products_catalogCategoryId_idx" ON "products"("catalogCategoryId");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_catalogCategoryId_fkey" FOREIGN KEY ("catalogCategoryId") REFERENCES "catalog_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default categories (ids stable for linking)
INSERT INTO "catalog_categories" ("id", "slug", "name", "names", "sortOrder", "isActive", "systemType", "createdAt", "updatedAt")
VALUES
  ('cat_hosting', 'hosting', 'Hosting', '{"az":"Hosting","en":"Hosting","tr":"Hosting","ru":"Хостинг"}'::jsonb, 10, true, 'HOSTING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_vps', 'vps', 'VPS', '{"az":"VPS","en":"VPS","tr":"VPS","ru":"VPS"}'::jsonb, 20, true, 'VPS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_dedicated', 'dedicated', 'Dedicated', '{"az":"Dedicated","en":"Dedicated","tr":"Dedicated","ru":"Dedicated"}'::jsonb, 30, true, 'DEDICATED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_domain', 'domain', 'Domain', '{"az":"Domen","en":"Domain","tr":"Alan adı","ru":"Домен"}'::jsonb, 40, true, 'DOMAIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_ssl', 'ssl', 'SSL', '{"az":"SSL","en":"SSL","tr":"SSL","ru":"SSL"}'::jsonb, 50, true, 'SSL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_email', 'email', 'Email', '{"az":"E-poçt","en":"Email","tr":"E-posta","ru":"Email"}'::jsonb, 60, true, 'EMAIL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_license', 'license', 'License', '{"az":"Lisenziya","en":"License","tr":"Lisans","ru":"Лицензия"}'::jsonb, 70, true, 'LICENSE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_backup', 'backup', 'Backup', '{"az":"Backup","en":"Backup","tr":"Yedekleme","ru":"Бэкап"}'::jsonb, 80, true, 'BACKUP', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Link existing products by system type
UPDATE "products" p
SET "catalogCategoryId" = c."id"
FROM "catalog_categories" c
WHERE c."systemType" = p."category";
