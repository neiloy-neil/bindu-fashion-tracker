import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import * as ExcelJS from 'exceljs'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  const userId = req.headers.get('x-user-id')
  
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const mappingStr = formData.get('mapping') as string
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    let mappingConfig: Record<string, string> = {}
    if (mappingStr) {
      mappingConfig = JSON.parse(mappingStr)
    }

    const arrayBuffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(arrayBuffer)
    
    const worksheet = workbook.worksheets[0]
    if (!worksheet) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 })
    }

    const headers: Record<number, string> = {}
    const firstRow = worksheet.getRow(1)
    if (firstRow) {
      firstRow.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.text?.trim() || `Column ${colNumber}`
      })
    }

    const importedParties: any[] = []
    const errors: string[] = []
    
    let rowCount = 0
    let processed = 0
    let created = 0

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return // Skip header
      rowCount++

      const rowData: Record<string, any> = {}
      const customData: Record<string, any> = {}

      row.eachCell((cell, colNumber) => {
        const headerName = headers[colNumber]
        if (!headerName) return
        
        const mappedField = mappingConfig[headerName]
        const cellValue = cell.text?.trim()

        if (mappedField) {
          rowData[mappedField] = cellValue
        } else if (cellValue) {
          customData[headerName] = cellValue
        }
      })

      const name = rowData['name']
      const contactPerson = rowData['contactPerson']
      const contactNumber = rowData['contactNumber']
      const secondaryNumber = rowData['secondaryNumber']
      const email = rowData['email'] || null
      const address = rowData['address']
      const balanceStr = rowData['balance']
      
      const balance = balanceStr ? parseFloat(balanceStr) : 0

      if (!name) {
        errors.push(`Row ${rowNumber}: Name is required`)
        return
      }

      importedParties.push({
        rowNumber,
        name,
        contactPerson: contactPerson || name,
        contactNumber: contactNumber || '-',
        secondaryNumber: secondaryNumber || null,
        email,
        address: address || '-',
        balance: isNaN(balance) ? 0 : balance,
        customData: Object.keys(customData).length > 0 ? customData : undefined
      })
    })

    // Transaction to process valid entries
    const results = await prisma.$transaction(async (tx) => {
      const records = []
      
      for (const p of importedParties) {
        const existing = await tx.party.findUnique({ where: { name: p.name } })
        if (existing) {
          errors.push(`Row ${p.rowNumber}: Party '${p.name}' already exists`)
          continue
        }
        
        const newParty = await tx.party.create({
          data: {
            name: p.name,
            contactPerson: p.contactPerson,
            contactNumber: p.contactNumber,
            secondaryNumber: p.secondaryNumber,
            email: p.email,
            address: p.address,
            isActive: true,
            balance: p.balance
          }
        })
        
        if (p.balance > 0) {
          await tx.purchase.create({
            data: {
              partyId: newParty.id,
              date: new Date(),
              amount: p.balance,
              isOpeningDue: true,
              note: 'Opening Due from Excel Import',
            }
          })
        }
        
        records.push(newParty)
        processed++
        created++
      }
      return records
    })

    if (userId && created > 0) {
      await logAudit({
        userId: parseInt(userId),
        action: 'CREATE',
        entityType: 'Party_Batch',
        entityId: 0,
        newValues: { count: created },
        reason: 'Excel Import'
      })
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: rowCount,
        processed,
        created,
        errors
      }
    })
    
  } catch (error: any) {
    logger.error('parties.import_failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
