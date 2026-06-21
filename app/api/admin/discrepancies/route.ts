import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get('x-user-role')
    if (role !== 'ADMIN' && role !== 'AUDITOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch discrepancies: where actualPhysicalCash != expectedNetBalance OR cashDifferenceNote is not null
    const discrepancies = await prisma.dailyEntry.findMany({
      where: {
        OR: [
          { cashDifferenceNote: { not: null } },
          { 
            AND: [
              { actualPhysicalCash: { not: null } },
              { expectedNetBalance: { not: null } },
              // Prisma doesn't directly support comparing two columns in `where` easily without raw queries,
              // but we can fetch them all and filter, or use Prisma's field comparison if enabled.
              // Since we just added expectedNetBalance, we'll fetch entries that have cashDifferenceNote 
              // or we'll compute the difference in JS for now.
            ]
          }
        ]
      },
      include: {
        branch: true
      },
      orderBy: {
        date: 'desc'
      },
      take: 100
    })

    // Filter in memory for column comparison since raw query is complex with relations
    const flagged = discrepancies.filter(entry => 
      entry.cashDifferenceNote || 
      (entry.actualPhysicalCash !== null && entry.expectedNetBalance !== null && entry.actualPhysicalCash !== entry.expectedNetBalance)
    )

    return NextResponse.json(flagged)
  } catch (error: any) {
    console.error('Failed to load discrepancies:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
