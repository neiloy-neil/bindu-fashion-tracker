'use client'

import { useEffect, useState, Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Employee, Branch, SalaryRecord } from '@prisma/client'
import { calcSalary } from '@/lib/hr/calculations'
import { downloadCSV } from '@/lib/hr/csv'
import { toast } from 'sonner'
import { Save, Users, AlertCircle, Lock, RefreshCw, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchFilter, type SortOption } from '@/components/shared/SearchFilter'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [confirmClearMonth, setConfirmClearMonth] = useState(false)
  
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
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
        const data = recsRes.ok ? await recsRes.json() : { records: [], calculatedLeaves: {} }
        const recs = data.records || []
        const calcLeaves = data.calculatedLeaves || {}

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
            leaveDaysTaken: calcLeaves[emp.id] ?? 0, leaveAdjustment: 0,
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
      hrAdvanceDeducted: isNaN(Number(r.record.hrAdvanceDeducted)) ? 0 : Number(r.record.hrAdvanceDeducted),
      leaveDaysTaken: isNaN(Number(r.record.leaveDaysTaken)) ? 0 : Number(r.record.leaveDaysTaken),
      leaveAdjustment: isNaN(Number(r.record.leaveAdjustment)) ? 0 : Number(r.record.leaveAdjustment),
      lateDays: isNaN(Number(r.record.lateDays)) ? 0 : Math.round(Number(r.record.lateDays)),
      otDays: isNaN(Number(r.record.otDays)) ? 0 : Number(r.record.otDays),
      attendanceBonus: isNaN(Number(r.record.attendanceBonus)) ? 0 : Number(r.record.attendanceBonus),
      conveyanceOverride: (r.record.conveyanceOverride == null || isNaN(Number(r.record.conveyanceOverride))) 
        ? r.employee.conveyance 
        : Number(r.record.conveyanceOverride),
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

  async function deleteRecord(row: Row) {
    if (!row.record.id) {
      setRows(prev => prev.filter(r => r.employee.id !== row.employee.id))
      setConfirmDeleteId(null)
      return
    }
    try {
      const res = await fetch(`/api/hr/salary-records/${row.record.id}`, { method: 'DELETE' })
      if (!res.ok) {
        if (res.status === 423) toast.error('This month is locked — cannot delete records')
        else toast.error('Failed to delete record')
        return
      }
      toast.success('Record deleted')
      setReloadNonce(n => n + 1)
    } catch (e) {
      toast.error('Error deleting record')
    } finally {
      setConfirmDeleteId(null)
    }
  }

  async function clearMonth() {
    const savedRecords = rows.filter(r => r.record.id)
    if (!savedRecords.length) return
    setSaving(true)
    let deletedCount = 0
    try {
      for (const row of savedRecords) {
        const res = await fetch(`/api/hr/salary-records/${row.record.id}`, { method: 'DELETE' })
        if (res.ok) deletedCount++
        else if (res.status === 423) throw new Error('Month is locked')
      }
      toast.success(`Month cleared — ${deletedCount} records removed`)
      setReloadNonce(n => n + 1)
    } catch (e: any) {
      toast.error(e.message || 'Error clearing month')
    } finally {
      setSaving(false)
      setConfirmClearMonth(false)
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

  function exportCSV() {
    const headers = [
      'Employee ID', 'Name', 'Branch', 'Basic Salary', 'Tracker Advance', 'HR Advance',
      'Leave Days', 'Leave Adj', 'Late Days', 'OT Days', 'Attendance Bonus', 'Conveyance', 'Net Payable', 'Notes'
    ]
    const dataRows = displayed.map(row => {
      const calc = calcSalary(row.employee, row.record as SalaryRecord)
      return [
        row.employee.employeeId || '',
        row.employee.name,
        (row.employee.branch as any)?.name || '',
        row.employee.basicSalary,
        row.record.trackerAdvanceTotal || 0,
        row.record.hrAdvanceDeducted || 0,
        row.record.leaveDaysTaken || 0,
        row.record.leaveAdjustment || 0,
        row.record.lateDays || 0,
        row.record.otDays || 0,
        row.record.attendanceBonus || 0,
        calc.conveyance,
        calc.netPayable,
        row.record.notes || ''
      ]
    })
    downloadCSV(headers, dataRows, `Salary_${MONTHS[month - 1]}_${year}`)
  }

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1]

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none flex items-center gap-2">
            Salary Processing {isLocked && <Lock size={16} className="text-[var(--text-muted)]" />}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Input monthly data for each employee</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(month)} onValueChange={v => setMonth(+(v ?? month))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(+(v ?? year))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 min-h-0">
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-[var(--border)] bg-[var(--surface)] rounded-xl">
          <Button onClick={syncTrackerAdvances} disabled={syncing || isLocked} variant="outline" size="sm" className="gap-2 text-[var(--brand-orange)] border-[var(--brand-orange)] hover:bg-[var(--warning-subtle)]">
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> Sync Advances
          </Button>

          <div className="w-px h-6 bg-[var(--border)] mx-1" />

          <Button onClick={saveAll} disabled={saving || dirtyCount === 0 || isLocked} size="sm" className="gap-2 relative">
            <Save size={14} />{saving ? 'Saving…' : 'Save All'}
            {dirtyCount > 0 && !saving && (
              <span className="absolute -top-1.5 -right-1.5 bg-[var(--danger)] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {dirtyCount > 99 ? '99+' : dirtyCount}
              </span>
            )}
          </Button>
          <Button onClick={lockMonth} disabled={isLocked} variant="outline" size="sm" className="gap-1.5">
            <Lock size={14} /> Lock Month
          </Button>
          {isAdmin && (
            <Button onClick={() => setConfirmClearMonth(true)} disabled={isLocked || !rows.some(r => r.record.id)} variant="outline" size="sm" className="gap-1.5 text-[var(--danger)] border-[var(--danger-subtle)] hover:bg-[var(--danger-subtle)]">
              <Trash2 size={14} /> Clear Month
            </Button>
          )}
        </div>

      {isLocked && (
        <div className="mb-3 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg px-4 py-2.5 flex items-center gap-3 text-sm">
          <Lock size={15} className="text-[var(--text-muted)] shrink-0" />
          <span className="text-[var(--text-primary)] font-medium">This month is locked and cannot be edited.</span>
        </div>
      )}

      {confirmClearMonth && (
        <div className="mb-3 bg-[var(--danger-subtle)] border border-[var(--danger-subtle)] rounded-lg px-4 py-3 flex items-center gap-3 text-sm flex-wrap">
          <Trash2 size={15} className="text-[var(--danger)] shrink-0" />
          <span className="text-[var(--danger)] font-medium">This will delete all {rows.filter(r => r.record.id).length} records for {MONTHS[month - 1]} {year}. Confirm?</span>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setConfirmClearMonth(false)} className="h-7 text-xs">Cancel</Button>
            <Button size="sm" variant="destructive" onClick={clearMonth} disabled={saving} className="h-7 text-xs">Yes, Clear</Button>
          </div>
        </div>
      )}

      {dirtyCount > 0 && (
        <div className="mb-3 bg-[var(--warning-subtle)] border border-[var(--warning-subtle)] rounded-lg px-4 py-2.5 flex items-center gap-3 text-sm">
          <AlertCircle size={15} className="text-[var(--warning)] shrink-0" />
          <span className="text-[var(--warning)] font-medium">{dirtyCount} unsaved change{dirtyCount !== 1 ? 's' : ''}</span>
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
        onExportCSV={exportCSV}
        exportLabel={`Export CSV (${displayed.length})`}
      />

      {pageLoading ? (
        <div className="flex items-center justify-center h-64 gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
          <span className="text-sm text-[var(--text-muted)]">Loading…</span>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Salary Records
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--border)] hover:bg-transparent">
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Employee</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Branch</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Basic</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-center w-24" title="Synced from tracker automatically">
                    Branch Adv<br /><span className="normal-case font-normal text-[var(--text-muted)] text-[10px]">(৳)</span>
                  </TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-center w-24">
                    HR Adv<br /><span className="normal-case font-normal text-[var(--text-muted)] text-[10px]">(৳)</span>
                  </TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-center w-24">
                    Leave<br /><span className="normal-case font-normal text-[var(--text-muted)] text-[10px]">(days)</span>
                  </TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-center w-24">
                    Leave Adj<br /><span className="normal-case font-normal text-[var(--text-muted)] text-[10px]">(days)</span>
                  </TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-center w-20">
                    Late<br /><span className="normal-case font-normal text-[var(--text-muted)] text-[10px]">(days)</span>
                  </TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-center w-20">
                    OT<br /><span className="normal-case font-normal text-[var(--text-muted)] text-[10px]">(days)</span>
                  </TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-center w-24">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1">
                        <Checkbox checked={allChecked} disabled={isLocked} data-state={!allChecked && someChecked ? 'indeterminate' : undefined} onCheckedChange={toggleAllBonus} className="shrink-0" />
                        <span>Att.</span>
                      </div>
                      <span className="normal-case font-normal text-[var(--text-muted)] text-[10px]">Bonus</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-center w-24">
                    Conv.<br /><span className="normal-case font-normal text-[var(--text-muted)] text-[10px]">(৳)</span>
                  </TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide min-w-[160px]">Notes</TableHead>
                  <TableHead className="text-[var(--text-primary)] text-xs font-semibold uppercase tracking-wide text-right bg-[var(--surface-raised)]">Net Payable</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {displayed.map((row) => {
                  const rec = row.record as SalaryRecord
                  const calc = calcSalary(row.employee, rec)
                  const bonusChecked = (rec.attendanceBonus ?? 0) === ATTENDANCE_BONUS_AMOUNT
                  return (
                    <TableRow key={row.employee.id} className={`border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors ${row.dirty ? 'bg-[var(--warning-subtle)]' : ''}`}>
                      <TableCell>
                        <p className="font-medium text-[var(--text-primary)] text-sm leading-tight">{row.employee.name}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-tight">{row.employee.employeeId}</p>
                      </TableCell>
                      <TableCell className="text-[var(--text-secondary)] text-xs">{row.employee.branch?.name}</TableCell>
                      <TableCell className="text-right text-[var(--text-secondary)] text-sm whitespace-nowrap font-medium tabular-nums">{formatTaka(row.employee.basicSalary)}</TableCell>
                      
                      <TableCell 
                        className="text-center text-[var(--text-secondary)] font-medium cursor-help tabular-nums"
                        title={((rec as any).advances || []).map((a: any) => `Given by ${a.user} on ${new Date(a.date).toLocaleDateString()}`).join('\n') || undefined}
                      >
                        {formatTaka(rec.trackerAdvanceTotal ?? 0)}
                      </TableCell>

                      <TableCell>
                        <Input disabled={isLocked} type="number" min="0" value={rec.hrAdvanceDeducted ?? 0} onChange={e => update(row.employee.id, 'hrAdvanceDeducted', +e.target.value)} className="text-right h-7 text-xs w-full min-w-[60px]" />
                      </TableCell>
                      <TableCell>
                        <Input disabled={isLocked} type="number" min="0" step="0.5" value={rec.leaveDaysTaken ?? 0} onChange={e => update(row.employee.id, 'leaveDaysTaken', +e.target.value)} className="text-right h-7 text-xs w-full min-w-[60px]" />
                      </TableCell>
                      <TableCell>
                        <Input disabled={isLocked} type="number" min="0" step="0.5" value={rec.leaveAdjustment ?? 0} onChange={e => update(row.employee.id, 'leaveAdjustment', +e.target.value)} className="text-right h-7 text-xs w-full min-w-[60px]" />
                      </TableCell>
                      <TableCell>
                        <Input disabled={isLocked} type="number" min="0" value={rec.lateDays ?? 0} onChange={e => update(row.employee.id, 'lateDays', +e.target.value)} className="text-right h-7 text-xs w-full min-w-[60px]" />
                      </TableCell>
                      <TableCell>
                        <Input disabled={isLocked} type="number" min="0" step="0.5" value={rec.otDays ?? 0} onChange={e => update(row.employee.id, 'otDays', +e.target.value)} className="text-right h-7 text-xs w-full min-w-[60px]" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox disabled={isLocked} checked={bonusChecked} onCheckedChange={checked => update(row.employee.id, 'attendanceBonus', checked ? ATTENDANCE_BONUS_AMOUNT : 0)} />
                      </TableCell>
                      <TableCell>
                        <Input disabled={isLocked} type="number" min="0" value={rec.conveyanceOverride ?? row.employee.conveyance} onChange={e => update(row.employee.id, 'conveyanceOverride', +e.target.value)} className="text-right h-7 text-xs w-full min-w-[60px]" />
                      </TableCell>
                      <TableCell className="align-top min-w-[160px]">
                        <Input
                          disabled={isLocked}
                          value={rec.notes ?? ''}
                          onChange={e => update(row.employee.id, 'notes', e.target.value)}
                          placeholder="Note..."
                          className="w-full text-xs h-7"
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold text-[var(--info)] bg-[var(--surface-raised)] whitespace-nowrap text-sm tabular-nums">
                        {formatTaka(calc.netPayable)}
                      </TableCell>
                      <TableCell className="text-right">
                        {confirmDeleteId === rec.id && rec.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-xs text-[var(--danger)] font-medium mr-1">Delete?</span>
                            <Button size="sm" variant="destructive" className="h-6 px-2 text-[10px]" onClick={() => deleteRecord(row)}>Yes</Button>
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => setConfirmDeleteId(null)}>No</Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)]"
                            disabled={isLocked}
                            onClick={() => rec.id ? setConfirmDeleteId(rec.id) : deleteRecord(row)}
                            title="Delete record"
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {displayed.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center h-64 gap-3">
                        <div className="w-12 h-12 rounded-full bg-[var(--surface-raised)] flex items-center justify-center">
                          <Users className="w-5 h-5 text-[var(--text-muted)]" />
                        </div>
                        <p className="text-sm font-medium text-[var(--text-muted)]">
                          No employees found
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>

              {displayed.length > 0 && (
                <TableBody>
                  <TableRow className="bg-[var(--surface-raised)] border-t-[var(--border-strong)] text-sm font-medium hover:bg-[var(--surface-raised)]">
                    <TableCell className="font-semibold text-[var(--text-primary)]" colSpan={3}>
                      Total ({totals.count} emp.)
                    </TableCell>
                    <TableCell className="text-center text-[var(--danger)] tabular-nums"></TableCell>
                    <TableCell className="text-center text-[var(--danger)] tabular-nums">{formatTaka(Math.round(totals.advance))}</TableCell>
                    <TableCell className="text-center text-[var(--danger)] tabular-nums">{formatTaka(Math.round(totals.leave))}</TableCell>
                    <TableCell />
                    <TableCell className="text-center text-[var(--danger)] tabular-nums">{formatTaka(Math.round(totals.late))}</TableCell>
                    <TableCell className="text-center text-[var(--success)] tabular-nums">{formatTaka(Math.round(totals.ot))}</TableCell>
                    <TableCell className="text-center text-[var(--success)] tabular-nums">{formatTaka(Math.round(totals.bonus))}</TableCell>
                    <TableCell className="text-center text-[var(--success)] tabular-nums">{formatTaka(Math.round(totals.conveyance))}</TableCell>
                    <TableCell />
                    <TableCell className="text-right font-bold text-[var(--info)] text-base tabular-nums">{formatTaka(Math.round(totals.net))}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              )}
            </Table>
          </div>
        </div>
      )}
    </div>
    </>
  )
}

export default function SalaryPage() {
  return <Suspense><SalaryContent /></Suspense>
}
