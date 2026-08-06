-- AlterTable
ALTER TABLE "users" ADD COLUMN "emailTwoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "email_login_otps" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rememberMe" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_login_otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_login_otps_userId_idx" ON "email_login_otps"("userId");

-- AddForeignKey
ALTER TABLE "email_login_otps" ADD CONSTRAINT "email_login_otps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
