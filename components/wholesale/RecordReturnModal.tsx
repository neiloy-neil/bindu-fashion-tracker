'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { dhakaDateString } from '@/lib/new-entry'
import toast from 'react-hot-toast'

interface Props {
  challan: { id: number; challanNumber: string; buyerId: number; branchId: number; netAmount: number; remainingDue: number }
  onClose: () => void
  onSaved: () => void
}

const inputCls = "flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
const textareaCls = "flex w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] resize-none"
const labelCls = "block text-xs text-[var(--text-muted)] mb-1"

export default function RecordReturnModal({ challan, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    date: dhakaDateString(),
    amount: '',
    reason: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) { setError('Enter a valid return amount.'); return }
    if (amt > challan.netAmount) { setError(`Return amount cannot exceed challan value (${formatCurrency(challan.netAmount)}).`); return }
    setSaving(true)
    try {
      const res = await fetch('/api/wholesale/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challanId: challan.id,
          branchId: challan.branchId,
          date: form.date,
          amount: amt,
          reason: form.reason || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to record return')
      toast.success('Return recorded')
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
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Record Return</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{challan.challanNumber}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--surface-raised)] rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

          <div className="rounded-lg bg-[var(--surface)] px-3 py-2 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Net invoice</span>
              <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(challan.netAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Remaining due</span>
              <span className={`font-semibold ${challan.remainingDue > 0 ? 'text-red-400' : 'text-[var(--success)]'}`}>
                {formatCurrency(challan.remainingDue)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Return Date <span className="text-red-400">*</span></label>
              <input type="date" value={form.date} onChange={set('date')} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Return Amount (৳) <span className="text-red-400">*</span></label>
              <input
                type="number" min="1" max={challan.netAmount} step="0.01"
                value={form.amount} onChange={set('amount')}
                className={inputCls} placeholder="0.00" required
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Reason</label>
            <textarea value={form.reason} onChange={set('reason')} className={textareaCls} rows={2} placeholder="Defective goods, wrong item, etc." />
          </div>
        </form>

        <div className="px-5 py-3 border-t border-[var(--border)] flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit as any} disabled={saving} className="gap-1.5 bg-orange-500 hover:bg-orange-600">
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            {saving ? 'Saving...' : 'Record Return'}
          </Button>
        </div>
      </div>
    </div>
  )
}
