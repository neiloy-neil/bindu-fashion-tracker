'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { BrandSpinner } from '@/components/ui/BrandSpinner'

const COLORS = ['var(--accent)', '#3a7bd5', 'var(--success)', 'var(--warning)', 'var(--danger)', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#14b8a6']

type AnalyticsTrendPoint = {
  date: string
  revenue: number
  expenses: number
}

type AnalyticsBranchPoint = {
  name: string
  sales: number
}

type AnalyticsExpensePoint = {
  name: string
  value: number
}

type AnalyticsResponse = {
  kpi: {
    totalRevenue: number
    totalExpenses: number
    netProfit: number
    cashInHand: number
  }
  trendData: AnalyticsTrendPoint[]
  branchData: AnalyticsBranchPoint[]
  expenseData: AnalyticsExpensePoint[]
}

type ChartTooltipProps = {
  active?: boolean
  payload?: Array<{
    color?: string
    name?: string
    value?: number | string
  }>
  label?: string
}

function AnalyticsTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] p-3 rounded-lg shadow-xl">
      <p className="text-[var(--text-secondary)] font-semibold mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={`${entry.name ?? 'series'}-${index}`} className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-white">{entry.name}:</span>
          <span className="font-mono text-[var(--accent)]">{formatCurrency(Number(entry.value ?? 0))}</span>
        </div>
      ))}
    </div>
  )
}

export default function AdminAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const [dateRange, setDateRange] = useState('today')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  useEffect(() => {
    let cancelled = false

    const fetchAnalytics = async () => {
      setLoading(true)
      try {
        const end = new Date()
        let start = new Date()

        if (dateRange === '7days') {
          start.setDate(end.getDate() - 6)
        } else if (dateRange === '30days') {
          start.setDate(end.getDate() - 29)
        } else if (dateRange === 'thisMonth') {
          start = new Date(end.getFullYear(), end.getMonth(), 1)
        } else if (dateRange === 'custom' && customStart && customEnd) {
          start = new Date(customStart)
          const customEndDate = new Date(customEnd)
          if (!Number.isNaN(customEndDate.getTime())) {
            end.setTime(customEndDate.getTime())
          }
        }

        const query = new URLSearchParams({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        })

        const res = await fetch(`/api/admin/analytics?${query}`)
        if (!res.ok) throw new Error('Failed to fetch analytics')
        const json: AnalyticsResponse = await res.json()

        if (!cancelled) {
          setData(json)
        }
      } catch (error) {
        console.error(error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchAnalytics()

    return () => {
      cancelled = true
    }
  }, [dateRange, customStart, customEnd])

  if (loading && !data) {
    return <div className="flex items-center justify-center min-h-[50vh]"><BrandSpinner /></div>
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            📊 Company Analytics
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">Consolidated view of all branch performances and expenses.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border)]">
          <select 
            className="form-select bg-[var(--bg-card)] border-[var(--border)] text-sm py-1.5"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="30days">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                className="form-input bg-[var(--bg-card)] border-[var(--border)] text-sm py-1.5"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
              />
              <span className="text-[var(--text-secondary)]">to</span>
              <input 
                type="date" 
                className="form-input bg-[var(--bg-card)] border-[var(--border)] text-sm py-1.5"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {data?.kpi && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border)] shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 p-4">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h3 className="text-[var(--text-secondary)] text-sm uppercase font-semibold">Total Revenue</h3>
            <p className="text-3xl font-bold font-mono text-white mt-2 flex items-baseline gap-1">
              <span className="text-xl text-[var(--success)]">৳</span>
              {formatCurrency(data.kpi.totalRevenue).replace('৳', '')}
            </p>
          </div>
          
          <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border)] shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 p-4">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2"><path d="M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7"/></svg>
            </div>
            <h3 className="text-[var(--text-secondary)] text-sm uppercase font-semibold">Total Expenses</h3>
            <p className="text-3xl font-bold font-mono text-white mt-2 flex items-baseline gap-1">
              <span className="text-xl text-[var(--danger)]">৳</span>
              {formatCurrency(data.kpi.totalExpenses).replace('৳', '')}
            </p>
          </div>

          <div className="bg-gradient-to-br from-[var(--success)]/10 to-[#059669]/20 p-5 rounded-xl border border-[var(--success)]/30 shadow-lg">
            <h3 className="text-[var(--success)] text-sm uppercase font-semibold">Net Profit</h3>
            <p className="text-3xl font-bold font-mono text-white mt-2 flex items-baseline gap-1">
              <span className="text-xl text-[var(--success)]">৳</span>
              {formatCurrency(data.kpi.netProfit).replace('৳', '')}
            </p>
          </div>

          <div className="bg-gradient-to-br from-[var(--accent)]/10 to-[#3a7bd5]/20 p-5 rounded-xl border border-[var(--accent)]/30 shadow-lg">
            <h3 className="text-[var(--accent)] text-sm uppercase font-semibold">Latest Cash in Hand</h3>
            <p className="text-3xl font-bold font-mono text-white mt-2 flex items-baseline gap-1">
              <span className="text-xl text-[var(--accent)]">৳</span>
              {formatCurrency(data.kpi.cashInHand).replace('৳', '')}
            </p>
            <p className="text-xs text-[var(--accent)]/70 mt-1">Sum of all physical cash</p>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Trend Chart */}
        <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border)] shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-6">Revenue vs Expenses Trend</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.trendData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} tickMargin={10} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickFormatter={(val) => `৳${(val/1000)}k`} />
                <Tooltip content={<AnalyticsTooltip />} />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="var(--success)" strokeWidth={3} dot={{ r: 4, fill: 'var(--success)' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="expenses" name="Expenses" stroke="var(--danger)" strokeWidth={3} dot={{ r: 4, fill: 'var(--danger)' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Branch Comparison */}
        <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border)] shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-6">Branch Sales Comparison</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.branchData || []} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-secondary)" fontSize={12} tickFormatter={(val) => `৳${(val/1000)}k`} />
                <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip content={<AnalyticsTooltip />} />
                <Bar dataKey="sales" name="Sales" fill="var(--accent)" radius={[0, 4, 4, 0]}>
                  {data?.branchData?.map((entry, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Expenses Pie Chart */}
        <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border)] shadow-lg lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-6">Top Expense Categories</h3>
          <div className="h-80 w-full flex flex-col md:flex-row items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.expenseData || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {data?.expenseData?.map((entry, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<AnalyticsTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
