'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { dhakaDateString } from '@/lib/new-entry'

type ChequeRow = {
  id: number
  issueDate: string
  withdrawDate: string
  status: string
  payment: {
    amount: number
    party: { id: number; name: string }
    dailyEntry: { branch: { name: string } } | null
  }
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:  'bg-yellow-500/15 text-yellow-400',
  APPROVED: 'bg-green-500/15 text-green-400',
  REJECTED: 'bg-red-500/15 text-red-400',
}

function daysUntil(dateStr: string) {
  const today = new Date(dhakaDateString())
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export default function ChequesCalendarPage() {
  const [cheques, setCheques] = useState<ChequeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    fetch(`/api/cheques?${params}`)
      .then(r => r.json())
      .then(data => setCheques(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [statusFilter])

  // Group by withdraw date for calendar view
  const byDate = cheques.reduce<Record<string, ChequeRow[]>>((acc, c) => {
    const d = c.withdrawDate.slice(0, 10)
    if (!acc[d]) acc[d] = []
    acc[d].push(c)
    return acc
  }, {})
  const sortedDates = Object.keys(byDate).sort()

  const totalPending = cheques
    .filter(c => c.status === 'PENDING')
    .reduce((s, c) => s + c.payment.amount, 0)

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Cheque Maturity</h1>
          {statusFilter === 'PENDING' && cheques.length > 0 && (
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              {cheques.length} pending · {formatCurrency(totalPending)} total
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="">All</option>
          </select>
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden text-sm">
            {(['list', 'calendar'] as const).map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 capitalize transition-colors ${viewMode === m ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--surface-raised)]'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
          <span className="text-sm text-[var(--text-muted)]">Loading…</span>
        </div>
      ) : cheques.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">No cheques found.</div>
      ) : viewMode === 'calendar' ? (
        <div className="space-y-4">
          {sortedDates.map(date => {
            const group = byDate[date]
            const days = daysUntil(date)
            const isOverdue = days < 0
            const isToday = days === 0
            const isSoon = days > 0 && days <= 3
            return (
              <div key={date} className={`rounded-xl border bg-[var(--surface)] overflow-hidden ${isOverdue ? 'border-red-500/40' : isSoon ? 'border-yellow-500/40' : 'border-[var(--border)]'}`}>
                <div className={`px-4 py-2.5 flex items-center justify-between text-sm font-semibold ${isOverdue ? 'bg-red-500/10 text-red-400' : isToday ? 'bg-green-500/10 text-green-400' : isSoon ? 'bg-yellow-500/10 text-yellow-400' : 'bg-[var(--surface-raised)] text-[var(--text-secondary)]'}`}>
                  <span>{new Date(date).toLocaleDateString('en-BD', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  <span className="text-xs font-normal">
                    {isOverdue ? `${Math.abs(days)}d overdue` : isToday ? 'Today' : `in ${days}d`}
                    {' · '}{formatCurrency(group.reduce((s, c) => s + c.payment.amount, 0))}
                  </span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {group.map(c => (
                    <div key={c.id} className="px-4 py-3 flex items-center justify-between text-sm">
                      <div>
                        <Link href={`/parties/${c.payment.party.id}`} className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors">
                          {c.payment.party.name}
                        </Link>
                        {c.payment.dailyEntry?.branch && (
                          <span className="ml-2 text-xs text-[var(--text-muted)]">{c.payment.dailyEntry.branch.name}</span>
                        )}
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Issued {new Date(c.issueDate).toLocaleDateString('en-BD')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(c.payment.amount)}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] || ''}`}>{c.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-4 font-medium">Party</th>
                  <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Branch</th>
                  <th className="text-left py-3 px-4 font-medium">Issue Date</th>
                  <th className="text-left py-3 px-4 font-medium">Withdraw Date</th>
                  <th className="text-right py-3 px-4 font-medium">Amount</th>
                  <th className="text-center py-3 px-4 font-medium">Status</th>
                  <th className="text-right py-3 px-4 font-medium">Days</th>
                </tr>
              </thead>
              <tbody>
                {cheques.sort((a, b) => new Date(a.withdrawDate).getTime() - new Date(b.withdrawDate).getTime()).map(c => {
                  const days = daysUntil(c.withdrawDate)
                  return (
                    <tr key={c.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                      <td className="py-3 px-4">
                        <Link href={`/parties/${c.payment.party.id}`} className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors">
                          {c.payment.party.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)] hidden md:table-cell">{c.payment.dailyEntry?.branch?.name || '—'}</td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">{new Date(c.issueDate).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="py-3 px-4 font-medium text-[var(--text-primary)]">{new Date(c.withdrawDate).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="py-3 px-4 text-right font-semibold text-[var(--text-primary)]">{formatCurrency(c.payment.amount)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] || ''}`}>{c.status}</span>
                      </td>
                      <td className={`py-3 px-4 text-right text-xs font-semibold ${days < 0 ? 'text-red-400' : days === 0 ? 'text-green-400' : days <= 3 ? 'text-yellow-400' : 'text-[var(--text-muted)]'}`}>
                        {days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? 'Today' : `${days}d`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
