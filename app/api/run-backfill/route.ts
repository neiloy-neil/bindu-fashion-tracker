import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  console.log('Starting backfill of LedgerAccount.branchId...')

  const ledgerAccounts = await prisma.ledgerAccount.findMany({
    where: { type: 'BRANCH' }
  })
  
  const branches = await prisma.branch.findMany()

  let updatedCount = 0
  let failedCount = 0
  const logs: string[] = []

  for (const account of ledgerAccounts) {
    if (account.branchId) {
      logs.push(`Skipping account ${account.name} (ID: ${account.id}) - already has branchId`)
      continue
    }

    // Try to match by exact name
    let matchedBranch = branches.find(b => b.name.toLowerCase() === account.name.toLowerCase())
    
    // If not exact, maybe contains
    if (!matchedBranch) {
      matchedBranch = branches.find(b => account.name.toLowerCase().includes(b.name.toLowerCase()) || b.name.toLowerCase().includes(account.name.toLowerCase()))
    }

    if (matchedBranch) {
      await prisma.ledgerAccount.update({
        where: { id: account.id },
        data: { branchId: matchedBranch.id }
      })
      logs.push(`✅ Matched Account '${account.name}' to Branch '${matchedBranch.name}' (ID: ${matchedBranch.id})`)
      updatedCount++
    } else {
      logs.push(`❌ Could not match Account '${account.name}' to any branch. Manual review required.`)
      failedCount++
    }
  }

  logs.push(`\nBackfill complete. Updated: ${updatedCount}, Failed to match: ${failedCount}`)
  
  return NextResponse.json({ success: true, updatedCount, failedCount, logs })
}
