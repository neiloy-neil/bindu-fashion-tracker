'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Employee, SalaryRecord } from '@prisma/client'
import { calcSalary } from '@/lib/hr/calculations'
import { Users, ChevronRight, Clock, CheckCircle2, Circle, Lock } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

type MonthData = {
  month: number
  year: number
  records: number
  totalPayable: number
  lastUpdatedAt: string | null
  status: 'finalized' | 'in_progress' | 'pending'
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
        const [empsRes] = await Promise.all([
          fetch('/api/hr/employees?active=true')
        ])

        const emps: Employee[] = empsRes.ok ? await empsRes.json() : []
        
        const monthPromises = []
        for (let m = 1; m <= 12; m++) {
          monthPromises.push(fetch(`/api/hr/salary-records?month=${m}&year=${year}`).then(res => res.ok ? res.json() : []))
        }
        const allRecs = await Promise.all(monthPromises)

        if (cancelled) return

        setTotalEmployees(emps.length)

        const empMap = new Map((emps ?? []).map(e => [e.id, e]))

        const monthData: MonthData[] = []
        for (let m = 1; m <= 12; m++) {
          const recs = (allRecs[m - 1]?.records ?? []) as SalaryRecord[]
          
          let totalPayable = 0
          let recordsCount = 0
          let lastUpdatedAt: string | null = null
          let isFinalized = false

          for (const r of recs) {
            const emp = empMap.get(r.employeeId)
            if (emp) {
              const calc = calcSalary(emp, r)
              totalPayable += calc.netPayable
              recordsCount++
            }
            if (!lastUpdatedAt || new Date(r.updatedAt) > new Date(lastUpdatedAt)) {
              lastUpdatedAt = r.updatedAt.toString()
            }
            if (r.lockedAt) {
              isFinalized = true
            }
          }

          const completion = emps.length > 0 ? Math.round((recordsCount / emps.length) * 100) : 0

          let status: 'finalized' | 'in_progress' | 'pending' = 'pending'
          if (isFinalized && recordsCount > 0) status = 'finalized'
          else if (recordsCount > 0) status = 'in_progress'

          monthData.push({ month: m, year, records: recordsCount, totalPayable, lastUpdatedAt, status, completion })
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
  const processedCount = months.filter(m => m.status === 'finalized').length
  const totalRecords = months.reduce((s, m) => s + m.records, 0)
  const totalPayable = months.reduce((s, m) => s + m.totalPayable, 0)

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Done</p>
          <p className="text-2xl font-bold tabular-nums leading-none text-[var(--text-primary)]">{processedCount}</p>
          <p className="text-xs text-[var(--text-muted)]">Months finalized</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Remaining</p>
          <p className="text-2xl font-bold tabular-nums leading-none text-[var(--text-primary)]">{12 - processedCount}</p>
          <p className="text-xs text-[var(--text-muted)]">Months left</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Staff</p>
          <p className="text-2xl font-bold tabular-nums leading-none text-[var(--text-primary)]">{totalEmployees}</p>
          <p className="text-xs text-[var(--text-muted)]">Active employees</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Total</p>
          <p className="text-2xl font-bold tabular-nums leading-none text-[var(--info)]">{formatTaka(Math.round(totalPayable / 1000))}k</p>
          <p className="text-xs text-[var(--text-muted)]">Payroll volume</p>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto">
        {[
          { label: 'All', value: 'all', count: 12 },
          { label: 'Finalized', value: 'finalized', count: months.filter(m => m.status === 'finalized').length },
          { label: 'In Progress', value: 'in_progress', count: months.filter(m => m.status === 'in_progress').length },
          { label: 'Pending', value: 'pending', count: months.filter(m => m.status === 'pending').length },
        ].map(opt => (
          <Button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            variant="ghost"
            size="sm"
            className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
              statusFilter === opt.value
                ? 'bg-[var(--accent-subtle)] text-[var(--accent)] hover:bg-[var(--accent-subtle)]'
                : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]'
            }`}
          >
            {opt.label}
            <span className={`ml-1.5 ${statusFilter === opt.value ? 'text-[var(--accent)]/70' : 'text-[var(--text-muted)]'}`}>{opt.count}</span>
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
          <span className="text-sm text-[var(--text-muted)]">Loading…</span>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => {
            const isCurrentMonth = m.month === currentMonth && m.year === currentYear
            return (
              <Link key={m.month} href={`/hr/salary?month=${m.month}&year=${m.year}`} className="block group">
                <div className={`rounded-xl border bg-[var(--surface)] p-4 sm:p-5 flex items-center gap-3 sm:gap-4 transition-all duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] ${
                  isCurrentMonth ? 'border-[var(--warning)]/40 ring-1 ring-[var(--warning)]/10' : 'border-[var(--border)]'
                }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    m.status === 'finalized' ? 'bg-[var(--success-subtle)]/20' : m.status === 'in_progress' ? 'bg-[var(--info-subtle)]/20' : 'bg-[var(--border)]/30'
                  }`}>
                    {m.status === 'finalized' ? <CheckCircle2 size={20} className="text-[var(--success)]" /> :
                     m.status === 'in_progress' ? <Circle size={20} className="text-[var(--info)]" /> :
                     <Circle size={20} className="text-[var(--text-muted)] opacity-50" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[var(--text-primary)] text-sm sm:text-base">{MONTHS[m.month - 1]}</p>
                      {isCurrentMonth && <span className="inline-flex rounded-full bg-[var(--warning-subtle)] px-2 py-0.5 text-[11px] font-semibold text-[var(--warning)]">Current</span>}
                      {m.status === 'finalized' && <span className="hidden sm:inline-flex rounded-full bg-[var(--success-subtle)] px-2 py-0.5 text-[11px] font-semibold text-[var(--success)]">Finalized</span>}
                      {m.status === 'in_progress' && <span className="hidden sm:inline-flex rounded-full bg-[var(--info-subtle)] px-2 py-0.5 text-[11px] font-semibold text-[var(--info)]">In Progress</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--text-muted)] flex-wrap">
                      {m.records > 0 ? (
                        <>
                          <span className="flex items-center gap-1"><Users size={12} />{m.records} employee{m.records !== 1 ? 's' : ''}</span>
                          {m.totalPayable > 0 && <span className="font-medium text-[var(--text-secondary)]">{formatTaka(Math.round(m.totalPayable))}</span>}
                          {m.status === 'finalized' && <span className="flex items-center gap-1"><Lock size={12} />Locked</span>}
                          {m.lastUpdatedAt && <span className="flex items-center gap-1"><Clock size={12} />{formatRelative(m.lastUpdatedAt)}</span>}
                        </>
                      ) : (
                        <span className="text-[var(--text-muted)] opacity-50">No records yet</span>
                      )}
                    </div>
                  </div>

                  {m.records > 0 && (
                    <div className="shrink-0 hidden sm:flex flex-col items-end gap-1">
                      <span className="text-xs font-semibold text-[var(--text-muted)]">{m.completion}%</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 10 }).map((_, index) => (
                          <span
                            key={index}
                            className={`h-1.5 w-1.5 rounded-full ${
                              index < Math.ceil(Math.min(m.completion, 100) / 10)
                                ? m.completion >= 100
                                  ? 'bg-[var(--success)]'
                                  : m.completion >= 50
                                  ? 'bg-[var(--info)]'
                                  : 'bg-[var(--warning)]'
                                : 'bg-[var(--border)]'
                            }`}
                          />
                        ))}
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
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-12 h-12 rounded-full bg-[var(--surface-raised)] flex items-center justify-center">
                <Circle className="w-5 h-5 text-[var(--text-muted)]" />
              </div>
              <p className="text-sm font-medium text-[var(--text-muted)]">No months match the selected filter</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)] px-1">
        <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-[var(--success)]" /> Finalized payroll month</span>
        <span className="flex items-center gap-1.5"><Circle size={14} className="text-[var(--info)]" /> Payroll in progress</span>
        <span className="flex items-center gap-1.5"><Circle size={14} className="text-[var(--text-muted)] opacity-50" /> Not processed</span>
      </div>
    </div>
    </>
  )
}

export default function FeedPage() {
  return <Suspense><FeedContent /></Suspense>
}
