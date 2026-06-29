'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { BrandSpinner } from '@/components/ui/BrandSpinner'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

type Tab = 'BRANCHES' | 'PARTIES' | 'ACCOUNTS' | 'SLIPS'

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<Tab>('BRANCHES')
  
  const [branches, setBranches] = useState<any[]>([])
  const [parties, setParties] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [savingSettings, setSavingSettings] = useState(false)

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
        } else if (activeTab === 'SLIPS') {
          const res = await fetch('/api/hr/settings')
          if (res.ok && !cancelled) setSettings(await res.json())
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
    { id: 'SLIPS', label: 'Slip Settings' },
  ]

  const handleSaveSettings = async (e: any) => {
    e.preventDefault()
    setSavingSettings(true)
    const formData = new FormData(e.target)
    const payload: any = Object.fromEntries(formData.entries())
    
    try {
      const res = await fetch('/api/hr/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save settings')
      toast.success('Settings updated successfully')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingSettings(false)
    }
  }

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
    }

    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-[var(--surface-raised)] border-b border-[var(--border)]">
            <TableRow className="border-none hover:bg-transparent">
              {columns.map(c => <TableHead key={c.key} className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">{c.label}</TableHead>)}
              <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(item => (
              <TableRow key={item.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                <TableCell className="font-medium text-[var(--text-primary)]">{item.name}</TableCell>
                
                {activeTab === 'BRANCHES' && <TableCell className="text-[var(--text-secondary)]">{item.code}</TableCell>}
                {activeTab === 'PARTIES' && <TableCell className="text-[var(--text-secondary)]">৳{item.balance?.toFixed(2)}</TableCell>}
                {activeTab === 'ACCOUNTS' && <TableCell className="text-[var(--text-secondary)]">{item.type}</TableCell>}
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold ${item.isActive ? 'bg-[var(--success-subtle)]/30 text-[var(--success)]' : 'bg-[var(--danger-subtle)]/30 text-[var(--danger)]'}`}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="text-right flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openModal(item)} className="h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]" title="Edit">
                    <Edit2 size={14} />
                  </Button>
                  {activeTab !== 'BRANCHES' && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)]/50" title="Delete">
                      <Trash2 size={14} />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="p-8 text-center text-[var(--text-muted)]">No data found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    )
  }

  const renderFormFields = () => {
    return (
      <>
        <div>
          <label className="text-sm text-[var(--text-secondary)] mb-1 block">Name</label>
          <input type="text" name="name" defaultValue={selectedItem?.name} className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" required />
        </div>

        {activeTab === 'BRANCHES' && (
          <>
            <div>
              <label className="text-sm text-[var(--text-secondary)] mb-1 block">Code</label>
              <input type="text" name="code" defaultValue={selectedItem?.code} className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" required />
            </div>
            <div>
              <label className="text-sm text-[var(--text-secondary)] mb-1 block">Branch Type</label>
              <select name="type" defaultValue={selectedItem?.type || 'RETAIL'} className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" required>
                <option value="RETAIL">Retail</option>
                <option value="WHOLESALE">Wholesale</option>
                <option value="FACTORY">Factory</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-[var(--text-secondary)] mb-1 block">Address</label>
              <textarea name="address" defaultValue={selectedItem?.address} className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" rows={2}></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[var(--text-secondary)] mb-1 block">Contact Person</label>
                <input type="text" name="contactPerson" defaultValue={selectedItem?.contactPerson} className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" />
              </div>
              <div>
                <label className="text-sm text-[var(--text-secondary)] mb-1 block">Phone Number</label>
                <input type="text" name="phoneNumber" defaultValue={selectedItem?.phoneNumber} className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" />
              </div>
            </div>
          </>
        )}

        {activeTab === 'ACCOUNTS' && (
          <div>
            <label className="text-sm text-[var(--text-secondary)] mb-1 block">Account Type</label>
            <select name="type" defaultValue={selectedItem?.type || 'BRANCH'} className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" required>
              <option value="BRANCH">Branch</option>
              <option value="COMPANY">Company</option>
              <option value="ONLINE_DEPARTMENT">Online Department</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        )}

        <div>
          <label className="text-sm text-[var(--text-secondary)] mb-1 block">Status</label>
          <select name="isActive" defaultValue={selectedItem ? String(selectedItem.isActive) : 'true'} className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50">
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Admin Settings</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Manage users, branches, and system preferences</p>
        </div>
      </div>
      <div className="flex-1 p-6 space-y-6 min-h-0 flex flex-col overflow-auto">

      <div className="flex flex-wrap gap-4 border-b border-[var(--border)]">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`pb-4 px-4 font-semibold transition-colors ${activeTab === tab.id ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><BrandSpinner /></div>
      ) : activeTab === 'SLIPS' ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 shadow-sm max-w-2xl">
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">Slip Print Settings</h3>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="text-sm text-[var(--text-secondary)] mb-1 block">Company Name</label>
              <input type="text" name="companyName" defaultValue={settings?.companyName} className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[var(--text-secondary)] mb-1 block">Generated By (Signature)</label>
                <input type="text" name="generatedBy" defaultValue={settings?.generatedBy} className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" />
              </div>
              <div>
                <label className="text-sm text-[var(--text-secondary)] mb-1 block">Payment By (Signature)</label>
                <input type="text" name="paymentBy" defaultValue={settings?.paymentBy} className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" />
              </div>
            </div>
            <div>
              <label className="text-sm text-[var(--text-secondary)] mb-1 block">Logo URL (Optional)</label>
              <input type="text" name="logoUrl" defaultValue={settings?.logoUrl || ''} className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" />
            </div>
            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={savingSettings}>
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white capitalize">{tabs.find(t => t.id === activeTab)?.label?.replace(' Configuration', '')} Directory</h3>
            <Button className="flex items-center gap-2" onClick={() => openModal()}>
              <Plus size={16} /> Add New
            </Button>
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
                <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit">{selectedItem ? 'Save Changes' : 'Create'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
