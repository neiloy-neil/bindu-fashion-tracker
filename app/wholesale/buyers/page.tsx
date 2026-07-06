'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Plus, Search, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandSpinner } from '@/components/ui/BrandSpinner'
import NewBuyerModal from '@/components/wholesale/NewBuyerModal'
import EditBuyerModal from '@/components/wholesale/EditBuyerModal'

type Buyer = {
  id: number
  name: string
  contactPerson: string | null
  contactNumber: string | null
  email: string | null
  address: string | null
  creditLimit: number
  balance: number
  isActive: boolean
  branch: { id: number; name: string } | null
}

export default function BuyersPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [editBuyer, setEditBuyer] = useState<Buyer | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [includeInactive, setIncludeInactive] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (includeInactive) params.set('includeInactive', 'true')
      const res = await fetch(`/api/wholesale/buyers?${params}`)
      if (!res.ok) throw new Error()
      setBuyers(await res.json())
    } catch {
      toast.error('Failed to load buyers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(s => setRole(s?.user?.role || null))
  }, [])

  useEffect(() => { void load() }, [includeInactive])

  const filtered = buyers.filter(b =>
    !search ||
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.contactPerson || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.contactNumber || '').includes(search)
  )

  const canCreate = role && ['ADMIN', 'SUPER_ADMIN'].includes(role)
  const totalOutstanding = filtered.reduce((s, b) => s + b.balance, 0)

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Wholesale Buyers</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {filtered.length} buyers · Total outstanding: <span className="text-red-400 font-semibold">{formatCurrency(totalOutstanding)}</span>
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] cursor-pointer">
            <input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} className="rounded" />
            Show inactive
          </label>
          {canCreate && (
            <Button onClick={() => setShowNew(true)} size="sm" className="gap-1.5">
              <Plus size={15} /> Add Buyer
            </Button>
          )}
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search buyers..."
          className="flex h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-8 pr-3 py-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] w-full"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><BrandSpinner /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">No buyers found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-medium">Buyer</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Branch</th>
                <th className="text-right py-3 px-4 font-medium">Credit Limit</th>
                <th className="text-right py-3 px-4 font-medium">Outstanding</th>
                <th className="text-center py-3 px-4 font-medium">Status</th>
                {canCreate && <th className="py-3 px-4" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer" onClick={() => window.location.href = `/wholesale/buyers/${b.id}`}>
                  <td className="py-3 px-4">
                    <p className="font-medium text-[var(--text-primary)]">{b.name}</p>
                    {b.contactPerson && <p className="text-xs text-[var(--text-muted)]">{b.contactPerson}</p>}
                    {b.contactNumber && <p className="text-xs text-[var(--text-muted)]">{b.contactNumber}</p>}
                  </td>
                  <td className="py-3 px-4 text-[var(--text-secondary)] hidden md:table-cell">
                    {b.branch ? b.branch.name : <span className="text-[var(--text-muted)] italic">Shared</span>}
                  </td>
                  <td className="py-3 px-4 text-right text-[var(--text-secondary)]">
                    {b.creditLimit > 0 ? formatCurrency(b.creditLimit) : <span className="text-[var(--text-muted)]">—</span>}
                  </td>
                  <td className={`py-3 px-4 text-right font-semibold ${b.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {formatCurrency(b.balance)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${b.isActive ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                      {b.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canCreate && (
                    <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-[var(--text-muted)] hover:text-[var(--accent)]" onClick={() => setEditBuyer(b)}>
                        <Pencil size={13} />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <NewBuyerModal
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); void load() }}
        />
      )}
      {editBuyer && (
        <EditBuyerModal
          buyer={editBuyer}
          onClose={() => setEditBuyer(null)}
          onSaved={() => { setEditBuyer(null); void load() }}
        />
      )}
    </div>
  )
}
