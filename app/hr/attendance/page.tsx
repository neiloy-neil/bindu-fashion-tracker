'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, parseISO, getDaysInMonth, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, User, ClipboardCheck, BarChart2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MorningCheckInWidget } from '@/components/hr/MorningCheckInWidget'

type PageTab = 'record' | 'report'

export default function AttendanceDashboardPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const userBranchId = (session?.user as any)?.branchId

  const [tab, setTab] = useState<PageTab>('record')
  const [currentMonth, setCurrentMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [branches, setBranches] = useState<any[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [report, setReport] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null)
  const [isExcused, setIsExcused] = useState(false)
  const [excuseNote, setExcuseNote] = useState('')
  const [savingRecord, setSavingRecord] = useState(false)

  // Resolve the branchId to use for recording
  const recordBranchId: number | null = useMemo(() => {
    if (userRole === 'BRANCH' && userBranchId) return parseInt(userBranchId)
    if (selectedBranch !== 'all') return parseInt(selectedBranch)
    return null
  }, [userRole, userBranchId, selectedBranch])

  useEffect(() => {
    fetch('/api/branches')
      .then(r => r.json())
      .then(b => {
        setBranches(b)
        // Auto-select branch for BRANCH role
        if (userRole === 'BRANCH' && userBranchId) {
          setSelectedBranch(userBranchId)
        }
      })
      .catch(() => toast.error('Failed to load branches'))
  }, [userRole, userBranchId])

  useEffect(() => {
    if (tab !== 'report') return
    const fetchReport = async () => {
      setLoading(true)
      try {
        const url = new URL(window.location.origin + '/api/hr/attendance/monthly')
        url.searchParams.set('month', currentMonth)
        if (selectedBranch !== 'all') url.searchParams.set('branchId', selectedBranch)
        const res = await fetch(url.toString())
        if (!res.ok) throw new Error('Failed to load attendance data')
        const data = await res.json()
        setReport(data.report)
      } catch (err: any) {
        toast.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [currentMonth, selectedBranch, tab])

  const filteredReport = useMemo(() => {
    if (!search) return report
    const q = search.toLowerCase()
    return report.filter(emp =>
      emp.name.toLowerCase().includes(q) ||
      (emp.employeeId && emp.employeeId.toLowerCase().includes(q))
    )
  }, [report, search])

  const daysInMonth = getDaysInMonth(parseISO(`${currentMonth}-01`))
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-100 text-green-800 border-green-200'
      case 'ABSENT':  return 'bg-red-100 text-red-800 border-red-200'
      case 'LATE':    return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LEAVE':   return 'bg-blue-100 text-blue-800 border-blue-200'
      default:        return 'bg-gray-50 text-gray-400 border-gray-100'
    }
  }

  const getStatusLetter = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'P'
      case 'ABSENT':  return 'A'
      case 'LATE':    return 'L'
      case 'LEAVE':   return 'V'
      default:        return '-'
    }
  }

  const handleCellClick = (record: any, empName: string, dateStr: string) => {
    if (!record?.id) return
    setSelectedRecord({ ...record, empName, dateStr })
    setIsExcused(record.isExcused || false)
    setExcuseNote(record.excuseNote || '')
  }

  const handleSaveExcuse = async () => {
    if (!selectedRecord) return
    setSavingRecord(true)
    try {
      const res = await fetch(`/api/hr/attendance/${selectedRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isExcused, excuseNote }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update')
      toast.success('Attendance updated')
      setReport(prev => prev.map(emp => {
        if (emp.name !== selectedRecord.empName) return emp
        return {
          ...emp,
          attendanceMap: {
            ...emp.attendanceMap,
            [selectedRecord.day]: { ...emp.attendanceMap[selectedRecord.day], isExcused, excuseNote },
          },
        }
      }))
      setSelectedRecord(null)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingRecord(false)
    }
  }

  const canRecord = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'BRANCH'

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Attendance</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Record daily check-ins and view monthly reports</p>
        </div>

        {/* Tab toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1">
          {canRecord && (
            <button
              onClick={() => setTab('record')}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'record' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              <ClipboardCheck size={14} /> Record Today
            </button>
          )}
          <button
            onClick={() => setTab('report')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'report' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
          >
            <BarChart2 size={14} /> Monthly Report
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-auto">

        {/* Branch selector — shown in both tabs for ADMIN */}
        {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'HR_ADMIN') && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-[var(--text-muted)] shrink-0">Branch</label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-56 bg-[var(--surface)]">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map(b => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* ── Record Today tab ── */}
        {tab === 'record' && canRecord && (
          <>
            {recordBranchId ? (
              <MorningCheckInWidget branchId={recordBranchId} />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-20 gap-3">
                <ClipboardCheck size={32} className="text-[var(--text-disabled)]" />
                <p className="text-sm font-medium text-[var(--text-muted)]">Select a branch above to record attendance</p>
              </div>
            )}
          </>
        )}

        {/* ── Monthly Report tab ── */}
        {tab === 'report' && (
          <>
            {/* Month nav + search */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <input
                  className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm w-52"
                  placeholder="Search employee…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(format(subMonths(parseISO(`${currentMonth}-01`), 1), 'yyyy-MM'))}>
                  <ChevronLeft size={14} className="mr-1" /> Prev
                </Button>
                <span className="font-medium text-sm w-24 text-center">{format(parseISO(`${currentMonth}-01`), 'MMM yyyy')}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(format(addMonths(parseISO(`${currentMonth}-01`), 1), 'yyyy-MM'))}>
                  Next <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>

            {/* Matrix */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-48 gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
                  <span className="text-sm text-[var(--text-muted)]">Loading…</span>
                </div>
              ) : filteredReport.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <User size={36} className="text-[var(--text-disabled)]" />
                  <p className="text-sm text-[var(--text-muted)]">No employees found for the selected criteria.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="whitespace-nowrap">
                    <TableHeader className="bg-[var(--surface-raised)]">
                      <TableRow>
                        <TableHead className="sticky left-0 bg-[var(--surface-raised)] z-10 w-48 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Employee</TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wide text-green-600">P</TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wide text-yellow-600">L</TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wide text-red-600">A</TableHead>
                        {daysArray.map(day => (
                          <TableHead key={day} className="text-center px-1 min-w-[32px] font-mono text-xs text-[var(--text-muted)]">{day}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReport.map(emp => (
                        <TableRow key={emp.id} className="hover:bg-[var(--surface-raised)] border-[var(--border)]">
                          <TableCell className="sticky left-0 bg-[var(--surface)] z-10 border-r border-[var(--border)]">
                            <div className="font-medium text-sm text-[var(--text-primary)]">{emp.name}</div>
                            <div className="text-xs text-[var(--text-muted)]">{emp.employeeId || 'No ID'} · {emp.branchName}</div>
                          </TableCell>
                          <TableCell className="text-center font-medium text-green-700">{emp.summary.presentDays}</TableCell>
                          <TableCell className="text-center font-medium text-yellow-700">{emp.summary.lateDays}</TableCell>
                          <TableCell className="text-center font-medium text-red-700">{emp.summary.absentDays}</TableCell>
                          {daysArray.map(day => {
                            const record = emp.attendanceMap[day]
                            const status = record?.status || ''
                            const colorClass = record?.isExcused
                              ? 'bg-green-100 text-green-800 border-green-400 border-2'
                              : getStatusColor(status)
                            const letter = getStatusLetter(status)
                            const checkIn = record?.checkInTime ? format(new Date(record.checkInTime), 'HH:mm') : null
                            const checkOut = record?.checkOutTime ? format(new Date(record.checkOutTime), 'HH:mm') : null
                            const tipParts = []
                            if (checkIn) tipParts.push(`In: ${checkIn}`)
                            if (checkOut) tipParts.push(`Out: ${checkOut}`)
                            if (record?.isExcused) tipParts.push('Excused')
                            const tip = tipParts.length ? tipParts.join(' · ') : 'No record'
                            return (
                              <TableCell key={day} className="text-center px-1 py-2">
                                <div
                                  onClick={() => handleCellClick({ ...record, day }, emp.name, `${currentMonth}-${String(day).padStart(2, '0')}`)}
                                  title={tip}
                                  className={`w-7 h-7 mx-auto rounded flex items-center justify-center text-xs font-semibold border relative ${colorClass} ${record?.id ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                                >
                                  {letter}
                                  {record?.isExcused && (
                                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Excuse modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Manage Attendance</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{selectedRecord.empName} — {selectedRecord.dateStr}</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex justify-between items-center text-sm bg-[var(--surface-raised)] p-3 rounded-lg">
                  <span className="text-[var(--text-muted)]">Status</span>
                  <Badge variant="outline">{selectedRecord.status}</Badge>
                </div>
                <div className="flex justify-between items-center text-sm bg-[var(--surface-raised)] p-3 rounded-lg">
                  <span className="text-[var(--text-muted)]">Check-in</span>
                  <span className="font-mono text-xs">{selectedRecord.checkInTime ? format(new Date(selectedRecord.checkInTime), 'HH:mm') : 'N/A'}</span>
                </div>
                {selectedRecord.checkOutTime && (
                  <div className="col-span-2 flex justify-between items-center text-sm bg-[var(--surface-raised)] p-3 rounded-lg">
                    <span className="text-[var(--text-muted)]">Check-out</span>
                    <span className="font-mono text-xs">{format(new Date(selectedRecord.checkOutTime), 'HH:mm')}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[var(--border)] space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={isExcused} onChange={e => setIsExcused(e.target.checked)} className="w-4 h-4 rounded" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">Mark as Excused</span>
                </label>
                {isExcused && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-muted)]">Excuse Note</label>
                    <textarea
                      value={excuseNote}
                      onChange={e => setExcuseNote(e.target.value)}
                      placeholder="Reason for excuse…"
                      className="w-full text-sm bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2 min-h-[80px]"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedRecord(null)}>Cancel</Button>
                <Button className="flex-1" onClick={handleSaveExcuse} disabled={savingRecord}>
                  {savingRecord ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
