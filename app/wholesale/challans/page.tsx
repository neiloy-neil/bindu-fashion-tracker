'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { dhakaDateString } from '@/lib/new-entry'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Plus, Search, Eye, X } from 'lucide-react'
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

function ChallansInner() {
  const searchParams = useSearchParams()
  const buyerIdParam = searchParams.get('buyerId')
  const [challans, setChallans] = useState<Challan[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showNew, setShowNew] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const today = dhakaDateString()
  const firstOfMonth = today.slice(0, 7) + '-01'
  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(today)

  const limit = 20

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) })
      if (statusFilter) params.set('status', statusFilter)
      if (buyerIdParam) params.set('buyerId', buyerIdParam)
      if (startDate && endDate) { params.set('startDate', startDate); params.set('endDate', endDate) }
      if (debouncedSearch) params.set('search', debouncedSearch)
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
  }, [statusFilter, startDate, endDate, buyerIdParam, debouncedSearch])

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(s => setRole(s?.user?.role || null))
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  useEffect(() => { setPage(1); void load(1) }, [load])
  useEffect(() => { void load(page) }, [page])

  const canCreate = role && ['ADMIN', 'SUPER_ADMIN', 'BRANCH'].includes(role)
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Challans</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {total} total
            {buyerIdParam && <span className="ml-2 text-[var(--accent)]">· filtered by buyer · <Link href="/wholesale/challans" className="underline hover:opacity-80">clear filter</Link></span>}
          </p>
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
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input text-sm h-9 px-2" placeholder="From" />
        <span className="text-[var(--text-muted)] self-center text-sm">—</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input text-sm h-9 px-2" placeholder="To" />
        {(startDate || endDate) && (
          <button onClick={() => { setStartDate(''); setEndDate('') }} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors" title="Clear date filter">
            <X size={14} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><BrandSpinner /></div>
      ) : challans.length === 0 ? (
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
              {challans.map(c => (
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

export default function ChallansPage() {
  return <Suspense><ChallansInner /></Suspense>
}
