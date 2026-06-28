'use client'

import { useState, useEffect } from 'react'
import { Branch } from '@/lib/types'
import toast from 'react-hot-toast'
import { Download } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'

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
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Monthly Report</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Consolidated monthly view of branch cash flows</p>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="form-label">Branch</label>
              <select
                className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
                value={selectedBranchId}
                onChange={e => setSelectedBranchId(e.target.value)}
              >
                <option value="all">All Branches (Consolidated)</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="form-label">Month</label>
              <select className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="form-label">Year</label>
              <input type="number" className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-8 text-[var(--text-secondary)]">Loading report...</div>
        ) : hasSearched && branchData.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-white mb-2">No Data Found</h3>
            <p className="text-[var(--text-secondary)]">No records exist for the selected period.</p>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap gap-3 mb-6">
              <Button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border-0" onClick={exportAsPdf}>
                <Download size={16} /> Export PDF Report
              </Button>
            </div>

            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                  <thead className="text-xs uppercase bg-[var(--bg-card)] border-b border-[var(--border)] text-slate-400">
                    <tr>
                      <th className="px-6 py-4">Branch</th>
                      <th className="px-6 py-4 text-right">Income</th>
                      <th className="px-6 py-4 text-right">Expense</th>
                      <th className="px-6 py-4 text-right">Transfers</th>
                      <th className="px-6 py-4 text-right">Payments</th>
                      <th className="px-6 py-4 text-right">Advances</th>
                      <th className="px-6 py-4 text-right text-white bg-[rgba(255,255,255,0.02)]">Net Cash Flow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchData.map((b) => (
                      <tr key={b.branchId} className="border-b border-[var(--border)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                        <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{b.branchName}</td>
                        <td className="px-6 py-4 text-right text-emerald-400 font-medium">Tk {formatCurrency(b.totalIncome)}</td>
                        <td className="px-6 py-4 text-right text-rose-400">Tk {formatCurrency(b.totalExpense)}</td>
                        <td className="px-6 py-4 text-right text-rose-400">Tk {formatCurrency(b.totalTransfers)}</td>
                        <td className="px-6 py-4 text-right text-rose-400">Tk {formatCurrency(b.totalPayments)}</td>
                        <td className="px-6 py-4 text-right text-rose-400">Tk {formatCurrency(b.totalAdvances)}</td>
                        <td className={`px-6 py-4 text-right font-bold bg-[rgba(255,255,255,0.02)] ${b.netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          Tk {formatCurrency(b.netCashFlow)}
                        </td>
                      </tr>
                    ))}
                    {selectedBranchId === 'all' && branchData.length > 1 && (
                      <tr className="bg-[rgba(255,255,255,0.05)] border-t-2 border-[var(--border)]">
                        <td className="px-6 py-4 font-bold text-white uppercase">Consolidated Total</td>
                        <td className="px-6 py-4 text-right text-emerald-400 font-bold">Tk {formatCurrency(totals.totalIncome)}</td>
                        <td className="px-6 py-4 text-right text-rose-400 font-bold">Tk {formatCurrency(totals.totalExpense)}</td>
                        <td className="px-6 py-4 text-right text-rose-400 font-bold">Tk {formatCurrency(totals.totalTransfers)}</td>
                        <td className="px-6 py-4 text-right text-rose-400 font-bold">Tk {formatCurrency(totals.totalPayments)}</td>
                        <td className="px-6 py-4 text-right text-rose-400 font-bold">Tk {formatCurrency(totals.totalAdvances)}</td>
                        <td className={`px-6 py-4 text-right font-bold text-lg ${totals.netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          Tk {formatCurrency(totals.netCashFlow)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
