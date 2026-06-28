import { SummaryStats } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { exportSummaryReportPdf } from '@/lib/report-pdf'

export default function PdfGenerator({ data, month, year, branchName }: { data: SummaryStats, month: number, year: number, branchName?: string }) {
  const handleDownload = async () => {
    await exportSummaryReportPdf(data, month, year, branchName)
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
