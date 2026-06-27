'use client'

import { useState, Suspense } from 'react'
import useSWR from 'swr'
import { formatCurrency } from '@/lib/utils'
import { SummaryStats, Branch } from '@/lib/types'
import AdminEditRequests from '@/components/dashboard/AdminEditRequests'
import RecentActivity from '@/components/dashboard/RecentActivity'
import PdfGenerator from '@/components/dashboard/PdfGenerator'
import ExcelExport from '@/components/dashboard/ExcelExport'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const COLORS = ['#F4881F', '#2A356E', '#2F9E6B', '#FA9A3E', '#4A537A', '#11162B', '#E8E2D5']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })
}

function DateFilter({
  month, year, startDate, endDate, viewMode, onChange, branches, branchId, onBranchChange, userRole
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
    <div className="filters-bar" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {userRole === 'ADMIN' && (
        <select
          className="form-input form-select"
          style={{ width: 140, borderColor: 'var(--accent)', color: 'var(--accent)', fontWeight: 'bold' }}
          value={branchId}
          onChange={(e) => onBranchChange(e.target.value)}
        >
          <option value="all">All Branches</option>
          {branches.map(b => (
            <option key={b.id} value={String(b.id)}>{b.name}</option>
          ))}
        </select>
      )}
      <select
        className="form-input form-select"
        style={{ width: 140 }}
        value={viewMode}
        onChange={(e) => onChange(month, year, startDate, endDate, e.target.value as any)}
      >
        <option value="daily">Daily View</option>
        <option value="month">Monthly View</option>
        <option value="custom">Custom Range</option>
      </select>

      {viewMode === 'custom' ? (
        <>
          <input
            type="date"
            className="form-input"
            value={startDate}
            onChange={(e) => onChange(month, year, e.target.value, endDate, viewMode)}
          />
          <span style={{ color: 'var(--text-muted)' }}>to</span>
          <input
            type="date"
            className="form-input"
            value={endDate}
            onChange={(e) => onChange(month, year, startDate, e.target.value, viewMode)}
          />
        </>
      ) : viewMode === 'daily' ? (
        <input
          type="date"
          className="form-input"
          value={startDate}
          onChange={(e) => onChange(month, year, e.target.value, e.target.value, viewMode)}
        />
      ) : (
        <>
          <select
            className="form-input form-select"
            style={{ width: 140 }}
            value={month}
            onChange={(e) => onChange(parseInt(e.target.value), year, startDate, endDate, viewMode)}
          >
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            className="form-input form-select"
            style={{ width: 100 }}
            value={year}
            onChange={(e) => onChange(month, parseInt(e.target.value), startDate, endDate, viewMode)}
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </>
      )}
    </div>
  )
}

import { useSearchParams } from 'next/navigation'
import { BrandSpinner } from '@/components/ui/BrandSpinner'


import Link from 'next/link'
import { FileText, Users, DollarSign, AlertCircle, CheckCircle, Clock } from 'lucide-react'

