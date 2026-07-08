import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

export default async function TransferHistoryPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const { role, branchId } = session.user

  if (!['ADMIN', 'SUPER_ADMIN', 'BRANCH', 'ACCOUNTS', 'AUDITOR', 'AREA_MANAGER'].includes(role)) {
    redirect('/')
  }

  const where: any = { status: { in: ['ACKNOWLEDGED', 'REJECTED'] } }
  if (role === 'BRANCH') {
    if (!branchId) return <div className="p-6">Error: User not assigned to a branch.</div>
    where.account = { branchId }
  }

  const transfers = await prisma.transfer.findMany({
    where,
    include: {
      dailyEntry: { include: { branch: true } },
      account: { include: { branch: true } },
      acknowledgedBy: { select: { username: true } },
    },
    orderBy: { acknowledgedAt: 'desc' },
    take: 200,
  })

  const STATUS_COLORS: Record<string, string> = {
    ACKNOWLEDGED: 'bg-green-500/15 text-green-400',
    REJECTED: 'bg-red-500/15 text-red-400',
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <Link href="/transfers/incoming" className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-2 transition-colors">
          <ArrowLeft size={14} /> Incoming Transfers
        </Link>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Transfer History</h1>
        <p className="text-sm text-[var(--text-muted)]">{transfers.length} completed transfers</p>
      </div>

      {transfers.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">No completed transfers yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-medium">Date</th>
                <th className="text-left py-3 px-4 font-medium">From</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">To Account</th>
                <th className="text-right py-3 px-4 font-medium">Amount</th>
                <th className="text-center py-3 px-4 font-medium">Status</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Actioned By</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map(t => (
                <tr key={t.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                  <td className="py-3 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                    {t.acknowledgedAt
                      ? new Date(t.acknowledgedAt).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-[var(--text-primary)]">{t.dailyEntry.branch.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(t.createdAt).toLocaleDateString('en-BD', { day: '2-digit', month: 'short' })}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-[var(--text-secondary)] hidden md:table-cell">{t.account.name}</td>
                  <td className="py-3 px-4 text-right font-semibold tabular-nums text-[var(--text-primary)]">
                    ৳{formatCurrency(t.amount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] ?? ''}`}>
                        {t.status === 'ACKNOWLEDGED' ? 'Acknowledged' : 'Rejected'}
                      </span>
                      {t.status === 'REJECTED' && t.rejectionReason && (
                        <p className="text-[10px] text-[var(--text-muted)] mt-1 max-w-[160px] truncate" title={t.rejectionReason}>
                          {t.rejectionReason}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[var(--text-secondary)] hidden md:table-cell">
                    {t.acknowledgedBy?.username ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
