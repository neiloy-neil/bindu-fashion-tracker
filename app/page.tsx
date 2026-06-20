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

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

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
          style={{ width: 140, borderColor: '#00d2ff', color: '#00d2ff', fontWeight: 'bold' }}
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

  const { data, isLoading: loading } = useSWR<SummaryStats>(url, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false, // Prevents excessive refetching on window focus
  })

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

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
            userRole={data?.userRole || ''}
          />
          {data && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <ExcelExport data={data} month={month} year={year} branchName={data.userRole === 'BRANCH' ? branches[0]?.name : branchId !== 'all' ? branches.find(b => String(b.id) === branchId)?.name : undefined} />
              <PdfGenerator data={data} month={month} year={year} branchName={data.userRole === 'BRANCH' ? branches[0]?.name : branchId !== 'all' ? branches.find(b => String(b.id) === branchId)?.name : undefined} />
            </div>
          )}
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', gap: 12 }}>
            <div className="spinner" />
            <span style={{ color: 'var(--text-secondary)' }}>Loading data…</span>
          </div>
        ) : !data ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0' }}>
            No data found. Import an Excel file or add entries to get started.
          </div>
        ) : (
          <>
            {/* Admin Widgets */}
            {data.userRole === 'ADMIN' && (
              <div style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <AdminEditRequests />
                <RecentActivity />
              </div>
            )}

            {/* Stat Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Sales</div>
                <div className="stat-value green">৳{formatCurrency(data.totalSales)}</div>
                <div className="stat-change">{MONTHS[month - 1]} {year}</div>
              </div>
              <div className="stat-card danger">
                <div className="stat-label">Total Expenses</div>
                <div className="stat-value red">৳{formatCurrency(data.totalExpenses)}</div>
                <div className="stat-change">{MONTHS[month - 1]} {year}</div>
              </div>
              <div className={`stat-card ${data.netBalance >= 0 ? '' : 'danger'}`}>
                <div className="stat-label">Net Balance</div>
                <div className={`stat-value ${data.netBalance >= 0 ? 'green' : 'red'}`}>
                  ৳{formatCurrency(Math.abs(data.netBalance))}
                </div>
                <div className="stat-change">{data.netBalance >= 0 ? 'Profit' : 'Loss'}</div>
              </div>
              <div className="stat-card info">
                <div className="stat-label">Active Branches</div>
                <div className="stat-value" style={{ color: '#60a5fa' }}>
                  {data.branchStats.length}
                </div>
                <div className="stat-change">With activity this month</div>
              </div>
              <div className="stat-card warning">
                <div className="stat-label">Total Physical Cash</div>
                <div className="stat-value" style={{ color: '#fcd34d' }}>
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
                      tick={{ fill: '#8899aa', fontSize: 11 }}
                      axisLine={{ stroke: '#1e2d45' }}
                    />
                    <YAxis
                      tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`}
                      tick={{ fill: '#8899aa', fontSize: 11 }}
                      axisLine={{ stroke: '#1e2d45' }}
                    />
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any) => [`৳${formatCurrency(v)}`, undefined]}
                      labelFormatter={(l) => new Date(l).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' })}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="totalSale" stroke="#10b981" strokeWidth={2} dot={false} name="Sales" />
                    <Line type="monotone" dataKey="totalExpense" stroke="#ef4444" strokeWidth={2} dot={false} name="Expenses" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Expense Breakdown */}
              <div className="card">
                <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 14 }}>
                  Expense Breakdown
                  {data.expenseBreakdown.filter(eb => eb.amount > (data.totalExpenses * 0.3) && eb.amount > 0).length > 0 && (
                    <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
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
                      contentStyle={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any) => [`৳${formatCurrency(v || 0)}`, undefined]}
                    />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      wrapperStyle={{ fontSize: 11, color: '#8899aa' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Branch Comparison & Table - Hidden for Branch Users */}
            {data.userRole !== 'BRANCH' && (
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
                        tick={{ fill: '#8899aa', fontSize: 11 }}
                        axisLine={{ stroke: '#1e2d45' }}
                      />
                      <YAxis
                        tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`}
                        tick={{ fill: '#8899aa', fontSize: 11 }}
                        axisLine={{ stroke: '#1e2d45' }}
                      />
                      <Tooltip
                        contentStyle={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 8, fontSize: 12 }}
                        formatter={(v: any) => [`৳${formatCurrency(v)}`, undefined]}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="totalSale" fill="#10b981" name="Sales" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="totalExpense" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

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
                            <tr key={b.branchName} style={{ borderBottom: '1px solid rgba(30,45,69,0.5)', transition: 'background 0.1s' }}>
                              <td style={{ padding: '10px 14px', fontWeight: 600 }}>{b.branchName}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--accent-light)' }}>৳{formatCurrency(b.totalSale)}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--danger-light)' }}>৳{formatCurrency(b.totalExpense)}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: b.netBalance >= 0 ? 'var(--accent-light)' : 'var(--danger-light)' }}>
                                ৳{formatCurrency(Math.abs(b.netBalance))}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#fcd34d' }}>
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
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12 }}>
        <div className="spinner" />
        <span style={{ color: 'var(--text-secondary)' }}>Loading Dashboard…</span>
      </div>
    }>
      <Dashboard />
    </Suspense>
  )
}
