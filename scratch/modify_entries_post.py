import re

with open('app/api/entries/route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix destructuring
destruct_fix = "  const { date, branchId, notes, actualPhysicalCash, cashDifferenceNote, eodChecklist, items, transfers, payments, expenseEntries, advanceSalaries } = body as any"
content = content.replace("  const { date, branchId, notes, actualPhysicalCash, cashDifferenceNote, eodChecklist, items } = body", destruct_fix)

# Add sub-relations to creation
create_addition = """        items: items ? {
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
        } : undefined,
        payments: payments ? {
          create: payments.map((p: any) => ({
            partyId: p.partyId,
            method: p.method,
            amount: p.amount,
            note: p.note,
            issueDate: p.issueDate ? new Date(p.issueDate) : null,
            withdrawDate: p.withdrawDate ? new Date(p.withdrawDate) : null,
            attachmentUrl: p.attachmentUrl || null,
            cheque: p.method === 'CHEQUE' ? {
              create: {
                status: 'PENDING'
              }
            } : undefined
          }))
        } : undefined,
        expenseEntries: expenseEntries ? {
          create: expenseEntries.map((e: any) => ({
            categoryId: e.categoryId,
            amount: e.amount,
            note: e.note
          }))
        } : undefined,
        advanceSalaries: advanceSalaries ? {
          create: advanceSalaries.map((a: any) => ({
            employeeId: a.employeeId,
            type: a.type,
            amount: a.amount,
            productDescription: a.productDescription,
            note: a.note
          }))
        } : undefined"""

old_create = """        items: items ? {
          create: items.map(item => ({
            categoryId: item.categoryId,
            amount: item.amount || 0,
            receiptUrls: item.receiptUrls || []
          }))
        } : undefined"""

content = content.replace(old_create, create_addition)

with open('app/api/entries/route.ts', 'w', encoding='utf-8') as f:
    f.write(content)
