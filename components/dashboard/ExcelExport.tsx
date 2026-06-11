'use client'

import * as XLSX from 'xlsx'
import { SummaryStats } from '@/lib/types'

export default function ExcelExport({ data, month, year, branchName }: { data: SummaryStats, month: number, year: number, branchName?: string }) {
  const exportDashboard = () => {
    const wb = XLSX.utils.book_new()
    
    // 1. Branch Stats
    const branchRows = data.branchStats.map(b => ({
      Branch: b.branchName,
      'Total Sales': b.totalSale,
      'Total Expenses': b.totalExpense,
      'Net Balance': b.netBalance,
      // @ts-ignore - dynamic physical cash field
      'Physical Cash': b.physicalCash || 0
    }))
    const wsBranch = XLSX.utils.json_to_sheet(branchRows)
    XLSX.utils.book_append_sheet(wb, wsBranch, 'Branches')

    // 2. Daily Trend
    const dailyRows = data.dailyTrend.map(d => ({
      Date: d.date,
      Sales: d.totalSale,
      Expenses: d.totalExpense,
      'Net Balance': d.totalSale - d.totalExpense
    }))
    const wsDaily = XLSX.utils.json_to_sheet(dailyRows)
    XLSX.utils.book_append_sheet(wb, wsDaily, 'Daily Trend')

    // 3. Expense Breakdown
    const expenseRows = data.expenseBreakdown.map(e => ({
      Category: e.category,
      Amount: e.amount
    }))
    const wsExpense = XLSX.utils.json_to_sheet(expenseRows)
    XLSX.utils.book_append_sheet(wb, wsExpense, 'Expense Breakdown')

    XLSX.writeFile(wb, `Dashboard_Summary_${branchName ? branchName.replace(/\s+/g, '_') + '_' : ''}${year}_${month}.xlsx`)
  }

  return (
    <button className="btn btn-secondary btn-sm" onClick={exportDashboard}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ marginRight: 6 }}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Export Excel
    </button>
  )
}
