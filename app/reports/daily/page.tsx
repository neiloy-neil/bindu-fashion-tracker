'use client'

import { useState, useEffect, useRef } from 'react'
import { Branch } from '@/lib/types'
import { dhakaDateString } from '@/lib/new-entry'
import { toPng, toJpeg } from 'html-to-image'
import toast from 'react-hot-toast'
import { Download, Share2 } from 'lucide-react'
import DailyReportTemplate from '@/components/reports/DailyReportTemplate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function DailyReportPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [selectedDate, setSelectedDate] = useState(dhakaDateString())
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
        ? await toPng(el, { quality: 0.8, backgroundColor: 'var(--bg-card)', pixelRatio: 1 })
        : await toJpeg(el, { quality: 0.8, backgroundColor: 'var(--bg-card)', pixelRatio: 1 })
      
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
      const dataUrl = await toJpeg(el, { quality: 0.8, backgroundColor: 'var(--bg-card)', pixelRatio: 1 })
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
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Daily Report</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">View and export branch daily summaries</p>
        </div>
      </div>
      <div className="flex-1 p-6 space-y-6 min-h-0 flex flex-col overflow-auto">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Branch</Label>
              <Select
                value={selectedBranchId}
                onValueChange={setSelectedBranchId}
                disabled={branches.length === 1}
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder="Select Branch..." />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Date</Label>
              <Input
                type="date"
                className="h-9 w-full text-sm"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            <span className="text-sm text-[var(--text-muted)]">Loading…</span>
          </div>
        ) : hasSearched && !entryData ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--surface-raised)] flex items-center justify-center">
              <Download className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-muted)]">
              There is no daily entry recorded for this branch on the selected date.
            </p>
          </div>
        ) : entryData ? (
          <div>
            {/* Export Bar */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Button variant="outline" className="gap-2" onClick={exportAsPdf}>
                <Download size={16} /> Export PDF
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => exportAsImage('png')}>
                <Download size={16} /> Export PNG
              </Button>
              <Button 
                className="gap-2 border-none bg-green-600 font-semibold text-white shadow-md shadow-green-900/20 transition-all hover:bg-green-700" 
                onClick={shareToWhatsApp}
              >
                <Share2 size={16} /> Share to WhatsApp
              </Button>
            </div>

            {/* Rendered Report Area */}
            <div 
              ref={reportRef} 
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-[var(--text-primary)] shadow-xl"
            >
              <DailyReportTemplate entryData={entryData} />
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
