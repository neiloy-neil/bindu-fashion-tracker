'use client'

import { useState, useEffect } from 'react'
import { Check, X, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { dhakaDateString } from '@/lib/new-entry'
import { BrandSpinner } from '@/components/ui/BrandSpinner'

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
}

interface Props {
  branchId: number
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
        
        // 1. Fetch branch employees
        const empRes = await fetch(`/api/hr/employees?branchId=${branchId}`)
        if (!empRes.ok) throw new Error('Failed to load employees')
        const empData = await empRes.json()
        const activeEmployees = (empData.employees || []).filter((e: any) => e.isActive)
        setEmployees(activeEmployees)

        // 2. Fetch today's attendance for this branch
        const attRes = await fetch(`/api/hr/attendance?branchId=${branchId}&date=${today}`)
        if (attRes.ok) {
          const attData = await attRes.json()
          const records: Record<number, AttendanceRecord> = {}
          for (const att of (attData.attendances || [])) {
            records[att.employeeId] = {
              employeeId: att.employeeId,
              status: att.status as AttendanceStatus,
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

  const handleMark = (employeeId: number, isAbsent: boolean) => {
    const now = new Date()
    const checkInTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    
    setAttendanceData(prev => ({
      ...prev,
      [employeeId]: {
        employeeId,
        status: isAbsent ? 'ABSENT' : 'PRESENT', // Optimistic, backend will check if LATE
        checkInTimeStr
      }
    }))
  }

  const submitAttendance = async () => {
    const unsaved = Object.values(attendanceData).filter(a => a.status === 'PRESENT' || a.status === 'ABSENT' || a.status === 'LATE')
    if (unsaved.length === 0) {
      toast.info('No attendance marked yet')
      return
    }

    setSaving(true)
    try {
      const payload = {
        branchId,
        date: today,
        attendances: unsaved.map(a => ({
          employeeId: a.employeeId,
          isAbsent: a.status === 'ABSENT',
          checkInTimeStr: a.checkInTimeStr
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
      
      // Reload the data so we get accurate LATE statuses assigned by the server
      const attRes = await fetch(`/api/hr/attendance?branchId=${branchId}&date=${today}`)
      if (attRes.ok) {
        const attData = await attRes.json()
        const records: Record<number, AttendanceRecord> = {}
        for (const att of (attData.attendances || [])) {
          records[att.employeeId] = {
            employeeId: att.employeeId,
            status: att.status as AttendanceStatus,
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
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 shadow-sm flex items-center justify-center min-h-[200px]">
        <BrandSpinner />
      </div>
    )
  }

  if (employees.length === 0) {
    return null // Don't show the widget if there are no employees at this branch
  }

  const submittedCount = Object.keys(attendanceData).length
  const allSubmitted = submittedCount === employees.length

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-raised)] flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Clock className="text-primary" size={18} />
            Morning Check-In
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {format(new Date(today), 'EEEE, MMMM do, yyyy')}
          </p>
        </div>
        <div className="text-sm font-medium text-[var(--text-secondary)]">
          {submittedCount} / {employees.length} Marked
        </div>
      </div>
      
      <div className="p-4 max-h-[300px] overflow-y-auto divide-y divide-[var(--border)]">
        {employees.map(emp => {
          const record = attendanceData[emp.id]
          const isSubmitted = !!record
          
          return (
            <div key={emp.id} className="py-3 flex justify-between items-center gap-4">
              <div>
                <p className="font-semibold text-[var(--text-primary)]">{emp.name}</p>
                <p className="text-xs text-[var(--text-muted)]">ID: {emp.employeeId || 'N/A'}</p>
              </div>
              
              <div className="flex items-center gap-2">
                {isSubmitted ? (
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    record.status === 'PRESENT' ? 'bg-[var(--success-subtle)]/30 text-[var(--success)]' :
                    record.status === 'ABSENT' ? 'bg-[var(--danger-subtle)]/30 text-[var(--danger)]' :
                    record.status === 'LATE' ? 'bg-orange-500/10 text-orange-600' :
                    'bg-blue-500/10 text-blue-600'
                  }`}>
                    {record.status}
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => handleMark(emp.id, false)}
                      className="h-8 px-3 rounded-md bg-[var(--success-subtle)] text-[var(--success)] hover:bg-[var(--success)] hover:text-white transition-colors text-xs font-medium flex items-center gap-1"
                    >
                      <Check size={14} /> Present
                    </button>
                    <button 
                      onClick={() => handleMark(emp.id, true)}
                      className="h-8 px-3 rounded-md bg-[var(--danger-subtle)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition-colors text-xs font-medium flex items-center gap-1"
                    >
                      <X size={14} /> Absent
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-raised)] flex justify-end">
        <button 
          onClick={submitAttendance}
          disabled={saving || allSubmitted || Object.values(attendanceData).filter(a => a.checkInTimeStr).length === 0}
          className="btn btn-primary text-sm flex items-center gap-2"
        >
          {saving ? <BrandSpinner size={14} /> : 'Submit Attendance'}
        </button>
      </div>
    </div>
  )
}
