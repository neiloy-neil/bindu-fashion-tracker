import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import IncomingTransfersClient from './IncomingTransfersClient'

export default async function IncomingTransfersPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login')
  }

  const { role, branchId } = session.user

  const whereClause: Prisma.TransferWhereInput = { status: 'PENDING' }
  if (role === 'BRANCH') {
    if (!branchId) {
      return <div className="p-6">Error: User not assigned to a branch.</div>
    }
    whereClause.account = { branchId }
  } else if (role !== 'ADMIN') {
    return <div className="p-6">Error: Unauthorized</div>
  }

  const pendingTransfers = await prisma.transfer.findMany({
    where: whereClause,
    include: {
      dailyEntry: {
        include: {
          branch: true
        }
      },
      account: {
        include: {
          branch: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Format dates manually for client components
  const transfersForClient = pendingTransfers.map(t => ({
    id: t.id,
    amount: t.amount,
    note: t.note,
    createdAt: t.createdAt.toISOString(),
    senderBranch: t.dailyEntry.branch.name,
    targetAccount: t.account.name
  }))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">Pending Incoming Transfers</h1>
      
      <IncomingTransfersClient initialTransfers={transfersForClient} />
    </div>
  )
}
