import { prisma } from '../lib/prisma';
import { computeTotals } from '../lib/utils';

async function main() {
  console.log('Recalculating expectedNetBalance for all previous entries...');
  const entries = await prisma.dailyEntry.findMany({
    include: {
      items: { include: { category: true } },
      transfers: true,
      receivedTransfers: true,
      payments: { include: { cheque: true } },
      expenseEntries: true,
      advanceSalaries: true
    }
  });

  let updated = 0;
  for (const entry of entries) {
    const totals = computeTotals(entry);
    if (entry.expectedNetBalance !== totals.netBalance) {
      await prisma.dailyEntry.update({
        where: { id: entry.id },
        data: { expectedNetBalance: totals.netBalance }
      });
      updated++;
    }
  }
  
  console.log(`Fixed expectedNetBalance for ${updated} previous entries.`);
  process.exit(0);
}

main();
