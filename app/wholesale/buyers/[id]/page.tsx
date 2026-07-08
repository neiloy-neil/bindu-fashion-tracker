'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { ArrowLeft, Pencil, Download, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandSpinner } from '@/components/ui/BrandSpinner'
import Link from 'next/link'
import EditBuyerModal from '@/components/wholesale/EditBuyerModal'

type BuyerDetail = {
  id: number
  name: string
  contactPerson: string | null
  contactNumber: string | null
  secondaryNumber: string | null
  email: string | null
  address: string | null
  creditLimit: number
  balance: number
  isActive: boolean
  branch: { id: number; name: string } | null
  challans: { id: number; challanNumber: string; date: string; netAmount: number; remainingDue: number; status: string; returns: { id: number; amount: number; date: string; reason: string | null }[] }[]
  payments: { id: number; amount: number; method: string; collectedAt: string; challanId: number | null }[]
}

const cardCls = "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/15 text-yellow-400',
  PARTIALLY_PAID: 'bg-blue-500/15 text-blue-400',
  PAID: 'bg-green-500/15 text-green-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
}

export default function BuyerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [buyer, setBuyer] = useState<BuyerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [branchId, setBranchId] = useState<number | null>(null)
  const [showBulkPay, setShowBulkPay] = useState(false)
  const [bulkAmount, setBulkAmount] = useState('')
  const [bulkMethod, setBulkMethod] = useState('CASH')
  const [bulkNote, setBulkNote] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)

  const load = () => {
    fetch(`/api/wholesale/buyers/${id}`)
      .then(r => r.json())
      .then(setBuyer)
      .catch(() => toast.error('Failed to load buyer'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    fetch('/api/auth/session').then(r => r.json()).then(s => {
      setRole(s?.user?.role || null)
      setBranchId(s?.user?.branchId ?? null)
    })
  }, [id])

  if (loading) return <div className="flex justify-center py-20"><BrandSpinner /></div>
  if (!buyer) return <div className="p-6 text-center text-[var(--text-muted)]">Buyer not found.</div>

  const canEdit = role && ['ADMIN', 'SUPER_ADMIN'].includes(role)
  const canRecord = role && ['ADMIN', 'SUPER_ADMIN', 'BRANCH', 'ACCOUNTS'].includes(role)

  const pendingChallans = buyer.challans.filter(c => c.status === 'PENDING' || c.status === 'PARTIALLY_PAID')

  const handleBulkPay = async () => {
    const amount = parseFloat(bulkAmount)
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return }
    setBulkSaving(true)
    try {
      const res = await fetch('/api/wholesale/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerId: buyer.id,
          branchId: buyer.branch?.id ?? branchId,
          method: bulkMethod,
          amount,
          note: bulkNote || `Bulk payment — ${pendingChallans.length} challan(s)`,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success('Bulk payment recorded')
      setShowBulkPay(false)
      setBulkAmount('')
      setBulkNote('')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBulkSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-2 transition-colors">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">{buyer.name}</h1>
            <p className="text-sm text-[var(--text-muted)]">
              {buyer.branch ? buyer.branch.name : 'Shared buyer'}
              {!buyer.isActive && <span className="ml-2 text-red-400">· Inactive</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowEdit(true)}>
                <Pencil size={13} /> Edit
              </Button>
            )}
            {canRecord && pendingChallans.length > 0 && (
              <Button size="sm" className="gap-1.5" onClick={() => { setBulkAmount(String(buyer.balance)); setShowBulkPay(true) }}>
                <CreditCard size={13} /> Bulk Payment
              </Button>
            )}
            <Link href={`/wholesale/challans?buyerId=${buyer.id}`}>
              <Button variant="outline" size="sm">View All Challans</Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={async () => {
                const { exportWholesaleBuyerLedgerPdf } = await import('@/lib/report-pdf')
                // Build a unified ledger sorted by date
                type E = { kind: 'challan' | 'payment' | 'return'; date: string; ref: string; details: string; debit: number; credit: number; balance: number }
                const rows: E[] = []
                let running = 0
                const events: { date: string; kind: E['kind']; ref: string; details: string; debit: number; credit: number }[] = [
                  ...buyer.challans.map(c => ({
                    date: c.date, kind: 'challan' as const, ref: c.challanNumber,
                    details: `Net ৳${c.netAmount.toLocaleString()} · ${c.status.replace('_', ' ')}`,
                    debit: c.netAmount, credit: 0,
                  })),
                  ...buyer.payments.map(p => ({
                    date: p.collectedAt, kind: 'payment' as const,
                    ref: p.challanId ? `Challan #${p.challanId}` : 'General',
                    details: p.method.replace('_', ' '), debit: 0, credit: p.amount,
                  })),
                  ...buyer.challans.flatMap(c => c.returns.map(r => ({
                    date: r.date, kind: 'return' as const, ref: c.challanNumber,
                    details: r.reason || 'Return', debit: 0, credit: r.amount,
                  }))),
                ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

                for (const ev of events) {
                  running += ev.debit - ev.credit
                  rows.push({ ...ev, balance: running })
                }
                await exportWholesaleBuyerLedgerPdf(buyer.name, buyer.balance, rows)
              }}
            >
              <Download size={13} /> Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className={`${cardCls} text-center`}>
          <p className="text-xs text-[var(--text-muted)] mb-1">Outstanding Balance</p>
          <p className={`text-lg font-bold tabular-nums ${buyer.balance > 0 ? 'text-orange-400' : 'text-[var(--success)]'}`}>
            ৳{formatCurrency(buyer.balance)}
          </p>
        </div>
        <div className={`${cardCls} text-center`}>
          <p className="text-xs text-[var(--text-muted)] mb-1">Credit Limit</p>
          <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
            {buyer.creditLimit > 0 ? `৳${formatCurrency(buyer.creditLimit)}` : 'No limit'}
          </p>
        </div>
        <div className={`${cardCls} text-center col-span-2 md:col-span-1`}>
          <p className="text-xs text-[var(--text-muted)] mb-1">Total Challans</p>
          <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">{buyer.challans.length}</p>
        </div>
      </div>

      {/* Contact info */}
      <div className={`${cardCls} grid md:grid-cols-2 gap-3 text-sm`}>
        {buyer.contactPerson && <div><p className="text-xs text-[var(--text-muted)] mb-0.5">Contact Person</p><p className="text-[var(--text-primary)]">{buyer.contactPerson}</p></div>}
        {buyer.contactNumber && <div><p className="text-xs text-[var(--text-muted)] mb-0.5">Phone</p><p className="text-[var(--text-primary)]">{buyer.contactNumber}</p></div>}
        {buyer.secondaryNumber && <div><p className="text-xs text-[var(--text-muted)] mb-0.5">Secondary Phone</p><p className="text-[var(--text-primary)]">{buyer.secondaryNumber}</p></div>}
        {buyer.email && <div><p className="text-xs text-[var(--text-muted)] mb-0.5">Email</p><p className="text-[var(--text-primary)]">{buyer.email}</p></div>}
        {buyer.address && <div className="md:col-span-2"><p className="text-xs text-[var(--text-muted)] mb-0.5">Address</p><p className="text-[var(--text-primary)]">{buyer.address}</p></div>}
      </div>

      {/* Recent challans */}
      <div className={cardCls}>
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3 font-medium">Recent Challans</p>
        {buyer.challans.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] italic">No challans yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs">
                  <th className="text-left py-2 pr-4 font-medium">Challan</th>
                  <th className="text-left py-2 px-2 font-medium">Date</th>
                  <th className="text-right py-2 px-2 font-medium">Amount</th>
                  <th className="text-right py-2 px-2 font-medium">Due</th>
                  <th className="text-center py-2 pl-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {buyer.challans.map(c => (
                  <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-raised)] transition-colors">
                    <td className="py-2 pr-4">
                      <Link href={`/wholesale/challans/${c.id}`} className="text-[var(--accent)] hover:underline font-mono text-xs">{c.challanNumber}</Link>
                    </td>
                    <td className="py-2 px-2 text-[var(--text-secondary)]">{new Date(c.date).toLocaleDateString('en-BD', { day: '2-digit', month: 'short' })}</td>
                    <td className="py-2 px-2 text-right tabular-nums">৳{formatCurrency(c.netAmount)}</td>
                    <td className={`py-2 px-2 text-right tabular-nums ${c.remainingDue > 0 ? 'text-orange-400' : 'text-[var(--success)]'}`}>
                      {c.remainingDue > 0 ? `৳${formatCurrency(c.remainingDue)}` : '—'}
                    </td>
                    <td className="py-2 pl-2 text-center">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[c.status]}`}>{c.status.replace('_', ' ')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent payments */}
      {buyer.payments.length > 0 && (
        <div className={cardCls}>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3 font-medium">Recent Payments</p>
          <div className="space-y-2">
            {buyer.payments.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm py-1 border-b border-[var(--border)] last:border-0">
                <div>
                  <span className="font-medium text-[var(--text-primary)]">{p.method.replace('_', ' ')}</span>
                  {p.challanId && <span className="text-xs text-[var(--text-muted)] ml-2">Challan #{p.challanId}</span>}
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums text-[var(--success)]">৳{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-[var(--text-muted)]">{new Date(p.collectedAt).toLocaleDateString('en-BD')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Returns — flattened from challans */}
      {(() => {
        const allReturns = buyer.challans.flatMap(c => c.returns.map(r => ({ ...r, challan: c })))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        if (allReturns.length === 0) return null
        return (
          <div className={cardCls}>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3 font-medium">Returns</p>
            <div className="space-y-2">
              {allReturns.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm py-1 border-b border-[var(--border)] last:border-0">
                  <div>
                    <Link href={`/wholesale/challans/${r.challan.id}`} className="font-mono text-xs text-[var(--accent)] hover:underline">{r.challan.challanNumber}</Link>
                    {r.reason && <span className="text-xs text-[var(--text-muted)] ml-2">— {r.reason}</span>}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums text-orange-400">−৳{formatCurrency(r.amount)}</p>
                    <p className="text-xs text-[var(--text-muted)]">{new Date(r.date).toLocaleDateString('en-BD')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {showEdit && buyer && (
        <EditBuyerModal
          buyer={buyer}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load() }}
        />
      )}

      {showBulkPay && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] w-full max-w-sm rounded-xl border border-[var(--border)] shadow-xl p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">Bulk Payment — {buyer.name}</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {pendingChallans.length} outstanding challan{pendingChallans.length !== 1 ? 's' : ''} · total due: {formatCurrency(buyer.balance)}
              </p>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1">Amount (৳)</label>
              <input
                type="number" min="0" value={bulkAmount} onChange={e => setBulkAmount(e.target.value)}
                className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1">Method</label>
              <select value={bulkMethod} onChange={e => setBulkMethod(e.target.value)} className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
                {['CASH', 'BANK_TRANSFER', 'CHEQUE', 'MOBILE_BANKING', 'OTHER'].map(m => (
                  <option key={m} value={m}>{m.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1">Note (optional)</label>
              <input
                value={bulkNote} onChange={e => setBulkNote(e.target.value)}
                placeholder="Reference, transaction ID…"
                className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowBulkPay(false)} disabled={bulkSaving}>Cancel</Button>
              <Button size="sm" onClick={handleBulkPay} disabled={bulkSaving} className="gap-1.5">
                <CreditCard size={13} /> {bulkSaving ? 'Saving…' : 'Record Payment'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
