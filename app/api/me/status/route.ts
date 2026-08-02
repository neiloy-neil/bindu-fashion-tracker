import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Single endpoint replacing /api/transfers/pending-count + /api/branch-requests (count)
// + unread notification count — polled by the shell every 120s instead of 3 separate 60s polls
export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  const userId = parseInt(req.headers.get('x-user-id') ?? '0')
  const branchId = parseInt(req.headers.get('x-user-branch-id') ?? '0')
  const managedBranches = req.headers.get('x-user-managed-branches')

  if (!role || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [notifCount, transferCount, chequeCount, requestCount] = await Promise.all([
    // Unread notifications for this user
    prisma.notification.count({ where: { userId, isRead: false } }),

    // Pending incoming transfers (only roles that see them)
    ['ADMIN', 'SUPER_ADMIN', 'BRANCH', 'AREA_MANAGER', 'ACCOUNTS'].includes(role)
      ? prisma.transfer.count({
          where: {
            status: 'PENDING',
            ...(role === 'BRANCH' && branchId
              ? { account: { branchId } }
              : role === 'AREA_MANAGER' && managedBranches
              ? { account: { branchId: { in: managedBranches.split(',').map(Number) } } }
              : {}),
          },
        })
      : Promise.resolve(0),

    // Pending cheques (ADMIN/SUPER_ADMIN/ACCOUNTS only)
    ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTS'].includes(role)
      ? prisma.cheque.count({ where: { status: 'PENDING' } })
      : Promise.resolve(0),

    // Open branch requests (ADMIN/SUPER_ADMIN only)
    ['ADMIN', 'SUPER_ADMIN'].includes(role)
      ? prisma.branchRequest.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } })
      : Promise.resolve(0),
  ])

  return NextResponse.json(
    { notifCount, transferCount, chequeCount, requestCount, role },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
