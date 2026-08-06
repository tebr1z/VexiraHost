-- CMS page hierarchy for license sub-pages (admin-managed)
ALTER TABLE "cms_pages" ADD COLUMN "parentSlug" TEXT;
ALTER TABLE "cms_pages" ADD COLUMN "pathSegment" TEXT;
ALTER TABLE "cms_pages" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "cms_pages_pathSegment_key" ON "cms_pages"("pathSegment");
CREATE INDEX "cms_pages_parentSlug_idx" ON "cms_pages"("parentSlug");
