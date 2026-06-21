import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { purchaseSchema } from '@/lib/schemas'

export async function POST(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = purchaseSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
    }

    const { partyId, date, amount, invoiceNumber, note, attachmentUrl, isOpeningDue } = parsed.data

    // We must use a transaction to create the purchase and increment the party balance
    const [purchase, party] = await prisma.$transaction([
      prisma.purchase.create({
        data: {
          partyId,
          date: new Date(date),
          amount,
          invoiceNumber: invoiceNumber || null,
          note: note || null,
          attachmentUrl: attachmentUrl || null,
          isOpeningDue: isOpeningDue || false
        }
      }),
      prisma.party.update({
        where: { id: partyId },
        data: {
          balance: { increment: amount } // Purchase increases what we owe the party
        }
      })
    ])

    return NextResponse.json(purchase, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
