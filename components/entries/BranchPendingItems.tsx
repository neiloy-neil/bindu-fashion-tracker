'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PendingExpense {
  id: number
  amount: number
  note: string | null
  approvalStatus: string
  rejectionReason?: string | null
  createdAt: string
  category: { name: string }
  dailyEntry: { date: string; branch: { name: string } }
}

interface EditRequest {
  id: number
  status: string
  reason: string | null
  createdAt: string
  entry: { date: string; branch: { name: string } }
}

export default function BranchPendingItems() {
  const [expenses, setExpenses] = useState<PendingExpense[]>([])
  const [editRequests, setEditRequests] = useState<EditRequest[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/expense-entries?status=PENDING').then(r => r.json()),
      fetch('/api/expense-entries?status=REJECTED').then(r => r.json()),
      fetch('/api/edit-requests').then(r => r.json()),
    ]).then(([pending, rejected, editData]) => {
      if (cancelled) return
      const allExpenses = [
        ...(pending.expenses || []),
        ...(rejected.expenses || []),
      ]
      setExpenses(allExpenses)
      setEditRequests(editData.requests || [])
      setLoaded(true)
    }).catch(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])

  if (!loaded) return null
  if (expenses.length === 0 && editRequests.length === 0) return null

  const pendingExpenses = expenses.filter(e => e.approvalStatus === 'PENDING')
  const rejectedExpenses = expenses.filter(e => e.approvalStatus === 'REJECTED')

  return (
    <div className="mb-5 space-y-3">
      {pendingExpenses.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] border-l-4 border-l-[var(--warning)] bg-[var(--surface)] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <span>🕐</span> Expenses Awaiting Admin Approval
            <span className="ml-1 rounded-full bg-[var(--warning)]/20 px-2 py-0.5 text-xs font-bold text-[var(--warning)]">
              {pendingExpenses.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {pendingExpenses.map(exp => (
              <div key={exp.id} className="flex items-center justify-between text-sm rounded-lg bg-[var(--surface-raised)] px-3 py-2 border border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text-primary)]">{exp.category.name}</span>
                  {exp.note && <span className="ml-1 italic text-[var(--text-muted)]">"{exp.note}"</span>}
                  <span className="ml-2 text-[var(--text-muted)]">— {formatDate(exp.dailyEntry.date)}</span>
                </span>
                <span className="font-mono font-bold text-[var(--warning)] tabular-nums">৳{formatCurrency(exp.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {rejectedExpenses.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] border-l-4 border-l-[var(--danger)] bg-[var(--surface)] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <span>❌</span> Rejected Expenses
            <span className="ml-1 rounded-full bg-[var(--danger)]/20 px-2 py-0.5 text-xs font-bold text-[var(--danger)]">
              {rejectedExpenses.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {rejectedExpenses.map(exp => (
              <div key={exp.id} className="text-sm rounded-lg bg-[var(--surface-raised)] px-3 py-2 border border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <span>
                    <span className="font-medium text-[var(--text-primary)]">{exp.category.name}</span>
                    <span className="ml-2 text-[var(--text-muted)]">— {formatDate(exp.dailyEntry.date)}</span>
                  </span>
                  <span className="font-mono font-bold text-[var(--danger)] tabular-nums">৳{formatCurrency(exp.amount)}</span>
                </div>
                {exp.rejectionReason && (
                  <div className="mt-1 text-xs text-[var(--danger)] italic">Reason: {exp.rejectionReason}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {editRequests.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] border-l-4 border-l-[var(--accent)] bg-[var(--surface)] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <span>✏️</span> My Edit Requests
          </div>
          <div className="flex flex-col gap-2">
            {editRequests.map(req => {
              const statusColor = req.status === 'APPROVED'
                ? 'text-[var(--success)] bg-[var(--success)]/10'
                : req.status === 'REJECTED'
                ? 'text-[var(--danger)] bg-[var(--danger)]/10'
                : 'text-[var(--warning)] bg-[var(--warning)]/10'
              return (
                <div key={req.id} className="flex items-center justify-between text-sm rounded-lg bg-[var(--surface-raised)] px-3 py-2 border border-[var(--border)]">
                  <span className="text-[var(--text-secondary)]">
                    Entry for <span className="font-medium text-[var(--text-primary)]">{formatDate(req.entry.date)}</span>
                    {req.reason && <span className="ml-1 italic text-[var(--text-muted)]">"{req.reason}"</span>}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusColor}`}>
                    {req.status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
