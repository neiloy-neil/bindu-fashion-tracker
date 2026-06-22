import os

page_ts = """'use client'

import { useEffect, useState, Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Employee, Branch, SalaryRecord, SystemSettings } from '@prisma/client'
import type { SalaryCalc } from '@/lib/hr/calculations'
import { formatTaka } from '@/lib/hr/calculations'
import { toast } from 'sonner'
import { Download, FileText, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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

  async function load() {
    try {
      const [userRes, setRes, slipsRes, empsRes] = await Promise.all([
        fetch('/api/auth/session'), // We might need to guess the role. The backend API handles RBAC. Let's just fetch the slips and if it returns one slip, we can assume branch.
        fetch('/api/hr/settings'),
        fetch(`/api/hr/slips?month=${month}&year=${year}`),
        fetch('/api/hr/employees?active=true') // We might only get our own employee if we are branch.
      ])

      if (setRes.ok) setSettings(await setRes.json())
      
      if (!slipsRes.ok) {
        toast.error('Failed to load slips')
        return
      }
      
      const slips: SalaryCalc[] = await slipsRes.json()
      
      let emps: any[] = []
      if (empsRes.ok) {
         emps = await empsRes.json()
      }

      // If we only got 1 slip and no other employees, it's likely a BRANCH user
      const isBranch = emps.length <= 1 && slips.length <= 1 && !empsRes.ok // This is a heuristic. Actually we can check response of empsRes, if forbidden it's branch.
      if (empsRes.status === 403) {
         setRole('BRANCH')
      } else {
         setRole('ADMIN')
      }

      const brs = new Map<string, Branch>()
      const map = new Map<string, SalaryCalc[]>()
      
      for (const calc of slips) {
        const bid = calc.employee.branchId?.toString() ?? 'unassigned'
        if (calc.employee.branch) brs.set(bid, calc.employee.branch as any)
        
        if (!map.has(bid)) map.set(bid, [])
        map.get(bid)!.push(calc)
      }
      setCalcsByBranch(map)
      setBranches(Array.from(brs.values()))
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => { load() }, [month, year])

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
        const filename = `${calc.employee.name.replace(/\\s+/g, '_')}_${MONTHS[month - 1]}_${year}.pdf`
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
    // Show only their own slip
    const slip = Array.from(calcsByBranch.values()).flat()[0]
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">My Salary Slip</h1>
        {slip ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden p-6 flex flex-col items-center gap-4">
             <FileText size={48} className="text-gray-300" />
             <div className="text-center">
               <h2 className="text-lg font-semibold">{MONTHS[month - 1]} {year}</h2>
               <p className="text-gray-500">{slip.employee.name}</p>
             </div>
             <p className="text-xl font-bold text-blue-700">{formatTaka(slip.netPayable)}</p>
             <div className="flex gap-3 mt-4">
               <SlipPreviewButton calc={slip} month={month} year={year} settings={settings as any} />
             </div>
          </div>
        ) : (
          <div className="text-center p-10 bg-gray-50 border border-gray-200 rounded-lg text-gray-500">
             No salary slip generated for {MONTHS[month - 1]} {year} yet.
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Salary Slips</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {MONTHS[month - 1]} {year}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Select value={String(month)} onValueChange={v => setMonth(+(v ?? month))}>
            <SelectTrigger className="w-36 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(+(v ?? year))}>
            <SelectTrigger className="w-24 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={downloadAll} disabled={loading} className="gap-2">
            <Download size={15} />{loading ? 'Generating...' : 'Download All as ZIP'}
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-sm font-bold text-red-600">-{formatTaka(Math.round(totalDeductions))}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Deductions</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-sm font-bold text-green-600">+{formatTaka(Math.round(totalAdditions))}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Additions</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-sm font-bold text-blue-700">{formatTaka(totalPayable)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Payable</p>
        </div>
      </div>

      {/* Search + Branch filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <Input value={localSearch} onChange={e => setLocalSearch(e.target.value)} placeholder="Search employee..." className="pl-9 pr-8 h-9 bg-white" />
          {localSearch && (
            <button onClick={() => { setLocalSearch(''); setSearch('') }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
        <Select value={selectedBranch} onValueChange={v => setSelectedBranch(v ?? 'all')}>
          <SelectTrigger className="w-full sm:w-56 bg-white"><SelectValue placeholder="Filter by branch" /></SelectTrigger>
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
            <div key={branch.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-200 gap-2">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-gray-800">{branch.name}</h2>
                  <Badge variant="secondary">{calcs.length} employees</Badge>
                </div>
                <div className="flex items-center gap-3 flex-wrap text-xs">
                  <span className="text-red-500 font-medium">-{formatTaka(Math.round(branchDeductions))}</span>
                  <span className="text-green-600 font-medium">+{formatTaka(Math.round(branchAdditions))}</span>
                  <span className="font-semibold text-gray-700">{formatTaka(branchTotal)}</span>
                  <Button size="sm" variant="outline" onClick={() => downloadBranch(branch.id.toString(), branch.name)} disabled={loading || calcs.length === 0} className="gap-1.5">
                    <Download size={13} />PDF
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Employee</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Basic</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Advance</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Leave</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Late</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">OT</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Conveyance</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-700 text-xs">Net Payable</th>
                      <th className="px-2 py-2.5 text-xs w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {calcs.map((calc, i) => (
                      <tr key={calc.employee.id} className={`border-b border-gray-100 hover:bg-gray-50/60 transition-colors ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-800">{calc.employee.name}</p>
                          <p className="text-xs text-gray-400">{calc.employee.designation}</p>
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-600">{formatTaka(calc.basicSalary)}</td>
                        <td className="px-4 py-2.5 text-right text-red-500">{(calc.record.trackerAdvanceTotal ?? 0) + (calc.record.hrAdvanceDeducted ?? 0) > 0 ? `-${formatTaka((calc.record.trackerAdvanceTotal ?? 0) + (calc.record.hrAdvanceDeducted ?? 0))}` : '—'}</td>
                        <td className="px-4 py-2.5 text-right text-red-500">{calc.leaveDeduction > 0 ? `-${formatTaka(Math.round(calc.leaveDeduction))}` : '—'}</td>
                        <td className="px-4 py-2.5 text-right text-red-500">{calc.lateDeduction > 0 ? `-${formatTaka(Math.round(calc.lateDeduction))}` : '—'}</td>
                        <td className="px-4 py-2.5 text-right text-green-600">{calc.otAddition > 0 ? `+${formatTaka(Math.round(calc.otAddition))}` : '—'}</td>
                        <td className="px-4 py-2.5 text-right text-green-600">+{formatTaka(calc.conveyance)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-blue-700">{formatTaka(calc.netPayable)}</td>
                        <td className="px-2 py-2.5">
                          <SlipPreviewButton calc={calc} month={month} year={year} settings={settings as any} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
        {displayedBranches.length === 0 || Array.from(calcsByBranch.values()).flat().length === 0 && (
           <div className="text-center py-10">
             <FileText size={24} className="mx-auto text-gray-300 mb-1" />
             <p className="text-gray-400 text-xs">{search ? 'No matching employees' : 'No employees in this branch'}</p>
           </div>
        )}
      </div>
    </div>
  )
}

export default function SlipsPage() {
  return <Suspense><SlipsContent /></Suspense>
}
"""

with open("d:/AI/bindu-fashion-tracker/app/hr/slips/page.tsx", "w", encoding="utf-8") as f:
    f.write(page_ts)
