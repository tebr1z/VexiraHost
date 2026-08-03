-- AlterTable
ALTER TABLE "domains" ADD COLUMN "nsGlueRecords" JSONB NOT NULL DEFAULT '[]';
