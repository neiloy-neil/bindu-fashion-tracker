'use client'

import { SummaryStats } from '@/lib/types'
import { downloadWorkbook } from '@/lib/excel-export'

export default function ExcelExport({ data, month, year, branchName }: { data: SummaryStats, month: number, year: number, branchName?: string }) {
  const exportDashboard = async () => {
    const branchRows = data.branchStats.map(b => ({
      branch: b.branchName,
      totalSales: b.totalSale,
      totalExpenses: b.totalExpense,
      netBalance: b.netBalance,
      physicalCash: b.physicalCash || 0
    }))

    const dailyRows = data.dailyTrend.map(d => ({
      date: d.date,
      sales: d.totalSale,
      expenses: d.totalExpense,
      netBalance: d.totalSale - d.totalExpense
    }))

    const expenseRows = data.expenseBreakdown.map(e => ({
      category: e.category,
      amount: e.amount
    }))

    await downloadWorkbook(`Dashboard_Summary_${branchName ? branchName.replace(/\s+/g, '_') + '_' : ''}${year}_${month}.xlsx`, [
      {
        name: 'Branches',
        columns: [
          { header: 'Branch', key: 'branch', width: 22 },
          { header: 'Total Sales', key: 'totalSales', width: 14 },
          { header: 'Total Expenses', key: 'totalExpenses', width: 14 },
          { header: 'Net Balance', key: 'netBalance', width: 14 },
          { header: 'Physical Cash', key: 'physicalCash', width: 14 },
        ],
        rows: branchRows,
      },
      {
        name: 'Daily Trend',
        columns: [
          { header: 'Date', key: 'date', width: 14 },
          { header: 'Sales', key: 'sales', width: 14 },
          { header: 'Expenses', key: 'expenses', width: 14 },
          { header: 'Net Balance', key: 'netBalance', width: 14 },
        ],
        rows: dailyRows,
      },
      {
        name: 'Expense Breakdown',
        columns: [
          { header: 'Category', key: 'category', width: 24 },
          { header: 'Amount', key: 'amount', width: 14 },
        ],
        rows: expenseRows,
      },
    ])
  }

  return (
    <button className="btn btn-secondary btn-sm" onClick={() => { void exportDashboard() }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ marginRight: 6 }}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Export Excel
    </button>
  )
}
