'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { BrandSpinner } from '@/components/ui/BrandSpinner'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

type Tab = 'ACCOUNTS' | 'SLIPS'

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<Tab>('ACCOUNTS')

  const [branches, setBranches] = useState<any[]>([])
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
        if (activeTab === 'ACCOUNTS') {
          const [accountsRes, branchesRes] = await Promise.all([
            fetch('/api/accounts?includeInactive=true'),
            fetch('/api/branches')
          ])
          if (!cancelled) {
            if (accountsRes.ok) setAccounts(await accountsRes.json())
            if (branchesRes.ok) setBranches(await branchesRes.json())
          }
        } else if (activeTab === 'SLIPS') {
          const res = await fetch('/api/hr/settings')
          if (res.ok && !cancelled) setSettings(await res.json())
        }
      } catch {
        if (!cancelled) toast.error('Failed to load data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchData()
    return () => { cancelled = true }
  }, [activeTab, refreshNonce])

  const openModal = (item: any = null) => {
    setSelectedItem(item)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Deleted successfully')
      setRefreshNonce(v => v + 1)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const payload: any = Object.fromEntries(formData.entries())
    if (payload.isActive !== undefined) payload.isActive = payload.isActive === 'true'

    const url = selectedItem ? `/api/accounts/${selectedItem.id}` : '/api/accounts'
    try {
      const res = await fetch(url, {
        method: selectedItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(selectedItem ? 'Updated successfully' : 'Created successfully')
      setModalOpen(false)
      setRefreshNonce(v => v + 1)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'ACCOUNTS', label: 'Accounts' },
    { id: 'SLIPS', label: 'Slip Settings' },
  ]

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Admin Settings</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Manage accounts and system preferences</p>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 min-h-0 flex flex-col overflow-auto">
        <div className="flex flex-wrap gap-4 border-b border-[var(--border)]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
              <h3 className="text-xl font-bold text-[var(--text-primary)]">Accounts Directory</h3>
              <Button className="flex items-center gap-2" onClick={() => openModal()}>
                <Plus size={16} /> Add New
              </Button>
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-[var(--surface-raised)] border-b border-[var(--border)]">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Name</TableHead>
                    <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Type</TableHead>
                    <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map(item => (
                    <TableRow key={item.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                      <TableCell className="font-medium text-[var(--text-primary)]">{item.name}</TableCell>
                      <TableCell className="text-[var(--text-secondary)]">{item.type}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold ${item.isActive ? 'bg-[var(--success-subtle)]/30 text-[var(--success)]' : 'bg-[var(--danger-subtle)]/30 text-[var(--danger)]'}`}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openModal(item)} className="h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]">
                          <Edit2 size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)]/50">
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {accounts.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={4} className="p-8 text-center text-[var(--text-muted)]">No accounts found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {modalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">
                {selectedItem ? 'Edit' : 'Add New'} Account
              </h3>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-1 block">Name</label>
                  <input type="text" name="name" defaultValue={selectedItem?.name} className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" required />
                </div>
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-1 block">Account Type</label>
                  <select name="type" defaultValue={selectedItem?.type || 'BRANCH'} className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" required>
                    <option value="BRANCH">Branch</option>
                    <option value="COMPANY">Company</option>
                    <option value="ONLINE_DEPARTMENT">Online Department</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-1 block">Assigned Branch (Optional)</label>
                  <select name="branchId" defaultValue={selectedItem?.branchId || ''} className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50">
                    <option value="">None</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-1 block">Status</label>
                  <select name="isActive" defaultValue={selectedItem ? String(selectedItem.isActive) : 'true'} className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
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
