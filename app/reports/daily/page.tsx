'use client'

import { useState, useEffect, useRef } from 'react'
import { Branch } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toPng, toJpeg } from 'html-to-image'
import toast from 'react-hot-toast'
import { Download } from 'lucide-react'
import DailyReportTemplate from '@/components/reports/DailyReportTemplate'

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
    el.style.background = 'var(--bg-card)' // match dark theme
    
    try {
      const dataUrl = type === 'png' 
        ? await toPng(el, { quality: 1, backgroundColor: 'var(--bg-card)', pixelRatio: 2 })
        : await toJpeg(el, { quality: 1, backgroundColor: 'var(--bg-card)', pixelRatio: 2 })
      
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
    const branchName = branches.find(b => b.id === parseInt(selectedBranchId))?.name || 'Branch'
    const { exportReportAsPdf } = await import('@/lib/exportPdf')
    await exportReportAsPdf(entryData, branchName, selectedDate)
  }

          
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
          <div className="flex justify-center p-8 text-[var(--text-secondary)]">Loading report...</div>
        ) : hasSearched && !entryData ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-white mb-2">No Entry Found</h3>
            <p className="text-[var(--text-secondary)]">There is no daily entry recorded for this branch on the selected date.</p>
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
              className="bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border)] shadow-xl text-white"
            >
              <DailyReportTemplate entryData={entryData} />
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
