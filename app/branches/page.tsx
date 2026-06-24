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
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/branches')
      .then((r) => r.json())
      .then((d) => { setBranches(d); setLoading(false) })
  }, [reloadNonce])

  const BRANCH_COLORS = [
    'var(--success)', 'var(--accent)', 'var(--warning)', 'var(--danger)', '#8b5cf6',
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6', 'var(--accent)',
  ]

  const openAddModal = () => {
    setEditingBranch(null)
    setBranchName('')
    setModalOpen(true)
  }

  const openEditModal = (branch: any) => {
    setEditingBranch(branch)
    setBranchName(branch.name)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!branchName.trim()) {
      toast.error('Branch name is required')
      return
    }
    setSaving(true)
    try {
      const payload = editingBranch 
        ? { name: branchName, code: editingBranch.code }
        : { name: branchName, code: branchName.substring(0, 3).toUpperCase() }

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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="page-title">Branches</h2>
          <p className="page-subtitle">{branches.length} active branches</p>
        </div>
        {isAdmin && (
          <Button onClick={openAddModal} className="bg-[var(--brand-orange)] hover:bg-orange-600 text-white gap-2">
            <Plus size={16} /> Add Branch
          </Button>
        )}
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', gap: 12 }}>
            <BrandSpinner />
            <span style={{ color: 'var(--text-secondary)' }}>Loading…</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {branches.map((branch, i) => (
              <div key={branch.id} className="card relative group flex flex-col" style={{ borderTop: `3px solid ${BRANCH_COLORS[i % BRANCH_COLORS.length]}` }}>
                {isAdmin && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEditModal(branch)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(branch.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
                <div style={{
                  width: 40, height: 40,
                  background: `${BRANCH_COLORS[i % BRANCH_COLORS.length]}22`,
                  border: `1px solid ${BRANCH_COLORS[i % BRANCH_COLORS.length]}44`,
                  borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 800,
                  color: BRANCH_COLORS[i % BRANCH_COLORS.length],
                  marginBottom: 12,
                }}>
                  {branch.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{branch.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 8 }}>
                  {branch.code}
                </div>
                {branch._count?.employees !== undefined && (
                  <div className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                    {branch._count.employees} Employee{branch._count.employees !== 1 ? 's' : ''}
                  </div>
                )}
                <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {branch.isActive ? (
                    <span className="badge badge-green">● Active</span>
                  ) : (
                    <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>● Inactive</span>
                  )}
                  <Link href={`/?branchId=${branch.id}`} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: 12 }}>
                    Dashboard →
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
            <DialogTitle>{editingBranch ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Branch Name</Label>
              <Input
                id="name"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g. Uttara Branch"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[var(--brand-orange)] hover:bg-orange-600 text-white">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
