'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface ChequeRow {
  id: number
  withdrawDate: string
  status: string
  payment: {
    amount: number
    party: { name: string }
    dailyEntry: { branch: { name: string } } | null
  }
}

function daysDiff(date: string) {
  const d = new Date(date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - now.getTime()) / 86400000)
}

export default function ChequeDueWidget() {
  const [cheques, setCheques] = useState<ChequeRow[]>([])

  useEffect(() => {
    fetch('/api/cheques?status=PENDING&limit=5')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        const list: ChequeRow[] = Array.isArray(data) ? data : []
        // Sort by withdrawDate asc, take first 5
        list.sort((a, b) => new Date(a.withdrawDate).getTime() - new Date(b.withdrawDate).getTime())
        setCheques(list.slice(0, 5))
      })
  }, [])

  return (
    <div className="rounded-xl border border-[var(--border)] border-l-4 border-l-amber-500 bg-[var(--surface)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-amber-500" />
          <span className="font-semibold text-sm text-[var(--text-primary)]">Cheques Due</span>
          {cheques.length > 0 && (
            <span className="ml-1 text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">{cheques.length}</span>
          )}
        </div>
        <Link href="/admin/cheques" className="text-xs text-[var(--accent)] hover:underline">View all</Link>
      </div>
      {cheques.length === 0 ? (
        <p className="px-5 py-4 text-sm text-[var(--text-muted)]">No pending cheques</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {cheques.map(c => {
            const diff = daysDiff(c.withdrawDate)
            const isOverdue = diff < 0
            const isSoon = diff >= 0 && diff <= 3
            const dateColor = isOverdue ? 'text-[var(--danger)]' : isSoon ? 'text-amber-500' : 'text-[var(--text-muted)]'
            return (
              <li key={c.id} className="flex items-center justify-between px-5 py-3 gap-3 hover:bg-[var(--surface-raised)]/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{c.payment.party.name}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{c.payment.dailyEntry?.branch.name ?? 'Unknown branch'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono font-semibold text-[var(--text-primary)]">৳{formatCurrency(c.payment.amount)}</p>
                  <p className={`text-xs font-medium ${dateColor}`}>
                    {isOverdue ? `${Math.abs(diff)}d overdue` : diff === 0 ? 'Due today' : `Due in ${diff}d`}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
