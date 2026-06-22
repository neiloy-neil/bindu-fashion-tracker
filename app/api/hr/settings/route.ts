import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const settings = await prisma.systemSettings.findFirst()
    return NextResponse.json(settings || {})
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (!role || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const data = await req.json()
    const { companyName, logoUrl, generatedBy, paymentBy } = data

    const existing = await prisma.systemSettings.findFirst()
    
    let settings
    if (existing) {
      settings = await prisma.systemSettings.update({
        where: { id: existing.id },
        data: {
          companyName: companyName !== undefined ? companyName : undefined,
          logoUrl: logoUrl !== undefined ? logoUrl : undefined,
          generatedBy: generatedBy !== undefined ? generatedBy : undefined,
          paymentBy: paymentBy !== undefined ? paymentBy : undefined,
        }
      })
    } else {
      settings = await prisma.systemSettings.create({
        data: {
          companyName: companyName || 'Bindu Premium',
          logoUrl: logoUrl || null,
          generatedBy: generatedBy || '',
          paymentBy: paymentBy || '',
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
