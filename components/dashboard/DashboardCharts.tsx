'use client'

import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

const COLORS = ['#F4881F', '#2A356E', '#2F9E6B', '#FA9A3E', '#4A537A', '#11162B', '#E8E2D5']
const TOOLTIP_STYLE = {
  background: 'var(--surface-raised)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'var(--text-primary)',
}

// Main admin/auditor dashboard charts
export function MainDashboardCharts({
  dailyTrend,
  incomeBreakdown,
  expenseBreakdown,
  branchStats,
  totalExpenses,
  userRole,
}: {
  dailyTrend: any[]
  incomeBreakdown?: { category: string; amount: number }[]
  expenseBreakdown: { category: string; amount: number }[]
  branchStats: any[]
  totalExpenses: number
  userRole: string
}) {
  return (
    <>
      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl bg-[var(--surface)] p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)' }}>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Daily Sales vs Expenses</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={dailyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
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

        {incomeBreakdown && incomeBreakdown.length > 0 && (
          <div className="rounded-xl bg-[var(--surface)] p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)' }}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Income Breakdown</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={incomeBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="amount" nameKey="category">
                  {incomeBreakdown.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`৳${formatCurrency(v || 0)}`, undefined]} />
                <Legend layout="vertical" align="right" verticalAlign="middle" className="text-[11px] text-[var(--text-secondary)]" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="rounded-xl bg-[var(--surface)] p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)' }}>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Expense Breakdown</h3>
          {expenseBreakdown.filter(eb => eb.amount > (totalExpenses * 0.3) && eb.amount > 0).length > 0 && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-[var(--danger-subtle)] text-xs font-semibold text-[var(--text-secondary)]">
              ⚠️ Anomaly:{' '}
              {expenseBreakdown.filter(eb => eb.amount > (totalExpenses * 0.3) && eb.amount > 0).map(eb => eb.category).join(', ')}{' '}
              exceed 30% of total expenses.
            </div>
          )}
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="amount" nameKey="category">
                {expenseBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`৳${formatCurrency(v || 0)}`, undefined]} />
              <Legend layout="vertical" align="right" verticalAlign="middle" className="text-[11px] text-[var(--text-secondary)]" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Branch performance bar chart */}
      {userRole !== 'BRANCH' && (
        <div className="rounded-xl bg-[var(--surface)] p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)' }}>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Branch-wise Performance</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={branchStats} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="branchName" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} />
              <YAxis tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`৳${formatCurrency(v)}`, undefined]} />
              <Legend className="text-xs" />
              <Bar dataKey="totalSale" fill="var(--success)" name="Sales" radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalExpense" fill="var(--text-secondary)" name="Expenses" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  )
}

// Area manager branch comparison chart
export function AreaManagerBranchChart({ chartData }: { chartData: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => formatCurrency(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Income" fill="#059669" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Expenses" fill="#dc2626" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
