'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import type { SalaryUploadLog, Employee } from '@prisma/client'
import { calcSalary } from '@/lib/hr/calculations'
import { Users, FileSpreadsheet, ChevronRight, Clock, CheckCircle2, Circle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

type MonthData = {
  month: number
  year: number
  records: number
  totalPayable: number
  log: SalaryUploadLog | null
  status: 'processed' | 'manual' | 'pending'
  completion: number
}

function formatTaka(amount: number) {
  if (amount >= 1000000) {
    return `৳ ${(amount / 100000).toFixed(2)}L`
  }
  return `৳ ${amount.toLocaleString('en-BD')}`
}

function formatRelative(dateStr: string | Date) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHrs < 24) return `${diffHrs}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function FeedContent() {
  const params = useSearchParams()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const [year, setYear] = useState(+(params.get('year') ?? currentYear))
  const [months, setMonths] = useState<MonthData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const [logsRes, empsRes] = await Promise.all([
          fetch(`/api/hr/upload-log?year=${year}`),
          fetch('/api/hr/employees?active=true')
        ])

        const logs: SalaryUploadLog[] = logsRes.ok ? await logsRes.json() : []
        const emps: Employee[] = empsRes.ok ? await empsRes.json() : []
        
        const monthPromises = []
        for (let m = 1; m <= 12; m++) {
          monthPromises.push(fetch(`/api/hr/salary-records?month=${m}&year=${year}`).then(res => res.ok ? res.json() : []))
        }
        const allRecs = await Promise.all(monthPromises)

        if (cancelled) return

        setTotalEmployees(emps.length)

        const logMap = new Map((logs ?? []).map(l => [l.month, l]))
        const empMap = new Map((emps ?? []).map(e => [e.id, e]))

        const monthData: MonthData[] = []
        for (let m = 1; m <= 12; m++) {
          const log = logMap.get(m) ?? null
          const recs = allRecs[m - 1]
          
          let totalPayable = 0
          let recordsCount = 0

          for (const r of recs) {
            const emp = empMap.get(r.employeeId)
            if (emp) {
              const calc = calcSalary(emp, r)
              totalPayable += calc.netPayable
              recordsCount++
            }
          }

          const completion = emps.length > 0 ? Math.round((recordsCount / emps.length) * 100) : 0

          let status: 'processed' | 'manual' | 'pending' = 'pending'
          if (log && recordsCount > 0) status = 'processed'
          else if (recordsCount > 0) status = 'manual'

          monthData.push({ month: m, year, records: recordsCount, totalPayable, log, status, completion })
        }

        setMonths(monthData)
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [year])

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return months
    return months.filter(m => m.status === statusFilter)
  }, [months, statusFilter])

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  const processedCount = months.filter(m => m.status !== 'pending').length
  const totalRecords = months.reduce((s, m) => s + m.records, 0)
  const totalPayable = months.reduce((s, m) => s + m.totalPayable, 0)

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Monthly Salary Feed</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {processedCount}/12 months processed · {totalRecords} records · {formatTaka(Math.round(totalPayable))} total in {year}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(year)} onValueChange={v => setYear(+(v ?? year))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex-1 p-6 space-y-6 min-h-0 flex flex-col overflow-auto">

      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 text-center">
          <p className="text-xl font-bold text-[var(--text-primary)]">{processedCount}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Done</p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 text-center">
          <p className="text-xl font-bold text-[var(--text-primary)]">{12 - processedCount}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Remaining</p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 text-center">
          <p className="text-xl font-bold text-[var(--text-primary)]">{totalEmployees}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Staff</p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 text-center">
          <p className="text-lg font-bold text-[var(--info)]">{formatTaka(Math.round(totalPayable / 1000))}k</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Total</p>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-4 overflow-x-auto">
        {[
          { label: 'All', value: 'all', count: 12 },
          { label: 'Processed', value: 'processed', count: months.filter(m => m.status === 'processed').length },
          { label: 'Manual', value: 'manual', count: months.filter(m => m.status === 'manual').length },
          { label: 'Pending', value: 'pending', count: months.filter(m => m.status === 'pending').length },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
              statusFilter === opt.value ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}<span className={`ml-1.5 ${statusFilter === opt.value ? 'text-gray-300' : 'text-gray-400'}`}>{opt.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-48 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => {
            const isCurrentMonth = m.month === currentMonth && m.year === currentYear
            return (
              <Link key={m.month} href={`/hr/salary?month=${m.month}&year=${m.year}`} className="block group">
                <div className={`bg-[var(--surface)] rounded-xl border p-4 sm:p-5 flex items-center gap-3 sm:gap-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                  isCurrentMonth ? 'border-[var(--warning)]/40 ring-1 ring-[var(--warning)]/10' : 'border-[var(--border)]'
                }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    m.status === 'processed' ? 'bg-[var(--success-subtle)]/20' : m.status === 'manual' ? 'bg-[var(--info-subtle)]/20' : 'bg-[var(--border)]/30'
                  }`}>
                    {m.status === 'processed' ? <CheckCircle2 size={20} className="text-[var(--success)]" /> :
                     m.status === 'manual' ? <Circle size={20} className="text-[var(--info)]" /> :
                     <Circle size={20} className="text-[var(--text-muted)] opacity-50" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[var(--text-primary)] text-sm sm:text-base">{MONTHS[m.month - 1]}</p>
                      {isCurrentMonth && <span className="text-[10px] font-bold uppercase tracking-wider bg-[var(--warning-subtle)]/30 text-[var(--warning)] px-2 py-0.5 rounded-full">Current</span>}
                      {m.status === 'processed' && <span className="text-[10px] font-bold uppercase tracking-wider bg-[var(--success-subtle)]/30 text-[var(--success)] px-2 py-0.5 rounded-full hidden sm:inline">Uploaded</span>}
                      {m.status === 'manual' && <span className="text-[10px] font-bold uppercase tracking-wider bg-[var(--info-subtle)]/30 text-[var(--info)] px-2 py-0.5 rounded-full hidden sm:inline">Manual</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--text-muted)] flex-wrap">
                      {m.records > 0 ? (
                        <>
                          <span className="flex items-center gap-1"><Users size={12} />{m.records} employee{m.records !== 1 ? 's' : ''}</span>
                          {m.totalPayable > 0 && <span className="font-medium text-[var(--text-secondary)]">{formatTaka(Math.round(m.totalPayable))}</span>}
                          {m.log && <span className="flex items-center gap-1"><FileSpreadsheet size={12} /><span className="truncate max-w-[140px]">{m.log.fileName || 'Imported'}</span></span>}
                          {m.log && <span className="flex items-center gap-1"><Clock size={12} />{formatRelative(m.log.uploadedAt)}</span>}
                        </>
                      ) : (
                        <span className="text-[var(--text-muted)] opacity-50">No records yet</span>
                      )}
                    </div>
                  </div>

                  {m.records > 0 && (
                    <div className="shrink-0 hidden sm:flex flex-col items-end gap-1">
                      <span className="text-xs font-semibold text-[var(--text-muted)]">{m.completion}%</span>
                      <div className="w-16 bg-[var(--border)]/30 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${m.completion >= 100 ? 'bg-[var(--success)]' : m.completion >= 50 ? 'bg-[var(--info)]' : 'bg-[var(--warning)]'}`}
                          style={{ width: `${Math.min(m.completion, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    <ChevronRight size={16} className="text-[var(--text-muted)] opacity-50 group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Link>
            )
          })}
          {filtered.length === 0 && (
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] text-center py-16">
              <p className="text-[var(--text-muted)] text-sm">No months match the selected filter</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)] px-1">
        <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-[var(--success)]" /> Uploaded via Excel</span>
        <span className="flex items-center gap-1.5"><Circle size={14} className="text-[var(--info)]" /> Manually entered</span>
        <span className="flex items-center gap-1.5"><Circle size={14} className="text-[var(--text-muted)] opacity-50" /> Not processed</span>
      </div>
    </div>
    </>
  )
}

export default function FeedPage() {
  return <Suspense><FeedContent /></Suspense>
}
