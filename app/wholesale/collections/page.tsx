'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Search } from 'lucide-react'
import { BrandSpinner } from '@/components/ui/BrandSpinner'
import Link from 'next/link'

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

type Return = {
  id: number
  amount: number
  reason: string | null
  date: string
  buyer?: { id: number; name: string }
  challan: { id: number; challanNumber: string; buyer: { id: number; name: string } }
}

type Row =
  | { kind: 'payment'; date: string; data: Payment }
  | { kind: 'return'; date: string; data: Return }

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
  const [returns, setReturns] = useState<Return[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'payments' | 'returns'>('all')

  useEffect(() => {
    Promise.all([
      fetch('/api/wholesale/payments').then(r => r.json()),
      fetch('/api/wholesale/returns').then(r => r.json()),
    ])
      .then(([p, r]) => { setPayments(p); setReturns(r) })
      .catch(() => toast.error('Failed to load collections'))
      .finally(() => setLoading(false))
  }, [])

  const rows: Row[] = [
    ...payments.map(p => ({ kind: 'payment' as const, date: p.collectedAt, data: p })),
    ...returns.map(r => ({ kind: 'return' as const, date: r.date, data: r })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const filtered = rows.filter(row => {
    if (tab === 'payments' && row.kind !== 'payment') return false
    if (tab === 'returns' && row.kind !== 'return') return false
    if (!search) return true
    const q = search.toLowerCase()
    if (row.kind === 'payment') {
      const p = row.data as Payment
      return p.buyer.name.toLowerCase().includes(q) ||
        (p.challan?.challanNumber || '').toLowerCase().includes(q) ||
        p.method.toLowerCase().includes(q) ||
        (p.transactionRef || '').toLowerCase().includes(q)
    } else {
      const r = row.data as Return
      return r.challan.buyer.name.toLowerCase().includes(q) ||
        r.challan.challanNumber.toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q)
    }
  })

  const totalCollected = payments.reduce((s, p) => s + p.amount, 0)
  const totalReturned = returns.reduce((s, r) => s + r.amount, 0)
  const byMethod = payments.reduce<Record<string, number>>((acc, p) => {
    acc[p.method] = (acc[p.method] || 0) + p.amount
    return acc
  }, {})

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Collections</h1>
        <p className="text-sm text-[var(--text-muted)]">
          <span className="text-green-400 font-semibold">{formatCurrency(totalCollected)}</span> collected
          {totalReturned > 0 && <> · <span className="text-orange-400 font-semibold">−{formatCurrency(totalReturned)}</span> returned · net <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(totalCollected - totalReturned)}</span></>}
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

      {/* Tabs + search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 rounded-lg border border-[var(--border)] p-0.5 bg-[var(--surface)]">
          {(['all', 'payments', 'returns'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${tab === t ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search buyer, challan, ref..."
            className="input pl-8 w-full text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><BrandSpinner /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">No records found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-medium">Date</th>
                <th className="text-left py-3 px-4 font-medium">Buyer</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Challan</th>
                <th className="text-center py-3 px-4 font-medium">Type</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Note / Ref</th>
                <th className="text-right py-3 px-4 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => {
                if (row.kind === 'payment') {
                  const p = row.data as Payment
                  return (
                    <tr key={`p-${p.id}`} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                      <td className="py-3 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                        {new Date(p.collectedAt).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 font-medium text-[var(--text-primary)]">{p.buyer.name}</td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        {p.challan
                          ? <Link href={`/wholesale/challans/${p.challan.id}`} className="text-[var(--accent)] hover:underline font-mono text-xs">{p.challan.challanNumber}</Link>
                          : <span className="text-[var(--text-muted)] italic text-xs">General</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${METHOD_COLORS[p.method] || 'bg-[var(--surface-raised)] text-[var(--text-muted)]'}`}>
                          {p.method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-muted)] text-xs hidden md:table-cell">
                        {p.transactionRef || p.note || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-green-400">+{formatCurrency(p.amount)}</td>
                    </tr>
                  )
                } else {
                  const r = row.data as Return
                  return (
                    <tr key={`r-${r.id}`} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                      <td className="py-3 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                        {new Date(r.date).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 font-medium text-[var(--text-primary)]">{r.challan.buyer.name}</td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <Link href={`/wholesale/challans/${r.challan.id}`} className="text-[var(--accent)] hover:underline font-mono text-xs">{r.challan.challanNumber}</Link>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400">RETURN</span>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-muted)] text-xs hidden md:table-cell">{r.reason || '—'}</td>
                      <td className="py-3 px-4 text-right font-semibold text-orange-400">−{formatCurrency(r.amount)}</td>
                    </tr>
                  )
                }
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
