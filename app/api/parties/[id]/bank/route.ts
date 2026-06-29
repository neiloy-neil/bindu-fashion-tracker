import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const paymentMethodSchema = z.object({
  type: z.enum(['BANK', 'BKASH', 'NAGAD', 'OTHER']).default('BANK'),
  accountNo: z.string().min(1).max(100),
  label: z.string().max(100).optional(),
  accountName: z.string().max(100).optional(),
  bankName: z.string().max(100).optional(),
  branchName: z.string().max(100).optional(),
  routingNo: z.string().max(50).optional(),
  isDefault: z.boolean().optional()
}).superRefine((data, ctx) => {
  if (data.type === 'BANK' && (!data.bankName || data.bankName.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Bank name is required for BANK type',
      path: ['bankName']
    })
  }
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userRole = req.headers.get('x-user-role')
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const resolvedParams = await params
  const partyId = parseInt(resolvedParams.id)

  try {
    const body = await req.json()
    const parsed = paymentMethodSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
    }

    const { type, label, accountNo, accountName, bankName, branchName, routingNo, isDefault } = parsed.data

    if (isDefault) {
      await prisma.partyBankInfo.updateMany({
        where: { partyId, type },
        data: { isDefault: false }
      })
    }

    const bankInfo = await prisma.partyBankInfo.create({
      data: {
        partyId,
        type,
        label: label || null,
        accountNo,
        accountName: accountName || null,
        bankName: bankName || null,
        branchName: branchName || null,
        routingNo: routingNo || null,
        isDefault: isDefault || false
      }
    })

    return NextResponse.json(bankInfo, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
