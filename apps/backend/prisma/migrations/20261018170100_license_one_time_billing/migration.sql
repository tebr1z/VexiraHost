-- Keep existing monthly/yearly rows as a recoverable pricing history. Only the
-- canonical ONE_TIME rows are advertised or used for license checkout.
INSERT INTO "product_prices" ("id", "productId", "currency", "period", "originalPrice", "salePrice", "createdAt", "updatedAt")
SELECT md5('license-one-time:' || src."productId" || ':' || src."currency"::text),
       src."productId", src."currency", 'ONE_TIME', src."originalPrice", src."salePrice", NOW(), NOW()
FROM (
  SELECT DISTINCT ON (pp."productId", pp."currency") pp.*
  FROM "product_prices" pp
  JOIN "products" p ON p."id" = pp."productId"
  WHERE p."category" = 'LICENSE'
  ORDER BY pp."productId", pp."currency",
           CASE pp."period" WHEN 'ONE_TIME' THEN 0 WHEN 'MONTHLY' THEN 1 ELSE 2 END
) src
ON CONFLICT ("productId", "currency", "period") DO NOTHING;

UPDATE "products" SET "billingCycle" = 'ONE_TIME', "updatedAt" = NOW()
WHERE "category" = 'LICENSE' AND "billingCycle" <> 'ONE_TIME';

-- Do not reactivate cancelled/expired services or rewrite historical invoices.
UPDATE "addon_services" SET "autoRenew" = false, "expiresAt" = NULL, "updatedAt" = NOW()
WHERE "type" = 'LICENSE' AND ("autoRenew" = true OR "expiresAt" IS NOT NULL);

ALTER TABLE "products" ADD CONSTRAINT "license_billing_one_time"
CHECK ("category" <> 'LICENSE' OR "billingCycle" = 'ONE_TIME');
