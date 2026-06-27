import { formatCurrency, formatDate } from '@/lib/utils'

export const exportMonthlyReportAsPdf = async (branchData: any[], month: number, year: number, selectedBranchId: string, allBranches: any[]) => {
  if (!branchData || branchData.length === 0) return

  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF('landscape')
  const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' })

  const isConsolidated = selectedBranchId === 'all'
  const reportTitle = isConsolidated ? 'Consolidated Monthly Summary' : `Monthly Summary: ${branchData[0].branchName}`

  doc.setFont('times', 'bold')
  doc.setTextColor(42, 53, 110)
  doc.setFontSize(18)
  doc.text(`Bindu Premium - ${reportTitle}`, 14, 20)
  
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(12)
  doc.text(`Period: ${monthName} ${year}`, 14, 28)
  const currentY = 40

  const head = [['Branch Name', 'Total Income', 'Total Expenses', 'Transfers', 'Party Payments', 'Salary Advances', 'Net Cash Flow']]
  const body = branchData.map(b => [
    b.branchName,
    `Tk ${formatCurrency(b.totalIncome)}`,
    `Tk ${formatCurrency(b.totalExpense)}`,
    `Tk ${formatCurrency(b.totalTransfers)}`,
    `Tk ${formatCurrency(b.totalPayments)}`,
    `Tk ${formatCurrency(b.totalAdvances)}`,
    `Tk ${formatCurrency(b.netCashFlow)}`
  ])

  // If consolidated, add a totals row
  if (isConsolidated && branchData.length > 1) {
    const totals = branchData.reduce((acc, curr) => ({
      totalIncome: acc.totalIncome + curr.totalIncome,
      totalExpense: acc.totalExpense + curr.totalExpense,
      totalTransfers: acc.totalTransfers + curr.totalTransfers,
      totalPayments: acc.totalPayments + curr.totalPayments,
      totalAdvances: acc.totalAdvances + curr.totalAdvances,
      netCashFlow: acc.netCashFlow + curr.netCashFlow
    }), { totalIncome: 0, totalExpense: 0, totalTransfers: 0, totalPayments: 0, totalAdvances: 0, netCashFlow: 0 })

    body.push([
      'TOTALS',
      `Tk ${formatCurrency(totals.totalIncome)}`,
      `Tk ${formatCurrency(totals.totalExpense)}`,
      `Tk ${formatCurrency(totals.totalTransfers)}`,
      `Tk ${formatCurrency(totals.totalPayments)}`,
      `Tk ${formatCurrency(totals.totalAdvances)}`,
      `Tk ${formatCurrency(totals.netCashFlow)}`
    ])
  }

  autoTable(doc, {
    startY: currentY,
    head,
    body,
    theme: 'grid',
    headStyles: { fillColor: [42, 53, 110], textColor: 255 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      6: { fontStyle: 'bold', textColor: [42, 53, 110] }
    },
    didParseCell: function(data: any) {
      if (data.row.index === body.length - 1 && isConsolidated && branchData.length > 1) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [240, 240, 240]
      }
    }
  })

  const filename = isConsolidated ? `monthly-consolidated-${monthName}-${year}.pdf` : `monthly-${branchData[0].branchName.replace(/\s+/g, '_')}-${monthName}-${year}.pdf`
  doc.save(filename.toLowerCase())
}
