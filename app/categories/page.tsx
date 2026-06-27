'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Category } from '@/lib/types'
import { BrandSpinner } from '@/components/ui/BrandSpinner'

const FREQUENCIES = [
  { value: 'DAILY',     label: 'Daily' },
  { value: 'WEEKLY',    label: 'Weekly' },
  { value: 'MONTHLY',   label: 'Monthly' },
  { value: 'AS_NEEDED', label: 'As Needed' },
]

const frequencyLabel = (f?: string | null) => FREQUENCIES.find(x => x.value === f)?.label ?? '—'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)

  const [name, setName] = useState('')
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME')
  const [frequency, setFrequency] = useState<string>('DAILY')
  const [isActive, setIsActive] = useState(true)

  const incomeCategories = categories.filter(c => c.type === 'INCOME')
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/categories?includeInactive=true')
        const data = await res.json()
        if (!cancelled) setCategories(data)
      } catch {
        if (!cancelled) toast.error('Failed to load categories')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [reloadNonce])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Category name is required'); return }
    if (type === 'EXPENSE' && !frequency) { toast.error('Frequency is required for expense categories'); return }

    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories'
      const method = editingCategory ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, frequency: type === 'EXPENSE' ? frequency : null, isActive }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save')
      toast.success(editingCategory ? 'Category updated' : 'Category created')
      setShowModal(false)
      setReloadNonce(n => n + 1)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Deactivate instead of delete — existing entries will be orphaned if you delete. Continue with delete?')) return
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete')
      toast.success('Category deleted')
      setReloadNonce(n => n + 1)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const openNew = () => {
    setEditingCategory(null)
    setName('')
    setType('INCOME')
    setFrequency('DAILY')
    setIsActive(true)
    setShowModal(true)
  }

  const openEdit = (cat: Category) => {
    setEditingCategory(cat)
    setName(cat.name)
    setType(cat.type)
    setFrequency(cat.frequency ?? 'DAILY')
    setIsActive(cat.isActive)
    setShowModal(true)
  }

  const CategoryTable = ({ cats, title }: { cats: Category[]; title: string }) => (
    <div className="mb-8">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">{title}</h3>
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>Name</th>
              {title.includes('Expense') && (
                <th style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>Frequency</th>
              )}
              <th style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cats.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No categories yet.</td>
              </tr>
            )}
            {cats.map(cat => (
              <tr key={cat.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '14px 16px', fontWeight: 500 }}>
                  {cat.name}
                  {cat.isDefault && <span className="ml-2 text-xs bg-[var(--border)] text-[var(--text-secondary)] px-2 py-1 rounded">System</span>}
                </td>
                {title.includes('Expense') && (
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                      padding: '2px 8px', borderRadius: 4,
                      background: cat.frequency === 'DAILY' ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)',
                      color: cat.frequency === 'DAILY' ? 'var(--success)' : '#f59e0b',
                    }}>
                      {frequencyLabel(cat.frequency)}
                    </span>
                  </td>
                )}
                <td style={{ padding: '14px 16px' }}>
                  {cat.isActive ? (
                    <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
                      <CheckCircle2 size={15} /> Active
                    </span>
                  ) : (
                    <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
                      <XCircle size={15} /> Inactive
                    </span>
                  )}
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                  <button onClick={() => openEdit(cat)} className="p-2 text-[var(--text-secondary)] hover:text-white transition-colors" title="Edit">
                    <Edit2 size={15} />
                  </button>
                  {!cat.isDefault && (
                    <button onClick={() => handleDelete(cat.id)} className="p-2 text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded transition-colors ml-1" title="Delete">
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Manage Categories</h2>
          <p className="page-subtitle">Income and expense categories used in daily entries</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={18} /> New Category
          </button>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', gap: 12 }}>
            <BrandSpinner />
            <span style={{ color: 'var(--text-secondary)' }}>Loading...</span>
          </div>
        ) : (
          <>
            <CategoryTable cats={incomeCategories} title="Income Categories" />
            <CategoryTable cats={expenseCategories} title="Expense Categories" />
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-secondary)]">
              <h3 className="font-bold text-white text-lg">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
              <button onClick={() => setShowModal(false)} className="text-[var(--text-secondary)] hover:text-white transition-colors text-xl font-bold px-2">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-6 flex flex-col gap-5">
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Shop Rent" autoFocus />
              </div>

              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  className="form-input"
                  value={type}
                  onChange={e => setType(e.target.value as 'INCOME' | 'EXPENSE')}
                  disabled={!!editingCategory?.isDefault}
                >
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>

              {type === 'EXPENSE' && (
                <div className="form-group">
                  <label className="form-label">Frequency</label>
                  <select className="form-input" value={frequency} onChange={e => setFrequency(e.target.value)}>
                    {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Daily expenses show immediately; Periodic (Monthly/Weekly/As Needed) are collapsed in the entry form.
                  </p>
                </div>
              )}

              <div className="form-group flex items-center gap-3">
                <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
                <label htmlFor="isActive" className="text-sm font-medium text-white cursor-pointer">Active (visible in daily entry form)</label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
