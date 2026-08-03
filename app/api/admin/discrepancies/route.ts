import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getReqPerms, FORBIDDEN } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  const auth = await getReqPerms(req)
  if (!auth || !auth.perms['admin.audit']) return FORBIDDEN()
  try {

    // Use raw query to compare columns directly so pagination (LIMIT) works correctly
    const flagged = await prisma.$queryRaw<any[]>`
      SELECT d.*, b.name as "branchName", b.code as "branchCode"
      FROM "DailyEntry" d
      JOIN "Branch" b ON d."branchId" = b.id
      WHERE d."cashDifferenceNote" IS NOT NULL
         OR (d."actualPhysicalCash" IS NOT NULL AND d."expectedNetBalance" IS NOT NULL AND d."actualPhysicalCash" != d."expectedNetBalance")
      ORDER BY d."date" DESC
      LIMIT 100
    `

    // Map to match the expected frontend structure (which expects a nested branch object)
    const mapped = flagged.map(entry => ({
      ...entry,
      branch: {
        id: entry.branchId,
        name: entry.branchName,
        code: entry.branchCode
      }
    }))

    return NextResponse.json(mapped)
  } catch (error: any) {
    logger.error('Failed to load discrepancies:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
