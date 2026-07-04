'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, MapPin, Phone, User, Building2 } from 'lucide-react'

const BRANCH_COLORS = [
  'bg-[var(--success-subtle)] text-[var(--success)]',
  'bg-[var(--accent-subtle)] text-[var(--accent)]',
  'bg-[var(--warning-subtle)] text-[var(--warning)]',
  'bg-[var(--danger-subtle)] text-[var(--danger)]',
  'bg-[var(--info-subtle)] text-[var(--info)]',
]

const TYPE_LABELS: Record<string, string> = {
  RETAIL: 'Retail',
  WHOLESALE: 'Wholesale',
  FACTORY: 'Factory',
}

const emptyForm = {
  name: '',
  code: '',
  type: 'RETAIL',
  address: '',
  contactPerson: '',
  phoneNumber: '',
  isActive: true,
}

export default function BranchesPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const router = useRouter()

  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reloadNonce, setReloadNonce] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<any | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/branches')
      .then(r => r.json())
      .then(d => { setBranches(d); setLoading(false) })
  }, [reloadNonce])

  const openAdd = () => {
    setEditingBranch(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (branch: any) => {
    setEditingBranch(branch)
    setForm({
      name: branch.name ?? '',
      code: branch.code ?? '',
      type: branch.type ?? 'RETAIL',
      address: branch.address ?? '',
      contactPerson: branch.contactPerson ?? '',
      phoneNumber: branch.phoneNumber ?? '',
      isActive: branch.isActive ?? true,
    })
    setModalOpen(true)
  }

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }))

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Branch name is required'); return }
    const code = form.code.trim() || form.name.substring(0, 3).toUpperCase()
    setSaving(true)
    try {
      const url = editingBranch ? `/api/branches/${editingBranch.id}` : '/api/branches'
      const method = editingBranch ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, code }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save')
      toast.success(`Branch ${editingBranch ? 'updated' : 'added'}`)
      setModalOpen(false)
      setReloadNonce(n => n + 1)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this branch? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/branches/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete')
      toast.success('Branch deleted')
      setReloadNonce(n => n + 1)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Branches</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">{branches.length} branches</p>
        </div>
        {isAdmin && (
          <Button onClick={openAdd} className="gap-2">
            <Plus size={16} /> Add Branch
          </Button>
        )}
      </div>

      <div className="flex-1 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64 gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            <span className="text-sm text-[var(--text-muted)]">Loading…</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {branches.map((branch, i) => (
              <div
                key={branch.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 relative group flex flex-col hover:border-[var(--border-strong)] hover:shadow-sm transition-all duration-150 cursor-pointer"
                onClick={() => router.push(`/branches/${branch.id}`)}
              >
                {isAdmin && (
                  <div
                    className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-[var(--text-muted)] hover:text-[var(--info)] hover:bg-[var(--info-subtle)]" onClick={() => openEdit(branch)}>
                      <Pencil size={13} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)]" onClick={() => handleDelete(branch.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                )}

                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-base font-extrabold mb-3 ${BRANCH_COLORS[i % BRANCH_COLORS.length]}`}>
                  {branch.name.charAt(0).toUpperCase()}
                </div>

                <div className="font-bold text-[15px] text-[var(--text-primary)]">{branch.name}</div>
                <div className="text-[11px] text-[var(--text-muted)] font-mono tracking-widest mt-0.5 mb-2">
                  {branch.code} · {TYPE_LABELS[branch.type] ?? branch.type}
                </div>

                {branch.contactPerson && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1">
                    <User size={11} /> {branch.contactPerson}
                  </div>
                )}
                {branch.phoneNumber && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1">
                    <Phone size={11} /> {branch.phoneNumber}
                  </div>
                )}
                {branch.address && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1 line-clamp-1">
                    <MapPin size={11} className="shrink-0" /> {branch.address}
                  </div>
                )}

                <div className="mt-auto pt-3 flex items-center justify-between">
                  {branch._count?.employees !== undefined && (
                    <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                      <Building2 size={11} /> {branch._count.employees} emp.
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ml-auto ${branch.isActive ? 'bg-[var(--success-subtle)] text-[var(--success)]' : 'bg-[var(--danger-subtle)] text-[var(--danger)]'}`}>
                    ● {branch.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingBranch ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Branch Name *</Label>
              <Input
                value={form.name}
                onChange={e => {
                  set('name', e.target.value)
                  if (!editingBranch && !form.code) set('code', e.target.value.substring(0, 3).toUpperCase())
                }}
                placeholder="e.g. Uttara Branch"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input
                value={form.code}
                onChange={e => set('code', e.target.value.toUpperCase())}
                placeholder="e.g. UTT"
                maxLength={10}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Type</Label>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value)}
                className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <option value="RETAIL">Retail</option>
                <option value="WHOLESALE">Wholesale</option>
                <option value="FACTORY">Factory</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Contact Person</Label>
              <Input
                value={form.contactPerson}
                onChange={e => set('contactPerson', e.target.value)}
                placeholder="Manager name"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input
                value={form.phoneNumber}
                onChange={e => set('phoneNumber', e.target.value)}
                placeholder="01XXXXXXXXX"
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={e => set('address', e.target.value)}
                placeholder="Full address"
              />
            </div>

            <div className="col-span-2 flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Active</p>
                <p className="text-xs text-[var(--text-muted)]">Inactive branches are hidden from daily entry</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.isActive}
                onClick={() => set('isActive', !form.isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${form.isActive ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editingBranch ? 'Save Changes' : 'Add Branch'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
