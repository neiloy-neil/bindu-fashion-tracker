'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, parseISO, getDaysInMonth, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function AttendanceDashboardPage() {
  const [currentMonth, setCurrentMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [branches, setBranches] = useState<any[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [report, setReport] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null)
  const [isExcused, setIsExcused] = useState(false)
  const [excuseNote, setExcuseNote] = useState('')
  const [savingRecord, setSavingRecord] = useState(false)

  useEffect(() => {
    fetch('/api/branches')
      .then(r => r.json())
      .then(b => setBranches(b))
      .catch(() => toast.error('Failed to load branches'))
  }, [])

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true)
      try {
        const url = new URL(window.location.origin + '/api/hr/attendance/monthly')
        url.searchParams.set('month', currentMonth)
        if (selectedBranch !== 'all') {
          url.searchParams.set('branchId', selectedBranch)
        }

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
  }, [currentMonth, selectedBranch])

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

  const handlePrevMonth = () => {
    setCurrentMonth(format(subMonths(parseISO(`${currentMonth}-01`), 1), 'yyyy-MM'))
  }

  const handleNextMonth = () => {
    setCurrentMonth(format(addMonths(parseISO(`${currentMonth}-01`), 1), 'yyyy-MM'))
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PRESENT': return 'bg-green-100 text-green-800 border-green-200'
      case 'ABSENT': return 'bg-red-100 text-red-800 border-red-200'
      case 'LATE': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LEAVE': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-50 text-gray-400 border-gray-100'
    }
  }

  const getStatusLetter = (status: string) => {
    switch(status) {
      case 'PRESENT': return 'P'
      case 'ABSENT': return 'A'
      case 'LATE': return 'L'
      case 'LEAVE': return 'V'
      default: return '-'
    }
  }

  const handleCellClick = (record: any, empName: string, dateStr: string) => {
    if (!record || !record.id) return
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
        body: JSON.stringify({ isExcused, excuseNote })
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update')
      toast.success('Attendance updated')
      
      // Update local state to avoid refetching
      setReport(prev => prev.map(emp => {
        if (emp.name !== selectedRecord.empName) return emp
        return {
          ...emp,
          attendanceMap: {
            ...emp.attendanceMap,
            [selectedRecord.day]: {
              ...emp.attendanceMap[selectedRecord.day],
              isExcused,
              excuseNote
            }
          }
        }
      }))
      setSelectedRecord(null)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingRecord(false)
    }
  }

  return (
    <>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4
                      px-6 py-4 border-b border-[var(--border)]
                      bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">
            Attendance Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track daily attendance, late check-ins, and leave across all branches.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Prev
          </Button>
          <div className="font-medium text-sm w-24 text-center">
            {format(parseISO(`${currentMonth}-01`), 'MMM yyyy')}
          </div>
          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="p-6 max-w-full overflow-x-hidden space-y-6">
        {/* Filters */}
        <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="flex gap-4 items-center">
            <div className="w-64">
              <input 
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                placeholder="Search employee..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="w-64">
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="bg-background">
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
          </div>
        </div>

        {/* Matrix */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading attendance data...</div>
          ) : filteredReport.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <User className="w-12 h-12 text-border mb-3" />
              <p>No employees found for the selected criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="whitespace-nowrap">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="sticky left-0 bg-muted/95 z-10 w-48">Employee</TableHead>
                    <TableHead className="text-center">Total P</TableHead>
                    <TableHead className="text-center">Total L</TableHead>
                    <TableHead className="text-center">Total A</TableHead>
                    {daysArray.map(day => (
                      <TableHead key={day} className="text-center px-1 min-w-[32px] font-mono text-xs">{day}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReport.map(emp => (
                    <TableRow key={emp.id} className="hover:bg-muted/30">
                      <TableCell className="sticky left-0 bg-card z-10 border-r border-border">
                        <div className="font-medium text-sm text-[var(--text-primary)]">{emp.name}</div>
                        <div className="text-xs text-muted-foreground">{emp.employeeId || 'No ID'} • {emp.branchName}</div>
                      </TableCell>
                      <TableCell className="text-center bg-green-50/30 font-medium text-green-700">{emp.summary.presentDays}</TableCell>
                      <TableCell className="text-center bg-yellow-50/30 font-medium text-yellow-700">{emp.summary.lateDays}</TableCell>
                      <TableCell className="text-center bg-red-50/30 font-medium text-red-700">{emp.summary.absentDays}</TableCell>
                      
                      {daysArray.map(day => {
                        const record = emp.attendanceMap[day]
                        const status = record?.status || ''
                        const colorClass = record?.isExcused ? 'bg-green-100 text-green-800 border-green-400 border-2' : getStatusColor(status)
                        const letter = getStatusLetter(status)
                        return (
                          <TableCell key={day} className="text-center px-1 py-2">
                            <div 
                              onClick={() => handleCellClick({ ...record, day }, emp.name, `${currentMonth}-${String(day).padStart(2, '0')}`)}
                              className={`w-7 h-7 mx-auto rounded flex items-center justify-center text-xs font-semibold border ${colorClass} ${record?.id ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`} 
                              title={record?.checkInTime ? `In: ${format(new Date(record.checkInTime), 'hh:mm a')}${record.isExcused ? ' (Excused)' : ''}` : 'No Record'}
                            >
                              {letter}
                              {record?.isExcused && <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span></span>}
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
      </div>

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
              <div className="flex justify-between items-center text-sm bg-muted/30 p-3 rounded-md">
                <span className="text-muted-foreground">Original Status</span>
                <Badge variant="outline">{selectedRecord.status}</Badge>
              </div>
              <div className="flex justify-between items-center text-sm bg-muted/30 p-3 rounded-md">
                <span className="text-muted-foreground">Check-in</span>
                <span className="font-mono">{selectedRecord.checkInTime ? format(new Date(selectedRecord.checkInTime), 'hh:mm a') : 'N/A'}</span>
              </div>
              
              <div className="pt-4 border-t border-border space-y-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={isExcused} onChange={e => setIsExcused(e.target.checked)} className="w-4 h-4 rounded border-border" />
                  <span className="text-sm font-medium">Mark as Excused</span>
                </label>
                
                {isExcused && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Excuse Note</label>
                    <textarea 
                      value={excuseNote}
                      onChange={e => setExcuseNote(e.target.value)}
                      placeholder="Reason for excuse..."
                      className="w-full text-sm bg-background border border-border rounded-md p-2 min-h-[80px]"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedRecord(null)}>Cancel</Button>
                <Button className="flex-1" onClick={handleSaveExcuse} disabled={savingRecord}>{savingRecord ? 'Saving...' : 'Save'}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
