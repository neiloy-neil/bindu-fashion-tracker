'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 shadow-xl">
      <p className="text-[var(--text-secondary)] font-semibold mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={`${entry.name ?? 'series'}-${index}`} className="flex items-center gap-2 text-sm">
          <div className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
          <span className="text-[var(--text-primary)]">{entry.name}:</span>
          <span className="font-mono text-[var(--accent)]">{formatCurrency(Number(entry.value ?? 0))}</span>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsCharts({ data }: { data: AnalyticsResponse | null }) {
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Trend Chart */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Revenue vs Expenses Trend</h3>
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
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Branch Sales Comparison</h3>
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
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 lg:col-span-2">
        <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Top Expense Categories</h3>
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
  )
}
