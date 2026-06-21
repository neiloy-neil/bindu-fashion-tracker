import { formatCurrency, formatDate } from '@/lib/utils'

export const exportReportAsPdf = async (entryData: any, branchName: string, selectedDate: string) => {
  if (!entryData) return

  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.text(`Bindu Fashion - Daily Report`, 14, 20)
  doc.setFontSize(12)
  doc.text(`Branch: ${branchName}`, 14, 28)
  doc.text(`Date: ${formatDate(selectedDate)}`, 14, 34)

  let currentY = 45

  const addSection = (title: string, head: string[], body: any[][]) => {
    if (body.length === 0) return
    doc.setFontSize(14)
    doc.text(title, 14, currentY)
    autoTable(doc, {
      startY: currentY + 5,
      head: [head],
      body,
      theme: 'grid',
      headStyles: { fillColor: [30, 45, 69] }
    })
    currentY = (doc as any).lastAutoTable.finalY + 15
  }

  // Income
  const incomeItems = entryData.items || []
  addSection('Income', ['Category', 'Note', 'Amount'], incomeItems.map((i: any) => [
    i.category?.name || 'Item',
    i.note || '-',
    `Tk ${formatCurrency(i.amount)}`
  ]))

  // Expenses
  const expenseItems = entryData.expenseEntries || []
  addSection('Expenses', ['Category', 'Note', 'Amount'], expenseItems.map((e: any) => [
    e.category?.name || 'Item',
    e.note || '-',
    `Tk ${formatCurrency(e.amount)}`
  ]))

  // Transfers
  const transfers = entryData.transfers || []
  addSection('Transfers', ['Account', 'Note', 'Amount'], transfers.map((t: any) => [
    t.account?.name || 'Account',
    t.note || '-',
    `Tk ${formatCurrency(t.amount)}`
  ]))

  // Payments
  const payments = entryData.payments || []
  addSection('Party Payments', ['Party', 'Method', 'Status', 'Amount'], payments.map((p: any) => [
    p.party?.name || 'Party',
    p.method,
    p.method === 'CHEQUE' ? p.cheque?.status : 'CLEARED',
    `Tk ${formatCurrency(p.amount)}`
  ]))

  // Advance Salary
  const advances = entryData.advanceSalaries || []
  addSection('Advance Salary', ['Employee', 'Type', 'Description/Amount'], advances.map((a: any) => [
    a.employee?.name || 'Employee',
    a.type,
    a.type === 'CASH' ? `Tk ${formatCurrency(a.amount)}` : a.productDescription
  ]))

  // Opening & Closing Time
  if (entryData.openingTime || entryData.closingTime) {
    doc.setFontSize(14)
    doc.text('Store Timing', 14, currentY)
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Opening Time', 'Closing Time']],
      body: [[entryData.openingTime || '-', entryData.closingTime || '-']],
      theme: 'grid',
      headStyles: { fillColor: [30, 45, 69] }
    })
  }

  doc.save(`daily-report-${branchName.replace(/\s+/g, '_')}-${selectedDate}.pdf`)
}
