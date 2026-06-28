'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format, getDaysInMonth, parseISO, startOfMonth } from 'date-fns'
import { toast } from 'sonner'
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  Phone,
  Briefcase,
  TrendingUp,
} from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function EmployeeAttendancePage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'))

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/hr/attendance/employee/${params.id}?month=${currentMonth}`)
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Failed to load employee attendance')

        if (!cancelled) {
          setData(result)
        }
      } catch (error: any) {
        if (!cancelled) {
          toast.error(error.message || 'Failed to load employee attendance')
          setData(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [params.id, currentMonth])

  const monthDate = useMemo(() => startOfMonth(parseISO(`${currentMonth}-01`)), [currentMonth])
  const daysInMonth = useMemo(() => getDaysInMonth(monthDate), [monthDate])
  const firstDayIndex = useMemo(() => monthDate.getDay(), [monthDate])

  const previousMonth = useMemo(() => {
    const prev = new Date(monthDate)
    prev.setMonth(prev.getMonth() - 1)
    return format(prev, 'yyyy-MM')
  }, [monthDate])

  const nextMonth = useMemo(() => {
    const next = new Date(monthDate)
    next.setMonth(next.getMonth() + 1)
    return format(next, 'yyyy-MM')
  }, [monthDate])

  const calendarDays = useMemo(() => Array.from({ length: daysInMonth }, (_, index) => index + 1), [daysInMonth])

  const leaveEntries = Object.entries(data?.leaveSummary || {}) as Array<[string, number]>

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
        <span className="text-sm text-[var(--text-muted)]">Loading…</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-12 h-12 rounded-full bg-[var(--surface-raised)] flex items-center justify-center">
          <User className="w-5 h-5 text-[var(--text-muted)]" />
        </div>
        <p className="text-sm font-medium text-[var(--text-muted)]">Employee attendance could not be loaded.</p>
      </div>
    )
  }

  const { employee, attendanceMap, summary, leaveRecords, transfers } = data

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
            <ArrowLeft size={16} /> Employees
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">{employee.name}</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">{employee.designation || 'Employee attendance dashboard'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn(
            'border-0',
            employee.isActive
              ? 'bg-[var(--success-subtle)] text-[var(--success)]'
              : 'bg-[var(--danger-subtle)] text-[var(--danger)]'
          )}>
            {employee.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 min-h-0">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-full bg-[var(--surface-raised)] border-2 border-[var(--border)] overflow-hidden flex-shrink-0 flex items-center justify-center">
              {employee.photoUrl ? (
                <Image src={employee.photoUrl} width={64} height={64} className="w-full h-full object-cover" alt={employee.name} />
              ) : (
                <User className="w-7 h-7 text-[var(--text-muted)]" />
              )}
            </div>

            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-0.5">Employee ID</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{employee.employeeId || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-0.5">Branch</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{employee.branch?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-0.5 flex items-center gap-1"><Briefcase className="w-3 h-3" /> Designation</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{employee.designation || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> Joining Date</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{employee.joiningDate ? format(parseISO(employee.joiningDate), 'dd MMM yyyy') : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-0.5">Basic Salary</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{employee.basicSalary ? `৳${employee.basicSalary.toLocaleString('en-BD')}` : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-0.5 flex items-center gap-1"><Phone className="w-3 h-3" /> Mobile</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{employee.mobileNumber || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-0.5">Yearly Leave Allowance</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{employee.yearlyLeaveAllowance ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-0.5">Blood Group</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{employee.bloodGroup || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--text-muted)]" />
              Attendance — {format(monthDate, 'MMMM yyyy')}
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(previousMonth)}>
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm text-[var(--text-secondary)] min-w-[110px] text-center">
                {format(monthDate, 'MMM yyyy')}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(nextMonth)} disabled={currentMonth >= format(new Date(), 'yyyy-MM')}>
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-[var(--success)]">{summary.presentDays}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3" /> Present</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-[var(--danger)]">{summary.absentDays}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center justify-center gap-1"><XCircle className="w-3 h-3" /> Absent</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-[var(--warning)]">{summary.lateDays}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center justify-center gap-1"><AlertCircle className="w-3 h-3" /> Late</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-[var(--info)]">{summary.leaveDays}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3" /> Leave</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(label => (
                <div key={label} className="text-center text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] py-2">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstDayIndex }).map((_, index) => (
                <div key={`empty-${index}`} className="rounded-lg bg-transparent p-2" />
              ))}

              {calendarDays.map(day => {
                const att = attendanceMap[day]
                const statusColorClass =
                  att?.status === 'PRESENT'
                    ? 'bg-[var(--success-subtle)] text-[var(--success)]'
                    : att?.status === 'ABSENT'
                    ? 'bg-[var(--danger-subtle)] text-[var(--danger)]'
                    : att?.status === 'LATE'
                    ? 'bg-[var(--warning-subtle)] text-[var(--warning)]'
                    : att?.status === 'LEAVE'
                    ? 'bg-[var(--info-subtle)] text-[var(--info)]'
                    : ''

                return (
                  <div
                    key={day}
                    title={att ? `${att.status}${att.note ? ' — ' + att.note : ''}` : ''}
                    className={cn(
                      'rounded-lg p-2 text-center text-xs font-medium transition-colors min-h-[72px]',
                      statusColorClass || 'bg-[var(--surface-raised)] text-[var(--text-disabled)]'
                    )}
                  >
                    <p className="text-sm font-semibold">{day}</p>
                    {att?.checkInTime && (
                      <p className="text-[10px] mt-0.5 opacity-75">
                        {format(parseISO(att.checkInTime), 'HH:mm')}
                      </p>
                    )}
                    {att?.status && (
                      <p className="text-[10px] mt-0.5 truncate">
                        {att.status === 'LATE' ? 'Late' : att.status === 'PRESENT' ? 'On Time' : att.status}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Leave Records — {currentMonth.slice(0, 4)}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {leaveEntries.map(([type, days]) => (
                <span key={type} className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-[var(--info-subtle)] text-[var(--info)]">
                  {type}: {days}d
                </span>
              ))}
            </div>
          </div>

          {leaveRecords.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--text-muted)]">
              No approved leave records for this year
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-[var(--border)]">
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Type</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">From</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">To</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Days</TableHead>
                  <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveRecords.map((lr: any) => (
                  <TableRow key={lr.id} className="border-[var(--border)] hover:bg-[var(--surface-raised)]">
                    <TableCell>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-[var(--info-subtle)] text-[var(--info)]">
                        {lr.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-secondary)]">
                      {format(parseISO(lr.startDate), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-secondary)]">
                      {format(parseISO(lr.endDate), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-[var(--text-primary)]">
                      {Math.round((new Date(lr.endDate).getTime() - new Date(lr.startDate).getTime()) / 86400000) + 1}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)] max-w-[200px] truncate">
                      {lr.reason || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {transfers.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
              Transfer History
            </h3>
            <div className="space-y-3">
              {transfers.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-raised)]">
                  <MapPin size={14} className="text-[var(--text-muted)] flex-shrink-0" />
                  <span className="text-sm text-[var(--text-secondary)]">
                    {t.fromBranch.name}
                  </span>
                  <ChevronRight size={14} className="text-[var(--text-muted)]" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {t.toBranch.name}
                  </span>
                  <span className="ml-auto text-xs text-[var(--text-muted)]">
                    {format(parseISO(t.transferDate), 'dd MMM yyyy')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
