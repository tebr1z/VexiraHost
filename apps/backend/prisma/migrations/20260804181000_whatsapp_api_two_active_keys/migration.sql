-- Enforce the new two-active-key policy for existing customers.
WITH ranked_keys AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "userId"
            ORDER BY "createdAt" DESC, "id" DESC
        ) AS "position"
    FROM "whatsapp_api_keys"
    WHERE "isActive" = true AND "revokedAt" IS NULL
)
UPDATE "whatsapp_api_keys"
SET
    "isActive" = false,
    "revokedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (
    SELECT "id"
    FROM ranked_keys
    WHERE "position" > 2
);
