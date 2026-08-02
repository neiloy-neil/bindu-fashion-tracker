'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function PartiesSummaryWidget() {
  const { data, isLoading } = useSWR('/api/dashboard/parties', fetcher, { revalidateOnFocus: false })

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 flex items-center gap-3 text-sm text-[var(--text-muted)]">
        <div className="w-4 h-4 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
        Loading party data…
      </div>
    )
  }
  if (!data) return null

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Parties & Payments</h3>
        <Link href="/parties" className="text-xs text-[var(--accent)] hover:underline">View all →</Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-b border-[var(--border)]">
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Outstanding</p>
          <p className="text-lg font-bold tabular-nums text-[var(--danger)]">৳{formatCurrency(data.totalOutstanding)}</p>
          <p className="text-[10px] text-[var(--text-muted)]">{data.withDue} parties</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Paid this month</p>
          <p className="text-lg font-bold tabular-nums text-[var(--success)]">৳{formatCurrency(data.monthPayments)}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Approved</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Pending</p>
          <p className={`text-lg font-bold tabular-nums ${data.pendingPayments > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
            {data.pendingPayments}
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">Awaiting approval</p>
        </div>
      </div>

      {/* Top debtors */}
      {data.topDebtors.length > 0 && (
        <div className="divide-y divide-[var(--border)]">
          {data.topDebtors.slice(0, 4).map((p: any, i: number) => {
            const pct = data.totalOutstanding > 0 ? (p.balance / data.totalOutstanding) * 100 : 0
            return (
              <Link key={p.id} href={`/parties/${p.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--surface-raised)] transition-colors">
                <span className="text-[10px] font-bold text-[var(--text-muted)] w-3 tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{p.name}</p>
                  <div className="mt-0.5 h-1 rounded-full bg-[var(--border)]">
                    <div className="h-1 rounded-full bg-[var(--danger)]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="text-[13px] font-semibold tabular-nums text-[var(--danger)]">৳{formatCurrency(p.balance)}</span>
              </Link>
            )
          })}
        </div>
      )}

      {/* Footer: recent payment */}
      {data.recentPayments.length > 0 && (
        <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--surface-raised)]">
          <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Last payment</p>
          {(() => {
            const p = data.recentPayments[0]
            return (
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[var(--text-secondary)]">
                  {p.party.name} · {p.method.replace('_', ' ')} · {format(new Date(p.createdAt), 'dd MMM')}
                </span>
                <span className="text-[12px] font-semibold text-[var(--success)] tabular-nums">৳{formatCurrency(p.amount)}</span>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
