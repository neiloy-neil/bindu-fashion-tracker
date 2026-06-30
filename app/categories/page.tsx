'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, ChevronRight, FolderOpen, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
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

// Extended Category type with children
type CategoryWithChildren = {
  id: number
  name: string
  type: 'INCOME' | 'EXPENSE'
  isActive: boolean
  isDefault: boolean
  frequency?: string | null
  parentId?: number | null
  requiresAttachment?: boolean
  isAutoTransferred?: boolean
  children?: CategoryWithChildren[]
}

const FREQUENCIES = [
  { value: 'DAILY',     label: 'Daily' },
  { value: 'WEEKLY',    label: 'Weekly' },
  { value: 'MONTHLY',   label: 'Monthly' },
  { value: 'AS_NEEDED', label: 'As Needed' },
]

const frequencyLabel = (f?: string | null) => FREQUENCIES.find(x => x.value === f)?.label ?? '—'

// ─── Category Row Component ────────────────────────────────────────────────────
function CategoryRow({
  cat,
  onEdit,
  onDelete,
  onAddSubcategory,
  showFrequency,
  isChild = false,
}: {
  cat: CategoryWithChildren
  onEdit: (c: CategoryWithChildren) => void
  onDelete: (id: number) => void
  onAddSubcategory: (parent: CategoryWithChildren) => void
  showFrequency: boolean
  isChild?: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = cat.children && cat.children.length > 0

  return (
    <>
      <tr className={cn(
        'border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors',
        isChild && 'bg-[var(--surface-raised)]/30'
      )}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {/* Indent for children */}
            {isChild && <span className="w-5 border-l-2 border-b-2 border-[var(--border)] h-3 ml-2 rounded-bl flex-shrink-0" />}
            {/* Expand toggle for parents with children */}
            {!isChild && hasChildren && (
              <button
                type="button"
                onClick={() => setExpanded(e => !e)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ChevronRight size={14} className={cn('transition-transform', expanded && 'rotate-90')} />
              </button>
            )}
            {!isChild && !hasChildren && <span className="w-[14px]" />}
            {isChild
              ? <Tag size={13} className="text-[var(--text-muted)]" />
              : <FolderOpen size={14} className="text-[var(--accent)]" />
            }
            <span className={cn('font-medium text-sm text-[var(--text-primary)]', isChild && 'text-[var(--text-secondary)]')}>
              {cat.name}
            </span>
            {cat.isDefault && (
              <span className="rounded-md bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">System</span>
            )}
          </div>
        </td>
        {showFrequency && (
          <td className="px-4 py-3">
            {cat.frequency ? (
              <span className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                cat.frequency === 'DAILY'
                  ? 'bg-[var(--success-subtle)] text-[var(--success)]'
                  : 'bg-[var(--warning-subtle)] text-[var(--warning)]'
              )}>
                {frequencyLabel(cat.frequency)}
              </span>
            ) : (
              <span className="text-xs text-[var(--text-muted)]">—</span>
            )}
          </td>
        )}
        <td className="px-4 py-3">
          {cat.isActive ? (
            <span className="inline-flex items-center gap-1 text-sm text-[var(--success)]">
              <CheckCircle2 size={14} /> Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm text-[var(--danger)]">
              <XCircle size={14} /> Inactive
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            {/* Add Sub-category button — only for top-level categories */}
            {!isChild && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddSubcategory(cat)}
                className="h-7 text-xs gap-1 text-[var(--text-muted)] hover:text-[var(--accent)]"
                title="Add Sub-category"
              >
                <Plus size={12} /> Sub
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(cat)}
              className="h-7 w-7 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title="Edit"
            >
              <Edit2 size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(cat.id)}
              className="h-7 w-7 text-[var(--danger)] hover:bg-[var(--danger-subtle)]"
              title="Delete"
            >
              <Trash2 size={13} />
            </Button>
          </div>
        </td>
      </tr>
      {/* Render children if expanded */}
      {!isChild && expanded && cat.children?.map(child => (
        <CategoryRow
          key={child.id}
          cat={child}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddSubcategory={onAddSubcategory}
          showFrequency={showFrequency}
          isChild
        />
      ))}
    </>
  )
}

