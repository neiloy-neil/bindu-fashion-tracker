import { NextResponse } from 'next/server'
import * as ExcelJS from 'exceljs'

export async function GET() {
  try {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Parties Demo')

    // Define columns
    worksheet.columns = [
      { header: 'name', key: 'name', width: 25 },
      { header: 'contactPerson', key: 'contactPerson', width: 20 },
      { header: 'contactNumber', key: 'contactNumber', width: 18 },
      { header: 'secondaryNumber', key: 'secondaryNumber', width: 18 },
      { header: 'email', key: 'email', width: 25 },
      { header: 'address', key: 'address', width: 35 },
      { header: 'balance', key: 'balance', width: 15 },
    ]

    // Style the header row
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    // Add a demo row
    worksheet.addRow({
      name: 'Example Company Ltd',
      contactPerson: 'John Doe',
      contactNumber: '01700000000',
      secondaryNumber: '01800000000',
      email: 'john@example.com',
      address: '123 Business Street, Dhaka',
      balance: 5000,
    })
    
    // Add a second demo row without optional fields
    worksheet.addRow({
      name: 'Basic Supplier',
      contactPerson: '',
      contactNumber: '01900000000',
      secondaryNumber: '',
      email: '',
      address: 'Dhaka',
      balance: 0,
    })

    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="party_import_demo.xlsx"',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
