import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

type WorkbookCellValue = string | number | boolean | null | undefined

type WorkbookColumn = {
  header: string
  key: string
  width?: number
}

type WorkbookSheet = {
  name: string
  columns: WorkbookColumn[]
  rows: Array<Record<string, WorkbookCellValue>>
}

const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export async function downloadWorkbook(filename: string, sheets: WorkbookSheet[]) {
  const workbook = new ExcelJS.Workbook()

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name)
    worksheet.columns = sheet.columns
    worksheet.views = [{ state: 'frozen', ySplit: 1 }]
    worksheet.addRows(sheet.rows)
    worksheet.getRow(1).font = { bold: true }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer], { type: XLSX_MIME_TYPE }), filename)
}
