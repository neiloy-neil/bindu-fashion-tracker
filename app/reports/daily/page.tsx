'use client'

import { useState, useEffect, useRef } from 'react'
import { Branch } from '@/lib/types'
import { toPng, toJpeg } from 'html-to-image'
import toast from 'react-hot-toast'
import { Download, Share2 } from 'lucide-react'
import DailyReportTemplate from '@/components/reports/DailyReportTemplate'
import { Button } from '@/components/ui/button'

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
    if (!selectedBranchId || !selectedDate) {
      return
    }

    let cancelled = false

    const fetchReport = async () => {
      setLoading(true)
      setHasSearched(true)
      try {
        const res = await fetch(`/api/reports/daily?branchId=${selectedBranchId}&date=${selectedDate}`)
        if (!res.ok) throw new Error('Failed to fetch report')
        const data = await res.json()
        if (!cancelled) {
          setEntryData(data)
        }
      } catch (error: unknown) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to fetch report')
          setEntryData(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchReport()

    return () => {
      cancelled = true
    }
  }, [selectedBranchId, selectedDate])

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

  const shareToWhatsApp = async () => {
    if (!reportRef.current) return
    const el = reportRef.current
    const oldBg = el.style.background
    el.style.background = 'var(--bg-card)'
    
    const toastId = toast.loading('Preparing image for WhatsApp...')
    
    try {
      const dataUrl = await toJpeg(el, { quality: 1, backgroundColor: 'var(--bg-card)', pixelRatio: 2 })
      const blob = await (await fetch(dataUrl)).blob()
      
      const branchName = branches.find(b => b.id === parseInt(selectedBranchId))?.name || 'Branch'
      const fileName = `DailyReport_${branchName.replace(/\s+/g, '_')}_${selectedDate}.jpeg`
      const file = new File([blob], fileName, { type: 'image/jpeg' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Daily Report - ${branchName}`,
          text: `Daily Report for ${selectedDate}`
        })
        toast.success('Shared successfully', { id: toastId })
      } else {
        // Fallback: download image
        const link = document.createElement('a')
        link.download = fileName
        link.href = dataUrl
        link.click()
        toast.success('Downloaded image (Sharing not supported on this device)', { id: toastId })
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Share failed', err)
        toast.error('Failed to share', { id: toastId })
      } else {
        toast.dismiss(toastId)
      }
    } finally {
      el.style.background = oldBg
    }
  }

          
  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Daily Report</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">View and export branch daily summaries</p>
        </div>
      </div>
      <div className="flex-1 p-6 space-y-6 min-h-0 flex flex-col overflow-auto">
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="form-label">Branch</label>
              <select
                className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
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
                className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
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
              <Button variant="outline" className="flex items-center gap-2" onClick={exportAsPdf}>
                <Download size={16} /> Export PDF
              </Button>
              <Button variant="outline" className="flex items-center gap-2" onClick={() => exportAsImage('png')}>
                <Download size={16} /> Export PNG
              </Button>
              <Button 
                className="text-white bg-green-600 hover:bg-green-700 border-none flex items-center gap-2 font-semibold shadow-md shadow-green-900/20 transition-all" 
                onClick={shareToWhatsApp}
              >
                <Share2 size={16} /> Share to WhatsApp
              </Button>
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
