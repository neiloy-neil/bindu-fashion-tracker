'use client'

import { useState, useEffect } from 'react'
import { Clock, X } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { dhakaDateString } from '@/lib/new-entry'
import { BrandSpinner } from '@/components/ui/BrandSpinner'
import { Button } from '@/components/ui/button'

type Employee = {
  id: number
  name: string
  employeeId: string
}

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'PENDING'

type AttendanceRecord = {
  employeeId: number
  status: AttendanceStatus
  checkInTimeStr?: string
  checkOutTimeStr?: string
  isAbsent?: boolean
}

interface Props {
  branchId: number
}

// Get current time as HH:MM
const nowTimeStr = () => {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function MorningCheckInWidget({ branchId }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendanceData, setAttendanceData] = useState<Record<number, AttendanceRecord>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const today = dhakaDateString()

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        
        const empRes = await fetch(`/api/hr/employees?branchId=${branchId}`)
        if (!empRes.ok) throw new Error('Failed to load employees')
        const empData = await empRes.json()
        const activeEmployees = (Array.isArray(empData) ? empData : []).filter((e: any) => e.isActive)
        setEmployees(activeEmployees)

        const attRes = await fetch(`/api/hr/attendance?branchId=${branchId}&date=${today}`)
        if (attRes.ok) {
          const attData = await attRes.json()
          const records: Record<number, AttendanceRecord> = {}
          for (const att of (attData.attendances || [])) {
            // Parse stored times back to HH:MM strings for display
            const checkInStr = att.checkInTime
              ? format(new Date(att.checkInTime), 'HH:mm')
              : undefined
            const checkOutStr = att.checkOutTime
              ? format(new Date(att.checkOutTime), 'HH:mm')
              : undefined
            records[att.employeeId] = {
              employeeId: att.employeeId,
              status: att.status as AttendanceStatus,
              checkInTimeStr: checkInStr,
              checkOutTimeStr: checkOutStr,
              isAbsent: att.status === 'ABSENT',
            }
          }
          setAttendanceData(records)
        }
      } catch (error) {
        toast.error('Could not load attendance data')
      } finally {
        setLoading(false)
      }
    }

    if (branchId) {
      loadData()
    }
  }, [branchId, today])

  const handleMarkAbsent = (employeeId: number) => {
    setAttendanceData(prev => ({
      ...prev,
      [employeeId]: {
        employeeId,
        status: 'ABSENT',
        isAbsent: true,
        checkInTimeStr: undefined,
        checkOutTimeStr: undefined,
      }
    }))
  }

  const handleClearMark = (employeeId: number) => {
    setAttendanceData(prev => {
      const next = { ...prev }
      delete next[employeeId]
      return next
    })
  }

  const handleTimeChange = (employeeId: number, field: 'checkInTimeStr' | 'checkOutTimeStr', value: string) => {
    setAttendanceData(prev => {
      const existing = prev[employeeId] || { employeeId, status: 'PRESENT', isAbsent: false }
      return {
        ...prev,
        [employeeId]: {
          ...existing,
          [field]: value,
          isAbsent: false,
          status: 'PRESENT', // Will be recalculated by server
        }
      }
    })
  }

  const submitAttendance = async () => {
    const toSubmit = Object.values(attendanceData).filter(
      a => a.isAbsent || a.checkInTimeStr
    )
    if (toSubmit.length === 0) {
      toast.info('No attendance marked yet')
      return
    }

    setSaving(true)
    try {
      const payload = {
        branchId,
        date: today,
        attendances: toSubmit.map(a => ({
          employeeId: a.employeeId,
          isAbsent: a.isAbsent || false,
          checkInTimeStr: a.checkInTimeStr,
          checkOutTimeStr: a.checkOutTimeStr,
        }))
      }

      const res = await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Failed to submit attendance')
      
      const resData = await res.json()
      toast.success(`Successfully saved attendance for ${resData.count} employees`)
      
      // Reload data to get server-computed statuses
      const attRes = await fetch(`/api/hr/attendance?branchId=${branchId}&date=${today}`)
      if (attRes.ok) {
        const attData = await attRes.json()
        const records: Record<number, AttendanceRecord> = {}
        for (const att of (attData.attendances || [])) {
          const checkInStr = att.checkInTime ? format(new Date(att.checkInTime), 'HH:mm') : undefined
          const checkOutStr = att.checkOutTime ? format(new Date(att.checkOutTime), 'HH:mm') : undefined
          records[att.employeeId] = {
            employeeId: att.employeeId,
            status: att.status as AttendanceStatus,
            checkInTimeStr: checkInStr,
            checkOutTimeStr: checkOutStr,
            isAbsent: att.status === 'ABSENT',
          }
        }
        setAttendanceData(records)
      }
    } catch (error) {
      toast.error('Failed to submit attendance. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-center h-64 gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
          <span className="text-sm text-[var(--text-muted)]">Loading…</span>
        </div>
      </div>
    )
  }

  if (employees.length === 0) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm p-6 text-center">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Morning Check-In</h2>
        <p className="text-sm text-[var(--text-muted)]">No active employees found for this branch.</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Add employees in the HR & Payroll section to start tracking attendance.</p>
      </div>
    )
  }

  const markedCount = Object.keys(attendanceData).length

  const statusBadge = (status: AttendanceStatus) => {
    const map: Record<AttendanceStatus, string> = {
      PRESENT: 'bg-[var(--success-subtle)] text-[var(--success)]',
      ABSENT:  'bg-[var(--danger-subtle)] text-[var(--danger)]',
      LATE:    'bg-orange-500/10 text-orange-600',
      LEAVE:   'bg-blue-500/10 text-blue-600',
      PENDING: 'bg-[var(--surface-raised)] text-[var(--text-muted)]',
    }
    return map[status] || map.PENDING
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-raised)] flex justify-between items-center">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Clock className="text-primary" size={18} />
            Morning Check-In
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {format(new Date(today), 'EEEE, MMMM do, yyyy')}
          </p>
        </div>
        <div className="text-sm font-medium text-[var(--text-secondary)]">
          {markedCount} / {employees.length} Marked
        </div>
      </div>
      
      <div className="max-h-[420px] overflow-y-auto divide-y divide-[var(--border)]">
        {employees.map(emp => {
          const record = attendanceData[emp.id]
          const isAbsent = record?.isAbsent

          return (
            <div key={emp.id} className="flex items-center gap-2 px-4 py-2 min-w-0">
              {/* Name + ID */}
              <div className="w-36 shrink-0 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{emp.name}</p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">ID: {emp.employeeId || 'N/A'}</p>
              </div>

              {/* Check-in */}
              {!isAbsent ? (
                <>
                  <div className="flex items-center gap-1 shrink-0">
                    <label className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">In</label>
                    <input
                      type="time"
                      value={record?.checkInTimeStr || ''}
                      onChange={e => handleTimeChange(emp.id, 'checkInTimeStr', e.target.value)}
                      onClick={() => {
                        if (!record?.checkInTimeStr) handleTimeChange(emp.id, 'checkInTimeStr', nowTimeStr())
                      }}
                      className="h-7 w-24 px-1.5 text-xs rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <label className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">Out</label>
                    <input
                      type="time"
                      value={record?.checkOutTimeStr || ''}
                      onChange={e => handleTimeChange(emp.id, 'checkOutTimeStr', e.target.value)}
                      className="h-7 w-24 px-1.5 text-xs rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1" />
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Status badge */}
              {record && (
                <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusBadge(record.status)}`}>
                  {record.status}
                </span>
              )}

              {/* Absent / Undo button */}
              {isAbsent ? (
                <Button
                  onClick={() => handleClearMark(emp.id)}
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 gap-1 text-xs text-[var(--danger)] hover:bg-[var(--danger-subtle)]"
                >
                  <X size={12} /> Undo
                </Button>
              ) : (
                <Button
                  onClick={() => handleMarkAbsent(emp.id)}
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 gap-1 text-xs bg-[var(--danger-subtle)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white"
                >
                  Absent
                </Button>
              )}
            </div>
          )
        })}
      </div>

      <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-raised)] flex justify-end">
        <Button 
          onClick={submitAttendance}
          disabled={saving || markedCount === 0}
          className="gap-2 text-sm"
        >
          {saving ? <BrandSpinner size={14} /> : 'Save Attendance'}
        </Button>
      </div>
    </div>
  )
}
