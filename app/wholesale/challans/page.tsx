'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Plus, Search, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandSpinner } from '@/components/ui/BrandSpinner'
import NewChallanModal from '@/components/wholesale/NewChallanModal'

type Challan = {
  id: number
  challanNumber: string
  date: string
  status: string
  netAmount: number
  remainingDue: number
  paidAtDelivery: number
  deliveryPerson: string | null
  buyer: { id: number; name: string; contactNumber: string | null }
  branch: { id: number; name: string }
  items: { id: number; description: string; amount: number }[]
  payments: { id: number; amount: number; method: string; collectedAt: string }[]
  returns: { id: number; amount: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/15 text-yellow-400',
  PARTIALLY_PAID: 'bg-blue-500/15 text-blue-400',
  PAID: 'bg-green-500/15 text-green-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PARTIALLY_PAID: 'Partial',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
}

export default function ChallansPage() {
  const [challans, setChallans] = useState<Challan[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showNew, setShowNew] = useState(false)
  const [role, setRole] = useState<string | null>(null)

  const limit = 20

  const load = async (p = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/wholesale/challans?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setChallans(data.challans)
      setTotal(data.total)
    } catch {
      toast.error('Failed to load challans')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(s => setRole(s?.user?.role || null))
  }, [])

  useEffect(() => { void load(1); setPage(1) }, [statusFilter])
  useEffect(() => { void load(page) }, [page])

  const filtered = challans.filter(c =>
    !search ||
    c.challanNumber.toLowerCase().includes(search.toLowerCase()) ||
    c.buyer.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.deliveryPerson || '').toLowerCase().includes(search.toLowerCase())
  )

  const canCreate = role && ['ADMIN', 'SUPER_ADMIN', 'BRANCH'].includes(role)
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Challans</h1>
          <p className="text-sm text-[var(--text-muted)]">{total} total</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowNew(true)} size="sm" className="gap-1.5">
            <Plus size={15} /> New Challan
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search challan, buyer, delivery..."
            className="input pl-8 w-full text-sm"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input text-sm min-w-[140px]">
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PARTIALLY_PAID">Partial</option>
          <option value="PAID">Paid</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><BrandSpinner /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">No challans found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-medium">Challan #</th>
                <th className="text-left py-3 px-4 font-medium">Date</th>
                <th className="text-left py-3 px-4 font-medium">Buyer</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Branch</th>
                <th className="text-right py-3 px-4 font-medium">Net</th>
                <th className="text-right py-3 px-4 font-medium">Due</th>
                <th className="text-center py-3 px-4 font-medium">Status</th>
                <th className="text-right py-3 px-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                  <td className="py-3 px-4 font-mono text-[13px] text-[var(--accent)]">{c.challanNumber}</td>
                  <td className="py-3 px-4 text-[var(--text-secondary)]">
                    {new Date(c.date).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-[var(--text-primary)]">{c.buyer.name}</div>
                    {c.buyer.contactNumber && <div className="text-xs text-[var(--text-muted)]">{c.buyer.contactNumber}</div>}
                  </td>
                  <td className="py-3 px-4 text-[var(--text-secondary)] hidden md:table-cell">{c.branch.name}</td>
                  <td className="py-3 px-4 text-right font-medium text-[var(--text-primary)]">
                    {formatCurrency(c.netAmount - c.returns.reduce((s, r) => s + r.amount, 0))}
                    {c.returns.length > 0 && <div className="text-[10px] text-[var(--text-muted)]">orig. {formatCurrency(c.netAmount)}</div>}
                  </td>
                  <td className={`py-3 px-4 text-right font-medium ${c.remainingDue > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {c.remainingDue > 0 ? formatCurrency(c.remainingDue) : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] || 'bg-[var(--surface-raised)] text-[var(--text-muted)]'}`}>
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link href={`/wholesale/challans/${c.id}`}>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                        <Eye size={13} /> View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {showNew && (
        <NewChallanModal
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); void load(1); setPage(1) }}
        />
      )}
    </div>
  )
}
