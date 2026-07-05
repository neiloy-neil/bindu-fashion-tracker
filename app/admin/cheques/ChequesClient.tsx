'use client'

import { useState, useEffect, Fragment } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, Clock, Search, AlertCircle, Building2, User, Image as ImageIcon, CreditCard } from 'lucide-react'
import { ViewReceiptModal } from '@/components/entries/ViewReceiptModal'
import { BrandSpinner } from '@/components/ui/BrandSpinner'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

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
    <>
      <div className="sticky top-0 z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Approval Centre</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Approve cheques and party payments from branches.</p>
        </div>
      </div>
      <div className="flex-1 p-6 space-y-6 min-h-0 flex flex-col overflow-auto">

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
              {(['PENDING', 'APPROVED', 'REJECTED'] as ChequeFilter[]).map(f => (
                <Fragment key={f}>
                  {filterBtn(
                    f.charAt(0) + f.slice(1).toLowerCase(), chequeFilter === f, () => setChequeFilter(f),
                    f === 'PENDING' ? <Clock size={14} /> : f === 'APPROVED' ? <CheckCircle size={14} /> : <XCircle size={14} />
                  )}
                </Fragment>
              ))}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input type="text" placeholder="Search party or branch..." className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50 pl-9"
                value={chequeSearch} onChange={e => setChequeSearch(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto min-h-[300px]">
            <Table>
              <TableHeader className="bg-[var(--surface-raised)] border-b border-[var(--border)]">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Party & Branch</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Amount</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Issue Date</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Withdraw Date</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chequesLoading ? (
                  <TableRow><TableCell colSpan={5} className="py-12 text-center text-[var(--text-muted)]"><BrandSpinner size={16} /> Loading…</TableCell></TableRow>
                ) : filteredCheques.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-12 text-center text-[var(--text-muted)]">
                    <AlertCircle size={28} className="mx-auto mb-3 opacity-20" />
                    No {chequeFilter.toLowerCase()} cheques
                  </TableCell></TableRow>
                ) : filteredCheques.map(c => (
                  <TableRow key={c.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                    <TableCell>
                      <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5"><User size={13} className="text-[var(--text-muted)]" />{c.payment.party.name}</div>
                      <div className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-1"><Building2 size={12} />{c.payment.dailyEntry?.branch.name || '—'}</div>
                      {c.payment.note && <div className="text-xs text-[var(--text-muted)] italic mt-1">Note: {c.payment.note}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="font-mono font-bold text-[var(--text-primary)]">{formatCurrency(c.payment.amount)}</div>
                      {c.payment.attachmentUrl && (
                        <button onClick={() => setReceiptUrl(c.payment.attachmentUrl)} className="text-xs text-[var(--info)] hover:text-[var(--info-hover)] mt-1 flex items-center gap-1">
                          <ImageIcon size={12} /> View Slip
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)]">{formatDate(c.issueDate)}</TableCell>
                    <TableCell>
                      <div className={`font-medium ${new Date(c.withdrawDate) <= new Date() && chequeFilter === 'PENDING' ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>{formatDate(c.withdrawDate)}</div>
                      {new Date(c.withdrawDate) <= new Date() && chequeFilter === 'PENDING' && (
                        <span className="text-[10px] bg-[var(--danger-subtle)]/20 text-[var(--danger)] px-1.5 py-0.5 rounded font-bold mt-1 inline-block">Due</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {chequeFilter === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" onClick={() => handleChequeAction(c.id, 'reject')} disabled={chequeActionLoading === c.id}
                            className="bg-[var(--danger-subtle)]/30 text-[var(--danger)] hover:bg-[var(--danger-subtle)]/50 text-xs px-3 h-8">Reject</Button>
                          <Button onClick={() => handleChequeAction(c.id, 'approve')} disabled={chequeActionLoading === c.id}
                            className="text-xs px-3 h-8">{chequeActionLoading === c.id ? <BrandSpinner size={14} /> : 'Clear'}</Button>
                        </div>
                      ) : (
                        <div className="text-xs text-[var(--text-muted)]">{chequeFilter === 'APPROVED' ? 'Cleared' : 'Rejected'} by<br /><span className="font-semibold text-[var(--text-primary)]">{c.approvedBy?.username || 'Admin'}</span></div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── PARTY PAYMENTS TAB ── */}
      {activeTab === 'payments' && (
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between gap-4 bg-muted/20">
            <div className="flex bg-muted/50 p-1 rounded-lg self-start">
              {(['PENDING', 'APPROVED', 'REJECTED'] as PaymentFilter[]).map(f => (
                <Fragment key={f}>
                  {filterBtn(
                    f.charAt(0) + f.slice(1).toLowerCase(), paymentFilter === f, () => setPaymentFilter(f),
                    f === 'PENDING' ? <Clock size={14} /> : f === 'APPROVED' ? <CheckCircle size={14} /> : <XCircle size={14} />
                  )}
                </Fragment>
              ))}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input type="text" placeholder="Search party or branch..." className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50 pl-9"
                value={paymentSearch} onChange={e => setPaymentSearch(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto min-h-[300px]">
            <Table>
              <TableHeader className="bg-[var(--surface-raised)] border-b border-[var(--border)]">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Party & Branch</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Method</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Amount</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Date</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsLoading ? (
                  <TableRow><TableCell colSpan={5} className="py-12 text-center text-[var(--text-muted)]"><BrandSpinner size={16} /> Loading…</TableCell></TableRow>
                ) : filteredPayments.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-12 text-center text-[var(--text-muted)]">
                    <AlertCircle size={28} className="mx-auto mb-3 opacity-20" />
                    No {paymentFilter.toLowerCase()} party payments
                  </TableCell></TableRow>
                ) : filteredPayments.map(p => (
                  <TableRow key={p.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                    <TableCell>
                      <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5"><User size={13} className="text-[var(--text-muted)]" />{p.party.name}</div>
                      <div className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-1"><Building2 size={12} />{p.dailyEntry?.branch.name || '—'}</div>
                      {p.note && <div className="text-xs text-[var(--text-muted)] italic mt-1">Note: {p.note}</div>}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs bg-[var(--surface-raised)] border border-[var(--border)] px-2 py-1 rounded font-mono font-medium text-[var(--text-primary)]">{p.method}</span>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono font-bold text-[var(--text-primary)]">{formatCurrency(p.amount)}</div>
                      {p.attachmentUrl && (
                        <button onClick={() => setReceiptUrl(p.attachmentUrl)} className="text-xs text-[var(--info)] hover:text-[var(--info-hover)] mt-1 flex items-center gap-1">
                          <ImageIcon size={12} /> View Slip
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)]">{p.dailyEntry ? formatDate(p.dailyEntry.date) : formatDate(p.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {paymentFilter === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" onClick={() => handlePaymentAction(p.id, 'reject')} disabled={paymentActionLoading === p.id}
                            className="bg-[var(--danger-subtle)]/30 text-[var(--danger)] hover:bg-[var(--danger-subtle)]/50 text-xs px-3 h-8">Reject</Button>
                          <Button onClick={() => handlePaymentAction(p.id, 'approve')} disabled={paymentActionLoading === p.id}
                            className="text-xs px-3 h-8">{paymentActionLoading === p.id ? <BrandSpinner size={14} /> : 'Approve'}</Button>
                        </div>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded font-bold ${paymentFilter === 'APPROVED' ? 'bg-[var(--success-subtle)]/30 text-[var(--success)]' : 'bg-[var(--danger-subtle)]/30 text-[var(--danger)]'}`}>
                          {paymentFilter}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {receiptUrl && <ViewReceiptModal url={receiptUrl} onClose={() => setReceiptUrl(null)} />}
    </div>
    </>
  )
}
