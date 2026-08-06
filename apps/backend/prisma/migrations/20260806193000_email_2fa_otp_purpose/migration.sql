-- AlterTable
ALTER TABLE "email_login_otps" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'LOGIN';
ALTER TABLE "email_login_otps" ADD COLUMN "desiredEnabled" BOOLEAN;

-- CreateIndex
CREATE INDEX "email_login_otps_userId_purpose_idx" ON "email_login_otps"("userId", "purpose");
