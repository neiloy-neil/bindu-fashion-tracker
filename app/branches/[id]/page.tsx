'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin, Phone, User, Building2, Pencil, TrendingUp, TrendingDown, CalendarDays, Plus, Trash2, PartyPopper } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { BranchFormModal } from '@/components/BranchFormModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const TYPE_LABELS: Record<string, string> = {
  RETAIL: 'Retail',
  WHOLESALE: 'Wholesale',
  FACTORY: 'Factory',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function amount(n: number) {
  return '৳' + n.toLocaleString('en-BD')
}

export default function BranchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN'

  const [branch, setBranch] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadNonce, setReloadNonce] = useState(0)

  const [editOpen, setEditOpen] = useState(false)

  // Holidays
  const [holidays, setHolidays] = useState<any[]>([])
  const [holidayModalOpen, setHolidayModalOpen] = useState(false)
  const [hForm, setHForm] = useState({ date: '', name: '', note: '' })
  const [hSaving, setHSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/branches/${id}/holidays`)
      .then(r => r.json())
      .then(d => setHolidays(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [id, reloadNonce])

  const addHoliday = async () => {
    if (!hForm.date || !hForm.name.trim()) { toast.error('Date and holiday name are required'); return }
    setHSaving(true)
    try {
      const res = await fetch(`/api/branches/${id}/holidays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hForm),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      toast.success('Holiday added')
      setHolidayModalOpen(false)
      setHForm({ date: '', name: '', note: '' })
      setReloadNonce(n => n + 1)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setHSaving(false)
    }
  }

  const deleteHoliday = async (hid: number) => {
    if (!confirm('Remove this holiday?')) return
    try {
      const res = await fetch(`/api/branches/${id}/holidays/${hid}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Holiday removed')
      setHolidays(h => h.filter(x => x.id !== hid))
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetch(`/api/branches/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject('Not found'))
      .then(d => { setBranch(d); setLoading(false) })
      .catch(() => { toast.error('Branch not found'); router.push('/branches') })
  }, [id, reloadNonce])


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
          <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => setEditOpen(true)}>
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
              {(branch.pettyCashTarget ?? 0) > 0 && (
                <DetailRow icon={<Building2 size={14} />} label="Petty Cash Target" value={amount(branch.pettyCashTarget)} />
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

        {/* Weekly Off Days */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Weekly Off Days</h2>
            {(branch.offDays?.length ?? 0) === 0 && (
              <span className="text-xs text-[var(--text-muted)]">None configured</span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {DAYS.map((day, i) => {
              const isOff = (branch.offDays ?? []).includes(i)
              return (
                <span key={i} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${isOff ? 'bg-[var(--danger-subtle)] text-[var(--danger)] border-[var(--danger)]/30' : 'bg-[var(--surface-raised)] text-[var(--text-muted)] border-[var(--border)]'}`}>
                  {day}
                  {isOff && ' ✕'}
                </span>
              )
            })}
          </div>
          {(branch.offDays?.length ?? 0) > 0 && (
            <p className="mt-3 text-xs text-[var(--text-muted)]">Branch is closed on {(branch.offDays ?? []).map((d: number) => DAYS[d]).join(', ')} every week.</p>
          )}
        </div>

        {/* Holidays */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PartyPopper size={15} className="text-[var(--warning)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Branch Holidays
                {holidays.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">{holidays.length} set</span>
                )}
              </h2>
            </div>
            {isAdmin && (
              <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setHolidayModalOpen(true)}>
                <Plus size={12} /> Add Holiday
              </Button>
            )}
          </div>

          {holidays.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-[var(--text-muted)]">
              <CalendarDays size={28} className="opacity-30" />
              <p className="text-sm">No holidays configured for this branch</p>
              {isAdmin && (
                <Button size="sm" variant="ghost" className="text-xs mt-1 gap-1" onClick={() => setHolidayModalOpen(true)}>
                  <Plus size={12} /> Add first holiday
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {holidays.map((h: any) => {
                const d = new Date(h.date)
                const isPast = d < new Date(new Date().toDateString())
                return (
                  <div key={h.id} className="flex items-center gap-4 px-5 py-3">
                    <div className={`text-center min-w-[44px] rounded-lg px-2 py-1 ${isPast ? 'bg-[var(--surface-raised)] text-[var(--text-muted)]' : 'bg-[var(--warning-subtle)] text-[var(--warning)]'}`}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide leading-none">
                        {d.toLocaleDateString('en-BD', { month: 'short' })}
                      </p>
                      <p className="text-lg font-bold leading-tight">
                        {d.getUTCDate()}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isPast ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>{h.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {d.toLocaleDateString('en-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        {h.note && <span className="ml-2 italic">· {h.note}</span>}
                      </p>
                    </div>
                    {isPast && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface-raised)] text-[var(--text-muted)] font-medium shrink-0">Past</span>
                    )}
                    {isAdmin && (
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)] shrink-0"
                        onClick={() => deleteHoliday(h.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Holiday modal */}
      <Dialog open={holidayModalOpen} onOpenChange={setHolidayModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Add Branch Holiday</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input
                type="date"
                value={hForm.date}
                onChange={e => setHForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Holiday Name *</Label>
              <Input
                value={hForm.name}
                onChange={e => setHForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Eid ul-Fitr, National Day"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Note <span className="text-[var(--text-muted)] font-normal">(optional)</span></Label>
              <Input
                value={hForm.note}
                onChange={e => setHForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Any additional note"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setHolidayModalOpen(false)} disabled={hSaving}>Cancel</Button>
            <Button onClick={addHoliday} disabled={hSaving}>{hSaving ? 'Saving…' : 'Add Holiday'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <BranchFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        branch={branch}
        onSaved={() => setReloadNonce(n => n + 1)}
      />
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
