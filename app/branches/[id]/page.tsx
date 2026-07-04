'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, MapPin, Phone, User, Building2, Pencil, TrendingUp, TrendingDown, CalendarDays } from 'lucide-react'
import { formatDate } from '@/lib/utils'

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

function amount(n: number) {
  return '৳' + n.toLocaleString('en-BD')
}

export default function BranchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [branch, setBranch] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadNonce, setReloadNonce] = useState(0)

  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/branches/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject('Not found'))
      .then(d => { setBranch(d); setLoading(false) })
      .catch(() => { toast.error('Branch not found'); router.push('/branches') })
  }, [id, reloadNonce])

  const openEdit = () => {
    setForm({
      name: branch.name ?? '',
      code: branch.code ?? '',
      type: branch.type ?? 'RETAIL',
      address: branch.address ?? '',
      contactPerson: branch.contactPerson ?? '',
      phoneNumber: branch.phoneNumber ?? '',
      isActive: branch.isActive ?? true,
    })
    setEditOpen(true)
  }

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }))

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Branch name is required'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/branches/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save')
      toast.success('Branch updated')
      setEditOpen(false)
      setReloadNonce(n => n + 1)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
        <span className="text-sm text-[var(--text-muted)]">Loading…</span>
      </div>
    )
  }

  if (!branch) return null

  // Compute per-entry income & expense for the recent entries chart
  const recentEntries = (branch.entries ?? []).map((e: any) => {
    const income = (e.items ?? [])
      .filter((i: any) => i.category?.type === 'INCOME')
      .reduce((s: number, i: any) => s + Number(i.amount), 0)
    const expense = (e.expenseEntries ?? [])
      .reduce((s: number, i: any) => s + Number(i.amount), 0)
    return { date: e.date, id: e.id, income, expense, net: income - expense }
  })

  const totalIncome = recentEntries.reduce((s: number, e: any) => s + e.income, 0)
  const totalExpense = recentEntries.reduce((s: number, e: any) => s + e.expense, 0)

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.push('/branches')}>
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none truncate">{branch.name}</h1>
            <span className="font-mono text-xs text-[var(--text-muted)] shrink-0">{branch.code}</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${branch.isActive ? 'bg-[var(--success-subtle)] text-[var(--success)]' : 'bg-[var(--danger-subtle)] text-[var(--danger)]'}`}>
              {branch.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{TYPE_LABELS[branch.type] ?? branch.type}</p>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={openEdit}>
            <Pencil size={13} /> Edit
          </Button>
        )}
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Info cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Employees" value={String(branch._count?.employees ?? 0)} icon={<User size={16} />} />
          <StatCard label="Total Entries" value={String(branch._count?.entries ?? 0)} icon={<CalendarDays size={16} />} />
          <StatCard label="7-day Income" value={amount(totalIncome)} icon={<TrendingUp size={16} />} accent="success" />
          <StatCard label="7-day Expenses" value={amount(totalExpense)} icon={<TrendingDown size={16} />} accent="danger" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Branch details */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Branch Details</h2>
            <dl className="space-y-3">
              {branch.contactPerson && (
                <DetailRow icon={<User size={14} />} label="Contact Person" value={branch.contactPerson} />
              )}
              {branch.phoneNumber && (
                <DetailRow icon={<Phone size={14} />} label="Phone" value={branch.phoneNumber} />
              )}
              {branch.address && (
                <DetailRow icon={<MapPin size={14} />} label="Address" value={branch.address} />
              )}
              {branch.shiftStartTime && (
                <DetailRow icon={<CalendarDays size={14} />} label="Shift Start" value={branch.shiftStartTime} />
              )}
              {!branch.contactPerson && !branch.phoneNumber && !branch.address && (
                <p className="text-sm text-[var(--text-muted)]">No contact details added yet.</p>
              )}
            </dl>
          </div>

          {/* Recent entries */}
          <div className="lg:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent Daily Entries</h2>
            </div>
            {recentEntries.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-sm text-[var(--text-muted)]">No entries yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-raised)]">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Date</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Income</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Expense</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEntries.map((e: any) => (
                    <tr key={e.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--surface-raised)] transition-colors">
                      <td className="px-5 py-3 text-[var(--text-primary)]">{formatDate(e.date)}</td>
                      <td className="px-5 py-3 text-right text-[var(--success)] font-medium">{amount(e.income)}</td>
                      <td className="px-5 py-3 text-right text-[var(--danger)] font-medium">{amount(e.expense)}</td>
                      <td className={`px-5 py-3 text-right font-semibold ${e.net >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                        {amount(e.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Employees */}
        {branch.employees?.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Active Employees <span className="text-[var(--text-muted)] font-normal">({branch._count?.employees})</span>
              </h2>
              <Button variant="ghost" size="sm" className="text-xs text-[var(--accent)]" onClick={() => router.push(`/hr/employees?branch=${id}`)}>
                View all →
              </Button>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {branch.employees.map((emp: any) => (
                <div key={emp.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center text-xs font-bold text-[var(--accent)] shrink-0">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{emp.name}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{emp.designation || emp.employeeId}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Branch Name *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Uttara Branch" />
            </div>
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} maxLength={10} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                <option value="RETAIL">Retail</option>
                <option value="WHOLESALE">Wholesale</option>
                <option value="FACTORY">Factory</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Contact Person</Label>
              <Input value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} placeholder="Manager name" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input value={form.phoneNumber} onChange={e => set('phoneNumber', e.target.value)} placeholder="01XXXXXXXXX" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address" />
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Active</p>
                <p className="text-xs text-[var(--text-muted)]">Inactive branches are hidden from daily entry</p>
              </div>
              <button type="button" role="switch" aria-checked={form.isActive}
                onClick={() => set('isActive', !form.isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: 'success' | 'danger' }) {
  const colorClass = accent === 'success'
    ? 'text-[var(--success)]'
    : accent === 'danger'
      ? 'text-[var(--danger)]'
      : 'text-[var(--text-primary)]'
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">{icon}<span className="text-xs font-medium">{label}</span></div>
      <p className={`text-2xl font-bold tabular-nums ${colorClass}`}>{value}</p>
    </div>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-[var(--text-muted)] mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
        <p className="text-sm text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  )
}
