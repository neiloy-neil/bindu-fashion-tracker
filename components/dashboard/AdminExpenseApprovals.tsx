'use client'

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PendingExpense {
  id: number
  amount: number
  note: string | null
  approvalStatus: string
  createdAt: string
  category: { name: string }
  dailyEntry: {
    id: number
    date: string
    branch: { name: string }
  }
}

export default function AdminExpenseApprovals() {
  const [expenses, setExpenses] = useState<PendingExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/expense-entries?status=PENDING')
      .then(r => r.json())
      .then(data => { if (!cancelled) setExpenses(data.expenses || []) })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleApprove = async (id: number) => {
    setActionLoadingId(id)
    const t = toast.loading('Approving expense…')
    try {
      const res = await fetch(`/api/expense-entries/${id}/approve`, { method: 'POST' })
      if (res.ok) {
        toast.success('Expense approved', { id: t })
        setExpenses(prev => prev.filter(e => e.id !== id))
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to approve', { id: t })
      }
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleReject = async (id: number) => {
    if (!rejectReason.trim()) { toast.error('Please enter a rejection reason'); return }
    setActionLoadingId(id)
    const t = toast.loading('Rejecting expense…')
    try {
      const res = await fetch(`/api/expense-entries/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      })
      if (res.ok) {
        toast.success('Expense rejected', { id: t })
        setExpenses(prev => prev.filter(e => e.id !== id))
        setRejectingId(null)
        setRejectReason('')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to reject', { id: t })
      }
    } finally {
      setActionLoadingId(null)
    }
  }

  if (loading || expenses.length === 0) return null

  return (
    <div className="mb-5 rounded-xl border border-[var(--border)] border-l-4 border-l-[var(--danger)] bg-[var(--surface)] p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
        <span className="text-lg">🧾</span>
        Pending Expense Approvals
        <span className="ml-1 rounded-full bg-[var(--danger)]/20 px-2 py-0.5 text-xs font-bold text-[var(--danger)]">
          {expenses.length}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {expenses.map(exp => (
          <div key={exp.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm animate-pop-in">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-[var(--text-primary)]">
                  {exp.dailyEntry.branch.name}
                  <span className="ml-2 text-[var(--text-muted)] font-normal">— {formatDate(exp.dailyEntry.date)}</span>
                </div>
                <div className="mt-1 text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text-primary)]">{exp.category.name}</span>
                  {exp.note && <span className="ml-2 italic text-[var(--text-muted)]">"{exp.note}"</span>}
                </div>
                <div className="mt-1 text-base font-bold font-mono text-[var(--danger)]">
                  ৳{formatCurrency(exp.amount)}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 items-end">
                <Button size="sm" disabled={actionLoadingId === exp.id} onClick={() => handleApprove(exp.id)}>
                  {actionLoadingId === exp.id ? <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : 'Approve'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[var(--danger)]/10"
                  disabled={actionLoadingId === exp.id}
                  onClick={() => { setRejectingId(exp.id); setRejectReason('') }}
                >
                  Reject
                </Button>
              </div>
            </div>

            {rejectingId === exp.id && (
              <div className="mt-3 flex gap-2">
                <Input
                  autoFocus
                  placeholder="Reason for rejection…"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="h-8 text-xs"
                  onKeyDown={e => { if (e.key === 'Enter') handleReject(exp.id) }}
                />
                <Button size="sm" variant="destructive" onClick={() => handleReject(exp.id)}>Confirm</Button>
                <Button size="sm" variant="ghost" onClick={() => setRejectingId(null)}>Cancel</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
