import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const branchId = parseInt(id)
    if (isNaN(branchId)) return NextResponse.json({ error: 'Invalid branch ID' }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const dateParam = searchParams.get('date')
    if (!dateParam) return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })

    const targetDate = new Date(dateParam)
    
    // Find the most recent entry for this branch strictly before the target date
    const lastEntry = await prisma.dailyEntry.findFirst({
      where: {
        branchId,
        date: {
          lt: targetDate
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    const openingBalance = lastEntry?.actualPhysicalCash || 0

    return NextResponse.json({ openingBalance })
  } catch (error: any) {
    console.error('Error fetching last balance:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
