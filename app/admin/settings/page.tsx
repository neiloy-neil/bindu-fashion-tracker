'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { BrandSpinner } from '@/components/ui/BrandSpinner'

type Tab = 'BRANCHES' | 'PARTIES' | 'ACCOUNTS' | 'EMPLOYEES'

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<Tab>('BRANCHES')
  
  const [branches, setBranches] = useState<any[]>([])
  const [parties, setParties] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [refreshNonce, setRefreshNonce] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      try {
        if (activeTab === 'BRANCHES') {
          const res = await fetch('/api/branches')
          if (res.ok && !cancelled) setBranches(await res.json())
        } else if (activeTab === 'PARTIES') {
          const res = await fetch('/api/parties?includeInactive=true')
          if (res.ok && !cancelled) setParties(await res.json())
        } else if (activeTab === 'ACCOUNTS') {
          const res = await fetch('/api/accounts?includeInactive=true')
          if (res.ok && !cancelled) setAccounts(await res.json())
        } else if (activeTab === 'EMPLOYEES') {
          const res = await fetch('/api/employees?includeInactive=true')
          if (res.ok && !cancelled) setEmployees(await res.json())
        }
      } catch {
        if (!cancelled) {
          toast.error('Failed to load data')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchData()

    return () => {
      cancelled = true
    }
  }, [activeTab, refreshNonce])

  const openModal = (item: any = null) => {
    setSelectedItem(item)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return
    
    let url = ''
    if (activeTab === 'PARTIES') url = `/api/parties/${id}`
    else if (activeTab === 'ACCOUNTS') url = `/api/accounts/${id}`
    else if (activeTab === 'EMPLOYEES') url = `/api/employees/${id}`

    try {
      const res = await fetch(url, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      toast.success('Deleted successfully')
      setRefreshNonce((value) => value + 1)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const payload: any = Object.fromEntries(formData.entries())
    if (payload.isActive !== undefined) {
      payload.isActive = payload.isActive === 'true'
    }

    let url = ''
    if (activeTab === 'BRANCHES') url = '/api/branches'
    else if (activeTab === 'PARTIES') url = '/api/parties'
    else if (activeTab === 'ACCOUNTS') url = '/api/accounts'
    else if (activeTab === 'EMPLOYEES') url = '/api/employees'

    if (selectedItem) url += `/${selectedItem.id}`

    try {
      const res = await fetch(url, {
        method: selectedItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(selectedItem ? 'Updated successfully' : 'Created successfully')
      setModalOpen(false)
      setRefreshNonce((value) => value + 1)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const tabs = [
    { id: 'BRANCHES', label: 'Branches Configuration' },
    { id: 'PARTIES', label: 'Parties' },
    { id: 'ACCOUNTS', label: 'Accounts' },
    { id: 'EMPLOYEES', label: 'Employees' },
  ]

  const renderTable = () => {
    let data: any[] = []
    let columns: { key: string, label: string }[] = []

    if (activeTab === 'BRANCHES') {
      data = branches
      columns = [{ key: 'name', label: 'Name' }, { key: 'code', label: 'Code' }, { key: 'status', label: 'Status' }]
    } else if (activeTab === 'PARTIES') {
      data = parties
      columns = [{ key: 'name', label: 'Name' }, { key: 'balance', label: 'Balance' }, { key: 'status', label: 'Status' }]
    } else if (activeTab === 'ACCOUNTS') {
      data = accounts
      columns = [{ key: 'name', label: 'Name' }, { key: 'type', label: 'Type' }, { key: 'status', label: 'Status' }]
    } else if (activeTab === 'EMPLOYEES') {
      data = employees
      columns = [{ key: 'name', label: 'Name' }, { key: 'status', label: 'Status' }]
    }

    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border)] text-[var(--text-secondary)] text-sm">
              {columns.map(c => <th key={c.key} className="p-4 font-semibold">{c.label}</th>)}
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map(item => (
              <tr key={item.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="p-4 text-white font-medium">{item.name}</td>
                
                {activeTab === 'BRANCHES' && <td className="p-4 text-[var(--text-secondary)]">{item.code}</td>}
                {activeTab === 'PARTIES' && <td className="p-4 text-[var(--text-secondary)]">৳{item.balance?.toFixed(2)}</td>}
                {activeTab === 'ACCOUNTS' && <td className="p-4 text-[var(--text-secondary)]">{item.type}</td>}
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${item.isActive ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-[var(--danger)]/20 text-[var(--danger)]'}`}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4 text-right flex justify-end gap-2">
                  <button onClick={() => openModal(item)} className="p-2 bg-[var(--border)] hover:bg-[var(--accent)] hover:text-[var(--bg-card)] text-[var(--text-secondary)] rounded transition-colors" title="Edit">
                    <Edit2 size={14} />
                  </button>
                  {activeTab !== 'BRANCHES' && (
                    <button onClick={() => handleDelete(item.id)} className="p-2 bg-[var(--border)] hover:bg-red-500 hover:text-white text-[var(--text-secondary)] rounded transition-colors" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data.length === 0 && !loading && (
              <tr>
                <td colSpan={columns.length + 1} className="p-8 text-center text-[var(--text-secondary)]">No data found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }

  const renderFormFields = () => {
    return (
      <>
        <div>
          <label className="text-sm text-[var(--text-secondary)] mb-1 block">Name</label>
          <input type="text" name="name" defaultValue={selectedItem?.name} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded p-2 text-white focus:outline-none focus:border-[var(--accent)]" required />
        </div>

        {activeTab === 'BRANCHES' && (
          <div>
            <label className="text-sm text-[var(--text-secondary)] mb-1 block">Code</label>
            <input type="text" name="code" defaultValue={selectedItem?.code} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded p-2 text-white focus:outline-none focus:border-[var(--accent)]" required />
          </div>
        )}

        {activeTab === 'ACCOUNTS' && (
          <div>
            <label className="text-sm text-[var(--text-secondary)] mb-1 block">Account Type</label>
            <select name="type" defaultValue={selectedItem?.type || 'BRANCH'} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded p-2 text-white focus:outline-none focus:border-[var(--accent)]" required>
              <option value="BRANCH">Branch</option>
              <option value="COMPANY">Company</option>
              <option value="ONLINE_DEPARTMENT">Online Department</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        )}

        <div>
          <label className="text-sm text-[var(--text-secondary)] mb-1 block">Status</label>
          <select name="isActive" defaultValue={selectedItem ? String(selectedItem.isActive) : 'true'} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded p-2 text-white focus:outline-none focus:border-[var(--accent)]">
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="page-header mb-8">
        <div>
          <h2 className="page-title text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-[#3a7bd5] bg-clip-text text-transparent">Admin Settings</h2>
          <p className="page-subtitle">Manage users, branches, and system preferences</p>
        </div>
      </div>

      <div className="flex gap-4 mb-8 border-b border-[var(--border)] overflow-x-auto whitespace-nowrap scrollbar-hide">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`pb-4 px-4 font-semibold transition-colors ${activeTab === tab.id ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><BrandSpinner /></div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white capitalize">{tabs.find(t => t.id === activeTab)?.label} Directory</h3>
            <button className="btn btn-primary flex items-center gap-2" onClick={() => openModal()}>
              <Plus size={16} /> Add New
            </button>
          </div>
          {renderTable()}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">
              {selectedItem ? 'Edit' : 'Add New'} {tabs.find(t => t.id === activeTab)?.label?.replace(' Configuration', '')}
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {renderFormFields()}
              
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{selectedItem ? 'Save Changes' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
