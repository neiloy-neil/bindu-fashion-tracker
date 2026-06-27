'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Employee, Branch, EidRecord } from '@prisma/client'
import { calcEid, formatTaka } from '@/lib/hr/calculations'
import { toast } from 'sonner'
import { Save, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchFilter, type SortOption } from '@/components/shared/SearchFilter'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

type Row = {
  employee: Employee & { branch?: Branch }
  record: Partial<EidRecord>
  dirty: boolean
}

const SORT_OPTIONS: SortOption[] = [
  { label: 'Name A–Z', value: 'name_asc' },
  { label: 'Name Z–A', value: 'name_desc' },
  { label: 'Net Payable ↑', value: 'net_asc' },
  { label: 'Net Payable ↓', value: 'net_desc' },
  { label: 'Branch', value: 'branch' },
]

function EidContent() {
  const params = useSearchParams()
  const now = new Date()
  const currentYear = now.getFullYear()
  const [year, setYear] = useState(+(params.get('year') ?? currentYear))
  const [title, setTitle] = useState(`Eid ul Adha Bonus ${currentYear}`)
  
  const [rows, setRows] = useState<Row[]>([])
  const [saving, setSaving] = useState(false)
  const [filterBranch, setFilterBranch] = useState('all')
  const [branches, setBranches] = useState<Branch[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortValue, setSortValue] = useState('name_asc')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setPageLoading(true)
      try {
        const [empsRes, recsRes] = await Promise.all([
          fetch('/api/hr/employees?active=true'),
          fetch(`/api/hr/eid-records?year=${year}`)
        ])

        const emps = empsRes.ok ? await empsRes.json() : []
        const recs = recsRes.ok ? await recsRes.json() : []

        if (cancelled) return

        setTitle(recs.length > 0 && recs[0].title ? recs[0].title : `Eid ul Adha Bonus ${year}`)

        const uniqueBranches = Array.from(new Map(emps.filter((e: any) => e.branch).map((e: any) => [e.branch.id, e.branch])).values()) as Branch[]
        setBranches(uniqueBranches)

        const recMap = new Map((recs).map((r: any) => [r.employeeId, r]))
        setRows(emps.map((emp: any) => ({
          employee: emp,
          record: recMap.get(emp.id) ?? {
            employeeId: emp.id, year, title: `Eid ul Adha Bonus ${year}`,
            salaryPaymentPct: 50, hrAdvanceDeducted: 0, trackerAdvanceTotal: 0, eidBonusPct: 50
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
  }, [year])

  function update(empId: number, field: keyof EidRecord, value: number | string) {
    setRows(prev => prev.map(r =>
      r.employee.id === empId ? { ...r, record: { ...r.record, [field]: value }, dirty: true } : r
    ))
  }

  async function saveAll() {
    const dirty = rows.filter(r => r.dirty)
    if (!dirty.length) { toast.info('Nothing to save'); return }
    setSaving(true)
    
    const upserts = dirty.map(r => ({
      employeeId: r.employee.id,
      title,
      salaryPaymentPct: r.record.salaryPaymentPct ?? 50,
      hrAdvanceDeducted: r.record.hrAdvanceDeducted ?? 0,
      eidBonusPct: r.record.eidBonusPct ?? 50,
    }))

    try {
      const res = await fetch('/api/hr/eid-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, title, records: upserts })
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
        const ca = calcEid(a.employee, a.record as EidRecord)
        const cb = calcEid(b.employee, b.record as EidRecord)
        return ca.netPayable - cb.netPayable
      }); break
      case 'net_desc': list.sort((a, b) => {
        const ca = calcEid(a.employee, a.record as EidRecord)
        const cb = calcEid(b.employee, b.record as EidRecord)
        return cb.netPayable - ca.netPayable
      }); break
      case 'branch': list.sort((a, b) => ((a.employee.branch as any)?.name ?? '').localeCompare((b.employee.branch as any)?.name ?? '')); break
    }
    return list
  }, [rows, filterBranch, search, sortValue])

  const totals = useMemo(() => {
    let payment = 0, advance = 0, bonus = 0, net = 0
    displayed.forEach(row => {
      const calc = calcEid(row.employee, row.record as EidRecord)
      payment += calc.salaryPayment
      advance += calc.advanceDeducted
      bonus += calc.eidBonus
      net += calc.netPayable
    })
    return { payment, advance, bonus, net, count: displayed.length }
  }, [displayed])

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1]

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Eid Bonus Processing</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Input bonus and advance deductions</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input 
            value={title} 
            onChange={e => {
              setTitle(e.target.value)
              setRows(prev => prev.map(r => ({ ...r, dirty: true })))
            }}
            placeholder="e.g. Eid ul Adha 2024" 
            className="w-48"
          />
          <Select value={String(year)} onValueChange={v => setYear(+(v ?? year))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={saveAll} disabled={saving || dirtyCount === 0} size="sm" className="gap-2 relative">
            <Save size={14} />{saving ? 'Saving…' : 'Save All'}
            {dirtyCount > 0 && !saving && (
              <span className="absolute -top-1.5 -right-1.5 bg-[var(--warning)] text-[var(--warning-fg)] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none shadow-sm">
                {dirtyCount > 99 ? '99+' : dirtyCount}
              </span>
            )}
          </Button>
        </div>
      </div>
      <div className="flex-1 p-6 space-y-6 min-h-0 flex flex-col">

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
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            <span className="text-sm text-[var(--text-muted)]">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="overflow-auto flex-1 min-h-0 relative">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80">
                <TableRow className="border-b border-[var(--border)] hover:bg-transparent">
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Employee</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Branch</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Basic</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-center w-24">
                    Salary Pct<br /><span className="normal-case font-normal text-[var(--text-muted)] opacity-75 text-[10px]">(%)</span>
                  </TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-center w-24">
                    Branch Advance<br /><span className="normal-case font-normal text-[var(--text-muted)] opacity-75 text-[10px]">(৳)</span>
                  </TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-center w-24">
                    HR Advance<br /><span className="normal-case font-normal text-[var(--text-muted)] opacity-75 text-[10px]">(৳)</span>
                  </TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-center w-24">
                    Eid Bonus<br /><span className="normal-case font-normal text-[var(--text-muted)] opacity-75 text-[10px]">(%)</span>
                  </TableHead>
                  <TableHead className="text-[var(--text-primary)] text-xs font-semibold uppercase tracking-wide text-right bg-[var(--info-subtle)]/30">Net Payable</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {displayed.map((row) => {
                  const rec = row.record as EidRecord
                  const calc = calcEid(row.employee, rec)
                  return (
                    <TableRow key={row.employee.id} className={`border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors ${row.dirty ? 'bg-[var(--warning-subtle)]/40 hover:bg-[var(--warning-subtle)]/60' : ''}`}>
                      <TableCell>
                        <p className="font-medium text-[var(--text-primary)] leading-tight">{row.employee.name}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-tight">{row.employee.employeeId}</p>
                      </TableCell>
                      <TableCell className="text-[var(--text-secondary)]">{row.employee.branch?.name}</TableCell>
                      <TableCell className="text-right text-[var(--text-primary)] whitespace-nowrap font-medium tabular-nums">{formatTaka(row.employee.basicSalary)}</TableCell>
                      
                      <TableCell>
                        <Input type="number" min="0" value={rec.salaryPaymentPct ?? 50} onChange={e => update(row.employee.id, 'salaryPaymentPct', +e.target.value)} className="text-right h-7 text-xs w-full min-w-[60px]" />
                      </TableCell>
                      <TableCell>
                        <div className="text-right text-[var(--text-secondary)] py-1 pr-2 tabular-nums">
                          {formatTaka(rec.trackerAdvanceTotal ?? 0)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input type="number" min="0" value={rec.hrAdvanceDeducted ?? 0} onChange={e => update(row.employee.id, 'hrAdvanceDeducted', +e.target.value)} className="text-right h-7 text-xs w-full min-w-[60px]" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min="0" value={rec.eidBonusPct ?? 50} onChange={e => update(row.employee.id, 'eidBonusPct', +e.target.value)} className="text-right h-7 text-xs w-full min-w-[60px]" />
                      </TableCell>

                      <TableCell className="text-right font-bold text-[var(--info)] bg-[var(--info-subtle)]/10 whitespace-nowrap tabular-nums">
                        {formatTaka(calc.netPayable)}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {displayed.length === 0 && (
                  <TableRow className="border-[var(--border)] hover:bg-transparent">
                    <TableCell colSpan={8} className="text-center py-16">
                      <Users size={32} className="mx-auto text-[var(--text-muted)] opacity-50 mb-3" />
                      <p className="text-[var(--text-muted)] text-sm font-medium">No employees found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>

              {displayed.length > 0 && (
                <TableBody className="border-t-2 border-[var(--border)] bg-[var(--surface-raised)]/50">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableCell className="font-semibold text-[var(--text-primary)]" colSpan={3}>
                      Total ({totals.count} emp.)
                    </TableCell>
                    <TableCell className="text-center text-[var(--text-secondary)] font-medium tabular-nums">{formatTaka(Math.round(totals.payment))}</TableCell>
                    <TableCell className="text-center text-[var(--danger)] font-medium tabular-nums" colSpan={2}>{formatTaka(Math.round(totals.advance))}</TableCell>
                    <TableCell className="text-center text-[var(--success)] font-medium tabular-nums">{formatTaka(Math.round(totals.bonus))}</TableCell>
                    <TableCell className="text-right font-bold text-[var(--info)] bg-[var(--info-subtle)]/30 text-base tabular-nums">{formatTaka(Math.round(totals.net))}</TableCell>
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

export default function EidPage() {
  return <Suspense><EidContent /></Suspense>
}
