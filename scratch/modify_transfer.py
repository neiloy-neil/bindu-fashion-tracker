import re

with open('app/api/transfers/route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

creation_addition = """    const account = await prisma.ledgerAccount.findUnique({ where: { id: parseInt(accountId) } })
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    const status = account.type === 'BRANCH' ? 'PENDING' : 'NOT_APPLICABLE'

    const transfer = await prisma.transfer.create({
      data: {
        dailyEntryId: parseInt(dailyEntryId),
        accountId: parseInt(accountId),
        amount: parseFloat(amount),
        note,
        status,
      }
    })"""

content = content.replace("""    const transfer = await prisma.transfer.create({
      data: {
        dailyEntryId: parseInt(dailyEntryId),
        accountId: parseInt(accountId),
        amount: parseFloat(amount),
        note,
      }
    })""", creation_addition)

with open('app/api/transfers/route.ts', 'w', encoding='utf-8') as f:
    f.write(content)
