import { NextRequest, NextResponse } from 'next/server'
import * as ExcelJS from 'exceljs'
import { logger } from '@/lib/logger'
import { getReqPerms, FORBIDDEN } from '@/lib/server-auth'

export async function POST(req: NextRequest) {
  const auth = await getReqPerms(req)
  if (!auth || !auth.perms['admin.import']) return FORBIDDEN()

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
