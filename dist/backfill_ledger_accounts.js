"use strict";

// lib/prisma.ts
var import_client = require("@prisma/client");
var import_pg = require("pg");
var import_adapter_pg = require("@prisma/adapter-pg");
var globalForPrisma = globalThis;
function createPrismaClient() {
  const pool = new import_pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new import_adapter_pg.PrismaPg(pool);
  return new import_client.PrismaClient({ adapter });
}
var prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// scripts/backfill_ledger_accounts.ts
async function main() {
  console.log("Starting backfill of LedgerAccount.branchId...");
  const ledgerAccounts = await prisma.ledgerAccount.findMany({
    where: { type: "BRANCH" }
  });
  const branches = await prisma.branch.findMany();
  let updatedCount = 0;
  let failedCount = 0;
  for (const account of ledgerAccounts) {
    if (account.branchId) {
      console.log(`Skipping account ${account.name} (ID: ${account.id}) - already has branchId`);
      continue;
    }
    let matchedBranch = branches.find((b) => b.name.toLowerCase() === account.name.toLowerCase());
    if (!matchedBranch) {
      matchedBranch = branches.find((b) => account.name.toLowerCase().includes(b.name.toLowerCase()));
    }
    if (matchedBranch) {
      await prisma.ledgerAccount.update({
        where: { id: account.id },
        data: { branchId: matchedBranch.id }
      });
      console.log(`\u2705 Matched Account '${account.name}' to Branch '${matchedBranch.name}' (ID: ${matchedBranch.id})`);
      updatedCount++;
    } else {
      console.error(`\u274C Could not match Account '${account.name}' to any branch. Manual review required.`);
      failedCount++;
    }
  }
  console.log(`
Backfill complete. Updated: ${updatedCount}, Failed to match: ${failedCount}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