function PayrollSummary({ data, role }: { data: any, role: string }) {
  if (!data) return null;
  return (
    <div className="card" style={{ marginBottom: 24, marginTop: 24 }}>
      <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Payroll Summary ({data.month}/{data.year})</span>
        <Link href="/hr/salary" style={{ fontSize: 12, color: 'var(--brand-orange)', textDecoration: 'none' }}>Go to Processing →</Link>
      </div>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-label flex items-center gap-2"><Users size={14}/> Active Employees</div>
          <div className="stat-value">{data.activeEmployees}</div>
          <div className="stat-change">Total in system</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex items-center gap-2"><CheckCircle size={14}/> Processed</div>
          <div className={`stat-value ${data.processedCount === data.activeEmployees && data.activeEmployees > 0 ? 'success' : ''}`}>
            {data.processedCount} / {data.activeEmployees}
          </div>
          <div className="stat-change">{data.isLocked ? <span className="text-red-500 font-semibold">Locked</span> : 'Unlocked'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex items-center gap-2"><DollarSign size={14}/> Payroll Bill</div>
          <div className="stat-value font-display text-blue-700">৳{formatCurrency(data.totalNetPayable)}</div>
          <div className="stat-change">Total net payable</div>
        </div>
      </div>
    </div>
  )
}

function PendingItems({ payroll, transfersCount, chequesCount }: { payroll: any, transfersCount: number, chequesCount: number }) {
  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 16 }}>Pending Actions</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {chequesCount > 0 && (
          <Link href="/admin/cheques" style={{ flex: 1, minWidth: 200, padding: 16, background: 'var(--warning-glow)', borderRadius: 8, border: '1px solid var(--warning)', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}>
            <Clock className="text-amber-600" />
            <div>
              <div style={{ fontWeight: 600 }}>{chequesCount} Pending Cheques</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Require clearance</div>
            </div>
          </Link>
        )}
        {transfersCount > 0 && (
          <Link href="/transfers/incoming" style={{ flex: 1, minWidth: 200, padding: 16, background: 'var(--info-glow)', borderRadius: 8, border: '1px solid var(--info)', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}>
            <AlertCircle className="text-blue-600" />
            <div>
              <div style={{ fontWeight: 600 }}>{transfersCount} Pending Transfers</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Awaiting receipt</div>
            </div>
          </Link>
        )}
        {payroll && payroll.processedCount === 0 && (
          <Link href="/hr/salary" style={{ flex: 1, minWidth: 200, padding: 16, background: 'var(--danger-glow)', borderRadius: 8, border: '1px solid var(--danger)', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}>
            <Users className="text-red-600" />
            <div>
              <div style={{ fontWeight: 600 }}>Unprocessed Payroll</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{payroll.month}/{payroll.year} has no records</div>
            </div>
          </Link>
        )}
        {chequesCount === 0 && transfersCount === 0 && payroll?.processedCount > 0 && (
          <div style={{ flex: 1, padding: 16, background: 'var(--success-glow)', borderRadius: 8, border: '1px solid var(--success)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <CheckCircle className="text-green-600" />
            <div style={{ fontWeight: 600 }}>All caught up!</div>
          </div>
        )}
      </div>
    </div>
  )
}

function BranchSlipStatus({ month, year }: { month: number, year: number }) {
  const { data, isLoading } = useSWR(`/api/hr/slips?month=${month}&year=${year}`, (url) => fetch(url).then(r => r.ok ? r.json() : null))
  if (isLoading || !data) return null;

  return (
    <div className="card" style={{ marginBottom: 24, marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', borderLeft: '4px solid var(--brand-orange)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ background: 'var(--brand-orange)', color: 'white', padding: 12, borderRadius: '50%' }}>
          <FileText size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>Salary Slip: {MONTHS[month - 1]} {year}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{data.length > 0 ? 'Your salary slip is ready.' : 'Not generated yet.'}</div>
        </div>
      </div>
      <Link href="/hr/slips" className="btn btn-outline" style={{ textDecoration: 'none' }}>
        View Slip
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

  // SWR for user session
  const { data: session } = useSWR('/api/auth/session', fetcher)
  const userRole = session?.user?.role || ''

  // SWR for branches
  const { data: branchesData } = useSWR<Branch[]>('/api/branches', fetcher)
  const branches = branchesData || []

  // SWR for dashboard data
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

  const { data, isLoading: loading } = useSWR<SummaryStats>(userRole !== 'HR_ADMIN' ? url : null, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  })

  // SWR for Payroll
  const { data: payrollData } = useSWR((userRole === 'ADMIN' || userRole === 'HR_ADMIN') ? '/api/dashboard/payroll' : null, fetcher)
  const { data: transfersCountData } = useSWR(userRole === 'ADMIN' ? '/api/transfers/pending-count' : null, fetcher)
  const { data: chequesCountData } = useSWR(userRole === 'ADMIN' ? '/api/admin/cheques?status=PENDING' : null, fetcher)


  if (!session) return <BrandSpinner />

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-subtitle">
            {viewMode === 'daily' 
              ? `Overview for ${formatDate(startDate)}`
              : viewMode === 'custom' 
              ? `Overview for ${formatDate(startDate)} to ${formatDate(endDate)}` 
              : `Overview for ${MONTHS[month - 1]} ${year}`}
          </p>
        </div>
        {userRole !== 'HR_ADMIN' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
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
              <div style={{ display: 'flex', gap: '8px' }}>
                <ExcelExport data={data} month={month} year={year} branchName={userRole === 'BRANCH' ? branches[0]?.name : branchId !== 'all' ? branches.find(b => String(b.id) === branchId)?.name : undefined} />
                <PdfGenerator data={data} month={month} year={year} branchName={userRole === 'BRANCH' ? branches[0]?.name : branchId !== 'all' ? branches.find(b => String(b.id) === branchId)?.name : undefined} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="page-body">
        {userRole === 'ADMIN' && <PendingItems payroll={payrollData} transfersCount={transfersCountData?.count || 0} chequesCount={chequesCountData?.length || 0} />}
        
        {userRole === 'HR_ADMIN' && payrollData && (
          <PayrollSummary data={payrollData} role={userRole} />
        )}

        {userRole === 'BRANCH' && <BranchSlipStatus month={month} year={year} />}

        {userRole !== 'HR_ADMIN' && (
          loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', gap: 12 }}>
              <BrandSpinner />
              <span style={{ color: 'var(--text-secondary)' }}>Loading data…</span>
            </div>
          ) : !data ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0' }}>
              No data found. Import an Excel file or add entries to get started.
            </div>
          ) : (
            <>
              {/* Admin Widgets */}
              {userRole === 'ADMIN' && (
                <div style={{ marginBottom: '24px' }}>
                  <AdminEditRequests />
                </div>
              )}

              {/* Stat Cards */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Total Sales</div>
                  <div className="stat-value success">৳{formatCurrency(data.totalSales)}</div>
                  <div className="stat-change">{MONTHS[month - 1]} {year}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Expenses</div>
                  <div className="stat-value">৳{formatCurrency(data.totalExpenses)}</div>
                  <div className="stat-change">{MONTHS[month - 1]} {year}</div>
                </div>
                <div className={`stat-card ${data.netBalance >= 0 ? '' : 'danger'}`} style={{ overflow: 'hidden', position: 'relative' }}>
                  <svg className="absolute top-0 right-0 -mr-4 -mt-4 w-32 h-32 opacity-10 pointer-events-none" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C16.84 22 20.86 18.55 21.8 14H19.74C18.84 17.43 15.7 20 12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C14.7 4 17.08 5.34 18.5 7.4L15 7.4V9.4H22V2.4H20V5.13C18.17 2.58 15.26 1 12 2V2Z" fill="var(--brand-orange)"/>
                  </svg>
                  <div className="stat-label" style={{ position: 'relative', zIndex: 10 }}>Net Balance</div>
                  <div className={`stat-value font-display ${data.netBalance >= 0 ? 'success' : 'red'}`} style={{ position: 'relative', zIndex: 10, fontSize: '36px' }}>
                    ৳{formatCurrency(Math.abs(data.netBalance))}
                  </div>
                  <div className="stat-change" style={{ position: 'relative', zIndex: 10 }}>{data.netBalance >= 0 ? 'Profit' : 'Loss'}</div>
                </div>
                <div className="stat-card info">
                  <div className="stat-label">Active Branches</div>
                  <div className="stat-value" style={{ color: 'var(--text-primary)' }}>
                    {data.branchStats.length}
                  </div>
                  <div className="stat-change">With activity this month</div>
                </div>
                <div className="stat-card warning">
                  <div className="stat-label">Total Physical Cash</div>
                  <div className="stat-value" style={{ color: 'var(--warning)' }}>
                    ৳{formatCurrency(data.branchStats.reduce((sum, b) => sum + (b.physicalCash || 0), 0))}
                  </div>
                  <div className="stat-change">In branch drawers</div>
                </div>
              </div>

              {/* Charts Row 1 */}
              <div className="charts-grid">
                {/* Daily Trend */}
                <div className="card">
                  <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 14 }}>Daily Sales vs Expenses</div>
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
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                        formatter={(v: any) => [`৳${formatCurrency(v)}`, undefined]}
                        labelFormatter={(l) => new Date(l).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' })}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="totalSale" stroke="var(--success)" strokeWidth={2} dot={false} name="Sales" />
                      <Line type="monotone" dataKey="totalExpense" stroke="var(--text-secondary)" strokeWidth={2} dot={false} name="Expenses" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Expense Breakdown */}
                <div className="card">
                  <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 14 }}>
                    Expense Breakdown
                    {data.expenseBreakdown.filter(eb => eb.amount > (data.totalExpenses * 0.3) && eb.amount > 0).length > 0 && (
                      <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--danger-glow)', color: 'var(--text-secondary)', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                        ⚠️ Anomaly: {data.expenseBreakdown.filter(eb => eb.amount > (data.totalExpenses * 0.3) && eb.amount > 0).map(eb => eb.category).join(', ')} exceed 30% of total expenses.
                      </div>
                    )}
                  </div>
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
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                        formatter={(v: any) => [`৳${formatCurrency(v || 0)}`, undefined]}
                      />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Branch Comparison & Table - Hidden for Branch Users */}
              {userRole !== 'BRANCH' && (
                <>
                  <div className="card">
                    <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 14 }}>Branch-wise Performance</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={data.branchStats}
                        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                      >
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
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                          formatter={(v: any) => [`৳${formatCurrency(v)}`, undefined]}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="totalSale" fill="var(--success)" name="Sales" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="totalExpense" fill="var(--text-secondary)" name="Expenses" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {userRole === 'ADMIN' && payrollData && (
                    <PayrollSummary data={payrollData} role={userRole} />
                  )}

                  <div className="card" style={{ marginTop: 16 }}>
                    <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 14 }}>Branch Summary</div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            {['Branch', 'Total Sales', 'Total Expenses', 'Net Balance', 'Physical Cash', 'Status'].map((h) => (
                              <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Branch' ? 'left' : 'right', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[...data.branchStats]
                            .sort((a, b) => b.totalSale - a.totalSale)
                            .map((b) => (
                              <tr key={b.branchName} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}>
                                <td style={{ padding: '10px 14px', fontWeight: 600 }}>{b.branchName}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-primary)' }}>৳{formatCurrency(b.totalSale)}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)' }}>৳{formatCurrency(b.totalExpense)}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: b.netBalance >= 0 ? 'var(--success)' : 'var(--text-primary)' }}>
                                  ৳{formatCurrency(Math.abs(b.netBalance))}
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--warning)' }}>
                                  ৳{formatCurrency(b.physicalCash || 0)}
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                  <span className={`badge ${b.netBalance >= 0 ? 'badge-green' : 'badge-red'}`}>
                                    {b.netBalance >= 0 ? '▲ Profit' : '▼ Loss'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {userRole === 'ADMIN' && (
                    <div style={{ marginTop: 16 }}>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12 }}>
        <BrandSpinner />
        <span style={{ color: 'var(--text-secondary)' }}>Loading Dashboard…</span>
      </div>
    }>
      <Dashboard />
    </Suspense>
  )
}
