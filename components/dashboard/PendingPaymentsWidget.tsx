'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CreditCard } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface PaymentRow {
  id: number
  amount: number
  method: string
  createdAt: string
  approvalStatus: string
  party: { name: string }
  dailyEntry: { branch: { name: string } } | null
}

export default function PendingPaymentsWidget() {
  const [payments, setPayments] = useState<PaymentRow[]>([])

  useEffect(() => {
    fetch('/api/payments?approvalStatus=PENDING&limit=5')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        const list: PaymentRow[] = Array.isArray(data) ? data : []
        setPayments(list.slice(0, 5))
      })
  }, [])

  const methodLabel: Record<string, string> = {
    CASH: 'Cash', CHEQUE: 'Cheque', BKASH: 'bKash', NAGAD: 'Nagad', BANK_TRANSFER: 'Bank',
  }

  return (
    <div className="rounded-xl border border-[var(--border)] border-l-4 border-l-[var(--danger)] bg-[var(--surface)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-[var(--danger)]" />
          <span className="font-semibold text-sm text-[var(--text-primary)]">Pending Payments</span>
          {payments.length > 0 && (
            <span className="ml-1 text-xs bg-[var(--danger)]/15 text-[var(--danger)] px-1.5 py-0.5 rounded-full font-medium">{payments.length}</span>
          )}
        </div>
        <Link href="/parties" className="text-xs text-[var(--accent)] hover:underline">View all</Link>
      </div>
      {payments.length === 0 ? (
        <p className="px-5 py-4 text-sm text-[var(--text-muted)]">No pending payments</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {payments.map(p => (
            <li key={p.id} className="flex items-center justify-between px-5 py-3 gap-3 hover:bg-[var(--surface-raised)]/50 transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{p.party.name}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {p.dailyEntry?.branch.name ?? 'Unknown'} · {methodLabel[p.method] ?? p.method}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-mono font-semibold text-[var(--danger)]">৳{formatCurrency(p.amount)}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
