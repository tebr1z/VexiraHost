-- Keep internal product identifiers and existing orders intact; public URLs are persisted separately.
ALTER TABLE "products" ADD COLUMN "publicSlug" TEXT;
DO $$
DECLARE p RECORD; base TEXT; candidate TEXT; attempt INTEGER;
BEGIN
  FOR p IN SELECT "id", "name", "slug" FROM "products" ORDER BY "createdAt", "id" LOOP
    base := trim(both '-' from regexp_replace(lower(p."name"), '[^a-z0-9]+', '-', 'g'));
    IF base = '' THEN base := p."slug"; END IF;
    candidate := base;
    attempt := 0;
    WHILE EXISTS (SELECT 1 FROM "products" WHERE "publicSlug" = candidate) LOOP
      attempt := attempt + 1;
      candidate := base || '-' || substr(md5(p."id" || ':' || attempt::text), 1, 8);
    END LOOP;
    UPDATE "products" SET "publicSlug" = candidate WHERE "id" = p."id";
  END LOOP;
END $$;
CREATE UNIQUE INDEX "products_publicSlug_key" ON "products"("publicSlug");
