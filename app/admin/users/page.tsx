'use client'

import { useEffect, useState } from 'react'
import { PlusCircle } from 'lucide-react'
import toast from 'react-hot-toast'

type User = {
  id: number
  username: string
  role: string
  branchId: number | null
  branch: { name: string } | null
  managedBranches?: { id: number, name: string }[]
}

type Branch = {
  id: number
  name: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  // Form
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('BRANCH')
  const [branchId, setBranchId] = useState('')
  const [managedBranchIds, setManagedBranchIds] = useState<number[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/branches').then(r => r.json())
    ]).then(([uData, bData]) => {
      if (Array.isArray(uData)) setUsers(uData)
      if (Array.isArray(bData)) setBranches(bData)
      setLoading(false)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (role === 'BRANCH' && !branchId) {
      toast.error('Please select a branch for BRANCH role')
      return
    }

    if (role === 'AREA_MANAGER' && managedBranchIds.length === 0) {
      toast.error('Please select at least one branch for AREA_MANAGER')
      return
    }

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username, 
        password, 
        role, 
        branchId: role === 'BRANCH' ? branchId : undefined,
        managedBranchIds: role === 'AREA_MANAGER' ? managedBranchIds : undefined
      }),
    })
    
    const data = await res.json()
    if (res.ok) {
      setUsers([data, ...users])
      setUsername('')
      setPassword('')
      setRole('BRANCH')
      setBranchId('')
      setManagedBranchIds([])
      toast.success('User created successfully!')
    } else {
      toast.error(data.error || 'Failed to create user')
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <form onSubmit={handleSubmit} className="bg-[#131b2c] p-6 rounded-lg border border-[#1e2d45] space-y-4">
            <h2 className="text-lg font-semibold border-b border-[#1e2d45] pb-2 mb-4">Create User</h2>

            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">Username</label>
              <input 
                required 
                className="form-input w-full" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
              />
            </div>

            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">Password</label>
              <input 
                required 
                type="password" 
                className="form-input w-full" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
            </div>

            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">Role</label>
              <select className="form-input form-select w-full" value={role} onChange={e => setRole(e.target.value)}>
                <option value="BRANCH">BRANCH</option>
                <option value="AREA_MANAGER">AREA_MANAGER</option>
                <option value="AUDITOR">AUDITOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            {role === 'BRANCH' && (
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Branch</label>
                <select className="form-input form-select w-full" value={branchId} onChange={e => setBranchId(e.target.value)}>
                  <option value="">-- Select Branch --</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}

            {role === 'AREA_MANAGER' && (
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Managed Branches</label>
                <div className="bg-[#0a0f18] border border-[#1e2d45] rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {branches.map(b => (
                    <label key={b.id} className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-[#1e2d45] bg-[#162033] text-[#3b82f6] focus:ring-[#3b82f6]"
                        checked={managedBranchIds.includes(b.id)}
                        onChange={(e) => {
                          setManagedBranchIds(prev => 
                            e.target.checked ? [...prev, b.id] : prev.filter(id => id !== b.id)
                          )
                        }}
                      />
                      <span className="text-sm text-[#f0f4ff]">{b.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" className="w-full mt-2 py-2 rounded font-medium flex items-center justify-center bg-[#00d2ff] hover:bg-[#00d2ff]/80 text-black">
              <PlusCircle size={16} className="mr-2" />
              Create User
            </button>
          </form>
        </div>

        <div className="md:col-span-2">
          <div className="bg-[#131b2c] rounded-lg border border-[#1e2d45] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1e2d45]/50 border-b border-[#1e2d45] text-sm text-[var(--text-muted)]">
                  <th className="p-3">Username</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Assigned Branch</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-[#1e2d45] hover:bg-[#1e2d45]/30">
                    <td className="p-3 font-medium">{u.username}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded ${u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 text-[var(--text-muted)] text-sm">
                      {u.role === 'ADMIN' ? 'All Branches' : 
                       u.role === 'AUDITOR' ? 'All Branches (Read-Only)' :
                       u.role === 'AREA_MANAGER' ? (u.managedBranches?.map(b => b.name).join(', ') || 'None') :
                       u.branch?.name || 'Unassigned'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
