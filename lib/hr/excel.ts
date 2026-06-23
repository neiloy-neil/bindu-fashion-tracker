import ExcelJS from 'exceljs'
import type { CellValue } from 'exceljs'
import type { Employee, Branch, SalaryRecord } from '@prisma/client'
import { downloadWorkbook } from '@/lib/excel-export'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const XLSX_EXTENSION = '.xlsx'
const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024
const MAX_EMPLOYEE_IMPORT_ROWS = 1000
const MAX_SALARY_IMPORT_ROWS = 2000

const EMPLOYEE_COLUMNS = [
  { header: 'Employee ID', key: 'employeeId', width: 14 },
  { header: 'Name', key: 'name', width: 24 },
  { header: 'Branch', key: 'branch', width: 22 },
  { header: 'Designation', key: 'designation', width: 18 },
  { header: 'Basic Salary', key: 'basicSalary', width: 14 },
  { header: 'Conveyance', key: 'conveyance', width: 14 },
  { header: 'Yearly Leave', key: 'yearlyLeaveAllowance', width: 14 },
] as const

const SALARY_COLUMNS = [
  { header: 'Employee ID', key: 'employeeId', width: 14 },
  { header: 'Name', key: 'name', width: 24 },
  { header: 'Branch', key: 'branch', width: 22 },
  { header: 'Basic Salary', key: 'basicSalary', width: 14 },
  { header: 'Advance (৳)', key: 'hrAdvanceDeducted', width: 14 },
  { header: 'Leave (days)', key: 'leaveDaysTaken', width: 14 },
  { header: 'Leave Adjustment (±days)', key: 'leaveAdjustment', width: 20 },
  { header: 'Late (days)', key: 'lateDays', width: 12 },
  { header: 'OT (days)', key: 'otDays', width: 12 },
  { header: 'Conveyance (৳)', key: 'conveyance', width: 16 },
  { header: 'Attendance Bonus (৳)', key: 'attendanceBonus', width: 20 },
  { header: 'Notes', key: 'notes', width: 30 },
] as const

export type EmployeeSheetRow = {
  employeeId: string
  name: string
  branch: string
  designation: string
  basicSalary: number
  conveyance: number
  yearlyLeaveAllowance: number
  mobileNumber?: string
  dateOfBirth?: string
  joiningDate?: string
  address?: string
  emergencyContact?: string
  bloodGroup?: string
  nidNumber?: string
  oldIdCard?: string
  photoUrl?: string
}

export type SheetRow = {
  employeeId: string
  name: string
  branch: string
  basicSalary: number
  hrAdvanceDeducted: number
  leaveDaysTaken: number
  leaveAdjustment: number
  lateDays: number
  otDays: number
  conveyance: number
  attendanceBonus: number
  notes: string
}

type NormalizedSheetRow = Record<string, string>

function cellToString(value: CellValue | undefined | null): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim()
  }
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text.trim()
    if ('result' in value && value.result != null) return String(value.result).trim()
    if ('hyperlink' in value && typeof value.hyperlink === 'string') return value.hyperlink.trim()
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('').trim()
    }
  }
  return String(value).trim()
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase()
}

function validateImportFile(file: File) {
  const errors: string[] = []
  const fileName = file.name.toLowerCase()

  if (!fileName.endsWith(XLSX_EXTENSION)) {
    errors.push('Only .xlsx files are supported.')
  }

  if (file.size > MAX_IMPORT_FILE_BYTES) {
    errors.push(`File is too large. Maximum supported size is ${Math.round(MAX_IMPORT_FILE_BYTES / 1024 / 1024)} MB.`)
  }

  return errors
}

async function readNormalizedWorksheet(file: File, maxRows: number) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    return {
      rows: [] as NormalizedSheetRow[],
      headers: [] as string[],
      errors: ['Sheet data is empty or unreadable.'],
    }
  }

  const headerRow = worksheet.getRow(1)
  const headers = Array.from({ length: headerRow.cellCount }, (_, index) =>
    cellToString(headerRow.getCell(index + 1).value)
  ).filter(Boolean)

  if (headers.length === 0) {
    return {
      rows: [] as NormalizedSheetRow[],
      headers: [] as string[],
      errors: ['The sheet appears to be empty. Make sure data starts from row 1 with headers.'],
    }
  }

  const normalizedRows: NormalizedSheetRow[] = []
  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
    const row = worksheet.getRow(rowIndex)
    const normalized: NormalizedSheetRow = {}
    let hasData = false

    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      const header = headers[colIndex]
      const value = cellToString(row.getCell(colIndex + 1).value)
      if (value !== '') {
        hasData = true
      }
      normalized[normalizeHeader(header)] = value
    }

    if (hasData) {
      normalizedRows.push(normalized)
    }
  }

  if (normalizedRows.length > maxRows) {
    return {
      rows: [] as NormalizedSheetRow[],
      headers,
      errors: [`Too many rows detected. Maximum supported row count is ${maxRows}.`],
    }
  }

  return {
    rows: normalizedRows,
    headers,
    errors: [] as string[],
  }
}