// ─── Category Table Component ──────────────────────────────────────────────────
function CategoryTable({
  cats,
  title,
  onEdit,
  onDelete,
  onAddSubcategory,
}: {
  cats: CategoryWithChildren[]
  title: string
  onEdit: (c: CategoryWithChildren) => void
  onDelete: (id: number) => void
  onAddSubcategory: (parent: CategoryWithChildren) => void
}) {
  const showFrequency = title.includes('Expense')
  // Only show top-level (parentId == null)
  const topLevel = cats.filter(c => !c.parentId)

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">{title}</h3>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-raised)]/50">
              <th className="px-4 py-2.5 text-left text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Name</th>
              {showFrequency && (
                <th className="px-4 py-2.5 text-left text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Frequency</th>
              )}
              <th className="px-4 py-2.5 text-left text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Status</th>
              <th className="px-4 py-2.5 text-right text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {topLevel.length === 0 ? (
              <tr>
                <td colSpan={showFrequency ? 4 : 3} className="py-6 text-center text-[var(--text-secondary)] italic text-sm">
                  No categories yet.
                </td>
              </tr>
            ) : (
              topLevel.map(cat => (
                <CategoryRow
                  key={cat.id}
                  cat={cat}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAddSubcategory={onAddSubcategory}
                  showFrequency={showFrequency}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithChildren[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryWithChildren | null>(null)
  const [parentCategory, setParentCategory] = useState<CategoryWithChildren | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)

  const [name, setName] = useState('')
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME')
  const [frequency, setFrequency] = useState<string>('DAILY')
  const [isActive, setIsActive] = useState(true)
  const [requiresAttachment, setRequiresAttachment] = useState(true)
  const [isAutoTransferred, setIsAutoTransferred] = useState(false)

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
    if (type === 'EXPENSE' && !frequency && !parentCategory) { toast.error('Frequency is required for expense categories'); return }

    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories'
      const method = editingCategory ? 'PUT' : 'POST'
      const body = {
        name,
        type,
        frequency: type === 'EXPENSE' ? frequency : null,
        isActive,
        isAutoTransferred,
        requiresAttachment,
        parentId: parentCategory?.id || null
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
    if (!confirm('Delete this category? This cannot be undone. Categories used in entries will be blocked.')) return
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
    setParentCategory(null)
    setName('')
    setType('INCOME')
    setFrequency('DAILY')
    setIsActive(true)
    setRequiresAttachment(true)
    setIsAutoTransferred(false)
    setShowModal(true)
  }

  const openEdit = (cat: CategoryWithChildren) => {
    setEditingCategory(cat)
    setParentCategory(null)
    setName(cat.name)
    setType(cat.type)
    setFrequency(cat.frequency ?? 'DAILY')
    setIsActive(cat.isActive)
    setRequiresAttachment(cat.requiresAttachment ?? true)
    setIsAutoTransferred(cat.isAutoTransferred ?? false)
    setShowModal(true)
  }

  const openAddSubcategory = (parent: CategoryWithChildren) => {
    setEditingCategory(null)
    setParentCategory(parent)
    setName('')
    setType(parent.type)
    setFrequency(parent.frequency ?? 'DAILY')
    setIsActive(true)
    setRequiresAttachment(true)
    setIsAutoTransferred(false)
    setShowModal(true)
  }

  const modalTitle = editingCategory
    ? 'Edit Category'
    : parentCategory
      ? `Add Sub-category of "${parentCategory.name}"`
      : 'New Category'

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Manage Categories</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Income and expense categories used in daily entries</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus size={18} /> New Category
        </Button>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64 gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            <span className="text-sm text-[var(--text-muted)]">Loading…</span>
          </div>
        ) : (
          <>
            <CategoryTable
              cats={incomeCategories}
              title="Income Categories"
              onEdit={openEdit}
              onDelete={handleDelete}
              onAddSubcategory={openAddSubcategory}
            />
            <CategoryTable
              cats={expenseCategories}
              title="Expense Categories"
              onEdit={openEdit}
              onDelete={handleDelete}
              onAddSubcategory={openAddSubcategory}
            />
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">{modalTitle}</h3>
                {parentCategory && (
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Will be nested under: <span className="font-medium text-[var(--accent)]">{parentCategory.name}</span>
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="text-[var(--text-secondary)]">
                <XCircle size={18} />
              </Button>
            </div>

            <form onSubmit={handleSave} className="p-6 flex flex-col gap-5">
              <div>
                <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Category Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Shop Rent" autoFocus />
              </div>

              {/* Only show type selector if it's a top-level new category (not sub, not edit-locked) */}
              {!parentCategory && (
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Type</Label>
                  <Select
                    value={type}
                    onValueChange={value => setType(value as 'INCOME' | 'EXPENSE')}
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
              )}

              {type === 'EXPENSE' && !parentCategory && (
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

              <div className="flex flex-col gap-4">
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
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="requiresAttachment"
                    checked={requiresAttachment}
                    onCheckedChange={(checked) => setRequiresAttachment(checked === true)}
                  />
                  <Label htmlFor="requiresAttachment" className="cursor-pointer text-sm font-medium text-[var(--text-primary)]">
                    Requires Attachment (shows upload box)
                  </Label>
                </div>
                {type === 'INCOME' && !parentCategory && (
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="isAutoTransferred"
                      checked={isAutoTransferred}
                      onCheckedChange={(checked) => setIsAutoTransferred(checked === true)}
                    />
                    <Label htmlFor="isAutoTransferred" className="cursor-pointer text-sm font-medium text-[var(--text-primary)]">
                      Auto-Transfer Digital Sales (creates transfer entry automatically)
                    </Label>
                  </div>
                )}
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
