-- Add approvalStatus column to Payment table
-- Default existing records to 'APPROVED' (they were approved implicitly)
ALTER TABLE "Payment"
ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED';

-- After backfilling existing rows, the application-level default
-- is now 'PENDING' (set in schema.prisma).
-- Existing rows keep 'APPROVED' via the SQL DEFAULT above.
