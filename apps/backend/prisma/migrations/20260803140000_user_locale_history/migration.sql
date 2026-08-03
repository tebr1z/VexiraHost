-- AlterTable
ALTER TABLE "users" ADD COLUMN "localeHistory" TEXT[] DEFAULT ARRAY[]::TEXT[];
