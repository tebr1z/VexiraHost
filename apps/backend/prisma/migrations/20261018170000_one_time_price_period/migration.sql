-- Separate migration: PostgreSQL requires the enum addition to commit before use.
ALTER TYPE "PricePeriod" ADD VALUE IF NOT EXISTS 'ONE_TIME';
