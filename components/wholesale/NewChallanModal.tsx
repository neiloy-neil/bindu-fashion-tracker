'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { dhakaDateString } from '@/lib/new-entry'
import toast from 'react-hot-toast'

type Buyer = { id: number; name: string; contactNumber: string | null; branchId: number | null }
type Branch = { id: number; name: string; type: string }

interface ChallanItem {
  description: string
  quantity: string
  unitPrice: string
  amount: string
  note: string
}

interface Props {
  onClose: () => void
  onCreated: () => void
}

const inputCls = "flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
const textareaCls = "flex w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] resize-none"
const labelCls = "text-xs text-[var(--text-muted)] block mb-1"

export default function NewChallanModal({ onClose, onCreated }: Props) {
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [role, setRole] = useState<string | null>(null)
  const [userBranchId, setUserBranchId] = useState<string | null>(null)

  const today = dhakaDateString()
  const [form, setForm] = useState({
    buyerId: '', branchId: '', date: today,
    discount: '0', paidAtDelivery: '0', deliveryPerson: '', notes: '', attachmentUrl: '',
  })
  const [items, setItems] = useState<ChallanItem[]>([{ description: '', quantity: '', unitPrice: '', amount: '', note: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creditWarning, setCreditWarning] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/wholesale/buyers').then(r => r.json()),
      fetch('/api/branches').then(r => r.json()),
      fetch('/api/auth/session').then(r => r.json()),
    ]).then(([b, br, session]) => {
      setBuyers(Array.isArray(b) ? b : [])
      const branchList = Array.isArray(br) ? br : (br.branches || [])
      setBranches(branchList)
      const r = session?.user?.role
      const bid = session?.user?.branchId
      setRole(r)
      if (bid) {
        setUserBranchId(String(bid))
        setForm(f => ({ ...f, branchId: String(bid) }))
      }
    }).catch(() => {})
  }, [])

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const setItem = (i: number, k: keyof ChallanItem, val: string) => {
    setItems(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [k]: val }
      if (k === 'quantity' || k === 'unitPrice') {
        const qty = parseFloat(k === 'quantity' ? val : next[i].quantity) || 0
        const up = parseFloat(k === 'unitPrice' ? val : next[i].unitPrice) || 0
        if (qty > 0 && up > 0) next[i].amount = String(qty * up)
      }
      return next
    })
  }

  const addItem = () => setItems(prev => [...prev, { description: '', quantity: '', unitPrice: '', amount: '', note: '' }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))

  const totalAmount = items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0)
  const discount = parseFloat(form.discount) || 0
  const netAmount = totalAmount - discount
  const paid = parseFloat(form.paidAtDelivery) || 0
  const due = netAmount - paid

  const submitChallan = async (force = false) => {
    setError(null)
    setCreditWarning(null)
    const validItems = items.filter(it => it.description.trim() && parseFloat(it.amount) > 0)
    setSaving(true)
    try {
      const res = await fetch('/api/wholesale/challans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerId: form.buyerId,
          branchId: form.branchId,
          date: form.date,
          discount: form.discount,
          paidAtDelivery: form.paidAtDelivery,
          deliveryPerson: form.deliveryPerson || null,
          notes: form.notes || null,
          attachmentUrl: form.attachmentUrl || null,
          items: validItems,
          force,
        }),
      })
      const data = await res.json()
      if (res.status === 422 && data.creditLimitExceeded) {
        setCreditWarning(data.error)
        return
      }
      if (!res.ok) throw new Error(data.error || 'Failed to create challan')
      toast.success(`Challan ${data.challanNumber} created`)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.buyerId) { setError('Please select a buyer.'); return }
    if (!form.branchId) { setError('Please select a branch.'); return }
    const validItems = items.filter(it => it.description.trim() && parseFloat(it.amount) > 0)
    if (!validItems.length) { setError('Add at least one item with a description and amount.'); return }
    await submitChallan(false)
  }

  const isBranch = role === 'BRANCH'
  const availableBranches = isBranch ? branches.filter(b => String(b.id) === userBranchId) : branches
  const filteredBuyers = form.branchId
    ? buyers.filter(b => b.branchId === null || String(b.branchId) === form.branchId)
    : buyers

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] w-full max-w-2xl max-h-[92dvh] flex flex-col rounded-xl shadow-xl overflow-hidden border border-[var(--border)]">
        <div className="flex justify-between items-center px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">New Challan</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--surface-raised)] rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
          {creditWarning && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-3 space-y-2">
              <p className="text-sm text-yellow-400 font-medium">⚠ Credit Limit Exceeded</p>
              <p className="text-xs text-yellow-300/80">{creditWarning}</p>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setCreditWarning(null)} className="px-3 py-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Cancel</button>
                <button type="button" onClick={() => submitChallan(true)} disabled={saving} className="px-3 py-1 text-xs font-semibold bg-yellow-500 hover:bg-yellow-400 text-black rounded-md transition-colors disabled:opacity-50">
                  {saving ? 'Creating…' : 'Create Anyway'}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {!isBranch && (
              <div>
                <label className={labelCls}>Branch <span className="text-red-400">*</span></label>
                <select value={form.branchId} onChange={setField('branchId')} className={inputCls} required>
                  <option value="">Select branch...</option>
                  {availableBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
            <div className={!isBranch ? '' : 'col-span-2'}>
              <label className={labelCls}>Buyer <span className="text-red-400">*</span></label>
              <select value={form.buyerId} onChange={setField('buyerId')} className={inputCls} required>
                <option value="">Select buyer...</option>
                {filteredBuyers.map(b => <option key={b.id} value={b.id}>{b.name}{b.contactNumber ? ` (${b.contactNumber})` : ''}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Date</label>
              <input value={form.date} onChange={setField('date')} type="date" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Delivery Person</label>
              <input value={form.deliveryPerson} onChange={setField('deliveryPerson')} className={inputCls} placeholder="Name or ID" />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">Items</label>
              <button type="button" onClick={addItem} className="text-xs text-[var(--accent)] flex items-center gap-1 hover:opacity-80 transition-opacity">
                <Plus size={12} /> Add row
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4">
                    {i === 0 && <p className="text-[10px] text-[var(--text-muted)] mb-1">Description *</p>}
                    <input value={item.description} onChange={e => setItem(i, 'description', e.target.value)} className={inputCls} placeholder="Product / category" />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <p className="text-[10px] text-[var(--text-muted)] mb-1">Qty</p>}
                    <input value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} type="number" min="0" className={inputCls} placeholder="—" />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <p className="text-[10px] text-[var(--text-muted)] mb-1">Unit ৳</p>}
                    <input value={item.unitPrice} onChange={e => setItem(i, 'unitPrice', e.target.value)} type="number" min="0" className={inputCls} placeholder="—" />
                  </div>
                  <div className="col-span-3">
                    {i === 0 && <p className="text-[10px] text-[var(--text-muted)] mb-1">Amount ৳ *</p>}
                    <input value={item.amount} onChange={e => setItem(i, 'amount', e.target.value)} type="number" min="0" className={inputCls} placeholder="0" />
                  </div>
                  <div className="col-span-1 flex items-end pb-0.5">
                    {i === 0 && <div className="h-4 mb-1" />}
                    <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1} className="text-[var(--text-muted)] hover:text-red-400 disabled:opacity-30 p-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-[var(--border)] pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Discount (৳)</label>
                <input value={form.discount} onChange={setField('discount')} type="number" min="0" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Paid at Delivery (৳)</label>
                <input value={form.paidAtDelivery} onChange={setField('paidAtDelivery')} type="number" min="0" className={inputCls} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-[var(--surface)] px-3 py-2 text-sm">
              <span className="text-[var(--text-muted)]">Total: <span className="text-[var(--text-primary)] font-medium">{formatCurrency(totalAmount)}</span></span>
              {discount > 0 && <span className="text-[var(--text-muted)]">Net: <span className="text-[var(--text-primary)] font-medium">{formatCurrency(netAmount)}</span></span>}
              <span className={`font-semibold ${due > 0 ? 'text-orange-400' : 'text-[var(--success)]'}`}>
                {due > 0 ? `Due: ${formatCurrency(due)}` : '✓ Fully paid'}
              </span>
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={setField('notes')} className={textareaCls} rows={2} placeholder="Optional notes..." />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[var(--border)] flex justify-end gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit as any} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            {saving ? 'Creating...' : 'Create Challan'}
          </Button>
        </div>
      </div>
    </div>
  )
}
