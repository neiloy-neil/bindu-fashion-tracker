import * as XLSX from 'xlsx'
import type { Employee, Branch, SalaryRecord } from '@prisma/client'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// ─── Employee Import ────────────────────────────────────────────────────────

const EMPLOYEE_HEADERS = [
  'Employee ID',
  'Name',
  'Branch',
  'Designation',
  'Basic Salary',
  'Conveyance',
  'Yearly Leave',
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

export function downloadEmployeeTemplate(employees?: Employee[], branches?: Branch[]) {
  const branchMap = new Map((branches ?? []).map(b => [b.id, b.name]))
  const data = (employees ?? []).map(emp => ({
    'Employee ID': emp.employeeId,
    'Name': emp.name,
    'Branch': emp.branchId ? branchMap.get(emp.branchId) ?? '' : '',
    'Designation': emp.designation,
    'Basic Salary': emp.basicSalary,
    'Conveyance': emp.conveyance,
    'Yearly Leave': emp.yearlyLeaveAllowance,
  }))

  if (data.length === 0) {
    data.push({
      'Employee ID': 'EMP-001',
      'Name': 'Sample Employee',
      'Branch': 'Main Branch',
      'Designation': 'Manager',
      'Basic Salary': 15000,
      'Conveyance': 1500,
      'Yearly Leave': 12,
    })
  }

  const ws = XLSX.utils.json_to_sheet(data, { header: [...EMPLOYEE_HEADERS] })
  ws['!cols'] = [
    { wch: 14 }, { wch: 24 }, { wch: 22 }, { wch: 18 },
    { wch: 14 }, { wch: 14 }, { wch: 14 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Employees')
  XLSX.writeFile(wb, 'Bindu_Employees.xlsx')
}

export function parseEmployeeSheet(
  file: File,
): Promise<{ rows: EmployeeSheetRow[]; errors: string[] }> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const rows: EmployeeSheetRow[] = []
      const errors: string[] = []

      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })

        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          resolve({ rows: [], errors: ['No sheets found. Make sure it is a valid .xlsx, .xls, or .csv file.'] })
          return
        }

        const ws = wb.Sheets[wb.SheetNames[0]]
        if (!ws) {
          resolve({ rows: [], errors: ['Sheet data is empty or unreadable.'] })
          return
        }

        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false })

        if (!json || json.length === 0) {
          resolve({ rows: [], errors: ['The sheet appears to be empty. Make sure data starts from row 1 with headers.'] })
          return
        }

        const firstRowKeys = Object.keys(json[0])
        console.log('[parseEmployeeSheet] Detected headers:', firstRowKeys)

        json.forEach((row, idx) => {
          const n: Record<string, unknown> = {}
          for (const key of Object.keys(row)) {
            n[key.trim().toLowerCase()] = row[key]
          }

          const empId = String(
            n['employee id'] ?? n['employee_id'] ?? n['id'] ??
            n['emp id'] ?? n['emp_id'] ?? n['staff id'] ?? ''
          ).trim()
          const name = String(
            n['name'] ?? n['employee name'] ?? n['full name'] ?? n['staff name'] ?? ''
          ).trim()

          if (!empId && !name) return 

          const nidRaw = String(n['national id'] ?? n['nid'] ?? n['nid number'] ?? n['national id number (nid number)'] ?? '').trim()
          const nidVal = ['nai', 'na', 'n/a', ''].includes(nidRaw.toLowerCase()) ? undefined : nidRaw

          rows.push({
            employeeId: empId,
            name,
            branch: String(
              n['branch'] ?? n['branch name'] ?? n['location'] ?? n['office'] ?? ''
            ).trim(),
            designation: String(
              n['designation'] ?? n['role'] ?? n['position'] ?? n['title'] ?? n['job title'] ?? ''
            ).trim(),
            basicSalary: Number(
              n['basic salary'] ?? n['basic_salary'] ?? n['basic'] ?? n['salary'] ?? 0
            ) || 0,
            conveyance: Number(
              n['conveyance'] ?? n['conveyance (৳)'] ?? n['conv'] ?? n['transport'] ?? 0
            ) || 0,
            yearlyLeaveAllowance: Number(
              n['yearly leave'] ?? n['yearly_leave'] ?? n['leave'] ??
              n['leave allowance'] ?? n['annual leave'] ?? 0
            ) || 0,
            mobileNumber: String(n['mobile'] ?? n['mobile number'] ?? n['phone'] ?? n['contact'] ?? '').trim() || undefined,
            dateOfBirth: String(n['date of birth'] ?? n['dob'] ?? n['birth date'] ?? '').trim() || undefined,
            joiningDate: String(n['joining date'] ?? n['join date'] ?? n['date of joining'] ?? '').trim() || undefined,
            address: String(n['address'] ?? '').trim() || undefined,
            emergencyContact: String(n['emergency contact'] ?? n['emergency contact (family)'] ?? n['emergency'] ?? '').trim() || undefined,
            bloodGroup: String(n['blood group'] ?? n['blood'] ?? '').trim() || undefined,
            nidNumber: nidVal,
            oldIdCard: String(n['old id'] ?? n['old id card'] ?? n['office id card number'] ?? '').trim() || undefined,
            photoUrl: String(n['photo'] ?? n['photo url'] ?? n['passport size photo'] ?? '').trim() || undefined,
          })
        })

        if (rows.length === 0) {
          errors.push(`No valid rows found. Detected headers: ${firstRowKeys.join(', ')}. Make sure Employee ID or Name columns exist.`)
        }
      } catch (err) {
        errors.push(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }

      resolve({ rows, errors })
    }
    reader.readAsArrayBuffer(file)
  })
}

