'use client'

import { useEffect, useState } from 'react'
import { PlusCircle, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

type User = {
  id: number
  username: string
  email?: string | null
  phoneNumber?: string | null
  role: string
  isActive: boolean
  branchId: number | null
  branch: { id: number; name: string } | null
  managedBranches?: { id: number; name: string }[]
  employeeId?: number | null
  employee?: { id: number; name: string } | null
}

type Employee = { id: number; name: string; employeeId: string }
type Branch = { id: number; name: string }

const ROLES = ['BRANCH', 'AREA_MANAGER', 'AUDITOR', 'HR_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'ACCOUNTS'] as const

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // Create form
  const [createUsername, setCreateUsername] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createPhone, setCreatePhone] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createRole, setCreateRole] = useState<string>('BRANCH')
  const [createBranchId, setCreateBranchId] = useState('')
  const [createEmployeeId, setCreateEmployeeId] = useState('')
  const [createManagedBranchIds, setCreateManagedBranchIds] = useState<number[]>([])

  // Edit modal
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editUsername, setEditUsername] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editBranchId, setEditBranchId] = useState('')
  const [editManagedBranchIds, setEditManagedBranchIds] = useState<number[]>([])
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/branches').then(r => r.json()),
      fetch('/api/hr/employees?active=true').then(r => r.json()),
    ]).then(([uData, bData, eData]) => {
      if (Array.isArray(uData)) setUsers(uData)
      if (Array.isArray(bData)) setBranches(bData)
      if (Array.isArray(eData)) setEmployees(eData)
      setLoading(false)
    })
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (createRole === 'BRANCH' && !createBranchId) { toast.error('Select a branch'); return }
    if (createRole === 'AREA_MANAGER' && createManagedBranchIds.length === 0) { toast.error('Select at least one branch'); return }

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: createUsername,
        email: createEmail || undefined,
        phoneNumber: createPhone || undefined,
        password: createPassword,
        role: createRole,
        branchId: createRole === 'BRANCH' ? createBranchId : undefined,
        employeeId: createEmployeeId || undefined,
        managedBranchIds: createRole === 'AREA_MANAGER' ? createManagedBranchIds : undefined,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setUsers(prev => [data, ...prev])
      setCreateUsername(''); setCreateEmail(''); setCreatePhone(''); setCreatePassword('')
      setCreateRole('BRANCH'); setCreateBranchId(''); setCreateEmployeeId(''); setCreateManagedBranchIds([])
      toast.success('User created')
    } else {
      toast.error(data.error || 'Failed to create user')
    }
  }

  const openEdit = (u: User) => {
    setEditUser(u)
    setEditUsername(u.username)
    setEditEmail(u.email ?? '')
    setEditPhone(u.phoneNumber ?? '')
    setEditPassword('')
    setEditRole(u.role)
    setEditBranchId(u.branchId ? String(u.branchId) : '')
    setEditManagedBranchIds(u.managedBranches?.map(b => b.id) ?? [])
  }

  const handleEditSave = async () => {
    if (!editUser) return
    setEditSaving(true)
    try {
      const body: any = {
        username: editUsername,
        email: editEmail || null,
        phoneNumber: editPhone || null,
        role: editRole,
        isActive: editUser.isActive,
        branchId: editRole === 'BRANCH' ? (editBranchId ? parseInt(editBranchId) : null) : null,
        managedBranchIds: editRole === 'AREA_MANAGER' ? editManagedBranchIds : [],
      }
      if (editPassword.trim()) body.password = editPassword.trim()

      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...data } : u))
      setEditUser(null)
      toast.success('User updated')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setEditSaving(false)
    }
  }

  const toggleActive = async (u: User) => {
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !u.isActive }),
    })
    const data = await res.json()
    if (res.ok) {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isActive: data.isActive } : x))
      toast.success(data.isActive ? 'User activated' : 'User deactivated')
    } else {
      toast.error(data.error || 'Failed to update')
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">User Management</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Manage system access and roles</p>
        </div>
      </div>
      <div className="flex-1 p-6 space-y-6 min-h-0 flex flex-col overflow-auto">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Create Form */}
        <div className="md:col-span-1">
          <form onSubmit={handleCreate} className="bg-[var(--bg-card)] p-6 rounded-lg border border-[var(--border)] space-y-4">
            <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2 mb-4">Create User</h2>

            {[
              { label: 'Username', value: createUsername, set: setCreateUsername, type: 'text', required: true },
              { label: `Email${createRole === 'HR_ADMIN' ? ' *' : ''}`, value: createEmail, set: setCreateEmail, type: 'email', required: createRole === 'HR_ADMIN' },
              { label: 'Phone Number', value: createPhone, set: setCreatePhone, type: 'tel', required: false },
              { label: 'Password', value: createPassword, set: setCreatePassword, type: 'password', required: true },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-sm text-[var(--text-muted)] mb-1">{f.label}</label>
                <input required={f.required} type={f.type} className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" value={f.value}
                  onChange={e => f.set(e.target.value)} />
              </div>
            ))}

            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">Role</label>
              <select className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" value={createRole} onChange={e => setCreateRole(e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {createRole === 'BRANCH' && (
              <>
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Branch</label>
                  <select className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" value={createBranchId} onChange={e => setCreateBranchId(e.target.value)}>
                    <option value="">-- Select Branch --</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Linked Employee (Optional)</label>
                  <select className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" value={createEmployeeId} onChange={e => setCreateEmployeeId(e.target.value)}>
                    <option value="">-- None --</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>)}
                  </select>
                </div>
              </>
            )}

            {createRole === 'AREA_MANAGER' && (
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Managed Branches</label>
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {branches.map(b => (
                    <label key={b.id} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="rounded" checked={createManagedBranchIds.includes(b.id)}
                        onChange={e => setCreateManagedBranchIds(prev => e.target.checked ? [...prev, b.id] : prev.filter(id => id !== b.id))} />
                      <span className="text-sm">{b.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" className="w-full mt-2 flex items-center justify-center">
              <PlusCircle size={16} className="mr-2" /> Create User
            </Button>
          </form>
        </div>

        {/* User Table */}
        <div className="md:col-span-2">
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
            <Table>
              <TableHeader className="bg-[var(--surface)] border-b border-[var(--border)]">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">User</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Role</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Branch</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                    <TableCell>
                      <div className="font-medium text-[var(--text-primary)]">{u.username}</div>
                      {u.email && <div className="text-xs text-[var(--text-muted)]">{u.email}</div>}
                      {u.phoneNumber && <div className="text-xs text-[var(--text-muted)]">{u.phoneNumber}</div>}
                    </TableCell>
                    <TableCell>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${u.role === 'ADMIN' || u.role === 'SUPER_ADMIN' ? 'bg-[var(--info-subtle)]/30 text-[var(--info)]' : 'bg-[var(--success-subtle)]/30 text-[var(--success)]'}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)] text-sm">
                      {u.role === 'ADMIN' || u.role === 'SUPER_ADMIN' ? 'All Branches' :
                       u.role === 'AUDITOR' ? 'Read-Only' :
                       u.role === 'AREA_MANAGER' ? (u.managedBranches?.map(b => b.name).join(', ') || 'None') :
                       u.branch?.name || 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      <button onClick={() => toggleActive(u)} title={u.isActive ? 'Deactivate' : 'Activate'}
                        className={`flex items-center gap-1 text-xs font-medium ${u.isActive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                        {u.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        {u.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openEdit(u)} className="text-xs px-3 h-8 flex items-center gap-1.5 ml-auto">
                        <Pencil size={13} /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold">Edit User — {editUser.username}</h2>
              <button onClick={() => setEditUser(null)} className="text-[var(--text-muted)] hover:text-foreground text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Username</label>
                  <input className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" value={editUsername} onChange={e => setEditUsername(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Phone Number</label>
                  <input className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Email</label>
                <input className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">New Password <span className="text-[var(--text-muted)] font-normal">(leave blank to keep current)</span></label>
                <input className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Min 6 characters" />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Role</label>
                <select className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" value={editRole} onChange={e => setEditRole(e.target.value)}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {editRole === 'BRANCH' && (
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Branch</label>
                  <select className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" value={editBranchId} onChange={e => setEditBranchId(e.target.value)}>
                    <option value="">-- Select Branch --</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
              {editRole === 'AREA_MANAGER' && (
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Managed Branches</label>
                  <div className="border border-[var(--border)] rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                    {branches.map(b => (
                      <label key={b.id} className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={editManagedBranchIds.includes(b.id)}
                          onChange={e => setEditManagedBranchIds(prev => e.target.checked ? [...prev, b.id] : prev.filter(id => id !== b.id))} />
                        <span className="text-sm">{b.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 pt-1">
                <button onClick={() => setEditUser(u => u ? { ...u, isActive: !u.isActive } : u)}
                  className={`flex items-center gap-1.5 text-sm font-medium ${editUser.isActive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                  {editUser.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  {editUser.isActive ? 'Active' : 'Inactive'} — click to toggle
                </button>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditUser(null)} className="px-4">Cancel</Button>
              <Button onClick={handleEditSave} disabled={editSaving} className="px-6">
                {editSaving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
