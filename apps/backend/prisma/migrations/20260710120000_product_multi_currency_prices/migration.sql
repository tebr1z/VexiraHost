-- CreateEnum
CREATE TYPE "PriceCurrency" AS ENUM ('USD', 'EUR', 'AZN');

-- CreateEnum
CREATE TYPE "PricePeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "preferredCurrency" TEXT;
ALTER TABLE "users" ADD COLUMN "billingPeriod" TEXT;

-- CreateTable
CREATE TABLE "product_prices" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currency" "PriceCurrency" NOT NULL,
    "period" "PricePeriod" NOT NULL,
    "originalPrice" DECIMAL(10,2) NOT NULL,
    "salePrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_prices_productId_idx" ON "product_prices"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_prices_productId_currency_period_key" ON "product_prices"("productId", "currency", "period");

-- AddForeignKey
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
