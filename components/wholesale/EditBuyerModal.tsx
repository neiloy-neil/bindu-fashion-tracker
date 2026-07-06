'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'

type Branch = { id: number; name: string }

interface Buyer {
  id: number
  name: string
  contactPerson: string | null
  contactNumber: string | null
  secondaryNumber?: string | null
  email: string | null
  address: string | null
  creditLimit: number
  balance: number
  isActive: boolean
  branch: { id: number; name: string } | null
}

interface Props {
  buyer: Buyer
  onClose: () => void
  onSaved: () => void
}

const inputCls = "flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
const textareaCls = "flex w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] resize-none"
const labelCls = "block text-xs text-[var(--text-muted)] mb-1"

export default function EditBuyerModal({ buyer, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: buyer.name,
    contactPerson: buyer.contactPerson || '',
    contactNumber: buyer.contactNumber || '',
    secondaryNumber: (buyer as any).secondaryNumber || '',
    email: buyer.email || '',
    address: buyer.address || '',
    creditLimit: String(buyer.creditLimit),
    branchId: buyer.branch ? String(buyer.branch.id) : '',
    isActive: buyer.isActive,
  })
  const [branches, setBranches] = useState<Branch[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(d => setBranches(Array.isArray(d) ? d : d.branches || [])).catch(() => {})
  }, [])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) { setError('Buyer name is required.'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/wholesale/buyers/${buyer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          creditLimit: parseFloat(form.creditLimit) || 0,
          branchId: form.branchId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update buyer')
      toast.success('Buyer updated')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] w-full max-w-lg max-h-[90dvh] flex flex-col rounded-xl shadow-xl overflow-hidden border border-[var(--border)]">
        <div className="flex justify-between items-center px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Edit Buyer</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--surface-raised)] rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

          <div>
            <label className={labelCls}>Buyer Name <span className="text-red-400">*</span></label>
            <input value={form.name} onChange={set('name')} className={inputCls} placeholder="e.g. Rahman Brothers" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Contact Person</label>
              <input value={form.contactPerson} onChange={set('contactPerson')} className={inputCls} placeholder="Full name" />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input value={form.contactNumber} onChange={set('contactNumber')} className={inputCls} placeholder="01XXXXXXXXX" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Secondary Phone</label>
              <input value={form.secondaryNumber} onChange={set('secondaryNumber')} className={inputCls} placeholder="Optional" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input value={form.email} onChange={set('email')} type="email" className={inputCls} placeholder="Optional" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Address</label>
            <textarea value={form.address} onChange={set('address')} className={textareaCls} rows={2} placeholder="Full address" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Credit Limit (৳)</label>
              <input value={form.creditLimit} onChange={set('creditLimit')} type="number" min="0" className={inputCls} placeholder="0 = no limit" />
            </div>
            <div>
              <label className={labelCls}>Linked Branch</label>
              <select value={form.branchId} onChange={set('branchId')} className={inputCls}>
                <option value="">Shared (all branches)</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="isActive" className="text-sm text-[var(--text-primary)] cursor-pointer">Active</label>
          </div>
        </form>

        <div className="px-5 py-3 border-t border-[var(--border)] flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit as any} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