const HEADERS = [
  'Employee ID',
  'Name',
  'Branch',
  'Basic Salary',
  'Advance (৳)',
  'Leave (days)',
  'Leave Adjustment (±days)',
  'Late (days)',
  'OT (days)',
  'Conveyance (৳)',
  'Attendance Bonus (৳)',
  'Notes',
] as const

export type SheetRow = {
  employeeId: string
  name: string
  branch: string
  basicSalary: number
  advanceDeducted: number
  leaveDaysTaken: number
  leaveAdjustment: number
  lateDays: number
  otDays: number
  conveyance: number
  attendanceBonus: number
  notes: string
}

export function downloadTemplate(
  employees: Employee[],
  month: number,
  year: number,
  existingRecords?: SalaryRecord[],
) {
  const recMap = new Map((existingRecords ?? []).map(r => [r.employeeId, r]))

  const data = employees.map(emp => {
    const rec = recMap.get(emp.id)
    const branchName = (emp as any).branch?.name ?? ''
    return {
      'Employee ID': emp.employeeId,
      'Name': emp.name,
      'Branch': branchName,
      'Basic Salary': emp.basicSalary,
      'Advance (৳)': rec?.advanceDeducted ?? 0,
      'Leave (days)': rec?.leaveDaysTaken ?? 0,
      'Leave Adjustment (±days)': rec?.leaveAdjustment ?? 0,
      'Late (days)': rec?.lateDays ?? 0,
      'OT (days)': rec?.otDays ?? 0,
      'Conveyance (৳)': rec?.conveyanceOverride ?? emp.conveyance,
      'Attendance Bonus (৳)': rec?.attendanceBonus ?? 0,
      'Notes': rec?.notes ?? '',
    }
  })

  const ws = XLSX.utils.json_to_sheet(data, { header: [...HEADERS] })

  ws['!cols'] = [
    { wch: 14 }, { wch: 24 }, { wch: 22 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 12 },
    { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 30 },
  ]

  const wb = XLSX.utils.book_new()
  const sheetName = `${MONTHS[month - 1]} ${year}`
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  XLSX.writeFile(wb, `Bindu_Salary_${MONTHS[month - 1]}_${year}.xlsx`)
}

export function parseSalarySheet(
  file: File,
): Promise<{ rows: SheetRow[]; errors: string[] }> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const rows: SheetRow[] = []
      const errors: string[] = []

      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })

        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          resolve({ rows: [], errors: ['No sheets found in the uploaded file. Make sure it is a valid .xlsx, .xls, or .csv file.'] })
          return
        }

        const ws = wb.Sheets[wb.SheetNames[0]]
        if (!ws) {
          resolve({ rows: [], errors: ['Sheet data is empty or unreadable.'] })
          return
        }

        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false })

        if (!json || json.length === 0) {
          resolve({ rows: [], errors: ['The sheet appears to be empty. Make sure data starts from row 1 with headers.'] })
          return
        }

        const firstRowKeys = Object.keys(json[0])
        console.log('[parseSalarySheet] Detected headers:', firstRowKeys)

        json.forEach((row, idx) => {
          const normalizedRow: Record<string, unknown> = {}
          for (const key of Object.keys(row)) {
            normalizedRow[key.trim().toLowerCase()] = row[key]
          }

          const empId = String(
            normalizedRow['employee id'] ??
            normalizedRow['employee_id'] ??
            normalizedRow['id'] ??
            normalizedRow['emp id'] ??
            normalizedRow['emp_id'] ?? ''
          ).trim()
          const name = String(
            normalizedRow['name'] ??
            normalizedRow['employee name'] ??
            normalizedRow['full name'] ?? ''
          ).trim()

          if (!empId && !name) {
            return 
          }

          rows.push({
            employeeId: empId,
            name,
            branch: String(normalizedRow['branch'] ?? normalizedRow['branch name'] ?? '').trim(),
            basicSalary: Number(normalizedRow['basic salary'] ?? normalizedRow['basic_salary'] ?? normalizedRow['basic'] ?? 0) || 0,
            advanceDeducted: Number(normalizedRow['advance (৳)'] ?? normalizedRow['advance'] ?? normalizedRow['advance deducted'] ?? normalizedRow['total advance'] ?? 0) || 0,
            leaveDaysTaken: Number(normalizedRow['leave (days)'] ?? normalizedRow['leave'] ?? normalizedRow['leave days'] ?? normalizedRow['total leave'] ?? 0) || 0,
            leaveAdjustment: Number(normalizedRow['leave adjustment (±days)'] ?? normalizedRow['leave adjustment'] ?? normalizedRow['leave adj'] ?? 0) || 0,
            lateDays: Number(normalizedRow['late (days)'] ?? normalizedRow['late'] ?? normalizedRow['late days'] ?? normalizedRow['total late'] ?? 0) || 0,
            otDays: Number(normalizedRow['ot (days)'] ?? normalizedRow['ot'] ?? normalizedRow['ot days'] ?? normalizedRow['total ot'] ?? 0) || 0,
            conveyance: Number(normalizedRow['conveyance (৳)'] ?? normalizedRow['conveyance'] ?? normalizedRow['conv'] ?? 0) || 0,
            attendanceBonus: Number(normalizedRow['attendance bonus (৳)'] ?? normalizedRow['attendance bonus'] ?? normalizedRow['att bonus'] ?? 0) || 0,
            notes: String(normalizedRow['notes'] ?? normalizedRow['note'] ?? normalizedRow['remarks'] ?? '').trim(),
          })
        })

        if (rows.length === 0) {
          errors.push(`No valid rows found. Detected headers: ${firstRowKeys.join(', ')}. Make sure Employee ID or Name columns exist.`)
        }
      } catch (err) {
        errors.push(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }

      resolve({ rows, errors })
    }
    reader.readAsArrayBuffer(file)
  })
}
