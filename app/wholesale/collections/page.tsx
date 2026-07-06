'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Search } from 'lucide-react'
import { BrandSpinner } from '@/components/ui/BrandSpinner'

type Payment = {
  id: number
  amount: number
  method: string
  note: string | null
  transactionRef: string | null
  collectedAt: string
  buyer: { id: number; name: string }
  challan: { id: number; challanNumber: string } | null
}

const METHOD_COLORS: Record<string, string> = {
  CASH: 'bg-green-500/15 text-green-400',
  CHEQUE: 'bg-blue-500/15 text-blue-400',
  BKASH: 'bg-pink-500/15 text-pink-400',
  NAGAD: 'bg-orange-500/15 text-orange-400',
  BANK_TRANSFER: 'bg-purple-500/15 text-purple-400',
  UDHAR: 'bg-yellow-500/15 text-yellow-400',
}

export default function CollectionsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/wholesale/payments')
      .then(r => r.json())
      .then(setPayments)
      .catch(() => toast.error('Failed to load collections'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = payments.filter(p =>
    !search ||
    p.buyer.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.challan?.challanNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    p.method.toLowerCase().includes(search.toLowerCase()) ||
    (p.transactionRef || '').toLowerCase().includes(search.toLowerCase())
  )

  const total = filtered.reduce((s, p) => s + p.amount, 0)

  const byMethod = filtered.reduce<Record<string, number>>((acc, p) => {
    acc[p.method] = (acc[p.method] || 0) + p.amount
    return acc
  }, {})

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Collections</h1>
        <p className="text-sm text-[var(--text-muted)]">
          {filtered.length} payments · Total: <span className="text-green-400 font-semibold">{formatCurrency(total)}</span>
        </p>
      </div>

      {/* Method breakdown */}
      {Object.keys(byMethod).length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(byMethod).map(([method, amt]) => (
            <div key={method} className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg ${METHOD_COLORS[method] || 'bg-[var(--surface-raised)] text-[var(--text-muted)]'}`}>
              {method.replace('_', ' ')}: {formatCurrency(amt)}
            </div>
          ))}
        </div>
      )}

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search buyer, challan, ref..."
          className="input pl-8 w-full text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><BrandSpinner /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">No payments collected yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-medium">Date</th>
                <th className="text-left py-3 px-4 font-medium">Buyer</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Challan</th>
                <th className="text-center py-3 px-4 font-medium">Method</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Ref</th>
                <th className="text-right py-3 px-4 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                  <td className="py-3 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                    {new Date(p.collectedAt).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-3 px-4 font-medium text-[var(--text-primary)]">{p.buyer.name}</td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    {p.challan ? (
                      <a href={`/wholesale/challans/${p.challan.id}`} className="text-[var(--accent)] hover:underline font-mono text-xs">{p.challan.challanNumber}</a>
                    ) : (
                      <span className="text-[var(--text-muted)] italic text-xs">General</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${METHOD_COLORS[p.method] || 'bg-[var(--surface-raised)] text-[var(--text-muted)]'}`}>
                      {p.method.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[var(--text-muted)] text-xs hidden md:table-cell">{p.transactionRef || '—'}</td>
                  <td className="py-3 px-4 text-right font-semibold text-green-400">{formatCurrency(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
