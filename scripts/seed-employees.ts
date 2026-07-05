import 'dotenv/config'
import { prisma } from '../lib/prisma'

const SUPABASE_URL = (process.env.SALARY_SUPABASE_URL ?? '').replace(/\/?$/, '') + '/rest/v1'
const SUPABASE_KEY = process.env.SALARY_SUPABASE_SERVICE_KEY ?? ''
if (!SUPABASE_KEY) throw new Error('Missing SALARY_SUPABASE_SERVICE_KEY in .env')

async function sbFetch(path: string) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  })
  if (!res.ok) throw new Error(`Supabase ${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

// Branch name map: bindu-salary name → fashion-tracker name
const BRANCH_NAME_MAP: Record<string, string> = {
  'Aziz 1':         'Aziz 1',
  'Aziz 4':         'Aziz-2',
  'Aziz-3':         'Aziz-3',        // will be created if missing
  'Barisal':        'Barishal',
  'Basurhat':       'Basurhat',
  "Cox'sbazar 1":   "Cox's Bazar-1",
  "Cox'sbazar 2":   "Cox's Bazar-2",
  "Cox'sbazar 3":   "Cox's Bazar-3",
  'Dorgagate':      'Dorgahgate',
  'Head Office':    'Head Office',
  'Jessore Branch': 'Jashore',
  'Lamabazar':      'Lamabazar',
  'Teknaf':         'Teknaf',
}

async function main() {
  console.log('Fetching data from bindu-salary Supabase...')

  const [sbBranches, sbEmployees, sbSalaryRecords, sbEidRecords] = await Promise.all([
    sbFetch('/branches?select=id,name&order=name'),
    sbFetch('/employees?select=*&order=employee_id&limit=200'),
    sbFetch('/salary_records?select=*&order=year,month&limit=500'),
    sbFetch('/eid_records?select=*&limit=500'),
  ])

  console.log(`Fetched: ${sbEmployees.length} employees, ${sbSalaryRecords.length} salary records, ${sbEidRecords.length} EID records`)

  // Build UUID→name map for bindu-salary branches
  const sbBranchById = new Map<string, string>(sbBranches.map((b: any) => [b.id, b.name]))

  // --- Fashion tracker branches ---
  const ftBranches = await prisma.branch.findMany({ select: { id: true, name: true } })
  const ftBranchByName = new Map(ftBranches.map(b => [b.name, b.id]))

  // Ensure "Aziz-3" exists (it's in bindu-salary but not in the tracker)
  if (!ftBranchByName.has('Aziz-3')) {
    const b = await prisma.branch.create({ data: { name: 'Aziz-3', code: 'AZIZ3', type: 'RETAIL' } })
    ftBranchByName.set('Aziz-3', b.id)
    console.log('Created branch: Aziz-3')
  }

  // --- Clear all HR/payroll data ---
  console.log('\nClearing existing HR/payroll data...')
  await prisma.leaveRecord.deleteMany({})
  await prisma.eidRecord.deleteMany({})
  await prisma.salaryRecord.deleteMany({})
  await prisma.advanceSalary.deleteMany({})
  await prisma.attendance.deleteMany({})
  await prisma.employeeTransfer.deleteMany({})
  await prisma.employee.deleteMany({})
  console.log('Cleared.')

  // --- Seed employees ---
  console.log('\nSeeding employees...')
  // uuid → fashion-tracker int id
  const empUuidToFtId = new Map<string, number>()

  for (const emp of sbEmployees) {
    const sbBranchName: string = sbBranchById.get(emp.branch_id) ?? ''
    const ftBranchName = BRANCH_NAME_MAP[sbBranchName] ?? sbBranchName
    const branchId = ftBranchByName.get(ftBranchName)

    if (!branchId) {
      console.warn(`  ⚠ Branch not found: "${sbBranchName}" → "${ftBranchName}" (employee ${emp.employee_id} ${emp.name})`)
      continue
    }

    const created = await prisma.employee.create({
      data: {
        employeeId:           emp.employee_id,
        name:                 emp.name,
        designation:          emp.designation ?? null,
        basicSalary:          emp.basic_salary ?? 0,
        conveyance:           emp.conveyance ?? 1500,
        yearlyLeaveAllowance: emp.yearly_leave_allowance ?? 12,
        isActive:             emp.active ?? true,
        branchId,
      }
    })
    empUuidToFtId.set(emp.id, created.id)
    console.log(`  ✓ ${emp.employee_id} — ${emp.name} (${ftBranchName})`)
  }
  console.log(`Employees: ${empUuidToFtId.size} inserted.`)

  // --- Seed salary records ---
  console.log('\nSeeding salary records...')
  let srInserted = 0, srSkipped = 0
  for (const sr of sbSalaryRecords) {
    const ftEmpId = empUuidToFtId.get(sr.employee_id)
    if (!ftEmpId) {
      console.warn(`  ⚠ No matching employee for salary_record (uuid: ${sr.employee_id})`)
      srSkipped++
      continue
    }

    await prisma.salaryRecord.create({
      data: {
        employeeId:        ftEmpId,
        month:             sr.month,
        year:              sr.year,
        hrAdvanceDeducted: sr.advance_deducted ?? 0,
        leaveDaysTaken:    sr.leave_days_taken ?? 0,
        leaveAdjustment:   sr.leave_adjustment ?? 0,
        lateDays:          sr.late_days ?? 0,
        otDays:            sr.ot_days ?? 0,
        attendanceBonus:   sr.attendance_bonus ?? 0,
        conveyanceOverride: sr.conveyance != null ? sr.conveyance : null,
        notes:             sr.notes ?? '',
      }
    })
    srInserted++
  }
  console.log(`Salary records: ${srInserted} inserted, ${srSkipped} skipped.`)

  // --- Seed EID records ---
  if (sbEidRecords.length > 0) {
    console.log('\nSeeding EID records...')
    let eidInserted = 0, eidSkipped = 0
    for (const eid of sbEidRecords) {
      const ftEmpId = empUuidToFtId.get(eid.employee_id)
      if (!ftEmpId) {
        console.warn(`  ⚠ No matching employee for eid_record (uuid: ${eid.employee_id})`)
        eidSkipped++
        continue
      }

      await prisma.eidRecord.create({
        data: {
          employeeId:       ftEmpId,
          title:            eid.title ?? 'Eid Bonus',
          year:             eid.year,
          salaryPaymentPct: eid.salary_payment_pct ?? 50,
          eidBonusPct:      eid.eid_bonus_pct ?? 50,
          hrAdvanceDeducted: eid.advance_deducted ?? 0,
        }
      })
      eidInserted++
    }
    console.log(`EID records: ${eidInserted} inserted, ${eidSkipped} skipped.`)
  } else {
    console.log('\nNo EID records to seed.')
  }

  console.log('\nAll done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