function toNumber(value: string) {
  return Number(value) || 0
}

export async function downloadEmployeeTemplate(employees?: Employee[], branches?: Branch[]) {
  const branchMap = new Map((branches ?? []).map((branch) => [branch.id, branch.name]))
  const rows = (employees ?? []).map((employee) => ({
    employeeId: employee.employeeId,
    name: employee.name,
    branch: employee.branchId ? branchMap.get(employee.branchId) ?? '' : '',
    designation: employee.designation,
    basicSalary: employee.basicSalary,
    conveyance: employee.conveyance,
    yearlyLeaveAllowance: employee.yearlyLeaveAllowance,
  }))

  if (rows.length === 0) {
    rows.push({
      employeeId: 'EMP-001',
      name: 'Sample Employee',
      branch: 'Main Branch',
      designation: 'Manager',
      basicSalary: 15000,
      conveyance: 1500,
      yearlyLeaveAllowance: 12,
    })
  }

  await downloadWorkbook('Bindu_Employees.xlsx', [
    {
      name: 'Employees',
      columns: [...EMPLOYEE_COLUMNS],
      rows,
    },
  ])
}

export async function parseEmployeeSheet(
  file: File,
): Promise<{ rows: EmployeeSheetRow[]; errors: string[] }> {
  const fileErrors = validateImportFile(file)
  if (fileErrors.length > 0) {
    return { rows: [], errors: fileErrors }
  }

  try {
    const worksheet = await readNormalizedWorksheet(file, MAX_EMPLOYEE_IMPORT_ROWS)
    if (worksheet.errors.length > 0) {
      return { rows: [], errors: worksheet.errors }
    }

    const rows: EmployeeSheetRow[] = []
    for (const row of worksheet.rows) {
      const employeeId = String(
        row['employee id'] ?? row['employee_id'] ?? row['id'] ??
        row['emp id'] ?? row['emp_id'] ?? row['staff id'] ?? ''
      ).trim()
      const name = String(
        row['name'] ?? row['employee name'] ?? row['full name'] ?? row['staff name'] ?? ''
      ).trim()

      if (!employeeId && !name) {
        continue
      }

      const nidRaw = String(
        row['national id'] ?? row['nid'] ?? row['nid number'] ?? row['national id number (nid number)'] ?? ''
      ).trim()

      rows.push({
        employeeId,
        name,
        branch: String(row['branch'] ?? row['branch name'] ?? row['location'] ?? row['office'] ?? '').trim(),
        designation: String(row['designation'] ?? row['role'] ?? row['position'] ?? row['title'] ?? row['job title'] ?? '').trim(),
        basicSalary: toNumber(String(row['basic salary'] ?? row['basic_salary'] ?? row['basic'] ?? row['salary'] ?? '0')),
        conveyance: toNumber(String(row['conveyance'] ?? row['conveyance (৳)'] ?? row['conv'] ?? row['transport'] ?? '0')),
        yearlyLeaveAllowance: toNumber(
          String(row['yearly leave'] ?? row['yearly_leave'] ?? row['leave'] ?? row['leave allowance'] ?? row['annual leave'] ?? '0')
        ),
        mobileNumber: String(row['mobile'] ?? row['mobile number'] ?? row['phone'] ?? row['contact'] ?? '').trim() || undefined,
        dateOfBirth: String(row['date of birth'] ?? row['dob'] ?? row['birth date'] ?? '').trim() || undefined,
        joiningDate: String(row['joining date'] ?? row['join date'] ?? row['date of joining'] ?? '').trim() || undefined,
        address: String(row['address'] ?? '').trim() || undefined,
        emergencyContact: String(row['emergency contact'] ?? row['emergency contact (family)'] ?? row['emergency'] ?? '').trim() || undefined,
        bloodGroup: String(row['blood group'] ?? row['blood'] ?? '').trim() || undefined,
        nidNumber: ['nai', 'na', 'n/a', ''].includes(nidRaw.toLowerCase()) ? undefined : nidRaw,
        oldIdCard: String(row['old id'] ?? row['old id card'] ?? row['office id card number'] ?? '').trim() || undefined,
        photoUrl: String(row['photo'] ?? row['photo url'] ?? row['passport size photo'] ?? '').trim() || undefined,
      })
    }

    if (rows.length === 0) {
      return {
        rows: [],
        errors: [
          `No valid rows found. Detected headers: ${worksheet.headers.join(', ')}. Make sure Employee ID or Name columns exist.`,
        ],
      }
    }

    return { rows, errors: [] }
  } catch (error) {
    return {
      rows: [],
      errors: [`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`],
    }
  }
}

