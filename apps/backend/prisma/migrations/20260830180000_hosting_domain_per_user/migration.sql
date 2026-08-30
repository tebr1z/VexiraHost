-- Drop global unique constraint on primaryDomain; allow same domain per user, unique across users.
DROP INDEX IF EXISTS "hosting_accounts_primaryDomain_key";

CREATE UNIQUE INDEX "hosting_accounts_userId_primaryDomain_key" ON "hosting_accounts"("userId", "primaryDomain");

CREATE INDEX "hosting_accounts_primaryDomain_idx" ON "hosting_accounts"("primaryDomain");
