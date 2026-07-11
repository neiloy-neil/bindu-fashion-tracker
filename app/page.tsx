'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { dhakaDateString } from '@/lib/new-entry'
import Link from 'next/link'
import { formatCurrency, cn } from '@/lib/utils'
import { SummaryStats, Branch } from '@/lib/types'
import AdminEditRequests from '@/components/dashboard/AdminEditRequests'
import AdminExpenseApprovals from '@/components/dashboard/AdminExpenseApprovals'
import AdminPaymentApprovals from '@/components/dashboard/AdminPaymentApprovals'
import AdminSupportRequests from '@/components/dashboard/AdminSupportRequests'
import RecentActivity from '@/components/dashboard/RecentActivity'
import { MorningCheckInWidget } from '@/components/hr/MorningCheckInWidget'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import dynamic from 'next/dynamic'

const DashboardCharts = dynamic(
  () => import('@/components/dashboard/DashboardCharts').then(m => ({ default: m.MainDashboardCharts })),
  { ssr: false, loading: () => <div className="h-64" /> }
)
const AreaManagerBranchChart = dynamic(
  () => import('@/components/dashboard/DashboardCharts').then(m => ({ default: m.AreaManagerBranchChart })),
  { ssr: false, loading: () => <div className="h-56" /> }
)
import {
  FileText, Users, DollarSign, AlertCircle, CheckCircle,
  Clock, ChevronRight, BarChart2, Download, FileSpreadsheet, ChevronDown,
} from 'lucide-react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatCard({
  label, value, context, valueClass = 'text-[var(--text-primary)]', accent,
}: {
  label: string
  value: React.ReactNode
  context: string
  valueClass?: string
  accent?: string
}) {
  return (
    <div
      className="rounded-xl bg-[var(--surface)] p-5 flex flex-col gap-2"
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
        borderTop: accent ? `3px solid ${accent}` : '3px solid transparent',
      }}
    >
      <p className="text-[11px] font-medium text-[var(--text-muted)] tracking-wide">{label}</p>
      <p className={cn('text-[28px] font-bold tabular-nums leading-none tracking-tight', valueClass)}>{value}</p>
      <p className="text-[11px] text-[var(--text-muted)]">{context}</p>
    </div>
  )
}