export async function downloadTemplate(
  employees: Employee[],
  month: number,
  year: number,
  existingRecords?: SalaryRecord[],
) {
  const recordMap = new Map((existingRecords ?? []).map((record) => [record.employeeId, record]))
  const rows = employees.map((employee) => {
    const record = recordMap.get(employee.id)
    const branchName = (employee as Employee & { branch?: Branch }).branch?.name ?? ''

    return {
      employeeId: employee.employeeId,
      name: employee.name,
      branch: branchName,
      basicSalary: employee.basicSalary,
      hrAdvanceDeducted: (record?.hrAdvanceDeducted ?? 0) + (record?.trackerAdvanceTotal ?? 0),
      leaveDaysTaken: record?.leaveDaysTaken ?? 0,
      leaveAdjustment: record?.leaveAdjustment ?? 0,
      lateDays: record?.lateDays ?? 0,
      otDays: record?.otDays ?? 0,
      conveyance: record?.conveyanceOverride ?? employee.conveyance,
      attendanceBonus: record?.attendanceBonus ?? 0,
      notes: record?.notes ?? '',
    }
  })

  await downloadWorkbook(`Bindu_Salary_${MONTHS[month - 1]}_${year}.xlsx`, [
    {
      name: `${MONTHS[month - 1]} ${year}`,
      columns: [...SALARY_COLUMNS],
      rows,
    },
  ])
}

export async function parseSalarySheet(
  file: File,
): Promise<{ rows: SheetRow[]; errors: string[] }> {
  const fileErrors = validateImportFile(file)
  if (fileErrors.length > 0) {
    return { rows: [], errors: fileErrors }
  }

  try {
    const worksheet = await readNormalizedWorksheet(file, MAX_SALARY_IMPORT_ROWS)
    if (worksheet.errors.length > 0) {
      return { rows: [], errors: worksheet.errors }
    }

    const rows: SheetRow[] = []
    for (const row of worksheet.rows) {
      const employeeId = String(
        row['employee id'] ?? row['employee_id'] ?? row['id'] ?? row['emp id'] ?? row['emp_id'] ?? ''
      ).trim()
      const name = String(
        row['name'] ?? row['employee name'] ?? row['full name'] ?? ''
      ).trim()

      if (!employeeId && !name) {
        continue
      }

      rows.push({
        employeeId,
        name,
        branch: String(row['branch'] ?? row['branch name'] ?? '').trim(),
        basicSalary: toNumber(String(row['basic salary'] ?? row['basic_salary'] ?? row['basic'] ?? '0')),
        hrAdvanceDeducted: toNumber(
          String(row['advance (৳)'] ?? row['advance'] ?? row['advance deducted'] ?? row['total advance'] ?? '0')
        ),
        leaveDaysTaken: toNumber(
          String(row['leave (days)'] ?? row['leave'] ?? row['leave days'] ?? row['total leave'] ?? '0')
        ),
        leaveAdjustment: toNumber(String(row['leave adjustment (±days)'] ?? row['leave adjustment'] ?? row['leave adj'] ?? '0')),
        lateDays: toNumber(String(row['late (days)'] ?? row['late'] ?? row['late days'] ?? row['total late'] ?? '0')),
        otDays: toNumber(String(row['ot (days)'] ?? row['ot'] ?? row['ot days'] ?? row['total ot'] ?? '0')),
        conveyance: toNumber(String(row['conveyance (৳)'] ?? row['conveyance'] ?? row['conv'] ?? '0')),
        attendanceBonus: toNumber(
          String(row['attendance bonus (৳)'] ?? row['attendance bonus'] ?? row['att bonus'] ?? '0')
        ),
        notes: String(row['notes'] ?? row['note'] ?? row['remarks'] ?? '').trim(),
      })
    }

    if (rows.length === 0) {
      return {
        rows: [],
        errors: [
          `No valid rows found. Detected headers: ${worksheet.headers.join(', ')}. Make sure Employee ID or Name columns exist.`,
        ],
      }
    }

    return { rows, errors: [] }
  } catch (error) {
    return {
      rows: [],
      errors: [`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`],
    }
  }
}
