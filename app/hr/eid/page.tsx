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
    <div className="p-4 sm:p-6 lg:p-8 max-w-full mx-auto">
      <div className="flex flex-col gap-3 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Eid Bonus Processing</h1>
            <p className="text-gray-500 text-sm mt-0.5">Input bonus and advance deductions</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Input 
              value={title} 
              onChange={e => {
                setTitle(e.target.value)
                setRows(prev => prev.map(r => ({ ...r, dirty: true })))
              }}
              placeholder="e.g. Eid ul Adha 2024" 
              className="w-48 bg-white"
            />
            <Select value={String(year)} onValueChange={v => setYear(+(v ?? year))}>
              <SelectTrigger className="w-24 bg-white border-gray-300 text-gray-900"><SelectValue /></SelectTrigger>
              <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={saveAll} disabled={saving || dirtyCount === 0} size="sm" className="gap-2 relative bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-500">
            <Save size={14} />{saving ? 'Saving…' : 'Save All'}
            {dirtyCount > 0 && !saving && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {dirtyCount > 99 ? '99+' : dirtyCount}
              </span>
            )}
          </Button>
        </div>
      </div>

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
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4 flex-1 min-h-0 flex flex-col">
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50/95 backdrop-blur border-b-2 border-gray-200 text-xs uppercase tracking-wide">
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500">Employee</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500">Branch</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-500">Basic</th>
                  <th className="text-center px-2 py-2.5 font-semibold text-gray-500 w-24">
                    Salary Pct<br /><span className="normal-case font-normal text-gray-400 text-[10px]">(%)</span>
                  </th>
                  <th className="text-center px-2 py-2.5 font-semibold text-gray-500 w-24">
                    Branch Advance<br /><span className="normal-case font-normal text-gray-400 text-[10px]">(৳)</span>
                  </th>
                  <th className="text-center px-2 py-2.5 font-semibold text-gray-500 w-24">
                    HR Advance<br /><span className="normal-case font-normal text-gray-400 text-[10px]">(৳)</span>
                  </th>
                  <th className="text-center px-2 py-2.5 font-semibold text-gray-500 w-24">
                    Eid Bonus<br /><span className="normal-case font-normal text-gray-400 text-[10px]">(%)</span>
                  </th>

                  <th className="text-right px-3 py-2.5 font-semibold text-gray-700 bg-blue-50/80">Net Payable</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {displayed.map((row) => {
                  const rec = row.record as EidRecord
                  const calc = calcEid(row.employee, rec)
                  return (
                    <tr key={row.employee.id} className={`hover:bg-gray-50/60 transition-colors ${row.dirty ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-3 py-2">
                        <p className="font-medium text-gray-900 text-sm leading-tight">{row.employee.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 leading-tight">{row.employee.employeeId}</p>
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{row.employee.branch?.name}</td>
                      <td className="px-3 py-2 text-right text-gray-700 text-sm whitespace-nowrap font-medium">{formatTaka(row.employee.basicSalary)}</td>
                      
                      <td className="px-2 py-2">
                        <Input type="number" min="0" value={rec.salaryPaymentPct ?? 50} onChange={e => update(row.employee.id, 'salaryPaymentPct', +e.target.value)} className="text-right h-7 text-xs w-full min-w-[60px] border-gray-300 bg-white text-gray-900 focus:border-blue-500" />
                      </td>
                      <td className="px-2 py-2">
                        <div className="text-right text-gray-700 text-xs py-1 pr-2">
                          {formatTaka(rec.trackerAdvanceTotal ?? 0)}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <Input type="number" min="0" value={rec.hrAdvanceDeducted ?? 0} onChange={e => update(row.employee.id, 'hrAdvanceDeducted', +e.target.value)} className="text-right h-7 text-xs w-full min-w-[60px] border-gray-300 bg-white text-gray-900 focus:border-blue-500" />
                      </td>
                      <td className="px-2 py-2">
                        <Input type="number" min="0" value={rec.eidBonusPct ?? 50} onChange={e => update(row.employee.id, 'eidBonusPct', +e.target.value)} className="text-right h-7 text-xs w-full min-w-[60px] border-gray-300 bg-white text-gray-900 focus:border-blue-500" />
                      </td>

                      <td className="px-3 py-2 text-right font-semibold text-blue-700 bg-blue-50/40 whitespace-nowrap text-sm">
                        {formatTaka(calc.netPayable)}
                      </td>
                    </tr>
                  )
                })}
                {displayed.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
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
                    <td className="px-2 py-2.5 text-center text-gray-600">{formatTaka(Math.round(totals.payment))}</td>
                    <td className="px-2 py-2.5 text-center text-red-600" colSpan={2}>{formatTaka(Math.round(totals.advance))}</td>
                    <td className="px-2 py-2.5 text-center text-green-600">{formatTaka(Math.round(totals.bonus))}</td>
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

export default function EidPage() {
  return <Suspense><EidContent /></Suspense>
}
