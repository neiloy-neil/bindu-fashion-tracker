'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { ArrowLeft, Printer, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandSpinner } from '@/components/ui/BrandSpinner'
import RecordPaymentModal from '@/components/wholesale/RecordPaymentModal'
import RecordReturnModal from '@/components/wholesale/RecordReturnModal'

const cardCls = "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/15 text-yellow-400',
  PARTIALLY_PAID: 'bg-blue-500/15 text-blue-400',
  PAID: 'bg-green-500/15 text-green-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
}

type ChallanDetail = {
  id: number
  challanNumber: string
  date: string
  status: string
  totalAmount: number
  discount: number
  netAmount: number
  paidAtDelivery: number
  remainingDue: number
  deliveryPerson: string | null
  notes: string | null
  attachmentUrl: string | null
  createdById: number
  buyer: {
    id: number; name: string; contactPerson: string | null; contactNumber: string | null
    address: string | null; balance: number
  }
  branch: { id: number; name: string; address: string | null }
  items: { id: number; description: string; quantity: number | null; unitPrice: number | null; amount: number; note: string | null }[]
  payments: { id: number; amount: number; method: string; note: string | null; collectedAt: string; transactionRef: string | null }[]
  returns: { id: number; amount: number; reason: string | null; date: string }[]
}

