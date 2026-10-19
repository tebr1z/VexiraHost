ALTER TABLE "products"
ADD COLUMN "costPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "discount3Months" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "discount6Months" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "discount12Months" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "campaignDiscountPercent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "campaignStartsAt" TIMESTAMP(3),
ADD COLUMN "campaignEndsAt" TIMESTAMP(3);

ALTER TABLE "hosting_accounts"
ADD COLUMN "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY';

UPDATE "hosting_accounts" AS account
SET "billingCycle" = plan."billingCycle"
FROM "hosting_plans" AS plan
WHERE account."planId" = plan."id";

INSERT INTO "product_prices" (
  "id", "productId", "currency", "period", "originalPrice", "salePrice", "createdAt", "updatedAt"
)
SELECT
  CONCAT('pp_', MD5(RANDOM()::text || monthly."id" || period.value)),
  monthly."productId",
  monthly."currency",
  period.value::"PricePeriod",
  monthly."originalPrice" * period.months,
  monthly."salePrice" * period.months,
  NOW(),
  NOW()
FROM "product_prices" AS monthly
CROSS JOIN (VALUES ('QUARTERLY', 3), ('SEMIANNUAL', 6)) AS period(value, months)
WHERE monthly."period" = 'MONTHLY'
ON CONFLICT ("productId", "currency", "period") DO NOTHING;
