'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Edit2, Key, Trash2, PowerOff, Power } from 'lucide-react'

export default function AdminSettings() {
  const router = useRouter()
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)



  const fetchBranches = async () => {
    const res = await fetch('/api/branches') // We can just use the public branches since it returns what we need, but wait, maybe we need all branches including inactive?
    // Actually, admin can just use /api/branches for now if it returns all. Let's assume it does.
    if (res.ok) setBranches(await res.json())
  }

  useEffect(() => {
    setLoading(true)
    fetchBranches().finally(() => setLoading(false))
  }, [])

  const [branchModal, setBranchModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)

  const handleBranchSubmit = async (e: any) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const payload = Object.fromEntries(formData.entries())
    payload.isActive = payload.isActive === 'true'

    try {
      const url = selectedItem ? `/api/branches/${selectedItem.id}` : '/api/branches'
      const method = selectedItem ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(selectedItem ? 'Branch updated' : 'Branch created')
      setBranchModal(false)
      fetchBranches()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="page-header mb-8">
        <div>
          <h2 className="page-title text-3xl font-bold bg-gradient-to-r from-[#00d2ff] to-[#3a7bd5] bg-clip-text text-transparent">Admin Settings</h2>
          <p className="page-subtitle">Manage users, branches, and system preferences</p>
        </div>
      </div>

      <div className="flex gap-4 mb-8 border-b border-[#1e2d45]">
        <button 
          className="pb-4 px-4 font-semibold transition-colors text-[#00d2ff] border-b-2 border-[#00d2ff]"
        >
          Branches Configuration
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner"></div></div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Branches Directory</h3>
            <button className="btn btn-primary flex items-center gap-2" onClick={() => { setSelectedItem(null); setBranchModal(true) }}>
              <Plus size={16} /> Add Branch
            </button>
          </div>
          <div className="bg-[#0a0f18] border border-[#1e2d45] rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#162033] border-b border-[#1e2d45] text-[#8899aa] text-sm">
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Code</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches.map(b => (
                  <tr key={b.id} className="border-b border-[#1e2d45] hover:bg-[#162033] transition-colors">
                    <td className="p-4 text-white font-medium">{b.name}</td>
                    <td className="p-4 text-[#8899aa]">{b.code}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${b.isActive ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>
                        {b.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      <button onClick={() => { setSelectedItem(b); setBranchModal(true) }} className="p-2 bg-[#1e2d45] hover:bg-[#00d2ff] hover:text-[#0a0f18] text-[#8899aa] rounded transition-colors" title="Edit Branch">
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {/* Branch Modal */}
      {branchModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#162033] border border-[#1e2d45] rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">{selectedItem ? 'Edit Branch' : 'Add New Branch'}</h3>
            <form onSubmit={handleBranchSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-[#8899aa] mb-1 block">Branch Name</label>
                <input type="text" name="name" defaultValue={selectedItem?.name} className="w-full bg-[#0a0f18] border border-[#1e2d45] rounded p-2 text-white focus:outline-none focus:border-[#00d2ff]" required />
              </div>
              <div>
                <label className="text-sm text-[#8899aa] mb-1 block">Branch Code</label>
                <input type="text" name="code" defaultValue={selectedItem?.code} className="w-full bg-[#0a0f18] border border-[#1e2d45] rounded p-2 text-white focus:outline-none focus:border-[#00d2ff]" required />
              </div>
              <div>
                <label className="text-sm text-[#8899aa] mb-1 block">Status</label>
                <select name="isActive" defaultValue={selectedItem ? String(selectedItem.isActive) : 'true'} className="w-full bg-[#0a0f18] border border-[#1e2d45] rounded p-2 text-white focus:outline-none focus:border-[#00d2ff]">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setBranchModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{selectedItem ? 'Save Changes' : 'Create Branch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
