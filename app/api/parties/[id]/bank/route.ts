import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { partyBankInfoSchema } from '@/lib/schemas'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userRole = req.headers.get('x-user-role')
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const resolvedParams = await params
  const partyId = parseInt(resolvedParams.id)

  try {
    const body = await req.json()
    const parsed = partyBankInfoSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
    }

    const { bankName, branchName, accountNo, routingNo } = parsed.data

    const bankInfo = await prisma.partyBankInfo.create({
      data: {
        partyId,
        bankName,
        branchName,
        accountNo,
        routingNo: routingNo || null
      }
    })

    return NextResponse.json(bankInfo, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
