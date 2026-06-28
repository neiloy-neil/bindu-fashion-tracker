import { exportDailyReportPdf } from '@/lib/report-pdf'

type ExportableEntryData = Parameters<typeof exportDailyReportPdf>[0]

export const exportReportAsPdf = async (entryData: ExportableEntryData, branchName: string, selectedDate: string) => {
  if (!entryData) return
  await exportDailyReportPdf(entryData, branchName, selectedDate)
}
