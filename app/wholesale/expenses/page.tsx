'use client'

import { useEffect, useState } from 'react'
import { dhakaDateString } from '@/lib/new-entry'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { BrandSpinner } from '@/components/ui/BrandSpinner'

type Category = { id: number; name: string; type: string; children?: Category[] }
type Expense = {
  id: number
  amount: number
  note: string | null
  approvalStatus: string
  createdAt: string
  category: { name: string }
  dailyEntry: { date: string; branch: { name: string } }
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING: <Clock size={13} className="text-[var(--warning)]" />,
  APPROVED: <CheckCircle2 size={13} className="text-[var(--success)]" />,
  REJECTED: <XCircle size={13} className="text-[var(--danger)]" />,
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'text-[var(--warning)]',
  APPROVED: 'text-[var(--success)]',
  REJECTED: 'text-[var(--danger)]',
}

export default function WholesaleExpensesPage() {
  const today = dhakaDateString()
  const [categories, setCategories] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [catRes, expRes] = await Promise.all([
        fetch('/api/categories?type=EXPENSE'),
        fetch('/api/wholesale/expenses'),
      ])
      const catData = await catRes.json()
      const expData = await expRes.json()
      setCategories(Array.isArray(catData) ? catData : [])
      setExpenses(expData.expenses ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryId || !amount) return toast.error('Category and amount are required')
    setSubmitting(true)
    try {
      const res = await fetch('/api/wholesale/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: parseInt(categoryId), amount: parseFloat(amount), date, note: note || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'Failed')
      toast.success('Expense submitted for approval')
      setShowForm(false)
      setAmount('')
      setNote('')
      setCategoryId('')
      void load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Flatten categories + children for select
  const allExpenseCategories: { id: number; label: string }[] = []
  for (const cat of categories) {
    if (cat.type === 'EXPENSE') {
      if (cat.children && cat.children.length > 0) {
        for (const child of cat.children) {
          allExpenseCategories.push({ id: child.id, label: `${cat.name} › ${child.name}` })
        }
      } else {
        allExpenseCategories.push({ id: cat.id, label: cat.name })
      }
    }
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Expenses</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Submit and track branch expenses</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-black hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> New Expense
        </button>
      </div>

      <div className="flex-1 p-6 space-y-6 max-w-2xl">
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] p-5 space-y-4">
            <h2 className="font-medium text-[var(--text-primary)]">Submit Expense</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Category *</label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  required
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--surface)] text-[var(--text-primary)] text-sm"
                >
                  <option value="">Select category…</option>
                  {allExpenseCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Amount (৳) *</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                  placeholder="0.00"
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--surface)] text-[var(--text-primary)] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--surface)] text-[var(--text-primary)] text-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Note</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Optional description…"
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--surface)] text-[var(--text-primary)] text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-black hover:opacity-90 disabled:opacity-50">
                {submitting ? 'Submitting…' : 'Submit for Approval'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><BrandSpinner /></div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-secondary)]">
            <p className="text-sm">No expenses submitted yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map(exp => (
              <div key={exp.id} className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3">
                <div>
                  <p className="font-medium text-sm text-[var(--text-primary)]">{exp.category.name}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {new Date(exp.dailyEntry.date).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {exp.note && ` · ${exp.note}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <p className="font-semibold tabular-nums text-[var(--text-primary)]">{formatCurrency(exp.amount)}</p>
                  <div className={`flex items-center gap-1 text-xs font-medium ${STATUS_COLOR[exp.approvalStatus] ?? ''}`}>
                    {STATUS_ICON[exp.approvalStatus]}
                    {exp.approvalStatus}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
