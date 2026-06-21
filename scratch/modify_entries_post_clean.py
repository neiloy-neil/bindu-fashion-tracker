import re

with open('app/api/entries/route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the create object
cleanup_addition = """    let preparedTransfers = undefined;
    if (transfers && transfers.length > 0) {
      preparedTransfers = await Promise.all(transfers.map(async (t: any) => {
        const acc = await prisma.ledgerAccount.findUnique({ where: { id: t.accountId } });
        return {
          accountId: t.accountId,
          amount: t.amount,
          note: t.note,
          status: acc?.type === 'BRANCH' ? 'PENDING' : 'NOT_APPLICABLE'
        }
      }));
    }

    const entry = await prisma.dailyEntry.create({
      data: {
        date: new Date(date),
        branchId: finalBranchId,
        notes,
        actualPhysicalCash,
        cashDifferenceNote,
        eodChecklist,
        items: items ? {
          create: items.map((item: any) => ({
            categoryId: item.categoryId,
            amount: item.amount || 0,
            receiptUrls: item.receiptUrls || [],
            notes: item.notes || null
          }))
        } : undefined,
        transfers: preparedTransfers ? {
          create: preparedTransfers
        } : undefined,"""

content = content.replace("""    const entry = await prisma.dailyEntry.create({
      data: {
        date: new Date(date),
        branchId: finalBranchId,
        notes,
        actualPhysicalCash,
        cashDifferenceNote,
        eodChecklist,
        items: items ? {
          create: items.map((item: any) => ({
            categoryId: item.categoryId,
            amount: item.amount || 0,
            receiptUrls: item.receiptUrls || [],
            notes: item.notes || null
          }))
        } : undefined,
        transfers: transfers ? {
          create: await Promise.all(transfers.map(async (t: any) => {
            const acc = await prisma.ledgerAccount.findUnique({ where: { id: t.accountId } });
            return {
              accountId: t.accountId,
              amount: t.amount,
              note: t.note,
              status: acc?.type === 'BRANCH' ? 'PENDING' : 'NOT_APPLICABLE'
            }
          }))
        } : undefined,""", cleanup_addition)

with open('app/api/entries/route.ts', 'w', encoding='utf-8') as f:
    f.write(content)
