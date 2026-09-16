DO $$ BEGIN
  CREATE TYPE "TicketKind" AS ENUM ('SUPPORT', 'CANCELLATION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "kind" "TicketKind" NOT NULL DEFAULT 'SUPPORT';

CREATE INDEX IF NOT EXISTS "tickets_kind_idx" ON "tickets"("kind");
