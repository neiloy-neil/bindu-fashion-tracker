'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, MapPin, Phone, User, Building2, Clock } from 'lucide-react'
import { BranchFormModal } from '@/components/BranchFormModal'

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

const TYPE_COLORS: Record<string, string> = {
  RETAIL: 'bg-[var(--accent-subtle)] text-[var(--accent)]',
  WHOLESALE: 'bg-[var(--success-subtle)] text-[var(--success)]',
  FACTORY: 'bg-[var(--warning-subtle)] text-[var(--warning)]',
}

export default function BranchesPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN'
  const router = useRouter()

  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reloadNonce, setReloadNonce] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<any | null>(null)

  useEffect(() => {
    fetch('/api/branches')
      .then(r => r.json())
      .then(d => { setBranches(d); setLoading(false) })
  }, [reloadNonce])

  const openAdd = () => { setEditingBranch(null); setModalOpen(true) }
  const openEdit = (branch: any) => { setEditingBranch(branch); setModalOpen(true) }

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
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
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

                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-[15px] text-[var(--text-primary)]">{branch.name}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] text-[var(--text-muted)] font-mono tracking-widest">{branch.code}</span>
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${TYPE_COLORS[branch.type] ?? 'bg-[var(--surface-raised)] text-[var(--text-muted)]'}`}>
                    {TYPE_LABELS[branch.type] ?? branch.type}
                  </span>
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

                {branch.openingBalance > 0 && (
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    Opening: <span className="font-semibold text-[var(--text-primary)]">৳{branch.openingBalance.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] mt-1">
                  <Clock size={10} />
                  <span>{branch.shiftStartTime || '09:00'} – {branch.shiftEndTime || '21:00'}</span>
                  <span className="text-[var(--border-strong)]">·</span>
                  <span>{branch.gracePeriodMins ?? 15}m grace</span>
                </div>

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

      <BranchFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        branch={editingBranch}
        onSaved={() => setReloadNonce(n => n + 1)}
      />
    </>
  )
}
