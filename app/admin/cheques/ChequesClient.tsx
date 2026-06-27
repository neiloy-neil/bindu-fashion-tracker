'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, Clock, Search, AlertCircle, Building2, User, Image as ImageIcon, CreditCard } from 'lucide-react'
import { ViewReceiptModal } from '@/components/entries/ViewReceiptModal'
import { BrandSpinner } from '@/components/ui/BrandSpinner'

interface Cheque {
  id: number
  issueDate: string
  withdrawDate: string
  status: string
  createdAt: string
  approvedBy?: { username: string } | null
  payment: {
    amount: number
    note: string | null
    attachmentUrl: string | null
    party: { name: string; balance: number }
    dailyEntry: { date: string; branch: { name: string } } | null
  }
}

interface PendingPayment {
  id: number
  amount: number
  method: string
  note: string | null
  attachmentUrl: string | null
  approvalStatus: string
  createdAt: string
  party: { name: string; balance: number }
  dailyEntry: { date: string; branch: { name: string } } | null
}

type Tab = 'cheques' | 'payments'
type ChequeFilter = 'PENDING' | 'APPROVED' | 'REJECTED'
type PaymentFilter = 'PENDING' | 'APPROVED' | 'REJECTED'

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function ChequesClient() {
  const [activeTab, setActiveTab] = useState<Tab>('cheques')

  // Cheques state
  const [cheques, setCheques] = useState<Cheque[]>([])
  const [chequesLoading, setChequesLoading] = useState(true)
  const [chequeFilter, setChequeFilter] = useState<ChequeFilter>('PENDING')
  const [chequeSearch, setChequeSearch] = useState('')
  const [chequeActionLoading, setChequeActionLoading] = useState<number | null>(null)

  // Party payments state
  const [payments, setPayments] = useState<PendingPayment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('PENDING')
  const [paymentSearch, setPaymentSearch] = useState('')
  const [paymentActionLoading, setPaymentActionLoading] = useState<number | null>(null)

  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setChequesLoading(true)
    fetch(`/api/cheques?status=${chequeFilter}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) { setCheques(data); setChequesLoading(false) } })
      .catch(() => { if (!cancelled) setChequesLoading(false) })
    return () => { cancelled = true }
  }, [chequeFilter])

  useEffect(() => {
    let cancelled = false
    setPaymentsLoading(true)
    fetch(`/api/payments?approvalStatus=${paymentFilter}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) { setPayments(Array.isArray(data) ? data : []); setPaymentsLoading(false) } })
      .catch(() => { if (!cancelled) setPaymentsLoading(false) })
    return () => { cancelled = true }
  }, [paymentFilter])

  const handleChequeAction = async (id: number, action: 'approve' | 'reject') => {
    if (!window.confirm(action === 'approve' ? 'Clear this cheque and decrement party balance?' : 'Reject/Bounce this cheque?')) return
    setChequeActionLoading(id)
    try {
      const res = await fetch(`/api/cheques/${id}/${action}`, { method: 'POST' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || `Failed to ${action}`) }
      toast.success(`Cheque ${action === 'approve' ? 'cleared' : 'rejected'}`)
      setCheques(prev => prev.filter(c => c.id !== id))
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, `Failed to ${action} cheque`))
    } finally {
      setChequeActionLoading(null)
    }
  }

  const handlePaymentAction = async (id: number, action: 'approve' | 'reject') => {
    if (!window.confirm(action === 'approve' ? 'Approve this party payment? Party balance will be decremented.' : 'Reject this party payment?')) return
    setPaymentActionLoading(id)
    try {
      const res = await fetch(`/api/payments/${id}/${action}`, { method: 'POST' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || `Failed to ${action}`) }
      toast.success(`Payment ${action === 'approve' ? 'approved' : 'rejected'}`)
      setPayments(prev => prev.filter(p => p.id !== id))
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, `Failed to ${action} payment`))
    } finally {
      setPaymentActionLoading(null)
    }
  }

  const filteredCheques = cheques.filter(c =>
    c.payment.party.name.toLowerCase().includes(chequeSearch.toLowerCase()) ||
    (c.payment.dailyEntry?.branch.name.toLowerCase().includes(chequeSearch.toLowerCase()) ?? false)
  )

  const filteredPayments = payments.filter(p =>
    p.party.name.toLowerCase().includes(paymentSearch.toLowerCase()) ||
    (p.dailyEntry?.branch.name.toLowerCase().includes(paymentSearch.toLowerCase()) ?? false)
  )

  const pendingPaymentsCount = payments.filter(p => p.approvalStatus === 'PENDING').length

  const filterBtn = (label: string, active: boolean, onClick: () => void, icon?: React.ReactNode) => (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'}`}>
      {icon}{label}
    </button>
  )

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Approval Centre</h1>
          <p className="text-sm text-muted-foreground mt-1">Approve cheques and party payments from branches.</p>
        </div>
      </div>

      {/* Top-level tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        <button onClick={() => setActiveTab('cheques')}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'cheques' ? 'border-[var(--accent)] text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          <CheckCircle size={15} /> Cheques
        </button>
        <button onClick={() => setActiveTab('payments')}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 relative ${activeTab === 'payments' ? 'border-[var(--accent)] text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          <CreditCard size={15} /> Party Payments
          {paymentFilter === 'PENDING' && pendingPaymentsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[var(--danger)] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{pendingPaymentsCount}</span>
          )}
        </button>
      </div>

      {/* ── CHEQUES TAB ── */}
      {activeTab === 'cheques' && (
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between gap-4 bg-muted/20">
            <div className="flex bg-muted/50 p-1 rounded-lg self-start">
              {(['PENDING', 'APPROVED', 'REJECTED'] as ChequeFilter[]).map(f => filterBtn(
                f.charAt(0) + f.slice(1).toLowerCase(), chequeFilter === f, () => setChequeFilter(f),
                f === 'PENDING' ? <Clock size={14} /> : f === 'APPROVED' ? <CheckCircle size={14} /> : <XCircle size={14} />
              ))}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input type="text" placeholder="Search party or branch..." className="form-input w-full pl-9 h-10 text-sm"
                value={chequeSearch} onChange={e => setChequeSearch(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Party & Branch</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Issue Date</th>
                  <th className="px-6 py-4">Withdraw Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {chequesLoading ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground"><BrandSpinner size={16} /> Loading…</td></tr>
                ) : filteredCheques.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <AlertCircle size={28} className="mx-auto mb-3 opacity-20" />
                    No {chequeFilter.toLowerCase()} cheques
                  </td></tr>
                ) : filteredCheques.map(c => (
                  <tr key={c.id} className="hover:bg-muted/10">
                    <td className="px-6 py-4">
                      <div className="font-semibold flex items-center gap-1.5"><User size={13} className="text-muted-foreground" />{c.payment.party.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Building2 size={12} />{c.payment.dailyEntry?.branch.name || '—'}</div>
                      {c.payment.note && <div className="text-xs text-muted-foreground italic mt-1">Note: {c.payment.note}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono font-bold">{formatCurrency(c.payment.amount)}</div>
                      {c.payment.attachmentUrl && (
                        <button onClick={() => setReceiptUrl(c.payment.attachmentUrl)} className="text-xs text-blue-500 hover:text-blue-400 mt-1 flex items-center gap-1">
                          <ImageIcon size={12} /> View Slip
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(c.issueDate)}</td>
                    <td className="px-6 py-4">
                      <div className={`font-medium ${new Date(c.withdrawDate) <= new Date() && chequeFilter === 'PENDING' ? 'text-destructive' : ''}`}>{formatDate(c.withdrawDate)}</div>
                      {new Date(c.withdrawDate) <= new Date() && chequeFilter === 'PENDING' && (
                        <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded font-bold mt-1 inline-block">Due</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {chequeFilter === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleChequeAction(c.id, 'reject')} disabled={chequeActionLoading === c.id}
                            className="btn bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs px-3 h-8">Reject</button>
                          <button onClick={() => handleChequeAction(c.id, 'approve')} disabled={chequeActionLoading === c.id}
                            className="btn btn-primary text-xs px-3 h-8">{chequeActionLoading === c.id ? <BrandSpinner size={14} /> : 'Clear'}</button>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">{chequeFilter === 'APPROVED' ? 'Cleared' : 'Rejected'} by<br /><span className="font-semibold">{c.approvedBy?.username || 'Admin'}</span></div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PARTY PAYMENTS TAB ── */}
      {activeTab === 'payments' && (
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between gap-4 bg-muted/20">
            <div className="flex bg-muted/50 p-1 rounded-lg self-start">
              {(['PENDING', 'APPROVED', 'REJECTED'] as PaymentFilter[]).map(f => filterBtn(
                f.charAt(0) + f.slice(1).toLowerCase(), paymentFilter === f, () => setPaymentFilter(f),
                f === 'PENDING' ? <Clock size={14} /> : f === 'APPROVED' ? <CheckCircle size={14} /> : <XCircle size={14} />
              ))}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input type="text" placeholder="Search party or branch..." className="form-input w-full pl-9 h-10 text-sm"
                value={paymentSearch} onChange={e => setPaymentSearch(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Party & Branch</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paymentsLoading ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground"><BrandSpinner size={16} /> Loading…</td></tr>
                ) : filteredPayments.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <AlertCircle size={28} className="mx-auto mb-3 opacity-20" />
                    No {paymentFilter.toLowerCase()} party payments
                  </td></tr>
                ) : filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-muted/10">
                    <td className="px-6 py-4">
                      <div className="font-semibold flex items-center gap-1.5"><User size={13} className="text-muted-foreground" />{p.party.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Building2 size={12} />{p.dailyEntry?.branch.name || '—'}</div>
                      {p.note && <div className="text-xs text-muted-foreground italic mt-1">Note: {p.note}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs bg-muted/50 px-2 py-1 rounded font-mono font-medium">{p.method}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono font-bold">{formatCurrency(p.amount)}</div>
                      {p.attachmentUrl && (
                        <button onClick={() => setReceiptUrl(p.attachmentUrl)} className="text-xs text-blue-500 hover:text-blue-400 mt-1 flex items-center gap-1">
                          <ImageIcon size={12} /> View Slip
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{p.dailyEntry ? formatDate(p.dailyEntry.date) : formatDate(p.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      {paymentFilter === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handlePaymentAction(p.id, 'reject')} disabled={paymentActionLoading === p.id}
                            className="btn bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs px-3 h-8">Reject</button>
                          <button onClick={() => handlePaymentAction(p.id, 'approve')} disabled={paymentActionLoading === p.id}
                            className="btn btn-primary text-xs px-3 h-8">{paymentActionLoading === p.id ? <BrandSpinner size={14} /> : 'Approve'}</button>
                        </div>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded font-bold ${paymentFilter === 'APPROVED' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {paymentFilter}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {receiptUrl && <ViewReceiptModal url={receiptUrl} onClose={() => setReceiptUrl(null)} />}
    </div>
  )
}
