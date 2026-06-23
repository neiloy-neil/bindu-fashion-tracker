'use client'

import { useEffect, useState, Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Employee, Branch, SalaryRecord } from '@prisma/client'
import { calcSalary } from '@/lib/hr/calculations'
// import { downloadCSV } from '@/lib/hr/csv' // we'll skip CSV export for now or stub it
import { toast } from 'sonner'
import { Save, Users, AlertCircle, Lock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchFilter, type SortOption } from '@/components/shared/SearchFilter'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const ATTENDANCE_BONUS_AMOUNT = 700

type Row = {
  employee: Employee & { branch?: Branch }
  record: Partial<SalaryRecord>
  dirty: boolean
}

const SORT_OPTIONS: SortOption[] = [
  { label: 'Name A–Z', value: 'name_asc' },
  { label: 'Name Z–A', value: 'name_desc' },
  { label: 'Net Payable ↑', value: 'net_asc' },
  { label: 'Net Payable ↓', value: 'net_desc' },
  { label: 'Branch', value: 'branch' },
]

function formatTaka(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

function SalaryContent() {
  const params = useSearchParams()
  const now = new Date()
  const currentYear = now.getFullYear()
  const [month, setMonth] = useState(+(params.get('month') ?? now.getMonth() + 1))
  const [year, setYear] = useState(+(params.get('year') ?? currentYear))
  const [rows, setRows] = useState<Row[]>([])
  const [saving, setSaving] = useState(false)
  const [filterBranch, setFilterBranch] = useState('all')
  const [branches, setBranches] = useState<Branch[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortValue, setSortValue] = useState('name_asc')
  
  const [isLocked, setIsLocked] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [reloadNonce, setReloadNonce] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setPageLoading(true)
      try {
        const [empsRes, recsRes] = await Promise.all([
          fetch('/api/hr/employees?active=true'),
          fetch(`/api/hr/salary-records?month=${month}&year=${year}`)
        ])

        const emps = empsRes.ok ? await empsRes.json() : []
        const recs = recsRes.ok ? await recsRes.json() : []

        if (cancelled) return

        setIsLocked(recs.some((r: any) => r.lockedAt !== null))

        const uniqueBranches = Array.from(new Map(emps.filter((e: any) => e.branch).map((e: any) => [e.branch.id, e.branch])).values()) as Branch[]
        setBranches(uniqueBranches)

        const recMap = new Map((recs).map((r: any) => [r.employeeId, r]))
        setRows(emps.map((emp: any) => ({
          employee: emp,
          record: recMap.get(emp.id) ?? {
            employeeId: emp.id, month, year,
            trackerAdvanceTotal: 0, hrAdvanceDeducted: 0,
            leaveDaysTaken: 0, leaveAdjustment: 0,
            lateDays: 0, otDays: 0, attendanceBonus: 0,
            conveyanceOverride: emp.conveyance,
            notes: '',
          },
          dirty: false,
        })))
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) {
          setPageLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [month, year, reloadNonce])

  function update(empId: number, field: keyof SalaryRecord, value: number | string) {
    if (isLocked) return
    setRows(prev => prev.map(r =>
      r.employee.id === empId ? { ...r, record: { ...r.record, [field]: value }, dirty: true } : r
    ))
  }

  async function saveAll() {
    if (isLocked) return
    const dirty = rows.filter(r => r.dirty)
    if (!dirty.length) { toast.info('Nothing to save'); return }
    setSaving(true)
    
    const upserts = dirty.map(r => ({
      employeeId: r.employee.id,
      hrAdvanceDeducted: r.record.hrAdvanceDeducted ?? 0,
      leaveDaysTaken: r.record.leaveDaysTaken ?? 0,
      leaveAdjustment: r.record.leaveAdjustment ?? 0,
      lateDays: r.record.lateDays ?? 0,
      otDays: r.record.otDays ?? 0,
      attendanceBonus: r.record.attendanceBonus ?? 0,
      conveyanceOverride: r.record.conveyanceOverride ?? r.employee.conveyance,
      notes: r.record.notes ?? '',
    }))

    try {
      const res = await fetch('/api/hr/salary-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year, records: upserts })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }

      toast.success(`Saved ${dirty.length} records`)
      setRows(prev => prev.map(r => ({ ...r, dirty: false })))
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function syncTrackerAdvances() {
    setSyncing(true)
    try {
      const res = await fetch('/api/hr/sync/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year })
      })
      if (!res.ok) {
        if (res.status === 423) toast.error('Month is locked')
        else toast.error('Failed to sync advances')
        return
      }
      toast.success('Advances synced from tracker')
      setReloadNonce((value) => value + 1)
    } finally {
      setSyncing(false)
    }
  }

  async function lockMonth() {
    if (!confirm('Locking this month prevents further edits. This cannot be undone without admin access. Continue?')) return
    const res = await fetch('/api/hr/salary-records/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year })
    })
    if (res.ok) {
      toast.success('Month locked')
      setReloadNonce((value) => value + 1)
    } else {
      const err = await res.json()
      toast.error(err.error || 'Failed to lock month')
    }
  }

  const dirtyCount = rows.filter(r => r.dirty).length

  const displayed = useMemo(() => {
    let list = filterBranch === 'all' ? [...rows] : rows.filter(r => r.employee.branchId?.toString() === filterBranch)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r => r.employee.name.toLowerCase().includes(q) || (r.employee.employeeId || '').toLowerCase().includes(q))
    }
    switch (sortValue) {
      case 'name_asc': list.sort((a, b) => a.employee.name.localeCompare(b.employee.name)); break
      case 'name_desc': list.sort((a, b) => b.employee.name.localeCompare(a.employee.name)); break
      case 'net_asc': list.sort((a, b) => {
        const ca = calcSalary(a.employee, a.record as SalaryRecord)
        const cb = calcSalary(b.employee, b.record as SalaryRecord)
        return ca.netPayable - cb.netPayable
      }); break
      case 'net_desc': list.sort((a, b) => {
        const ca = calcSalary(a.employee, a.record as SalaryRecord)
        const cb = calcSalary(b.employee, b.record as SalaryRecord)
        return cb.netPayable - ca.netPayable
      }); break
      case 'branch': list.sort((a, b) => ((a.employee.branch as any)?.name ?? '').localeCompare((b.employee.branch as any)?.name ?? '')); break
    }
    return list
  }, [rows, filterBranch, search, sortValue])

  const totals = useMemo(() => {
    let advance = 0, leave = 0, late = 0, ot = 0, bonus = 0, conveyance = 0, net = 0
    displayed.forEach(row => {
      const calc = calcSalary(row.employee, row.record as SalaryRecord)
      advance += calc.advanceDeducted
      leave += calc.leaveDeduction
      late += calc.lateDeduction
      ot += calc.otAddition
      bonus += calc.attendanceBonus
      conveyance += calc.conveyance
      net += calc.netPayable
    })
    return { advance, leave, late, ot, bonus, conveyance, net, count: displayed.length }
  }, [displayed])

  const allChecked = displayed.length > 0 && displayed.every(r => (r.record.attendanceBonus ?? 0) === ATTENDANCE_BONUS_AMOUNT)
  const someChecked = displayed.some(r => (r.record.attendanceBonus ?? 0) === ATTENDANCE_BONUS_AMOUNT)

  function toggleAllBonus(checked: boolean) {
    if (isLocked) return
    const value = checked ? ATTENDANCE_BONUS_AMOUNT : 0
    setRows(prev => prev.map(r =>
      filterBranch === 'all' || r.employee.branchId?.toString() === filterBranch
        ? { ...r, record: { ...r.record, attendanceBonus: value }, dirty: true }
        : r
    ))
  }

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full mx-auto">
      <div className="flex flex-col gap-3 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              Salary Processing
              {isLocked && <Lock size={18} className="text-gray-400" />}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">Input monthly data for each employee</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={String(month)} onValueChange={v => setMonth(+(v ?? month))}>
              <SelectTrigger className="w-36 bg-white border-gray-300 text-gray-900"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={v => setYear(+(v ?? year))}>
              <SelectTrigger className="w-24 bg-white border-gray-300 text-gray-900"><SelectValue /></SelectTrigger>
              <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={syncTrackerAdvances} disabled={syncing || isLocked} variant="outline" size="sm" className="gap-2 bg-white border-brand-orange text-brand-orange hover:bg-orange-50">
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> Sync Advances
          </Button>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          <Button onClick={saveAll} disabled={saving || dirtyCount === 0 || isLocked} size="sm" className="gap-2 relative bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-500">
            <Save size={14} />{saving ? 'Saving…' : 'Save All'}
            {dirtyCount > 0 && !saving && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {dirtyCount > 99 ? '99+' : dirtyCount}
              </span>
            )}
          </Button>
          <Button onClick={lockMonth} disabled={isLocked} variant="outline" size="sm" className="gap-1.5 bg-white border-gray-300 text-gray-900 hover:bg-gray-50">
            <Lock size={14} /> Lock Month
          </Button>
        </div>
      </div>

      {isLocked && (
        <div className="mb-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 flex items-center gap-3 text-sm">
          <Lock size={15} className="text-gray-500 shrink-0" />
          <span className="text-gray-800 font-medium">This month is locked and cannot be edited.</span>
        </div>
      )}

      {dirtyCount > 0 && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center gap-3 text-sm">
          <AlertCircle size={15} className="text-amber-500 shrink-0" />
          <span className="text-amber-800 font-medium">{dirtyCount} unsaved change{dirtyCount !== 1 ? 's' : ''}</span>
          <Button size="sm" variant="outline" onClick={saveAll} disabled={saving} className="ml-auto h-7 text-xs gap-1">
            <Save size={12} />Save Now
          </Button>
        </div>
      )}

      <SearchFilter
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search employee name or ID..."
        branches={branches}
        branchFilter={filterBranch}
        onBranchChange={setFilterBranch}
        showBranchFilter
        sortOptions={SORT_OPTIONS}
        sortValue={sortValue}
        onSortChange={setSortValue}
        resultCount={displayed.length}
        resultLabel="employees"
        onExportCSV={() => {}}
        exportLabel="Export CSV"
      />

      {pageLoading ? (
        <div className="mt-4 p-8 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4">
          <div className="overflow-x-auto" style={{ maxHeight: '70vh' }}>
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50/95 backdrop-blur border-b-2 border-gray-200 text-xs uppercase tracking-wide">
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500">Employee</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500">Branch</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-500">Basic</th>
                  <th className="text-center px-2 py-2.5 font-semibold text-gray-500 w-24" title="Synced from tracker automatically">
                    Branch Adv<br /><span className="normal-case font-normal text-gray-400 text-[10px]">(৳)</span>
                  </th>
                  <th className="text-center px-2 py-2.5 font-semibold text-gray-500 w-24">
                    HR Adv<br /><span className="normal-case font-normal text-gray-400 text-[10px]">(৳)</span>
                  </th>
                  <th className="text-center px-2 py-2.5 font-semibold text-gray-500 w-24">
                    Leave<br /><span className="normal-case font-normal text-gray-400 text-[10px]">(days)</span>
                  </th>
                  <th className="text-center px-2 py-2.5 font-semibold text-gray-500 w-20">
                    Late<br /><span className="normal-case font-normal text-gray-400 text-[10px]">(days)</span>
                  </th>
                  <th className="text-center px-2 py-2.5 font-semibold text-gray-500 w-20">
                    OT<br /><span className="normal-case font-normal text-gray-400 text-[10px]">(days)</span>
                  </th>
                  <th className="text-center px-2 py-2.5 font-semibold text-gray-500 w-24">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1">
                        <Checkbox checked={allChecked} disabled={isLocked} data-state={!allChecked && someChecked ? 'indeterminate' : undefined} onCheckedChange={toggleAllBonus} className="shrink-0" />
                        <span>Att.</span>
                      </div>
                      <span className="normal-case font-normal text-gray-400 text-[10px]">Bonus</span>
                    </div>
                  </th>
                  <th className="text-center px-2 py-2.5 font-semibold text-gray-500 w-24">
                    Conv.<br /><span className="normal-case font-normal text-gray-400 text-[10px]">(৳)</span>
                  </th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500" style={{ minWidth: 160 }}>Notes</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-700 bg-blue-50/80">Net Payable</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {displayed.map((row) => {
                  const rec = row.record as SalaryRecord
                  const calc = calcSalary(row.employee, rec)
                  const bonusChecked = (rec.attendanceBonus ?? 0) === ATTENDANCE_BONUS_AMOUNT
                  return (
                    <tr key={row.employee.id} className={`hover:bg-gray-50/60 transition-colors ${row.dirty ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-3 py-2">
                        <p className="font-medium text-gray-900 text-sm leading-tight">{row.employee.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 leading-tight">{row.employee.employeeId}</p>
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{row.employee.branch?.name}</td>
                      <td className="px-3 py-2 text-right text-gray-700 text-sm whitespace-nowrap font-medium">{formatTaka(row.employee.basicSalary)}</td>
                      
                      <td 
                        className="px-2 py-2 text-center text-gray-500 font-medium cursor-help"
                        title={((rec as any).advances || []).map((a: any) => `Given by ${a.user} on ${new Date(a.date).toLocaleDateString()}`).join('\n') || undefined}
                      >
                        {formatTaka(rec.trackerAdvanceTotal ?? 0)}
                      </td>

                      <td className="px-2 py-2">
                        <Input disabled={isLocked} type="number" min="0" value={rec.hrAdvanceDeducted ?? 0} onChange={e => update(row.employee.id, 'hrAdvanceDeducted', +e.target.value)} className="text-right h-7 text-xs w-full min-w-[60px] border-gray-300 bg-white text-gray-900 focus:border-blue-500" />
                      </td>
                      <td className="px-2 py-2">
                        <Input disabled={isLocked} type="number" min="0" step="0.5" value={rec.leaveDaysTaken ?? 0} onChange={e => update(row.employee.id, 'leaveDaysTaken', +e.target.value)} className="text-right h-7 text-xs w-full min-w-[60px] border-gray-300 bg-white text-gray-900 focus:border-blue-500" />
                      </td>
                      <td className="px-2 py-2">
                        <Input disabled={isLocked} type="number" min="0" value={rec.lateDays ?? 0} onChange={e => update(row.employee.id, 'lateDays', +e.target.value)} className="text-right h-7 text-xs w-full min-w-[60px] border-gray-300 bg-white text-gray-900 focus:border-blue-500" />
                      </td>
                      <td className="px-2 py-2">
                        <Input disabled={isLocked} type="number" min="0" step="0.5" value={rec.otDays ?? 0} onChange={e => update(row.employee.id, 'otDays', +e.target.value)} className="text-right h-7 text-xs w-full min-w-[60px] border-gray-300 bg-white text-gray-900 focus:border-blue-500" />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Checkbox disabled={isLocked} checked={bonusChecked} onCheckedChange={checked => update(row.employee.id, 'attendanceBonus', checked ? ATTENDANCE_BONUS_AMOUNT : 0)} className="border-gray-400" />
                      </td>
                      <td className="px-2 py-2">
                        <Input disabled={isLocked} type="number" min="0" value={rec.conveyanceOverride ?? row.employee.conveyance} onChange={e => update(row.employee.id, 'conveyanceOverride', +e.target.value)} className="text-right h-7 text-xs w-full min-w-[60px] border-gray-300 bg-white text-gray-900 focus:border-blue-500" />
                      </td>
                      <td className="px-3 py-2 align-top" style={{ minWidth: 160 }}>
                        <textarea
                          disabled={isLocked}
                          value={rec.notes ?? ''}
                          onChange={e => update(row.employee.id, 'notes', e.target.value)}
                          placeholder="Note..."
                          rows={1}
                          className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-md bg-white text-gray-900 placeholder:text-gray-400 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-blue-700 bg-blue-50/40 whitespace-nowrap text-sm">
                        {formatTaka(calc.netPayable)}
                      </td>
                    </tr>
                  )
                })}
                {displayed.length === 0 && (
                  <tr>
                    <td colSpan={12} className="text-center py-16">
                      <Users size={32} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-400 text-sm">No employees found</p>
                    </td>
                  </tr>
                )}
              </tbody>

              {displayed.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50/80 border-t-2 border-gray-200 text-sm font-medium">
                    <td className="px-3 py-2.5 font-semibold text-gray-700" colSpan={3}>
                      Total ({totals.count} emp.)
                    </td>
                    <td className="px-2 py-2.5 text-center text-red-600"></td>
                    <td className="px-2 py-2.5 text-center text-red-600">{formatTaka(Math.round(totals.advance))}</td>
                    <td className="px-2 py-2.5 text-center text-red-600">{formatTaka(Math.round(totals.leave))}</td>
                    <td className="px-2 py-2.5 text-center text-red-600">{formatTaka(Math.round(totals.late))}</td>
                    <td className="px-2 py-2.5 text-center text-green-600">{formatTaka(Math.round(totals.ot))}</td>
                    <td className="px-2 py-2.5 text-center text-green-600">{formatTaka(Math.round(totals.bonus))}</td>
                    <td className="px-2 py-2.5 text-center text-green-600">{formatTaka(Math.round(totals.conveyance))}</td>
                    <td className="px-3 py-2.5" />
                    <td className="px-3 py-2.5 text-right font-bold text-blue-800 bg-blue-50 text-base">{formatTaka(Math.round(totals.net))}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SalaryPage() {
  return <Suspense><SalaryContent /></Suspense>
}
