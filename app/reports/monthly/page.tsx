'use client'

import { useState, useEffect } from 'react'
import { Branch } from '@/lib/types'
import toast from 'react-hot-toast'
import { Download } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function MonthlyReportPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState('all')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [branchData, setBranchData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    fetch('/api/branches')
      .then(r => r.json())
      .then(data => {
        setBranches(data)
      })
  }, [])

  useEffect(() => {
    let cancelled = false
    const fetchReport = async () => {
      setLoading(true)
      setHasSearched(true)
      try {
        const url = new URL('/api/reports/monthly', window.location.origin)
        url.searchParams.set('month', month.toString())
        url.searchParams.set('year', year.toString())
        if (selectedBranchId !== 'all') {
          url.searchParams.set('branchId', selectedBranchId)
        }
        
        const res = await fetch(url.toString())
        if (!res.ok) throw new Error('Failed to fetch report')
        const data = await res.json()
        if (!cancelled) {
          setBranchData(data)
        }
      } catch (error: unknown) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to fetch report')
          setBranchData([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchReport()
    return () => { cancelled = true }
  }, [selectedBranchId, month, year])

  const exportAsPdf = async () => {
    if (!branchData || branchData.length === 0) return
    const { exportMonthlyReportAsPdf } = await import('@/lib/exportMonthlyPdf')
    await exportMonthlyReportAsPdf(branchData, month, year, selectedBranchId, branches)
  }

  // Calculate totals
  const totals = branchData.reduce((acc, curr) => ({
    totalIncome: acc.totalIncome + curr.totalIncome,
    totalExpense: acc.totalExpense + curr.totalExpense,
    totalTransfers: acc.totalTransfers + curr.totalTransfers,
    totalPayments: acc.totalPayments + curr.totalPayments,
    totalAdvances: acc.totalAdvances + curr.totalAdvances,
    netCashFlow: acc.netCashFlow + curr.netCashFlow
  }), { totalIncome: 0, totalExpense: 0, totalTransfers: 0, totalPayments: 0, totalAdvances: 0, netCashFlow: 0 })

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Monthly Report</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Consolidated monthly view of branch cash flows</p>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Branch</Label>
              <Select
                value={selectedBranchId}
                onValueChange={setSelectedBranchId}
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches (Consolidated)</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Month</Label>
              <Select value={String(month)} onValueChange={(value) => setMonth(Number(value))}>
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Year</Label>
              <Input type="number" className="h-9 w-full text-sm" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            <span className="text-sm text-[var(--text-muted)]">Loading…</span>
          </div>
        ) : hasSearched && branchData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--surface-raised)] flex items-center justify-center">
              <Download className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-muted)]">No records exist for the selected period.</p>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap gap-3 mb-6">
              <Button className="gap-2 border-0 bg-indigo-600 text-white hover:bg-indigo-700" onClick={exportAsPdf}>
                <Download size={16} /> Export PDF Report
              </Button>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-[var(--border)]">
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Branch</TableHead>
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Income</TableHead>
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Expense</TableHead>
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Transfers</TableHead>
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Payments</TableHead>
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Advances</TableHead>
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Net Cash Flow</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branchData.map((b) => (
                      <TableRow key={b.branchId} className="border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                        <TableCell className="font-medium text-[var(--text-primary)] whitespace-nowrap">{b.branchName}</TableCell>
                        <TableCell className="text-right tabular-nums text-[var(--success)] font-medium">Tk {formatCurrency(b.totalIncome)}</TableCell>
                        <TableCell className="text-right tabular-nums text-[var(--danger)]">Tk {formatCurrency(b.totalExpense)}</TableCell>
                        <TableCell className="text-right tabular-nums text-[var(--danger)]">Tk {formatCurrency(b.totalTransfers)}</TableCell>
                        <TableCell className="text-right tabular-nums text-[var(--danger)]">Tk {formatCurrency(b.totalPayments)}</TableCell>
                        <TableCell className="text-right tabular-nums text-[var(--danger)]">Tk {formatCurrency(b.totalAdvances)}</TableCell>
                        <TableCell className={`text-right tabular-nums font-bold ${b.netCashFlow >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                          Tk {formatCurrency(b.netCashFlow)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {selectedBranchId === 'all' && branchData.length > 1 && (
                      <TableRow className="border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--surface-raised)]">
                        <TableCell className="font-bold uppercase text-[var(--text-primary)]">Consolidated Total</TableCell>
                        <TableCell className="text-right tabular-nums font-bold text-[var(--success)]">Tk {formatCurrency(totals.totalIncome)}</TableCell>
                        <TableCell className="text-right tabular-nums font-bold text-[var(--danger)]">Tk {formatCurrency(totals.totalExpense)}</TableCell>
                        <TableCell className="text-right tabular-nums font-bold text-[var(--danger)]">Tk {formatCurrency(totals.totalTransfers)}</TableCell>
                        <TableCell className="text-right tabular-nums font-bold text-[var(--danger)]">Tk {formatCurrency(totals.totalPayments)}</TableCell>
                        <TableCell className="text-right tabular-nums font-bold text-[var(--danger)]">Tk {formatCurrency(totals.totalAdvances)}</TableCell>
                        <TableCell className={`text-right tabular-nums text-lg font-bold ${totals.netCashFlow >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                          Tk {formatCurrency(totals.netCashFlow)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
