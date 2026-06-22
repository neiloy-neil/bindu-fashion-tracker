import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year')

  if (!year) {
    return NextResponse.json({ error: 'year is required' }, { status: 400 })
  }

  try {
    const logs = await prisma.salaryUploadLog.findMany({
      where: {
        year: parseInt(year),
      },
      orderBy: { month: 'asc' }
    })
    return NextResponse.json(logs)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