export default function ChallanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [challan, setChallan] = useState<ChallanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPayment, setShowPayment] = useState(false)
  const [showReturn, setShowReturn] = useState(false)
  const [role, setRole] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch(`/api/wholesale/challans/${id}`)
      if (!res.ok) throw new Error()
      setChallan(await res.json())
    } catch {
      toast.error('Failed to load challan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    fetch('/api/auth/session').then(r => r.json()).then(s => setRole(s?.user?.role || null))
  }, [id])

  if (loading) return <div className="flex justify-center py-20"><BrandSpinner /></div>
  if (!challan) return <div className="p-6 text-center text-[var(--text-muted)]">Challan not found.</div>

  const canRecord = role && ['ADMIN', 'SUPER_ADMIN', 'BRANCH', 'ACCOUNTS'].includes(role)
  const totalPaid = challan.payments.reduce((s, p) => s + p.amount, 0)
  const totalReturns = challan.returns.reduce((s, r) => s + r.amount, 0)

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-2 transition-colors">
            <ArrowLeft size={14} /> Back
          </button>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">{challan.challanNumber}</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {new Date(challan.date).toLocaleDateString('en-BD', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            {challan.deliveryPerson && ` · Delivery: ${challan.deliveryPerson}`}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[challan.status]}`}>
            {challan.status.replace('_', ' ')}
          </span>
          {canRecord && challan.status !== 'CANCELLED' && challan.status !== 'PAID' && (
            <Button variant="outline" size="sm" className="gap-1.5 text-orange-400 border-orange-400/30 hover:bg-orange-500/10" onClick={() => setShowReturn(true)}>
              <RotateCcw size={14} /> Return
            </Button>
          )}
          {canRecord && challan.status !== 'PAID' && challan.status !== 'CANCELLED' && (
            <Button size="sm" className="gap-1.5" onClick={() => setShowPayment(true)}>
              <Plus size={14} /> Record Payment
            </Button>
          )}
          <Button
            variant="outline" size="sm" className="gap-1.5"
            onClick={() => window.open(`/wholesale/challans/${challan.id}/print`, '_blank')}
          >
            <Printer size={14} /> Print
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Net Amount', value: formatCurrency(challan.netAmount), sub: challan.discount > 0 ? `Disc: ${formatCurrency(challan.discount)}` : null },
          { label: 'Paid at Delivery', value: formatCurrency(challan.paidAtDelivery), sub: null },
          { label: 'Total Collected', value: formatCurrency(totalPaid), sub: totalReturns > 0 ? `Returns: ${formatCurrency(totalReturns)}` : null },
          { label: 'Remaining Due', value: formatCurrency(challan.remainingDue), sub: null, highlight: challan.remainingDue > 0 },
        ].map(card => (
          <div key={card.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-center">
            <p className="text-xs text-[var(--text-muted)] mb-1">{card.label}</p>
            <p className={`text-lg font-semibold ${card.highlight ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>{card.value}</p>
            {card.sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Buyer & Branch */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className={cardCls}>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Buyer</p>
          <p className="font-medium text-[var(--text-primary)]">{challan.buyer.name}</p>
          {challan.buyer.contactPerson && <p className="text-sm text-[var(--text-secondary)]">{challan.buyer.contactPerson}</p>}
          {challan.buyer.contactNumber && <p className="text-sm text-[var(--text-muted)]">{challan.buyer.contactNumber}</p>}
          {challan.buyer.address && <p className="text-xs text-[var(--text-muted)] mt-1">{challan.buyer.address}</p>}
          <p className="text-xs text-[var(--text-muted)] mt-2">Outstanding balance: <span className="font-semibold text-[var(--text-secondary)]">{formatCurrency(challan.buyer.balance)}</span></p>
        </div>
        <div className={cardCls}>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Branch</p>
          <p className="font-medium text-[var(--text-primary)]">{challan.branch.name}</p>
          {challan.branch.address && <p className="text-sm text-[var(--text-muted)]">{challan.branch.address}</p>}
          {challan.notes && <p className="text-xs text-[var(--text-muted)] mt-2 italic">{challan.notes}</p>}
        </div>
      </div>

      {/* Items */}
      <div className={cardCls}>
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">Items</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs">
                <th className="text-left py-2 pr-4 font-medium">Description</th>
                <th className="text-right py-2 px-2 font-medium hidden sm:table-cell">Qty</th>
                <th className="text-right py-2 px-2 font-medium hidden sm:table-cell">Unit Price</th>
                <th className="text-right py-2 pl-4 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {challan.items.map(item => (
                <tr key={item.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 pr-4">
                    <p className="text-[var(--text-primary)]">{item.description}</p>
                    {item.note && <p className="text-xs text-[var(--text-muted)]">{item.note}</p>}
                  </td>
                  <td className="py-2 px-2 text-right text-[var(--text-secondary)] hidden sm:table-cell">{item.quantity ?? '—'}</td>
                  <td className="py-2 px-2 text-right text-[var(--text-secondary)] hidden sm:table-cell">{item.unitPrice ? formatCurrency(item.unitPrice) : '—'}</td>
                  <td className="py-2 pl-4 text-right font-medium text-[var(--text-primary)]">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {challan.discount > 0 && (
                <tr>
                  <td colSpan={3} className="pt-2 pr-4 text-right text-sm text-[var(--text-muted)]">Discount</td>
                  <td className="pt-2 pl-4 text-right text-sm text-[var(--text-muted)]">−{formatCurrency(challan.discount)}</td>
                </tr>
              )}
              <tr>
                <td colSpan={3} className="pt-2 pr-4 text-right text-sm font-semibold text-[var(--text-primary)]">Net Total</td>
                <td className="pt-2 pl-4 text-right text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(challan.netAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payments */}
      {challan.payments.length > 0 && (
        <div className={cardCls}>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">Payments Collected</p>
          <div className="space-y-2">
            {challan.payments.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-[var(--text-primary)]">{p.method.replace('_', ' ')}</span>
                  {p.note && <span className="text-[var(--text-muted)] ml-2 text-xs">— {p.note}</span>}
                  {p.transactionRef && <span className="text-[var(--text-muted)] ml-2 text-xs">({p.transactionRef})</span>}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-400">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-[var(--text-muted)]">{new Date(p.collectedAt).toLocaleDateString('en-BD')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Returns */}
      {(challan.returns.length > 0 || (canRecord && challan.status !== 'CANCELLED' && challan.status !== 'PAID')) && (
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
              Returns {challan.returns.length > 0 && <span className="ml-1 text-orange-400">({challan.returns.length})</span>}
            </p>
            {canRecord && challan.status !== 'CANCELLED' && challan.status !== 'PAID' && (
              <button onClick={() => setShowReturn(true)} className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors">
                <RotateCcw size={11} /> Record return
              </button>
            )}
          </div>
          {challan.returns.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] italic">No returns recorded.</p>
          ) : (
            <div className="space-y-2">
              {challan.returns.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm py-1 border-b border-[var(--border)] last:border-0">
                  <div>
                    <span className="font-medium text-[var(--text-primary)]">Return</span>
                    {r.reason && <span className="text-[var(--text-muted)] ml-2 text-xs">— {r.reason}</span>}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-orange-400">−{formatCurrency(r.amount)}</p>
                    <p className="text-xs text-[var(--text-muted)]">{new Date(r.date).toLocaleDateString('en-BD')}</p>
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-xs pt-1 text-[var(--text-muted)]">
                <span>Total returned</span>
                <span className="font-semibold text-orange-400">{formatCurrency(totalReturns)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {showPayment && (
        <RecordPaymentModal
          challan={{ id: challan.id, challanNumber: challan.challanNumber, buyerId: challan.buyer.id, branchId: challan.branch.id, remainingDue: challan.remainingDue }}
          onClose={() => setShowPayment(false)}
          onSaved={() => { setShowPayment(false); void load() }}
        />
      )}
      {showReturn && (
        <RecordReturnModal
          challan={{ id: challan.id, challanNumber: challan.challanNumber, buyerId: challan.buyer.id, branchId: challan.branch.id, netAmount: challan.netAmount, remainingDue: challan.remainingDue }}
          onClose={() => setShowReturn(false)}
          onSaved={() => { setShowReturn(false); void load() }}
        />
      )}
    </div>
  )
}
