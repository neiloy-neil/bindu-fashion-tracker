import { NextRequest, NextResponse } from 'next/server'
import * as ExcelJS from 'exceljs'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(arrayBuffer)
    
    const worksheet = workbook.worksheets[0]
    if (!worksheet) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 })
    }

    const headers: string[] = []
    
    const firstRow = worksheet.getRow(1)
    if (firstRow) {
      firstRow.eachCell((cell, colNumber) => {
        headers.push(cell.text?.trim() || `Column ${colNumber}`)
      })
    }

    return NextResponse.json({ headers })
    
  } catch (error: any) {
    logger.error('parties.import_preview_failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
