import { prisma } from '../lib/prisma'

async function main() {
  console.log('Starting backfill of LedgerAccount.branchId...')

  const ledgerAccounts = await prisma.ledgerAccount.findMany({
    where: { type: 'BRANCH' }
  })
  
  const branches = await prisma.branch.findMany()

  let updatedCount = 0
  let failedCount = 0

  for (const account of ledgerAccounts) {
    if (account.branchId) {
      console.log(`Skipping account ${account.name} (ID: ${account.id}) - already has branchId`)
      continue
    }

    // Try to match by exact name
    let matchedBranch = branches.find(b => b.name.toLowerCase() === account.name.toLowerCase())
    
    // If not exact, maybe contains
    if (!matchedBranch) {
      matchedBranch = branches.find(b => account.name.toLowerCase().includes(b.name.toLowerCase()))
    }

    if (matchedBranch) {
      await prisma.ledgerAccount.update({
        where: { id: account.id },
        data: { branchId: matchedBranch.id }
      })
      console.log(`✅ Matched Account '${account.name}' to Branch '${matchedBranch.name}' (ID: ${matchedBranch.id})`)
      updatedCount++
    } else {
      console.error(`❌ Could not match Account '${account.name}' to any branch. Manual review required.`)
      failedCount++
    }
  }

  console.log(`\nBackfill complete. Updated: ${updatedCount}, Failed to match: ${failedCount}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
