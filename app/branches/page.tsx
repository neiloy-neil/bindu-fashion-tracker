'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BrandSpinner } from '@/components/ui/BrandSpinner'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function BranchesPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reloadNonce, setReloadNonce] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<any | null>(null)
  const [branchName, setBranchName] = useState('')
  const [branchCode, setBranchCode] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/branches')
      .then((r) => r.json())
      .then((d) => { setBranches(d); setLoading(false) })
  }, [reloadNonce])

  const BRANCH_COLORS = [
    'bg-[var(--success-subtle)] text-[var(--success)]',
    'bg-[var(--accent-subtle)] text-[var(--accent)]',
    'bg-[var(--warning-subtle)] text-[var(--warning)]',
    'bg-[var(--danger-subtle)] text-[var(--danger)]',
    'bg-[var(--info-subtle)] text-[var(--info)]',
  ]

  const openAddModal = () => {
    setEditingBranch(null)
    setBranchName('')
    setBranchCode('')
    setModalOpen(true)
  }

  const openEditModal = (branch: any) => {
    setEditingBranch(branch)
    setBranchName(branch.name)
    setBranchCode(branch.code)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!branchName.trim()) {
      toast.error('Branch name is required')
      return
    }
    const code = branchCode.trim() || branchName.substring(0, 3).toUpperCase()
    setSaving(true)
    try {
      const payload = editingBranch
        ? { name: branchName, code }
        : { name: branchName, code }

      const url = editingBranch ? `/api/branches/${editingBranch.id}` : '/api/branches'
      const method = editingBranch ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save branch')
      }

      toast.success(`Branch ${editingBranch ? 'updated' : 'added'} successfully`)
      setModalOpen(false)
      setReloadNonce(n => n + 1)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this branch?')) return
    try {
      const res = await fetch(`/api/branches/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Failed to delete branch')
        return
      }
      toast.success('Branch deleted successfully')
      setReloadNonce(n => n + 1)
    } catch (e: any) {
      toast.error(e.message || 'Error deleting branch')
    }
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Branches</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">{branches.length} active branches</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button onClick={openAddModal} className="gap-2">
              <Plus size={16} /> Add Branch
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64 gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            <span className="text-sm text-[var(--text-muted)]">Loading…</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {branches.map((branch, i) => (
              <div key={branch.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 relative group flex flex-col hover:border-[var(--border-strong)] transition-colors duration-150">
                {isAdmin && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-[var(--text-muted)] hover:text-[var(--info)] hover:bg-[var(--info-subtle)]" onClick={() => openEditModal(branch)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)]" onClick={() => handleDelete(branch.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-base font-extrabold mb-3 ${BRANCH_COLORS[i % BRANCH_COLORS.length]}`}>
                  {branch.name.charAt(0).toUpperCase()}
                </div>
                <div className="font-bold text-[15px] mb-1 text-[var(--text-primary)]">{branch.name}</div>
                <div className="text-[11px] text-[var(--text-muted)] font-mono tracking-widest mb-2">
                  {branch.code}
                </div>
                {branch._count?.employees !== undefined && (
                  <div className="text-xs text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-disabled)]"></div>
                    {branch._count.employees} Employee{branch._count.employees !== 1 ? 's' : ''}
                  </div>
                )}
                <div className="mt-auto pt-3 flex justify-between items-center">
                  {branch.isActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--success-subtle)] text-[var(--success)]">● Active</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--danger-subtle)] text-[var(--danger)]">● Inactive</span>
                  )}
                  <Link href={`/?branchId=${branch.id}`}>
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                      Dashboard →
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)]">{editingBranch ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Branch Name</Label>
              <Input
                id="name"
                value={branchName}
                onChange={(e) => {
                  setBranchName(e.target.value)
                  if (!editingBranch && !branchCode) {
                    setBranchCode(e.target.value.substring(0, 3).toUpperCase())
                  }
                }}
                placeholder="e.g. Uttara Branch"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">Branch Code</Label>
              <Input
                id="code"
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                placeholder="e.g. UTT"
                maxLength={10}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)] mt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
