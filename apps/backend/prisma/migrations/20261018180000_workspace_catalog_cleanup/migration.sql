-- Quote-only products stay visible in the catalog but cannot enter checkout.
ALTER TABLE "products"
  ADD COLUMN "minimumQuantity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "requiresQuote" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "products"
  ADD CONSTRAINT "products_minimum_quantity_positive" CHECK ("minimumQuantity" >= 1),
  ADD CONSTRAINT "products_quote_not_free" CHECK (NOT ("requiresQuote" AND "isFree"));

-- SSL is included with hosting and backup is not currently offered as a product.
UPDATE "catalog_categories"
SET "isActive" = false, "updatedAt" = NOW()
WHERE "systemType" IN ('SSL', 'BACKUP');

UPDATE "products"
SET "isActive" = false, "updatedAt" = NOW()
WHERE "category" IN ('SSL', 'BACKUP');

-- Google Workspace Business Standard: reseller price per user/month, minimum 3 users.
UPDATE "products"
SET
  "name" = 'Google Workspace Business Standard',
  "description" = E'Google Workspace for growing teams.\n• 2 TB pooled Google Drive storage per user\n• Business Gmail on your own domain\n• Google Meet for up to 150 participants with recording\n• Shared drives and central Admin console\n• Gemini in Gmail, Docs, Meet and more\n• Minimum order: 3 users',
  "price" = 10.50,
  "currency" = 'USD',
  "billingCycle" = 'MONTHLY',
  "minimumQuantity" = 3,
  "requiresQuote" = false,
  "isActive" = true,
  "updatedAt" = NOW()
WHERE "slug" = 'google-workspace';

UPDATE "product_prices" pp
SET
  "originalPrice" = CASE pp."currency" WHEN 'USD' THEN 10.50 WHEN 'EUR' THEN 9.10 ELSE 17.85 END,
  "salePrice" = CASE pp."currency" WHEN 'USD' THEN 10.50 WHEN 'EUR' THEN 9.10 ELSE 17.85 END,
  "updatedAt" = NOW()
FROM "products" p
WHERE pp."productId" = p."id"
  AND p."slug" = 'google-workspace'
  AND pp."period" = 'MONTHLY';

UPDATE "product_prices" pp
SET
  "originalPrice" = CASE pp."currency" WHEN 'USD' THEN 126.00 WHEN 'EUR' THEN 109.20 ELSE 214.20 END,
  "salePrice" = CASE pp."currency" WHEN 'USD' THEN 105.00 WHEN 'EUR' THEN 91.00 ELSE 178.50 END,
  "updatedAt" = NOW()
FROM "products" p
WHERE pp."productId" = p."id"
  AND p."slug" = 'google-workspace'
  AND pp."period" = 'YEARLY';

-- Pro+ is quote-only because it is sold in team-sized orders and needs a tailored offer.
INSERT INTO "products" (
  "id", "slug", "name", "description", "category", "catalogCategoryId",
  "price", "currency", "billingCycle", "minimumQuantity", "requiresQuote",
  "isActive", "sortOrder", "deliveryMode", "isFree", "createdAt", "updatedAt"
)
VALUES (
  'prod_google_workspace_pro_plus',
  'google-workspace-pro-plus',
  'Google Workspace Pro+',
  E'Advanced Google Workspace for teams that need more capacity and control.\n• 5 TB pooled Google Drive storage per user\n• Business Gmail with eDiscovery and retention\n• Google Meet for up to 500 participants with attendance tracking\n• Google Vault and advanced endpoint management\n• Advanced security and administration controls\n• Minimum order: 3 users',
  'EMAIL',
  (SELECT "id" FROM "catalog_categories" WHERE "systemType" = 'EMAIL' ORDER BY "sortOrder" LIMIT 1),
  0,
  'USD',
  'MONTHLY',
  3,
  true,
  true,
  19,
  'NONE',
  false,
  NOW(),
  NOW()
)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "catalogCategoryId" = EXCLUDED."catalogCategoryId",
  "price" = EXCLUDED."price",
  "currency" = EXCLUDED."currency",
  "billingCycle" = EXCLUDED."billingCycle",
  "minimumQuantity" = EXCLUDED."minimumQuantity",
  "requiresQuote" = EXCLUDED."requiresQuote",
  "isActive" = EXCLUDED."isActive",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();

-- Remove the unavailable backup promise from the live hosting CMS included list.
UPDATE "cms_page_sections" s
SET "content" = jsonb_set(
  s."content"::jsonb,
  '{items}',
  COALESCE(
    (
      SELECT jsonb_agg(item ORDER BY ordinality)
      FROM jsonb_array_elements(s."content"::jsonb -> 'items') WITH ORDINALITY AS entry(item, ordinality)
      WHERE COALESCE(item ->> 'icon', '') <> 'cloud_sync'
    ),
    '[]'::jsonb
  )
),
"updatedAt" = NOW()
FROM "cms_pages" p
WHERE s."pageId" = p."id"
  AND p."slug" = 'hosting'
  AND s."key" = 'included'
  AND jsonb_typeof(s."content"::jsonb -> 'items') = 'array';

-- Make both Workspace offers visible on the dedicated email landing page.
UPDATE "cms_page_sections" s
SET "content" = jsonb_set(
  s."content"::jsonb,
  '{productSlugs}',
  '["google-workspace", "google-workspace-pro-plus"]'::jsonb
),
"updatedAt" = NOW()
FROM "cms_pages" p
WHERE s."pageId" = p."id"
  AND p."slug" = 'email'
  AND s."key" = 'products';
