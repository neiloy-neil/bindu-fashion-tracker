'use client'

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface PendingPayment {
  id: number
  amount: number
  method: string
  note: string | null
  approvalStatus: string
  createdAt: string
  party: { name: string }
  dailyEntry: {
    id: number
    date: string
    branch: { name: string }
  }
}

export default function AdminPaymentApprovals() {
  const [payments, setPayments] = useState<PendingPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/payments?approvalStatus=PENDING')
      .then(r => r.json())
      .then(data => { if (!cancelled) setPayments(Array.isArray(data) ? data : []) })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleApprove = async (id: number) => {
    const res = await fetch(`/api/payments/${id}/approve`, { method: 'POST' })
    if (res.ok) {
      toast.success('Payment approved')
      setPayments(prev => prev.filter(p => p.id !== id))
    } else {
      const data = await res.json()
      toast.error(data.error || 'Failed to approve')
    }
  }

  const handleReject = async (id: number) => {
    if (!confirm('Reject this payment? The party balance will not be affected.')) return
    const res = await fetch(`/api/payments/${id}/reject`, { method: 'POST' })
    if (res.ok) {
      toast.success('Payment rejected')
      setPayments(prev => prev.filter(p => p.id !== id))
    } else {
      const data = await res.json()
      toast.error(data.error || 'Failed to reject')
    }
  }

  if (loading || payments.length === 0) return null

  return (
    <div className="mb-5 rounded-xl border border-[var(--border)] border-l-4 border-l-[var(--warning)] bg-[var(--surface)] p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
        <span className="text-lg">💳</span>
        Pending Party Payment Approvals
        <span className="ml-1 rounded-full bg-[var(--warning)]/20 px-2 py-0.5 text-xs font-bold text-[var(--warning)]">
          {payments.length}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {payments.map(p => (
          <div key={p.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-[var(--text-primary)]">
                  {p.dailyEntry.branch.name}
                  <span className="ml-2 text-[var(--text-muted)] font-normal">— {formatDate(p.dailyEntry.date)}</span>
                </div>
                <div className="mt-1 text-[var(--text-secondary)]">
                  Party: <span className="font-medium text-[var(--text-primary)]">{p.party.name}</span>
                  <span className="ml-2 rounded bg-[var(--surface)] px-1.5 py-0.5 text-xs border border-[var(--border)]">{p.method}</span>
                  {p.note && <span className="ml-2 italic text-[var(--text-muted)]">"{p.note}"</span>}
                </div>
                <div className="mt-1 text-base font-bold font-mono text-[var(--danger)]">
                  ৳{formatCurrency(p.amount)}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" onClick={() => handleApprove(p.id)}>Approve</Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[var(--danger)]/10"
                  onClick={() => handleReject(p.id)}
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
