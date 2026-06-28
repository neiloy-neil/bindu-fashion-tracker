'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Category } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const FREQUENCIES = [
  { value: 'DAILY',     label: 'Daily' },
  { value: 'WEEKLY',    label: 'Weekly' },
  { value: 'MONTHLY',   label: 'Monthly' },
  { value: 'AS_NEEDED', label: 'As Needed' },
]

const frequencyLabel = (f?: string | null) => FREQUENCIES.find(x => x.value === f)?.label ?? '—'

function CategoryTable({
  cats,
  title,
  onEdit,
  onDelete,
}: {
  cats: Category[]
  title: string
  onEdit: (category: Category) => void
  onDelete: (id: number) => void
}) {
  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">{title}</h3>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-[var(--border)]">
              <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Name</TableHead>
              {title.includes('Expense') && (
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Frequency</TableHead>
              )}
              <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Status</TableHead>
              <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cats.length === 0 && (
              <TableRow className="border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                <TableCell colSpan={4} className="py-6 text-center text-[var(--text-secondary)] italic">
                  No categories yet.
                </TableCell>
              </TableRow>
            )}
            {cats.map(cat => (
              <TableRow key={cat.id} className="border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                <TableCell className="font-medium text-[var(--text-primary)]">
                  {cat.name}
                  {cat.isDefault && <span className="ml-2 rounded-md bg-[var(--surface-raised)] px-2 py-1 text-xs text-[var(--text-secondary)]">System</span>}
                </TableCell>
                {title.includes('Expense') && (
                  <TableCell>
                    <span className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                      cat.frequency === 'DAILY'
                        ? 'bg-[var(--success-subtle)] text-[var(--success)]'
                        : 'bg-[var(--warning-subtle)] text-[var(--warning)]'
                    )}>
                      {frequencyLabel(cat.frequency)}
                    </span>
                  </TableCell>
                )}
                <TableCell>
                  {cat.isActive ? (
                    <span className="inline-flex items-center gap-1 text-sm text-[var(--success)]">
                      <CheckCircle2 size={15} /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-sm text-[var(--danger)]">
                      <XCircle size={15} /> Inactive
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(cat)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" title="Edit">
                    <Edit2 size={15} />
                  </Button>
                  {!cat.isDefault && (
                    <Button variant="ghost" size="icon" onClick={() => onDelete(cat.id)} className="ml-1 text-[var(--danger)] hover:bg-[var(--danger-subtle)] hover:text-[var(--danger)]" title="Delete">
                      <Trash2 size={15} />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

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

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Manage Categories</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Income and expense categories used in daily entries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openNew} className="gap-2">
            <Plus size={18} /> New Category
          </Button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64 gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            <span className="text-sm text-[var(--text-muted)]">Loading…</span>
          </div>
        ) : (
          <>
            <CategoryTable cats={incomeCategories} title="Income Categories" onEdit={openEdit} onDelete={handleDelete} />
            <CategoryTable cats={expenseCategories} title="Expense Categories" onEdit={openEdit} onDelete={handleDelete} />
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <XCircle size={18} className="rotate-45" />
              </Button>
            </div>

            <form onSubmit={handleSave} className="p-6 flex flex-col gap-5">
              <div>
                <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Category Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Shop Rent" autoFocus />
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Type</Label>
                <Select
                  value={type}
                  onValueChange={value => setType(value as 'INCOME' | 'EXPENSE')}
                  disabled={!!editingCategory?.isDefault}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {type === 'EXPENSE' && (
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Frequency</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Daily expenses show immediately; Periodic (Monthly/Weekly/As Needed) are collapsed in the entry form.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Checkbox
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked === true)}
                />
                <Label htmlFor="isActive" className="cursor-pointer text-sm font-medium text-[var(--text-primary)]">
                  Active (visible in daily entry form)
                </Label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
                <Button variant="outline" type="button" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1">Save Category</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
