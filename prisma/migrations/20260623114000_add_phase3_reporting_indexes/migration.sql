-- Reporting and ledger indexes for phase 3 remediation
CREATE INDEX "Transfer_dailyEntryId_idx" ON "Transfer"("dailyEntryId");

CREATE INDEX "Transfer_accountId_status_idx" ON "Transfer"("accountId", "status");

CREATE INDEX "Transfer_receivingEntryId_idx" ON "Transfer"("receivingEntryId");

CREATE INDEX "Payment_partyId_idx" ON "Payment"("partyId");

CREATE INDEX "Payment_dailyEntryId_idx" ON "Payment"("dailyEntryId");

CREATE INDEX "AdvanceSalary_employeeId_createdAt_idx" ON "AdvanceSalary"("employeeId", "createdAt");
