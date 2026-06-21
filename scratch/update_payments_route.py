import re

with open('app/api/payments/route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Update validation and logic to handle direct admin payments
payments_update = """    const { dailyEntryId, partyId, method, amount, note, issueDate, withdrawDate, attachmentUrl } = await req.json()

    if ((method === 'BANK' || method === 'CHEQUE') && !attachmentUrl) {
      return NextResponse.json({ error: 'A payslip attachment is required for bank transfer and cheque payments.' }, { status: 400 })
    }

    let parsedDailyEntryId = dailyEntryId ? parseInt(dailyEntryId) : null

    // If dailyEntryId is provided, verify branch ownership
    if (parsedDailyEntryId) {
      const entry = await prisma.dailyEntry.findUnique({ where: { id: parsedDailyEntryId } })
      if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

      if (userRole === 'BRANCH' && String(entry.branchId) !== String(userBranchId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      // If no dailyEntryId, it's a direct admin payment
      if (userRole !== 'ADMIN') {
        return NextResponse.json({ error: 'Only admins can make direct payments without a daily entry.' }, { status: 403 })
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          dailyEntryId: parsedDailyEntryId,
          partyId: parseInt(partyId),
          method,
          amount: parseFloat(amount),
          note: note || null,
          attachmentUrl: attachmentUrl || null,
        }
      })

      if (method === 'CHEQUE') {
        // Create pending cheque
        // Party.balance is NOT updated here for cheques; it updates when the admin approves the cheque.
        await tx.cheque.create({
          data: {
            paymentId: payment.id,
            issueDate: new Date(issueDate),
            withdrawDate: new Date(withdrawDate),
            status: 'PENDING'
          }
        })
      } else {
        // Immediately decrement party balance for CASH/BANK (because payment reduces our debt to them)
        await tx.party.update({
          where: { id: parseInt(partyId) },
          data: { balance: { decrement: parseFloat(amount) } }
        })
      }

      return payment
    })"""

content = content.replace("""    const { dailyEntryId, partyId, method, amount, note, issueDate, withdrawDate, attachmentUrl } = await req.json()

    if ((method === 'BANK' || method === 'CHEQUE') && !attachmentUrl) {
      return NextResponse.json({ error: 'A payslip attachment is required for bank transfer and cheque payments.' }, { status: 400 })
    }

    // Verify branch ownership
    const entry = await prisma.dailyEntry.findUnique({ where: { id: parseInt(dailyEntryId) } })
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

    if (userRole === 'BRANCH' && String(entry.branchId) !== String(userBranchId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          dailyEntryId: parseInt(dailyEntryId),
          partyId: parseInt(partyId),
          method,
          amount: parseFloat(amount),
          note,
          attachmentUrl,
        }
      })

      if (method === 'CHEQUE') {
        // Create pending cheque
        // Party.balance is NOT updated here for cheques; it updates when the admin approves the cheque.
        await tx.cheque.create({
          data: {
            paymentId: payment.id,
            issueDate: new Date(issueDate),
            withdrawDate: new Date(withdrawDate),
            status: 'PENDING'
          }
        })
      } else {
        // Immediately increment party balance for CASH/BANK
        await tx.party.update({
          where: { id: parseInt(partyId) },
          data: { balance: { increment: parseFloat(amount) } }
        })
      }

      return payment
    })""", payments_update)

with open('app/api/payments/route.ts', 'w', encoding='utf-8') as f:
    f.write(content)
