import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dailyEntrySchema } from '@/lib/schemas'
import { logAudit } from '@/lib/audit'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const rawBody = await req.json()
  const parsed = dailyEntrySchema.partial().safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
  }
  const body = parsed.data
  // Add reason to body destructuring
  const { date, branchId, items, expenseEntries: expenseEntriesUpdate, reason, ...fields } = body as any

  const userRole = req.headers.get('x-user-role')
  if (userRole === 'AUDITOR' || userRole === 'AREA_MANAGER') {
    return NextResponse.json({ error: 'Forbidden: Read-Only Role' }, { status: 403 })
  }
  const userBranchId = req.headers.get('x-user-branch-id')

  try {
    // If branch user, verify they own this entry AND it's today's entry
    if (userRole === 'BRANCH') {
      if (!userBranchId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const existing = await prisma.dailyEntry.findUnique({ where: { id: parseInt(id) } })
      if (!existing || existing.branchId !== parseInt(userBranchId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      
      const todayStr = new Date().toISOString().split('T')[0]
      const entryDateStr = existing.date.toISOString().split('T')[0]
      
      if (todayStr !== entryDateStr) {
        return NextResponse.json({ error: 'Past entries cannot be edited directly. Please submit an edit request.' }, { status: 403 })
      }
    }

    const entryIdNum = parseInt(id)
    const existingEntrySnapshot = await prisma.dailyEntry.findUnique({
      where: { id: entryIdNum },
      include: { items: true }
    })

    // First update the entry itself
    const entry = await prisma.dailyEntry.update({
      where: { id: entryIdNum },
      data: {
        ...(date && { date: new Date(date) }),
        ...(branchId && userRole === 'ADMIN' && { branchId: typeof branchId === 'string' ? parseInt(branchId) : branchId }),
        ...fields,
      },
      include: { branch: true },
    })

    // Upsert income items if provided
    if (items) {
      for (const item of items) {
        await prisma.entryItem.upsert({
          where: { entryId_categoryId: { entryId: entryIdNum, categoryId: item.categoryId } },
          update: { amount: item.amount, note: item.note || null, partyName: item.partyName || null, receiptUrls: item.receiptUrls || [] },
          create: { entryId: entryIdNum, categoryId: item.categoryId, amount: item.amount || 0, note: item.note || null, partyName: item.partyName || null, receiptUrls: item.receiptUrls || [] },
        })
      }

      // --- AUTO-TRANSFER DIGITAL SALES ---
      const digitalMethods = ['Bkash', 'Rocket', 'Nagad', 'POS']
      for (const item of items) {
        const cat = await prisma.category.findUnique({ where: { id: item.categoryId } })
        if (cat && digitalMethods.some(m => cat.name.toLowerCase().includes(m.toLowerCase()))) {
          let account = await prisma.ledgerAccount.findFirst({
            where: { name: { equals: cat.name, mode: 'insensitive' } }
          })
          if (!account) {
            account = await prisma.ledgerAccount.create({
              data: { name: cat.name, type: 'BANK', isActive: true }
            })
          }
          // Upsert the transfer for this specific auto-transfer
          const transferNote = `Auto-transferred from ${cat.name} sale`
          const existingTransfer = await prisma.transfer.findFirst({
            where: { dailyEntryId: entryIdNum, accountId: account.id, note: transferNote }
          })
          if (existingTransfer) {
            if (item.amount === 0) {
              await prisma.transfer.delete({ where: { id: existingTransfer.id } })
            } else {
              await prisma.transfer.update({ where: { id: existingTransfer.id }, data: { amount: item.amount } })
            }
          } else if (item.amount > 0) {
            await prisma.transfer.create({
              data: { dailyEntryId: entryIdNum, accountId: account.id, amount: item.amount, note: transferNote }
            })
          }
        }
      }
      // ------------------------------------
    }

    // Upsert expense entries if provided
    if (expenseEntriesUpdate) {
      for (const exp of expenseEntriesUpdate) {
        const existing = await prisma.expenseEntry.findFirst({
          where: { dailyEntryId: entryIdNum, categoryId: exp.categoryId },
        })
        if (existing) {
          await prisma.expenseEntry.update({ where: { id: existing.id }, data: { amount: exp.amount, note: exp.note || null } })
        } else {
          await prisma.expenseEntry.create({ data: { dailyEntryId: entryIdNum, categoryId: exp.categoryId, amount: exp.amount || 0, note: exp.note || null } })
        }
      }
    }

    // Recalculate expectedNetBalance from current DB state
    const balanceSnapshot = await prisma.dailyEntry.findUnique({
      where: { id: entryIdNum },
      include: {
        items: { include: { category: { select: { type: true, name: true } } } },
        expenseEntries: true,
        transfers: true,
        payments: true,
        advanceSalaries: true,
      },
    })
    if (balanceSnapshot) {
      const income = balanceSnapshot.items
        .filter(i => i.category?.type === 'INCOME' && i.category?.name !== 'Opening Balance')
        .reduce((s, i) => s + i.amount, 0)
      const expenses = balanceSnapshot.expenseEntries.reduce((s, e) => s + e.amount, 0)
      const transfers = balanceSnapshot.transfers.reduce((s, t) => s + t.amount, 0)
      const payments = balanceSnapshot.payments.reduce((s, p) => s + p.amount, 0)
      const advances = balanceSnapshot.advanceSalaries
        .filter(a => a.type === 'CASH')
        .reduce((s, a) => s + (a.amount ?? 0), 0)
      await prisma.dailyEntry.update({
        where: { id: entryIdNum },
        data: { expectedNetBalance: income - expenses - transfers - payments - advances },
      })
    }

    // Return the full updated entry
    const finalEntry = await prisma.dailyEntry.findUnique({
      where: { id: entryIdNum },
      include: {
        branch: true,
        items: { include: { category: true } },
        expenseEntries: { include: { category: true } },
      },
    })

    const userId = parseInt(req.headers.get('x-user-id') || '0')
    if (userId) {
      await logAudit({
        userId,
        action: 'UPDATE',
        entityType: 'DailyEntry',
        entityId: entryIdNum,
        oldValues: existingEntrySnapshot,
        newValues: finalEntry,
        reason: reason || 'Direct Inline Edit'
      })
    }

    return NextResponse.json(finalEntry)
  } catch (error: unknown) {
    const e = error as { message?: string }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userRole = _req.headers.get('x-user-role')
  if (userRole === 'AUDITOR' || userRole === 'AREA_MANAGER') {
    return NextResponse.json({ error: 'Forbidden: Read-Only Role' }, { status: 403 })
  }
  const userBranchId = _req.headers.get('x-user-branch-id')

  try {
    if (userRole === 'BRANCH') {
      if (!userBranchId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const existing = await prisma.dailyEntry.findUnique({ where: { id: parseInt(id) } })
      if (!existing || existing.branchId !== parseInt(userBranchId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      
      const todayStr = new Date().toISOString().split('T')[0]
      const entryDateStr = existing.date.toISOString().split('T')[0]
      
      if (todayStr !== entryDateStr) {
        return NextResponse.json({ error: 'Past entries cannot be deleted.' }, { status: 403 })
      }
    }

    const existingEntry = await prisma.dailyEntry.findUnique({
      where: { id: parseInt(id) },
      include: { transfers: true }
    })
    
    if (existingEntry && existingEntry.transfers.some(t => t.status === 'ACKNOWLEDGED')) {
      return NextResponse.json({ error: 'Cannot delete entry: It contains transfers that have already been acknowledged by the receiving branch.' }, { status: 403 })
    }

    await prisma.dailyEntry.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const e = error as { message?: string }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
