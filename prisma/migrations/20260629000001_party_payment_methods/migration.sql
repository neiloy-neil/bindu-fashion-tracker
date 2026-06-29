-- Extend PartyBankInfo for bKash/Nagad support
ALTER TABLE "PartyBankInfo"
  ADD COLUMN IF NOT EXISTS "type"        TEXT NOT NULL DEFAULT 'BANK',
  ADD COLUMN IF NOT EXISTS "label"       TEXT,
  ADD COLUMN IF NOT EXISTS "accountName" TEXT,
  ADD COLUMN IF NOT EXISTS "isDefault"   BOOLEAN NOT NULL DEFAULT false,
  ALTER COLUMN "bankName"  DROP NOT NULL,
  ALTER COLUMN "branchName" DROP NOT NULL;

-- Backfill label from existing bankName
UPDATE "PartyBankInfo"
SET "label" = CONCAT("bankName", ' - ', "branchName")
WHERE "type" = 'BANK' AND "bankName" IS NOT NULL;

-- Add payment method tracking to Payment
ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "partyBankInfoId" INTEGER REFERENCES "PartyBankInfo"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "transactionRef"  TEXT;

CREATE INDEX IF NOT EXISTS "Payment_partyBankInfoId_idx" ON "Payment"("partyBankInfoId");
