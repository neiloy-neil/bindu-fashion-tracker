'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Props {
  challan: { id: number; challanNumber: string; buyerId: number; branchId: number; remainingDue: number }
  onClose: () => void
  onSaved: () => void
}

const METHODS = ['CASH', 'BKASH', 'NAGAD', 'BANK_TRANSFER', 'CHEQUE', 'UDHAR']

const inputCls = "flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
const labelCls = "text-xs text-[var(--text-muted)] block mb-1"

export default function RecordPaymentModal({ challan, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    method: 'CASH',
    amount: String(challan.remainingDue > 0 ? challan.remainingDue : ''),
    transactionRef: '',
    note: '',
    collectedAt: new Date().toISOString().split('T')[0],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Amount must be greater than 0.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/wholesale/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerId: challan.buyerId,
          challanId: challan.id,
          branchId: challan.branchId,
          method: form.method,
          amount: form.amount,
          transactionRef: form.transactionRef || null,
          note: form.note || null,
          collectedAt: form.collectedAt,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to record payment')
      toast.success('Payment recorded')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] w-full max-w-md flex flex-col rounded-xl shadow-xl overflow-hidden border border-[var(--border)]">
        <div className="flex justify-between items-center px-5 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Record Payment</h2>
            <p className="text-xs text-[var(--text-muted)]">{challan.challanNumber} · Due: {formatCurrency(challan.remainingDue)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--surface-raised)] rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Method</label>
              <select value={form.method} onChange={set('method')} className={inputCls}>
                {METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Amount (৳) <span className="text-red-400">*</span></label>
              <input value={form.amount} onChange={set('amount')} type="number" min="0.01" step="0.01" className={inputCls} required />
            </div>
          </div>

          <div>
            <label className={labelCls}>Date</label>
            <input value={form.collectedAt} onChange={set('collectedAt')} type="date" className={inputCls} />
          </div>

          {['BKASH', 'NAGAD', 'BANK_TRANSFER', 'CHEQUE'].includes(form.method) && (
            <div>
              <label className={labelCls}>Transaction Ref / Cheque #</label>
              <input value={form.transactionRef} onChange={set('transactionRef')} className={inputCls} placeholder="e.g. BKH-2026XXXXXX" />
            </div>
          )}

          <div>
            <label className={labelCls}>Note</label>
            <input value={form.note} onChange={set('note')} className={inputCls} placeholder="Optional" />
          </div>
        </form>

        <div className="px-5 py-3 border-t border-[var(--border)] flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit as any} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            {saving ? 'Saving...' : 'Record Payment'}
          </Button>
        </div>
      </div>
    </div>
  )
}
