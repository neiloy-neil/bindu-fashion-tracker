import { exportMonthlyReportPdf } from '@/lib/report-pdf'

type ExportableMonthlyBranchRow = Parameters<typeof exportMonthlyReportPdf>[0][number]

export const exportMonthlyReportAsPdf = async (
  branchData: ExportableMonthlyBranchRow[],
  month: number,
  year: number,
  selectedBranchId: string,
  _allBranches: unknown[],
) => {
  void _allBranches
  if (!branchData || branchData.length === 0) return
  await exportMonthlyReportPdf(branchData, month, year, selectedBranchId)
}
