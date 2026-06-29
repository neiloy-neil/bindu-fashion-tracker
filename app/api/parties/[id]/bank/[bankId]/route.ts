import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string, bankId: string }> }) {
  const userRole = req.headers.get('x-user-role')
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const resolvedParams = await params
  const partyId = parseInt(resolvedParams.id)
  const bankId = parseInt(resolvedParams.bankId)

  try {
    const existing = await prisma.partyBankInfo.findUnique({
      where: { id: bankId, partyId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })
    }

    // Set any dependent payments to null first (soft-check)
    await prisma.payment.updateMany({
      where: { partyBankInfoId: bankId },
      data: { partyBankInfoId: null }
    })

    await prisma.partyBankInfo.delete({
      where: { id: bankId }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
