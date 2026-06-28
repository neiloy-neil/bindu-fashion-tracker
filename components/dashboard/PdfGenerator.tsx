import { SummaryStats } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export default function PdfGenerator({ data, month, year, branchName }: { data: SummaryStats, month: number, year: number, branchName?: string }) {
  const handleDownload = async () => {
    // Dynamic import to avoid SSR issues
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default

    const doc = new jsPDF()
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    // Header
    doc.setFont('times', 'bold')
    doc.setTextColor(42, 53, 110)
    doc.setFontSize(20)
    doc.text(`Bindu Premium - ${branchName ? branchName + ' Summary' : 'Monthly Summary'}`, 14, 22)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.text(`Period: ${MONTHS[month - 1]} ${year}`, 14, 30)

    // Summary Stats
    doc.setFontSize(14)
    doc.text('Overall Performance', 14, 45)
    
    autoTable(doc, {
      startY: 50,
      head: [['Total Sales', 'Total Expenses', 'Net Balance']],
      body: [[
        `Taka ${formatCurrency(data.totalSales)}`,
        `Taka ${formatCurrency(data.totalExpenses)}`,
        `Taka ${formatCurrency(data.netBalance)}`
      ]],
      theme: 'grid',
      headStyles: { fillColor: [42, 53, 110] }
    })

    // Branch Performance
    if (data.branchStats && data.branchStats.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 50
      doc.text('Branch Performance', 14, finalY + 15)
      
      const branchBody = data.branchStats.map(b => [
        b.branchName,
        `Taka ${formatCurrency(b.totalSale)}`,
        `Taka ${formatCurrency(b.totalExpense)}`,
        `Taka ${formatCurrency(b.netBalance)}`
      ])

      autoTable(doc, {
        startY: finalY + 20,
        head: [['Branch', 'Sales', 'Expenses', 'Net Balance']],
        body: branchBody,
        theme: 'striped',
        headStyles: { fillColor: [42, 53, 110] }
      })
    }

    doc.save(`Bindu_Summary_${branchName ? branchName.replace(/\s+/g, '_') + '_' : ''}${MONTHS[month - 1]}_${year}.pdf`)
  }

  return (
    <Button variant="outline" onClick={handleDownload} className="flex items-center gap-2">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Download Monthly Report
    </Button>
  )
}