function DateFilter({
  month, year, startDate, endDate, viewMode, onChange,
  branches, branchId, onBranchChange, userRole,
}: {
  month: number
  year: number
  startDate: string
  endDate: string
  viewMode: 'daily' | 'month' | 'custom'
  onChange: (m: number, y: number, sd: string, ed: string, mode: 'daily' | 'month' | 'custom') => void
  branches: Branch[]
  branchId: string
  onBranchChange: (b: string) => void
  userRole: string
}) {
  return (
      <div className="flex flex-wrap items-center gap-2">
      {userRole === 'ADMIN' && (
        <Select value={branchId} onValueChange={onBranchChange}>
          <SelectTrigger className="h-8 w-[160px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map(b => (
              <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={viewMode} onValueChange={(v) => onChange(month, year, startDate, endDate, v as 'daily' | 'month' | 'custom')}>
        <SelectTrigger className="h-8 w-[160px] text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="daily">Daily View</SelectItem>
          <SelectItem value="month">Monthly View</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      {viewMode === 'custom' ? (
        <>
          <Input
            type="date"
            className="h-8 w-[150px] text-sm"
            value={startDate}
            onChange={(e) => onChange(month, year, e.target.value, endDate, viewMode)}
          />
          <span className="text-xs text-[var(--text-muted)]">to</span>
          <Input
            type="date"
            className="h-8 w-[150px] text-sm"
            value={endDate}
            onChange={(e) => onChange(month, year, startDate, e.target.value, viewMode)}
          />
        </>
      ) : viewMode === 'daily' ? (
        <Input
          type="date"
          className="h-8 w-[150px] text-sm"
          value={startDate}
          onChange={(e) => onChange(month, year, e.target.value, e.target.value, viewMode)}
        />
      ) : (
        <>
          <Select value={String(month)} onValueChange={(v) => onChange(parseInt(v), year, startDate, endDate, viewMode)}>
            <SelectTrigger className="h-8 w-[110px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => onChange(month, parseInt(v), startDate, endDate, viewMode)}>
            <SelectTrigger className="h-8 w-[90px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
    </div>
  )
}

function PayrollSummary({ data }: { data: any }) {
  if (!data) return null
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Payroll Summary — {data.month}/{data.year}
        </h3>
        <Link href="/hr/salary" className="text-xs font-medium text-[var(--accent)] hover:underline">
          Go to processing →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-1.5 hover:border-[var(--border-strong)] transition-colors duration-150">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide flex items-center gap-1.5">
            <Users size={11} /> Active Employees
          </p>
          <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums leading-none">
            {data.activeEmployees}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Total in system</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-1.5 hover:border-[var(--border-strong)] transition-colors duration-150">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide flex items-center gap-1.5">
            <CheckCircle size={11} /> Processed
          </p>
          <p className={cn(
            'text-xl font-bold tabular-nums leading-none',
            data.processedCount === data.activeEmployees && data.activeEmployees > 0
              ? 'text-[var(--success)]'
              : 'text-[var(--text-primary)]'
          )}>
            {data.processedCount} / {data.activeEmployees}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {data.isLocked
              ? <span className="text-[var(--danger)] font-semibold">Locked</span>
              : 'Unlocked'}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-1.5 hover:border-[var(--border-strong)] transition-colors duration-150">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide flex items-center gap-1.5">
            <DollarSign size={11} /> Payroll Bill
          </p>
          <p className="text-xl font-bold text-[var(--info)] tabular-nums leading-none">
            ৳{formatCurrency(data.totalNetPayable)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Total net payable</p>
        </div>
      </div>
    </div>
  )
}

function PendingItems({
  payroll, transfersCount, chequesCount,
}: {
  payroll: any
  transfersCount: number
  chequesCount: number
}) {
  const allClear = chequesCount === 0 && transfersCount === 0 && payroll?.processedCount > 0

  return (
    <div className="rounded-xl bg-[var(--surface)] p-5" style={{boxShadow:'0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)'}}>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Pending Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {chequesCount > 0 && (
          <Link
            href="/admin/cheques"
            className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] transition-all duration-150 group"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--warning-subtle)] text-[var(--warning)]">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{chequesCount} Pending Cheques</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">Require clearance</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors flex-shrink-0" />
          </Link>
        )}
        {transfersCount > 0 && (
          <Link
            href="/transfers/incoming"
            className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] transition-all duration-150 group"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--info-subtle)] text-[var(--info)]">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{transfersCount} Pending Transfers</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">Awaiting receipt</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors flex-shrink-0" />
          </Link>
        )}
        {payroll && payroll.processedCount === 0 && (
          <Link
            href="/hr/salary"
            className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] transition-all duration-150 group"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--danger-subtle)] text-[var(--danger)]">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Unprocessed Payroll</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                {payroll.month}/{payroll.year} has no records
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors flex-shrink-0" />
          </Link>
        )}
        {allClear && (
          <div className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--success-subtle)] text-[var(--success)]">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">All caught up!</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">No pending actions</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function BranchSlipStatus({ month, year }: { month: number; year: number }) {
  const { data, isLoading } = useSWR(
    `/api/hr/slips?month=${month}&year=${year}`,
    (url) => fetch(url).then(r => r.ok ? r.json() : null)
  )
  if (isLoading || !data) return null

  return (
    <div className="flex items-center justify-between p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--accent-subtle)] text-[var(--accent)]">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Salary Slip: {MONTHS[month - 1]} {year}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {data.length > 0 ? 'Your salary slip is ready.' : 'Not generated yet.'}
          </p>
        </div>
      </div>
      <Link href="/hr/slips" className="text-xs font-semibold text-[var(--accent)] hover:underline">
        View Slip →
      </Link>
    </div>
  )
}

type WholesaleDashboardData = {
  totalChallans: number
  totalNetAmount: number
  totalCollected: number
  totalOutstanding: number
  activeBuyers: number
  pendingChallans: number
  methodBreakdown: Record<string, number>
}

function ExportMenu({ data, month, year, branchName, wholesaleData }: { data: SummaryStats; month: number; year: number; branchName?: string; wholesaleData?: WholesaleDashboardData }) {
  const [open, setOpen] = useState(false)

  const handleExcel = async () => {
    setOpen(false)
    const { downloadWorkbook } = await import('@/lib/excel-export')
    const branchRows = data.branchStats.map(b => ({ branch: b.branchName, totalSales: b.totalSale, totalExpenses: b.totalExpense, netBalance: b.netBalance, physicalCash: b.physicalCash || 0 }))
    const dailyRows = data.dailyTrend.map(d => ({ date: d.date, sales: d.totalSale, expenses: d.totalExpense, netBalance: d.totalSale - d.totalExpense }))
    const expenseRows = data.expenseBreakdown.map(e => ({ category: e.category, amount: e.amount }))
    const sheets: Parameters<typeof downloadWorkbook>[1] = [
      { name: 'Branches', columns: [{ header: 'Branch', key: 'branch', width: 22 }, { header: 'Total Sales', key: 'totalSales', width: 14 }, { header: 'Total Expenses', key: 'totalExpenses', width: 14 }, { header: 'Net Balance', key: 'netBalance', width: 14 }, { header: 'Physical Cash', key: 'physicalCash', width: 14 }], rows: branchRows },
      { name: 'Daily Trend', columns: [{ header: 'Date', key: 'date', width: 14 }, { header: 'Sales', key: 'sales', width: 14 }, { header: 'Expenses', key: 'expenses', width: 14 }, { header: 'Net Balance', key: 'netBalance', width: 14 }], rows: dailyRows },
      { name: 'Expense Breakdown', columns: [{ header: 'Category', key: 'category', width: 24 }, { header: 'Amount', key: 'amount', width: 14 }], rows: expenseRows },
    ]
    if (wholesaleData) {
      const wsRows: Array<Record<string, string | number>> = [
        { metric: 'Total Challans', value: wholesaleData.totalChallans },
        { metric: 'Total Invoiced (Tk)', value: wholesaleData.totalNetAmount },
        { metric: 'Total Collected (Tk)', value: wholesaleData.totalCollected },
        { metric: 'Outstanding Balance (Tk)', value: wholesaleData.totalOutstanding },
        { metric: 'Active Buyers', value: wholesaleData.activeBuyers },
        { metric: 'Unpaid / Partial Challans', value: wholesaleData.pendingChallans },
      ]
      if (wholesaleData.methodBreakdown) {
        for (const [method, amt] of Object.entries(wholesaleData.methodBreakdown)) {
          wsRows.push({ metric: `Payment – ${method.replace(/_/g, ' ')}`, value: amt as number })
        }
      }
      sheets.push({ name: 'Wholesale', columns: [{ header: 'Metric', key: 'metric', width: 30 }, { header: 'Value', key: 'value', width: 18 }], rows: wsRows })
    }
    await downloadWorkbook(`Dashboard_Summary_${branchName ? branchName.replace(/\s+/g, '_') + '_' : ''}${year}_${month}.xlsx`, sheets)
  }

  const handlePdf = async () => {
    setOpen(false)
    const { exportSummaryReportPdf } = await import('@/lib/report-pdf')
    await exportSummaryReportPdf(data, month, year, branchName, wholesaleData)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
      >
        <Download size={14} />
        Export
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-48 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden">
            <button
              onClick={handleExcel}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] transition-colors"
            >
              <FileSpreadsheet size={14} className="text-[var(--success)]" />
              Export as Excel
            </button>
            <button
              onClick={handlePdf}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] transition-colors"
            >
              <FileText size={14} className="text-[var(--danger)]" />
              Download PDF Report
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function FactoryBranchDashboard({ data, loading, month, year, viewMode, startDate, endDate, onFilterChange }: {
  data: SummaryStats | undefined
  loading: boolean
  month: number
  year: number
  viewMode: 'daily' | 'month' | 'custom'
  startDate: string
  endDate: string
  onFilterChange: (m: number, y: number, sd: string, ed: string, mode: 'daily' | 'month' | 'custom') => void
}) {
  const period = viewMode === 'daily'
    ? `Today · ${startDate}`
    : viewMode === 'custom'
    ? `${startDate} to ${endDate}`
    : `${MONTHS[month - 1]} ${year}`

  const totalExpenses = data?.totalExpenses ?? 0
  const totalIncome = data?.totalSales ?? 0
  const net = totalIncome - totalExpenses

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Factory Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">{period}</p>
        </div>
        <DateFilter
          month={month} year={year} startDate={startDate} endDate={endDate} viewMode={viewMode}
          onChange={onFilterChange}
          branches={[]} branchId="all" onBranchChange={() => {}} userRole="BRANCH"
        />
      </div>

      <div className="p-6 space-y-6 max-w-4xl">
        {loading ? (
          <div className="flex items-center justify-center h-48 gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            <span className="text-sm text-[var(--text-muted)]">Loading…</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Production Costs', value: totalExpenses, color: '#dc2626' },
                { label: 'Other Income', value: totalIncome, color: '#059669' },
                { label: 'Net', value: net, color: net >= 0 ? '#059669' : '#dc2626' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl bg-[var(--surface)] p-4 border border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
                  <p className="text-xl font-bold tabular-nums" style={{ color }}>{formatCurrency(value)}</p>
                </div>
              ))}
            </div>

            {data?.expenseBreakdown && data.expenseBreakdown.length > 0 && (
              <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5">
                <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">Cost Breakdown</p>
                <div className="space-y-2">
                  {data.expenseBreakdown.slice(0, 10).map((item: any) => (
                    <div key={item.category} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)] truncate max-w-[60%]">{item.category}</span>
                      <span className="font-medium text-[var(--text-primary)] tabular-nums">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <Link href="/entries/new" className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-black hover:opacity-90 transition-opacity">
                New Entry
              </Link>
              <Link href="/entries" className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors">
                Entry History
              </Link>
              <Link href="/hr/attendance" className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors">
                Attendance
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function WholesaleBranchDashboard({ wholesaleData, month, year, viewMode, startDate, endDate, onFilterChange }: {
  wholesaleData: any
  month: number
  year: number
  viewMode: 'daily' | 'month' | 'custom'
  startDate: string
  endDate: string
  onFilterChange: (m: number, y: number, sd: string, ed: string, mode: 'daily' | 'month' | 'custom') => void
}) {
  const ws = wholesaleData || {}
  const period = viewMode === 'daily'
    ? `Today · ${startDate}`
    : viewMode === 'custom'
    ? `${startDate} to ${endDate}`
    : `${MONTHS[month - 1]} ${year}`

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Wholesale Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">{period}</p>
        </div>
        <DateFilter
          month={month} year={year} startDate={startDate} endDate={endDate} viewMode={viewMode}
          onChange={onFilterChange}
          branches={[]} branchId="all" onBranchChange={() => {}} userRole="BRANCH"
        />
      </div>

      <div className="p-6 space-y-6 max-w-4xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Challans Issued', value: ws.totalChallans ?? 0, plain: true, color: 'var(--accent)' },
            { label: 'Total Invoiced', value: ws.totalNetAmount ?? 0, color: 'var(--text-primary)' },
            { label: 'Collected', value: ws.totalCollected ?? 0, color: '#059669' },
            { label: 'Pending Due', value: ws.pendingChallans ?? 0, plain: true, color: ws.pendingChallans > 0 ? '#d97706' : 'var(--text-muted)' },
          ].map(({ label, value, plain, color }) => (
            <div key={label} className="rounded-xl bg-[var(--surface)] p-4 border border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
              <p className="text-xl font-bold tabular-nums" style={{ color }}>
                {plain ? value : formatCurrency(value as number)}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-2">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Outstanding Balance (All Time)</p>
          <p className="text-3xl font-bold tabular-nums" style={{ color: (ws.totalOutstanding ?? 0) > 0 ? '#d97706' : '#059669' }}>
            {formatCurrency(ws.totalOutstanding ?? 0)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Across {ws.activeBuyers ?? 0} active buyer{ws.activeBuyers !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Link href="/wholesale/challans" className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-black hover:opacity-90 transition-opacity">
            New Challan
          </Link>
          <Link href="/wholesale/buyers" className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors">
            Buyers
          </Link>
          <Link href="/wholesale/collections" className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors">
            Collections
          </Link>
        </div>
      </div>
    </div>
  )
}

function AccountsDashboard({ wholesaleData, month, year, viewMode, startDate, endDate }: {
  wholesaleData: any
  month: number
  year: number
  viewMode: 'daily' | 'month' | 'custom'
  startDate: string
  endDate: string
}) {
  const fetcher = (url: string) => fetch(url).then(r => r.json())
  const { data: pendingCount } = useSWR('/api/transfers/pending-count', fetcher, { revalidateOnFocus: false })

  const ws = wholesaleData || {}
  const period = viewMode === 'daily'
    ? `Today · ${startDate}`
    : viewMode === 'custom'
    ? `${startDate} to ${endDate}`
    : `${MONTHS[month - 1]} ${year}`

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Accounts Overview</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">{period}</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Wholesale</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Invoiced', value: ws.invoiced ?? 0, color: 'var(--accent)' },
            { label: 'Collected', value: ws.collected ?? 0, color: '#059669' },
            { label: 'Outstanding', value: ws.outstanding ?? 0, color: '#d97706' },
            { label: 'Active Buyers', value: ws.activeBuyers ?? '—', color: 'var(--text-secondary)', raw: true },
          ].map(({ label, value, color, raw }) => (
            <div key={label} className="rounded-xl bg-[var(--surface)] p-4 border border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
              <p className="text-xl font-bold" style={{ color }}>{raw ? value : formatCurrency(value as number)}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Link href="/wholesale/challans" className="text-xs text-[var(--accent)] hover:underline">View Challans →</Link>
          <span className="text-[var(--border)]">·</span>
          <Link href="/wholesale/collections" className="text-xs text-[var(--accent)] hover:underline">Collections →</Link>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Transfers</h2>
        <div className="grid grid-cols-1 gap-4 mb-3">
          <div className="rounded-xl bg-[var(--surface)] p-4 border border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)] mb-1">Pending Incoming</p>
            <p className="text-2xl font-bold text-[var(--accent)]">{pendingCount?.count ?? '—'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/transfers/incoming" className="text-xs text-[var(--accent)] hover:underline">Incoming Transfers →</Link>
          <span className="text-[var(--border)]">·</span>
          <Link href="/transfers/history" className="text-xs text-[var(--accent)] hover:underline">History →</Link>
        </div>
      </div>
    </div>
  )
}

function AreaManagerDashboard({ month, year, viewMode, startDate, endDate }: {
  month: number
  year: number
  viewMode: 'daily' | 'month' | 'custom'
  startDate: string
  endDate: string
}) {
  const fetcher = (url: string) => fetch(url).then(r => r.json())

  const areaUrl = (() => {
    let u = '/api/dashboard/area-manager?'
    if (viewMode === 'custom') u += `startDate=${startDate}&endDate=${endDate}`
    else if (viewMode === 'daily') u += `startDate=${startDate}&endDate=${startDate}`
    else u += `month=${month}&year=${year}`
    return u
  })()

  const { data: branchStats, isLoading } = useSWR<any[]>(areaUrl, fetcher, { keepPreviousData: true, revalidateOnFocus: false })

  const period = viewMode === 'daily'
    ? `Today · ${startDate}`
    : viewMode === 'custom'
    ? `${startDate} to ${endDate}`
    : `${MONTHS[month - 1]} ${year}`

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
        <span className="text-sm text-[var(--text-muted)]">Loading…</span>
      </div>
    )
  }

  if (!branchStats || branchStats.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <p className="text-sm text-[var(--text-muted)]">No branches assigned to your account.</p>
      </div>
    )
  }

  const totalIncome = branchStats.reduce((s: number, r: any) => s + r.totalIncome, 0)
  const totalExpense = branchStats.reduce((s: number, r: any) => s + r.totalExpense, 0)
  const chartData = branchStats.map((r: any) => ({
    name: r.branch.name.length > 12 ? r.branch.name.slice(0, 11) + '…' : r.branch.name,
    Income: Math.round(r.totalIncome),
    Expenses: Math.round(r.totalExpense),
    Net: Math.round(r.netCashFlow),
  }))

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Area Overview</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">{period} · {branchStats.length} branch{branchStats.length !== 1 ? 'es' : ''}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Income', value: totalIncome, color: '#059669' },
          { label: 'Total Expenses', value: totalExpense, color: '#dc2626' },
          { label: 'Net Cash Flow', value: totalIncome - totalExpense, color: (totalIncome - totalExpense) >= 0 ? '#059669' : '#dc2626' },
          { label: 'Branches', value: branchStats.length, color: 'var(--accent)', plain: true },
        ].map(({ label, value, color, plain }) => (
          <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-[11px] text-[var(--text-muted)] mb-1">{label}</p>
            <p className="text-lg font-bold tabular-nums" style={{ color }}>
              {plain ? value : formatCurrency(value as number)}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">Branch Comparison</p>
        <AreaManagerBranchChart chartData={chartData} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {branchStats.map((row: any) => (
          <div key={row.branch.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[var(--text-primary)]">{row.branch.name}</h3>
              <Link href={`/?branchId=${row.branch.id}`} className="text-xs text-[var(--accent)] hover:underline">Details →</Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Income', value: row.totalIncome, color: '#059669' },
                { label: 'Expenses', value: row.totalExpense, color: '#dc2626' },
                { label: 'Net Cash Flow', value: row.netCashFlow, color: row.netCashFlow >= 0 ? '#059669' : '#dc2626' },
                { label: 'Transfers Out', value: row.totalTransfersOut, color: 'var(--text-secondary)' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className="text-[11px] text-[var(--text-muted)] mb-0.5">{label}</p>
                  <p className="text-sm font-semibold" style={{ color }}>{formatCurrency(value)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Dashboard() {
  const searchParams = useSearchParams()
  const now = new Date()

  const initialMonth = searchParams.get('month') ? parseInt(searchParams.get('month')!) : now.getMonth() + 1
  const initialYear = searchParams.get('year') ? parseInt(searchParams.get('year')!) : now.getFullYear()
  const initialBranchId = searchParams.get('branchId') || 'all'

  const [month, setMonth] = useState(initialMonth)
  const [year, setYear] = useState(initialYear)
  const [branchId, setBranchId] = useState(initialBranchId)

  const todayStr = dhakaDateString(now)
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [viewMode, setViewMode] = useState<'daily' | 'month' | 'custom'>('daily')

  const fetcher = (url: string) => fetch(url).then((res) => res.json())

  const { data: session } = useSWR('/api/auth/session', fetcher)
  const userRole = session?.user?.role || ''
  const branchType = (session?.user as any)?.branchType ?? null

  const { data: branchesData } = useSWR<Branch[]>('/api/branches', fetcher)
  const branches = branchesData || []

  let url = `/api/summary?`
  if (viewMode === 'custom') {
    url += `startDate=${startDate}&endDate=${endDate}`
  } else if (viewMode === 'daily') {
    url += `startDate=${startDate}&endDate=${startDate}`
  } else {
    url += `month=${month}&year=${year}`
  }
  if (branchId !== 'all') {
    url += `&branchId=${branchId}`
  }

  const { data, isLoading: loading } = useSWR<SummaryStats>(
    userRole !== 'HR_ADMIN' ? url : null,
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: false }
  )

  const { data: payrollData } = useSWR(
    (userRole === 'ADMIN' || userRole === 'HR_ADMIN') ? '/api/dashboard/payroll' : null,
    fetcher
  )
  const { data: transfersCountData } = useSWR(
    (userRole === 'ADMIN' || userRole === 'BRANCH') ? '/api/transfers/pending-count' : null,
    fetcher
  )
  const { data: chequesCountData } = useSWR(
    userRole === 'ADMIN' ? '/api/cheques?status=PENDING' : null,
    fetcher
  )

  const wholesaleUrl = (() => {
    const canSeeWholesale = ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTS', 'AUDITOR', 'AREA_MANAGER'].includes(userRole)
      || (userRole === 'BRANCH' && branchType === 'WHOLESALE')
    if (!canSeeWholesale) return null
    let u = '/api/dashboard/wholesale?'
    if (viewMode === 'custom') u += `startDate=${startDate}&endDate=${endDate}`
    else if (viewMode === 'daily') u += `startDate=${startDate}&endDate=${startDate}`
    else u += `month=${month}&year=${year}`
    return u
  })()
  const { data: wholesaleData } = useSWR(wholesaleUrl, fetcher, { keepPreviousData: true, revalidateOnFocus: false })

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
        <span className="text-sm text-[var(--text-muted)]">Loading…</span>
      </div>
    )
  }

  if (userRole === 'ACCOUNTS') {
    return <AccountsDashboard wholesaleData={wholesaleData} month={month} year={year} viewMode={viewMode} startDate={startDate} endDate={endDate} />
  }

  if (userRole === 'AREA_MANAGER') {
    return <AreaManagerDashboard month={month} year={year} viewMode={viewMode} startDate={startDate} endDate={endDate} />
  }

  if (userRole === 'BRANCH' && branchType === 'WHOLESALE') {
    return <WholesaleBranchDashboard wholesaleData={wholesaleData} month={month} year={year} viewMode={viewMode} startDate={startDate} endDate={endDate} onFilterChange={(m, y, sd, ed, mode) => { setMonth(m); setYear(y); setStartDate(sd); setEndDate(ed); setViewMode(mode) }} />
  }

  if (userRole === 'BRANCH' && branchType === 'FACTORY') {
    return <FactoryBranchDashboard data={data} loading={loading} month={month} year={year} viewMode={viewMode} startDate={startDate} endDate={endDate} onFilterChange={(m, y, sd, ed, mode) => { setMonth(m); setYear(y); setStartDate(sd); setEndDate(ed); setViewMode(mode) }} />
  }

  const subtitle =
    viewMode === 'daily'
      ? `Overview for ${formatDate(startDate)}`
      : viewMode === 'custom'
      ? `Overview for ${formatDate(startDate)} to ${formatDate(endDate)}`
      : `Overview for ${MONTHS[month - 1]} ${year}`

  return (
    <>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">
            Dashboard
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">{subtitle}</p>
        </div>
        {userRole !== 'HR_ADMIN' && (
          <div className="flex flex-wrap items-center gap-2">
            <DateFilter
              month={month}
              year={year}
              startDate={startDate}
              endDate={endDate}
              viewMode={viewMode}
              onChange={(m, y, sd, ed, mode) => {
                setMonth(m); setYear(y); setStartDate(sd); setEndDate(ed); setViewMode(mode)
              }}
              branches={branches}
              branchId={branchId}
              onBranchChange={setBranchId}
              userRole={userRole}
            />
            {data && (
              <ExportMenu
                data={data}
                month={month}
                year={year}
                branchName={
                  userRole === 'BRANCH'
                    ? branches[0]?.name
                    : branchId !== 'all'
                    ? branches.find(b => String(b.id) === branchId)?.name
                    : undefined
                }
                wholesaleData={wholesaleData}
              />
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 p-6 space-y-5 min-h-0">

        {(userRole === 'ADMIN' || userRole === 'BRANCH') && (
          <PendingItems
            payroll={userRole === 'ADMIN' ? payrollData : null}
            transfersCount={transfersCountData?.count || 0}
            chequesCount={userRole === 'ADMIN' ? (chequesCountData?.length || 0) : 0}
          />
        )}

        {userRole === 'HR_ADMIN' && payrollData && (
          <PayrollSummary data={payrollData} />
        )}

        {userRole === 'BRANCH' && (
          <>
            <MorningCheckInWidget branchId={parseInt(branchId === 'all' && branches.length > 0 ? String(branches[0].id) : branchId)} />
            <BranchSlipStatus month={month} year={year} />
          </>
        )}

        {userRole !== 'HR_ADMIN' && (
          loading ? (
            <div className="flex items-center justify-center h-64 gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
              <span className="text-sm text-[var(--text-muted)]">Loading…</span>
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-12 h-12 rounded-full bg-[var(--surface-raised)] flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-[var(--text-muted)]" />
              </div>
              <p className="text-sm font-medium text-[var(--text-muted)]">No data for this period</p>
            </div>
          ) : (
            <>
              {userRole === 'ADMIN' && (
                <div>
                  <AdminSupportRequests />
                  <AdminExpenseApprovals />
                  <AdminPaymentApprovals />
                  <AdminEditRequests />
                </div>
              )}

              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard
                  label="Total Sales"
                  value={`৳${formatCurrency(data.totalSales)}`}
                  context={`${MONTHS[month - 1]} ${year}`}
                  valueClass="text-[var(--success)]"
                  accent="var(--success)"
                />
                <StatCard
                  label="Total Expenses"
                  value={`৳${formatCurrency(data.totalExpenses)}`}
                  context={`${MONTHS[month - 1]} ${year}`}
                  accent="var(--danger)"
                />
                <StatCard
                  label="Net Balance"
                  value={`৳${formatCurrency(Math.abs(data.netBalance))}`}
                  context={data.netBalance >= 0 ? 'Profit' : 'Loss'}
                  valueClass={data.netBalance >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}
                  accent={data.netBalance >= 0 ? 'var(--success)' : 'var(--danger)'}
                />
                {userRole === 'ADMIN' && (
                  <StatCard
                    label="Active Branches"
                    value={data.branchStats.length}
                    context="With activity this period"
                    accent="var(--accent)"
                  />
                )}
                {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                  <>
                    <StatCard
                      label="Petty Cash"
                      value={`৳${formatCurrency(data.pettyCash || 0)}`}
                      context="Closing float across branches"
                      valueClass="text-[var(--info)]"
                      accent="var(--info)"
                    />
                    <StatCard
                      label="Total Payable"
                      value={`৳${formatCurrency(data.totalPayable || 0)}`}
                      context="Owed to parties"
                      valueClass="text-[var(--warning)]"
                      accent="var(--warning)"
                    />
                  </>
                )}
                <StatCard
                  label="Total Physical Cash"
                  value={`৳${formatCurrency(data.branchStats.reduce((sum, b) => sum + (b.physicalCash || 0), 0))}`}
                  context="In branch drawers"
                  valueClass="text-[var(--warning)]"
                  accent="var(--warning)"
                />
              </div>

              {/* Wholesale summary */}
              {wholesaleData && (
                <div className="rounded-xl bg-[var(--surface)] p-5" style={{boxShadow:'0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)'}}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Wholesale</h3>
                    <Link href="/wholesale/challans" className="text-xs font-medium text-[var(--accent)] hover:underline">
                      View challans →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="rounded-lg border border-[var(--border)] p-3 space-y-1">
                      <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Challans</p>
                      <p className="text-xl font-bold tabular-nums text-[var(--text-primary)]">{wholesaleData.totalChallans}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">This period</p>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] p-3 space-y-1" style={{borderTopColor:'var(--success)', borderTopWidth:3}}>
                      <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Invoiced</p>
                      <p className="text-xl font-bold tabular-nums text-[var(--success)]">৳{formatCurrency(wholesaleData.totalNetAmount)}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Net amount</p>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] p-3 space-y-1" style={{borderTopColor:'var(--info)', borderTopWidth:3}}>
                      <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Collected</p>
                      <p className="text-xl font-bold tabular-nums text-[var(--info)]">৳{formatCurrency(wholesaleData.totalCollected)}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Payments received</p>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] p-3 space-y-1" style={{borderTopColor: wholesaleData.totalOutstanding > 0 ? 'var(--warning)' : 'var(--success)', borderTopWidth:3}}>
                      <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Outstanding</p>
                      <p className={`text-xl font-bold tabular-nums ${wholesaleData.totalOutstanding > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
                        ৳{formatCurrency(wholesaleData.totalOutstanding)}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">All buyers · all-time</p>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] p-3 space-y-1">
                      <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Buyers</p>
                      <p className="text-xl font-bold tabular-nums text-[var(--text-primary)]">{wholesaleData.activeBuyers}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Active</p>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] p-3 space-y-1" style={{borderTopColor: wholesaleData.pendingChallans > 0 ? 'var(--danger)' : 'var(--success)', borderTopWidth:3}}>
                      <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Unpaid</p>
                      <p className={`text-xl font-bold tabular-nums ${wholesaleData.pendingChallans > 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
                        {wholesaleData.pendingChallans}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">Open challans</p>
                    </div>
                  </div>
                  {Object.keys(wholesaleData.methodBreakdown || {}).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)] flex flex-wrap gap-2">
                      {Object.entries(wholesaleData.methodBreakdown as Record<string,number>).map(([method, amount]) => (
                        <span key={method} className="text-[10px] font-semibold px-2 py-1 rounded-full bg-[var(--surface-raised)] text-[var(--text-secondary)]">
                          {method.replace('_',' ')}: ৳{formatCurrency(amount)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Charts — lazy loaded to keep recharts out of the initial bundle */}
              <DashboardCharts
                dailyTrend={data.dailyTrend}
                incomeBreakdown={data.incomeBreakdown}
                expenseBreakdown={data.expenseBreakdown}
                branchStats={data.branchStats}
                totalExpenses={data.totalExpenses}
                userRole={userRole}
              />

              {/* Branch section — hidden for BRANCH role */}
              {userRole !== 'BRANCH' && (
                <>

                  {/* Payroll summary (admin) */}
                  {userRole === 'ADMIN' && payrollData && (
                    <PayrollSummary data={payrollData} />
                  )}

                  {/* Branch summary table */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Branch Summary</h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-[var(--border)]">
                          <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">
                            Branch
                          </TableHead>
                          <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">
                            Total Sales
                          </TableHead>
                          <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">
                            Total Expenses
                          </TableHead>
                          <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">
                            Net Balance
                          </TableHead>
                          <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">
                            Physical Cash
                          </TableHead>
                          <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...data.branchStats]
                          .sort((a, b) => b.totalSale - a.totalSale)
                          .map((b) => (
                            <TableRow
                              key={b.branchName}
                              className="border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors"
                            >
                              <TableCell className="font-medium text-[var(--text-primary)]">
                                {b.branchName}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-[var(--text-secondary)]">
                                ৳{formatCurrency(b.totalSale)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-[var(--text-secondary)]">
                                ৳{formatCurrency(b.totalExpense)}
                              </TableCell>
                              <TableCell className={cn(
                                'text-right tabular-nums font-semibold',
                                b.netBalance >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                              )}>
                                ৳{formatCurrency(Math.abs(b.netBalance))}
                              </TableCell>
                              <TableCell className="text-right tabular-nums font-semibold text-[var(--warning)]">
                                ৳{formatCurrency(b.physicalCash || 0)}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={cn(
                                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
                                  'text-[11px] font-semibold tabular-nums',
                                  b.netBalance >= 0
                                    ? 'bg-[var(--success-subtle)] text-[var(--success)]'
                                    : 'bg-[var(--danger-subtle)] text-[var(--danger)]'
                                )}>
                                  {b.netBalance >= 0 ? '▲' : '▼'} {b.netBalance >= 0 ? 'Profit' : 'Loss'}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>

                  {userRole === 'ADMIN' && (
                    <div>
                      <RecentActivity />
                    </div>
                  )}
                </>
              )}
            </>
          )
        )}
      </div>
    </>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
        <span className="text-sm text-[var(--text-muted)]">Loading…</span>
      </div>
    }>
      <Dashboard />
    </Suspense>
  )
}
