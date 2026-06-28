'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { formatCurrency, cn } from '@/lib/utils'
import { SummaryStats, Branch } from '@/lib/types'
import AdminEditRequests from '@/components/dashboard/AdminEditRequests'
import RecentActivity from '@/components/dashboard/RecentActivity'
import PdfGenerator from '@/components/dashboard/PdfGenerator'
import ExcelExport from '@/components/dashboard/ExcelExport'
import { BrandSpinner } from '@/components/ui/BrandSpinner'
import { MorningCheckInWidget } from '@/components/hr/MorningCheckInWidget'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  FileText, Users, DollarSign, AlertCircle, CheckCircle,
  Clock, ChevronRight, BarChart2,
} from 'lucide-react'

const COLORS = ['#F4881F', '#2A356E', '#2F9E6B', '#FA9A3E', '#4A537A', '#11162B', '#E8E2D5']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const TOOLTIP_STYLE = {
  background: 'var(--surface-raised)',
  border: '1px solid var(--border-strong)',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'var(--text-primary)',
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatCard({
  label, value, context, valueClass = 'text-[var(--text-primary)]',
}: {
  label: string
  value: React.ReactNode
  context: string
  valueClass?: string
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-1.5 hover:border-[var(--border-strong)] transition-colors duration-150">
      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
      <p className={cn('text-2xl font-bold tabular-nums leading-none', valueClass)}>{value}</p>
      <p className="text-xs text-[var(--text-muted)]">{context}</p>
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
          <SelectTrigger className="h-8 w-[140px] text-sm">
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
        <SelectTrigger className="h-8 w-[140px] text-sm">
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
        <Link href="/hr/salary" className="text-xs text-[var(--accent)] hover:underline font-medium">
          Go to processing →
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-4">
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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Pending Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {chequesCount > 0 && (
          <Link
            href="/admin/cheques"
            className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] transition-all duration-150 no-underline group"
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
            className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] transition-all duration-150 no-underline group"
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
            className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] transition-all duration-150 no-underline group"
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

function Dashboard() {
  const searchParams = useSearchParams()
  const now = new Date()

  const initialMonth = searchParams.get('month') ? parseInt(searchParams.get('month')!) : now.getMonth() + 1
  const initialYear = searchParams.get('year') ? parseInt(searchParams.get('year')!) : now.getFullYear()
  const initialBranchId = searchParams.get('branchId') || 'all'

  const [month, setMonth] = useState(initialMonth)
  const [year, setYear] = useState(initialYear)
  const [branchId, setBranchId] = useState(initialBranchId)

  const todayStr = now.toISOString().split('T')[0]
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [viewMode, setViewMode] = useState<'daily' | 'month' | 'custom'>('daily')

  const fetcher = (url: string) => fetch(url).then((res) => res.json())

  const { data: session } = useSWR('/api/auth/session', fetcher)
  const userRole = session?.user?.role || ''

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
    userRole === 'ADMIN' ? '/api/admin/cheques?status=PENDING' : null,
    fetcher
  )

  if (!session) return <BrandSpinner />

  const subtitle =
    viewMode === 'daily'
      ? `Overview for ${formatDate(startDate)}`
      : viewMode === 'custom'
      ? `Overview for ${formatDate(startDate)} to ${formatDate(endDate)}`
      : `Overview for ${MONTHS[month - 1]} ${year}`

  return (
    <>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">
            Dashboard
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">{subtitle}</p>
        </div>
        {userRole !== 'HR_ADMIN' && (
          <div className="flex items-center gap-2">
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
              <>
                <ExcelExport
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
                />
                <PdfGenerator
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
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 p-6 space-y-6 min-h-0">

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
              <span className="text-sm text-[var(--text-muted)]">Loading data…</span>
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-12 h-12 rounded-full bg-[var(--surface-raised)] flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-[var(--text-muted)]" />
              </div>
              <p className="text-sm font-medium text-[var(--text-muted)]">No data for this period</p>
              <p className="text-xs text-[var(--text-disabled)]">Add entries or adjust the date range</p>
            </div>
          ) : (
            <>
              {userRole === 'ADMIN' && (
                <div>
                  <AdminEditRequests />
                </div>
              )}

              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                <StatCard
                  label="Total Sales"
                  value={`৳${formatCurrency(data.totalSales)}`}
                  context={`${MONTHS[month - 1]} ${year}`}
                  valueClass="text-[var(--success)]"
                />
                <StatCard
                  label="Total Expenses"
                  value={`৳${formatCurrency(data.totalExpenses)}`}
                  context={`${MONTHS[month - 1]} ${year}`}
                />
                <StatCard
                  label="Net Balance"
                  value={`৳${formatCurrency(Math.abs(data.netBalance))}`}
                  context={data.netBalance >= 0 ? 'Profit' : 'Loss'}
                  valueClass={data.netBalance >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}
                />
                <StatCard
                  label="Active Branches"
                  value={data.branchStats.length}
                  context="With activity this period"
                />
                {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                  <>
                    <StatCard
                      label="Petty Cash"
                      value={`৳${formatCurrency(data.pettyCash || 0)}`}
                      context="Latest physical cash"
                      valueClass="text-[var(--info)]"
                    />
                    <StatCard
                      label="Total Payable"
                      value={`৳${formatCurrency(data.totalPayable || 0)}`}
                      context="Owed to parties"
                      valueClass="text-[var(--warning)]"
                    />
                  </>
                )}
                <StatCard
                  label="Total Physical Cash"
                  value={`৳${formatCurrency(data.branchStats.reduce((sum, b) => sum + (b.physicalCash || 0), 0))}`}
                  context="In branch drawers"
                  valueClass="text-[var(--warning)]"
                />
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                    Daily Sales vs Expenses
                  </h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={data.dailyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v) => new Date(v).getDate().toString()}
                        tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                        axisLine={{ stroke: 'var(--border)' }}
                      />
                      <YAxis
                        tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`}
                        tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                        axisLine={{ stroke: 'var(--border)' }}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(v: any) => [`৳${formatCurrency(v)}`, undefined]}
                        labelFormatter={(l) => new Date(l).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' })}
                      />
                      <Legend className="text-xs" />
                      <Line type="monotone" dataKey="totalSale" stroke="var(--success)" strokeWidth={2} dot={false} name="Sales" />
                      <Line type="monotone" dataKey="totalExpense" stroke="var(--text-secondary)" strokeWidth={2} dot={false} name="Expenses" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                    Expense Breakdown
                  </h3>
                  {data.expenseBreakdown.filter(eb => eb.amount > (data.totalExpenses * 0.3) && eb.amount > 0).length > 0 && (
                    <div className="mb-3 px-3 py-2 rounded-lg bg-[var(--danger-subtle)] text-xs font-semibold text-[var(--text-secondary)]">
                      ⚠️ Anomaly:{' '}
                      {data.expenseBreakdown
                        .filter(eb => eb.amount > (data.totalExpenses * 0.3) && eb.amount > 0)
                        .map(eb => eb.category)
                        .join(', ')}{' '}
                      exceed 30% of total expenses.
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={data.expenseBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        dataKey="amount"
                        nameKey="category"
                      >
                        {data.expenseBreakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(v: any) => [`৳${formatCurrency(v || 0)}`, undefined]}
                      />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        className="text-[11px] text-[var(--text-secondary)]"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Branch section — hidden for BRANCH role */}
              {userRole !== 'BRANCH' && (
                <>
                  {/* Branch performance bar chart */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                      Branch-wise Performance
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.branchStats} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis
                          dataKey="branchName"
                          tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                          axisLine={{ stroke: 'var(--border)' }}
                        />
                        <YAxis
                          tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`}
                          tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                          axisLine={{ stroke: 'var(--border)' }}
                        />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(v: any) => [`৳${formatCurrency(v)}`, undefined]}
                        />
                        <Legend className="text-xs" />
                        <Bar dataKey="totalSale" fill="var(--success)" name="Sales" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="totalExpense" fill="var(--text-secondary)" name="Expenses" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

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
                          <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide w-[180px]">
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
      <div className="flex items-center justify-center h-screen gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
        <span className="text-sm text-[var(--text-muted)]">Loading Dashboard…</span>
      </div>
    }>
      <Dashboard />
    </Suspense>
  )
}
