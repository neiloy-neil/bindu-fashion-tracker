'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { AlertCircle, TrendingUp, TrendingDown, Users, Clock } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function KpiCard({ label, value, sub, accent, icon }: { label: string; value: string; sub?: string; accent: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[var(--surface)] p-4 flex flex-col gap-1" style={{ borderTop: `3px solid ${accent}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
        <span className="text-[var(--text-muted)] opacity-60">{icon}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">{value}</p>
      {sub && <p className="text-[11px] text-[var(--text-muted)]">{sub}</p>}
    </div>
  )
}

export function PartiesDashboard() {
  const { data, isLoading } = useSWR('/api/dashboard/parties', fetcher, { revalidateOnFocus: false })

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-6 px-6 text-sm text-[var(--text-muted)]">
        <div className="w-4 h-4 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
        Loading party overview…
      </div>
    )
  }
  if (!data) return null

  const netFlow = (data.monthPayments ?? 0) - (data.monthPurchases ?? 0)

  return (
    <div className="p-6 space-y-5 border-b border-[var(--border)]">

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="Total Parties"
          value={String(data.totalParties)}
          sub={`${data.activeParties} active`}
          accent="var(--accent)"
          icon={<Users size={15} />}
        />
        <KpiCard
          label="Total Outstanding"
          value={`৳${formatCurrency(data.totalOutstanding)}`}
          sub={`${data.withDue} parties with due`}
          accent="var(--danger)"
          icon={<AlertCircle size={15} />}
        />
        <KpiCard
          label="Cleared Parties"
          value={String(data.clearedParties)}
          sub="Balance = 0"
          accent="var(--success)"
          icon={<Users size={15} />}
        />
        <KpiCard
          label="This Month Purchases"
          value={`৳${formatCurrency(data.monthPurchases)}`}
          sub="Added to dues"
          accent="var(--warning)"
          icon={<TrendingUp size={15} />}
        />
        <KpiCard
          label="This Month Payments"
          value={`৳${formatCurrency(data.monthPayments)}`}
          sub="Approved payments"
          accent="var(--success)"
          icon={<TrendingDown size={15} />}
        />
        <KpiCard
          label="Pending Approvals"
          value={String(data.pendingPayments)}
          sub={data.pendingPayments > 0 ? 'Awaiting approval' : 'All clear'}
          accent={data.pendingPayments > 0 ? 'var(--warning)' : 'var(--success)'}
          icon={<Clock size={15} />}
        />
      </div>

      {/* Net flow badge */}
      {(data.monthPurchases > 0 || data.monthPayments > 0) && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">This month net:</span>
          <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${netFlow >= 0 ? 'bg-[var(--danger-subtle)] text-[var(--danger)]' : 'bg-[var(--success-subtle)] text-[var(--success)]'}`}>
            {netFlow >= 0 ? `+৳${formatCurrency(netFlow)} added to dues` : `-৳${formatCurrency(Math.abs(netFlow))} reduced`}
          </span>
        </div>
      )}

      {/* Two-col: top debtors + recent payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top debtors */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Top Outstanding</h3>
            <Link href="/parties?filter=HAS_DUE" className="text-xs text-[var(--accent)] hover:underline">View all →</Link>
          </div>
          {data.topDebtors.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] px-4 py-6 text-center">No outstanding balances</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {data.topDebtors.map((p: any, i: number) => {
                const pct = data.totalOutstanding > 0 ? (p.balance / data.totalOutstanding) * 100 : 0
                return (
                  <Link key={p.id} href={`/parties/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-raised)] transition-colors">
                    <span className="text-[11px] font-bold text-[var(--text-muted)] w-4 tabular-nums">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{p.name}</p>
                      <div className="mt-1 h-1 rounded-full bg-[var(--border)]">
                        <div className="h-1 rounded-full bg-[var(--danger)]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-[var(--danger)] flex-shrink-0">৳{formatCurrency(p.balance)}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent payments */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Payments</h3>
            <Link href="/admin/payments" className="text-xs text-[var(--accent)] hover:underline">View all →</Link>
          </div>
          {data.recentPayments.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] px-4 py-6 text-center">No approved payments yet</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {data.recentPayments.map((pay: any) => (
                <Link key={pay.id} href={`/parties/${pay.party.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-raised)] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{pay.party.name}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {pay.method.replace('_', ' ')}
                      {pay.dailyEntry?.branch?.name ? ` · ${pay.dailyEntry.branch.name}` : ''}
                      {' · '}{format(new Date(pay.createdAt), 'dd MMM')}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-[var(--success)] flex-shrink-0">৳{formatCurrency(pay.amount)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment method breakdown */}
      {data.methodBreakdown?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-[11px] text-[var(--text-muted)] self-center">This month by method:</span>
          {data.methodBreakdown.map((m: any) => (
            <span key={m.method} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--surface-raised)] text-[var(--text-secondary)]">
              {m.method.replace('_', ' ')}: ৳{formatCurrency(m.amount)} ({m.count})
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
