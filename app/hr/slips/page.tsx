'use client'

import { useEffect, useState, Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Branch, SystemSettings } from '@prisma/client'
import type { SalaryCalc } from '@/lib/hr/calculations'
import { formatTaka } from '@/lib/hr/calculations'
import { toast } from 'sonner'
import { Download, FileText, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { SlipPreviewButton } from '@/components/hr/SlipPreviewModal'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function SlipsContent() {
  const params = useSearchParams()
  const now = new Date()
  const currentYear = now.getFullYear()
  const [month, setMonth] = useState(+(params.get('month') ?? now.getMonth() + 1))
  const [year, setYear] = useState(+(params.get('year') ?? currentYear))
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [calcsByBranch, setCalcsByBranch] = useState<Map<string, SalaryCalc[]>>(new Map())
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [localSearch, setLocalSearch] = useState('')

  const [role, setRole] = useState<'ADMIN' | 'HR_ADMIN' | 'BRANCH' | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) setSearch(localSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearch, search])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const [setRes, slipsRes, empsRes] = await Promise.all([
          fetch('/api/hr/settings'),
          fetch(`/api/hr/slips?month=${month}&year=${year}`),
          fetch('/api/hr/employees?active=true')
        ])

        const nextSettings = setRes.ok ? await setRes.json() : null
        
        if (!slipsRes.ok) {
          if (!cancelled) {
            toast.error('Failed to load slips')
          }
          return
        }
        
        const slips: SalaryCalc[] = await slipsRes.json()
        
        if (empsRes.ok) {
          await empsRes.json()
        }

        if (cancelled) return

        setSettings(nextSettings)
        if (empsRes.status === 403) {
           setRole('BRANCH')
        } else {
           setRole('ADMIN')
        }

        const brs = new Map<string, Branch>()
        const map = new Map<string, SalaryCalc[]>()
        
        for (const calc of slips) {
          const bid = calc.employee.branchId?.toString() ?? 'unassigned'
          if ((calc.employee as any).branch) brs.set(bid, (calc.employee as any).branch)
          
          if (!map.has(bid)) map.set(bid, [])
          map.get(bid)!.push(calc)
        }
        setCalcsByBranch(map)
        setBranches(Array.from(brs.values()))
      } catch (e) {
        console.error(e)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [month, year])

  async function downloadBranch(branchId: string, branchName: string) {
    let calcs = calcsByBranch.get(branchId) ?? []
    if (search) {
      const q = search.toLowerCase()
      calcs = calcs.filter(c => c.employee.name.toLowerCase().includes(q) || (c.employee.employeeId || '').toLowerCase().includes(q))
    }
    if (!calcs.length) { toast.error('No employees match'); return }
    setLoading(true)
    try {
      const { downloadPDF } = await import('@/components/hr/SalarySlipPDF')
      await downloadPDF({
        calcs, month, year,
        generatedBy: settings?.generatedBy ?? 'Admin',
        paymentBy: settings?.paymentBy ?? '',
        companyName: settings?.companyName ?? 'Bindu Premium',
      }, `${branchName}-${MONTHS[month - 1]}-${year}.pdf`)
    } catch { toast.error('PDF generation failed') }
    setLoading(false)
  }

  async function downloadAll() {
    let allCalcs = Array.from(calcsByBranch.values()).flat()
    if (search) {
      const q = search.toLowerCase()
      allCalcs = allCalcs.filter(c => c.employee.name.toLowerCase().includes(q) || (c.employee.employeeId || '').toLowerCase().includes(q))
    }
    if (!allCalcs.length) { toast.error('No matching salary data'); return }
    setLoading(true)
    try {
      const JSZip = (await import('jszip')).default
      const { pdf } = await import('@react-pdf/renderer')
      const { SalarySlipDoc } = await import('@/components/hr/SalarySlipPDF')
      const { saveAs } = await import('file-saver')

      const zip = new JSZip()

      // Generate a PDF for each employee and add to ZIP
      // Wait, the prompt says "Download All as ZIP". We can chunk them or generate one PDF per employee.
      for (const calc of allCalcs) {
        const docProps = {
          calcs: [calc],
          month, year,
          generatedBy: settings?.generatedBy ?? 'Admin',
          paymentBy: settings?.paymentBy ?? '',
          companyName: settings?.companyName ?? 'Bindu Premium',
        }
        const blob = await pdf(<SalarySlipDoc {...docProps} />).toBlob()
        const filename = `${calc.employee.name.replace(/\s+/g, '_')}_${MONTHS[month - 1]}_${year}.pdf`
        zip.file(filename, blob)
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      saveAs(zipBlob, `Slips_${MONTHS[month - 1]}_${year}.zip`)
      
    } catch (e) {
      console.error(e)
      toast.error('ZIP generation failed') 
    }
    setLoading(false)
  }

  const displayedBranches = selectedBranch === 'all'
    ? branches
    : branches.filter(b => b.id.toString() === selectedBranch)

  const totalPayable = useMemo(() => {
    let allCalcs = Array.from(calcsByBranch.values()).flat()
    if (search) {
      const q = search.toLowerCase()
      allCalcs = allCalcs.filter(c => c.employee.name.toLowerCase().includes(q) || (c.employee.employeeId || '').toLowerCase().includes(q))
    }
    return allCalcs.reduce((s, c) => s + c.netPayable, 0)
  }, [calcsByBranch, search])

  const totalDeductions = useMemo(() => {
    let allCalcs = Array.from(calcsByBranch.values()).flat()
    if (search) {
      const q = search.toLowerCase()
      allCalcs = allCalcs.filter(c => c.employee.name.toLowerCase().includes(q))
    }
    return allCalcs.reduce((s, c) => s + (c.record.trackerAdvanceTotal ?? 0) + (c.record.hrAdvanceDeducted ?? 0) + c.leaveDeduction + c.lateDeduction, 0)
  }, [calcsByBranch, search])

  const totalAdditions = useMemo(() => {
    let allCalcs = Array.from(calcsByBranch.values()).flat()
    if (search) {
      const q = search.toLowerCase()
      allCalcs = allCalcs.filter(c => c.employee.name.toLowerCase().includes(q))
    }
    return allCalcs.reduce((s, c) => s + c.otAddition + c.conveyance + c.attendanceBonus, 0)
  }, [calcsByBranch, search])

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1]

  if (role === 'BRANCH') {
    const allSlips = Array.from(calcsByBranch.values()).flat()
    
    if (allSlips.length === 0) {
      return (
        <div className="flex-1 p-6">
          <div className="bg-[var(--warning-subtle)] border border-[var(--warning-subtle)] text-[var(--warning)] rounded-lg p-6 text-center shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Account Not Linked</h2>
            <p className="text-sm">Your account is not yet linked to an employee profile. Contact your admin to set this up.</p>
          </div>
        </div>
      )
    }

    // Show only their own slip
    const slip = allSlips[0]
    return (
      <>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">My Salary Slip</h1>
        </div>
        <div className="flex-1 p-6">
          {slip ? (
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden p-6 flex flex-col items-center gap-4 max-w-xl mx-auto">
               <FileText size={48} className="text-[var(--text-muted)] opacity-50" />
               <div className="text-center">
                 <h2 className="text-lg font-semibold text-[var(--text-primary)]">{MONTHS[month - 1]} {year}</h2>
                 <p className="text-[var(--text-muted)]">{slip.employee.name}</p>
               </div>
               <p className="text-xl font-bold text-[var(--info)]">{formatTaka(slip.netPayable)}</p>
               <div className="flex gap-3 mt-4">
                 <SlipPreviewButton calc={slip} month={month} year={year} settings={settings as any} />
               </div>
            </div>
          ) : (
            <div className="text-center p-10 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg text-[var(--text-muted)] max-w-xl mx-auto">
               No salary slip generated for {MONTHS[month - 1]} {year} yet.
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Salary Slips</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {MONTHS[month - 1]} {year}
          </p>
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
          <Button onClick={downloadAll} disabled={loading} className="gap-2">
            <Download size={15} />{loading ? 'Generating...' : 'Download All as ZIP'}
          </Button>
        </div>
      </div>
      <div className="flex-1 p-6 space-y-6 min-h-0">

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 text-center">
          <p className="text-lg font-bold text-[var(--danger)] tabular-nums">-{formatTaka(Math.round(totalDeductions))}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-medium uppercase tracking-wide">Total Deductions</p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 text-center">
          <p className="text-lg font-bold text-[var(--success)] tabular-nums">+{formatTaka(Math.round(totalAdditions))}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-medium uppercase tracking-wide">Total Additions</p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 text-center">
          <p className="text-lg font-bold text-[var(--info)] tabular-nums">{formatTaka(totalPayable)}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-medium uppercase tracking-wide">Total Payable</p>
        </div>
      </div>

      {/* Search + Branch filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-center p-4 border border-[var(--border)] bg-[var(--surface)] rounded-xl">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          <Input value={localSearch} onChange={e => setLocalSearch(e.target.value)} placeholder="Search employee..." className="pl-9 pr-8 h-9" />
          {localSearch && (
            <button onClick={() => { setLocalSearch(''); setSearch('') }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X size={14} />
            </button>
          )}
        </div>
        <Select value={selectedBranch} onValueChange={v => setSelectedBranch(v ?? 'all')}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Filter by branch" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {displayedBranches.map(branch => {
          let calcs = calcsByBranch.get(branch.id.toString()) ?? []
          if (search) {
            const q = search.toLowerCase()
            calcs = calcs.filter(c => c.employee.name.toLowerCase().includes(q) || (c.employee.employeeId || '').toLowerCase().includes(q))
          }
          const branchTotal = calcs.reduce((s, c) => s + c.netPayable, 0)
          const branchDeductions = calcs.reduce((s, c) => s + (c.record.trackerAdvanceTotal ?? 0) + (c.record.hrAdvanceDeducted ?? 0) + c.leaveDeduction + c.lateDeduction, 0)
          const branchAdditions = calcs.reduce((s, c) => s + c.otAddition + c.conveyance + c.attendanceBonus, 0)
          
          if (calcs.length === 0) return null;
          
          return (
            <div key={branch.id} className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 bg-[var(--surface-raised)] border-b border-[var(--border)] gap-2">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-[var(--text-primary)]">{branch.name}</h2>
                  <Badge variant="secondary">{calcs.length} employees</Badge>
                </div>
                <div className="flex items-center gap-3 flex-wrap text-xs">
                  <span className="text-[var(--danger)] font-medium tabular-nums">-{formatTaka(Math.round(branchDeductions))}</span>
                  <span className="text-[var(--success)] font-medium tabular-nums">+{formatTaka(Math.round(branchAdditions))}</span>
                  <span className="font-semibold text-[var(--info)] tabular-nums">{formatTaka(branchTotal)}</span>
                  <Button size="sm" variant="outline" onClick={() => downloadBranch(branch.id.toString(), branch.name)} disabled={loading || calcs.length === 0} className="gap-1.5">
                    <Download size={13} />PDF
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[var(--border)] hover:bg-transparent">
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Employee</TableHead>
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Basic</TableHead>
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Advance</TableHead>
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Leave</TableHead>
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Late</TableHead>
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">OT</TableHead>
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Conveyance</TableHead>
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Net Payable</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calcs.map((calc, i) => (
                      <TableRow key={calc.employee.id} className="border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                        <TableCell>
                          <p className="font-medium text-[var(--text-primary)]">{calc.employee.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">{calc.employee.designation}</p>
                        </TableCell>
                        <TableCell className="text-right text-[var(--text-secondary)] tabular-nums">{formatTaka(calc.basicSalary)}</TableCell>
                        <TableCell className="text-right text-[var(--danger)] tabular-nums">{(calc.record.trackerAdvanceTotal ?? 0) + (calc.record.hrAdvanceDeducted ?? 0) > 0 ? `-${formatTaka((calc.record.trackerAdvanceTotal ?? 0) + (calc.record.hrAdvanceDeducted ?? 0))}` : '—'}</TableCell>
                        <TableCell className="text-right text-[var(--danger)] tabular-nums">{calc.leaveDeduction > 0 ? `-${formatTaka(Math.round(calc.leaveDeduction))}` : '—'}</TableCell>
                        <TableCell className="text-right text-[var(--danger)] tabular-nums">{calc.lateDeduction > 0 ? `-${formatTaka(Math.round(calc.lateDeduction))}` : '—'}</TableCell>
                        <TableCell className="text-right text-[var(--success)] tabular-nums">{calc.otAddition > 0 ? `+${formatTaka(Math.round(calc.otAddition))}` : '—'}</TableCell>
                        <TableCell className="text-right text-[var(--success)] tabular-nums">+{formatTaka(calc.conveyance)}</TableCell>
                        <TableCell className="text-right font-bold text-[var(--info)] tabular-nums">{formatTaka(calc.netPayable)}</TableCell>
                        <TableCell>
                          <SlipPreviewButton calc={calc} month={month} year={year} settings={settings as any} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )
        })}
        {(displayedBranches.length === 0 || Array.from(calcsByBranch.values()).flat().length === 0) && (
           <div className="text-center py-10">
             <FileText size={24} className="mx-auto text-[var(--text-muted)] opacity-50 mb-1" />
             <p className="text-[var(--text-muted)] text-sm font-medium mt-3">{search ? 'No matching employees' : 'No employees in this branch'}</p>
           </div>
        )}
      </div>
    </div>
    </>
  )
}

export default function SlipsPage() {
  return <Suspense><SlipsContent /></Suspense>
}
