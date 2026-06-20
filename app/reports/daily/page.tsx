'use client'

import { useState, useEffect, useRef } from 'react'
import { Branch } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toPng, toJpeg } from 'html-to-image'
import toast from 'react-hot-toast'
import { Download } from 'lucide-react'

export default function DailyReportPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [entryData, setEntryData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/branches')
      .then(r => r.json())
      .then(data => {
        setBranches(data)
        if (data.length === 1) {
          setSelectedBranchId(String(data[0].id))
        }
      })
  }, [])

  useEffect(() => {
    if (selectedBranchId && selectedDate) {
      fetchReport()
    }
  }, [selectedBranchId, selectedDate])

  const fetchReport = async () => {
    setLoading(true)
    setHasSearched(true)
    try {
      const res = await fetch(`/api/reports/daily?branchId=${selectedBranchId}&date=${selectedDate}`)
      if (!res.ok) throw new Error('Failed to fetch report')
      const data = await res.json()
      setEntryData(data)
    } catch (e: any) {
      toast.error(e.message)
      setEntryData(null)
    } finally {
      setLoading(false)
    }
  }

  const exportAsImage = async (type: 'png' | 'jpeg') => {
    if (!reportRef.current) return
    const el = reportRef.current
    
    // add some padding or white background if needed
    const oldBg = el.style.background
    el.style.background = '#0f172a' // match dark theme
    
    try {
      const dataUrl = type === 'png' 
        ? await toPng(el, { quality: 1, backgroundColor: '#0f172a', pixelRatio: 2 })
        : await toJpeg(el, { quality: 1, backgroundColor: '#0f172a', pixelRatio: 2 })
      
      const link = document.createElement('a')
      const branchName = branches.find(b => b.id === parseInt(selectedBranchId))?.name || 'Branch'
      link.download = `DailyReport_${branchName.replace(/\s+/g, '_')}_${selectedDate}.${type}`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Export failed', err)
      toast.error('Failed to export image')
    } finally {
      el.style.background = oldBg
    }
  }

  const exportAsPdf = async () => {
    if (!entryData) return
    
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default

    const doc = new jsPDF()
    const branchName = branches.find(b => b.id === parseInt(selectedBranchId))?.name || 'Branch'

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

    doc.save(`DailyReport_${branchName.replace(/\s+/g, '_')}_${selectedDate}.pdf`)
  }

  const incomeItems = entryData?.items?.filter((i: any) => i.amount > 0) || []
  const expenseEntries = entryData?.expenseEntries || []
  const transfers = entryData?.transfers || []
  const payments = entryData?.payments || []
  const advanceSalaries = entryData?.advanceSalaries || []

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Daily Report</h2>
          <p className="page-subtitle">View and export branch daily summaries</p>
        </div>
      </div>

      <div className="page-body">
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="form-label">Branch</label>
              <select
                className="form-input form-select"
                value={selectedBranchId}
                onChange={e => setSelectedBranchId(e.target.value)}
                disabled={branches.length === 1}
              >
                <option value="">Select Branch...</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-input"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-8 text-[#8899aa]">Loading report...</div>
        ) : hasSearched && !entryData ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-white mb-2">No Entry Found</h3>
            <p className="text-[#8899aa]">There is no daily entry recorded for this branch on the selected date.</p>
          </div>
        ) : entryData ? (
          <div>
            {/* Export Bar */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button className="btn btn-secondary flex items-center gap-2" onClick={exportAsPdf}>
                <Download size={16} /> Export PDF
              </button>
              <button className="btn btn-secondary flex items-center gap-2" onClick={() => exportAsImage('png')}>
                <Download size={16} /> Export PNG
              </button>
              <button className="btn btn-secondary flex items-center gap-2" onClick={() => exportAsImage('jpeg')}>
                <Download size={16} /> Export JPEG
              </button>
            </div>

            {/* Rendered Report Area */}
            <div 
              ref={reportRef} 
              className="bg-[#0f172a] p-8 rounded-xl border border-[#1e2d45] shadow-xl text-white"
            >
              <div className="text-center mb-8 border-b border-[#1e2d45] pb-6">
                <h1 className="text-2xl font-bold text-white mb-2">Bindu Fashion - Daily Report</h1>
                <div className="flex justify-center gap-8 text-[#8899aa]">
                  <span>Branch: <strong className="text-white">{entryData.branch?.name}</strong></span>
                  <span>Date: <strong className="text-white">{formatDate(entryData.date)}</strong></span>
                </div>
              </div>

              {/* Store Timings */}
              <div className="mb-8">
                <h3 className="text-[#3b82f6] font-semibold uppercase tracking-wider text-sm mb-4 border-b border-[#1e2d45] pb-2">Store Timing</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#162033] p-4 rounded-lg">
                    <div className="text-[#8899aa] text-xs uppercase mb-1">Opening Time</div>
                    <div className="font-bold text-lg">{entryData.openingTime || 'N/A'}</div>
                  </div>
                  <div className="bg-[#162033] p-4 rounded-lg">
                    <div className="text-[#8899aa] text-xs uppercase mb-1">Closing Time</div>
                    <div className="font-bold text-lg">{entryData.closingTime || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Income Section */}
              <div className="mb-8">
                <h3 className="text-[#34d399] font-semibold uppercase tracking-wider text-sm mb-4 border-b border-[#1e2d45] pb-2">Income</h3>
                {incomeItems.length > 0 ? (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-[#8899aa] uppercase bg-[#162033] border-b border-[#1e2d45]">
                      <tr>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Note</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomeItems.map((item: any, i: number) => (
                        <tr key={i} className="border-b border-[#1e2d45] last:border-0 bg-[#0a0f1e]">
                          <td className="px-4 py-3 font-medium text-white">{item.category?.name || '-'}</td>
                          <td className="px-4 py-3 text-[#8899aa]">{item.note || '-'}</td>
                          <td className="px-4 py-3 text-right font-bold text-[#34d399]">৳{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-[#8899aa] italic text-sm py-2">No income items recorded.</div>
                )}
              </div>

              {/* Expenses Section */}
              <div className="mb-8">
                <h3 className="text-[#f87171] font-semibold uppercase tracking-wider text-sm mb-4 border-b border-[#1e2d45] pb-2">Expenses</h3>
                {expenseEntries.length > 0 ? (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-[#8899aa] uppercase bg-[#162033] border-b border-[#1e2d45]">
                      <tr>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Note</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseEntries.map((item: any, i: number) => (
                        <tr key={i} className="border-b border-[#1e2d45] last:border-0 bg-[#0a0f1e]">
                          <td className="px-4 py-3 font-medium text-white">{item.category?.name || '-'}</td>
                          <td className="px-4 py-3 text-[#8899aa]">{item.note || '-'}</td>
                          <td className="px-4 py-3 text-right font-bold text-[#f87171]">৳{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-[#8899aa] italic text-sm py-2">No expenses recorded.</div>
                )}
              </div>

              {/* Transfers Section */}
              <div className="mb-8">
                <h3 className="text-[#a78bfa] font-semibold uppercase tracking-wider text-sm mb-4 border-b border-[#1e2d45] pb-2">Transfers</h3>
                {transfers.length > 0 ? (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-[#8899aa] uppercase bg-[#162033] border-b border-[#1e2d45]">
                      <tr>
                        <th className="px-4 py-3">Account</th>
                        <th className="px-4 py-3">Note</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfers.map((item: any, i: number) => (
                        <tr key={i} className="border-b border-[#1e2d45] last:border-0 bg-[#0a0f1e]">
                          <td className="px-4 py-3 font-medium text-white">{item.account?.name || '-'}</td>
                          <td className="px-4 py-3 text-[#8899aa]">{item.note || '-'}</td>
                          <td className="px-4 py-3 text-right font-bold text-[#a78bfa]">৳{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-[#8899aa] italic text-sm py-2">No transfers recorded.</div>
                )}
              </div>

              {/* Payments Section */}
              <div className="mb-8">
                <h3 className="text-[#fb923c] font-semibold uppercase tracking-wider text-sm mb-4 border-b border-[#1e2d45] pb-2">Party Payments</h3>
                {payments.length > 0 ? (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-[#8899aa] uppercase bg-[#162033] border-b border-[#1e2d45]">
                      <tr>
                        <th className="px-4 py-3">Party</th>
                        <th className="px-4 py-3">Method</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Note</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((item: any, i: number) => (
                        <tr key={i} className="border-b border-[#1e2d45] last:border-0 bg-[#0a0f1e]">
                          <td className="px-4 py-3 font-medium text-white">{item.party?.name || '-'}</td>
                          <td className="px-4 py-3 text-[#8899aa]">{item.method}</td>
                          <td className="px-4 py-3">
                            {item.method === 'CHEQUE' 
                              ? <span className={`px-2 py-1 rounded text-xs font-bold ${item.cheque?.status === 'APPROVED' ? 'bg-[#10b981]/20 text-[#10b981]' : item.cheque?.status === 'REJECTED' ? 'bg-[#ef4444]/20 text-[#ef4444]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'}`}>{item.cheque?.status}</span>
                              : <span className="px-2 py-1 rounded text-xs font-bold bg-[#10b981]/20 text-[#10b981]">CLEARED</span>
                            }
                          </td>
                          <td className="px-4 py-3 text-[#8899aa]">{item.note || '-'}</td>
                          <td className="px-4 py-3 text-right font-bold text-[#fb923c]">৳{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-[#8899aa] italic text-sm py-2">No party payments recorded.</div>
                )}
              </div>

              {/* Advance Salary Section */}
              <div className="mb-4">
                <h3 className="text-[#38bdf8] font-semibold uppercase tracking-wider text-sm mb-4 border-b border-[#1e2d45] pb-2">Advance Salary</h3>
                {advanceSalaries.length > 0 ? (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-[#8899aa] uppercase bg-[#162033] border-b border-[#1e2d45]">
                      <tr>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Note</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {advanceSalaries.map((item: any, i: number) => (
                        <tr key={i} className="border-b border-[#1e2d45] last:border-0 bg-[#0a0f1e]">
                          <td className="px-4 py-3 font-medium text-white">{item.employee?.name || '-'}</td>
                          <td className="px-4 py-3 text-[#8899aa]">{item.type}</td>
                          <td className="px-4 py-3 text-white">{item.type === 'PRODUCT' ? item.productDescription : '-'}</td>
                          <td className="px-4 py-3 text-[#8899aa]">{item.note || '-'}</td>
                          <td className="px-4 py-3 text-right font-bold text-[#38bdf8]">{item.type === 'CASH' ? `৳${formatCurrency(item.amount)}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-[#8899aa] italic text-sm py-2">No advance salary recorded.</div>
                )}
              </div>

            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
