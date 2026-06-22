import { Employee, SalaryRecord, EidRecord } from '@prisma/client'

export type SalaryCalc = {
  employee: Employee
  record: SalaryRecord
  basicSalary: number
  advanceDeducted: number
  leaveDeduction: number
  lateDeduction: number
  otAddition: number
  conveyance: number
  attendanceBonus: number
  netPayable: number
  dailyRate: number
  yearlyUsedLeave: number
}

export type EidCalc = {
  employee: Employee
  record: EidRecord
  basicSalary: number
  salaryPayment: number
  advanceDeducted: number
  eidBonus: number
  netPayable: number
}

const WORKING_DAYS = 26

export function calcSalary(employee: Employee, record: SalaryRecord, yearlyUsedLeave: number = 0): SalaryCalc {
  const dailyRate = employee.basicSalary / WORKING_DAYS

  // Leave deduction: deduct days taken minus any leave adjustment
  const deductableLeave = Math.max(0, record.leaveDaysTaken - (record.leaveAdjustment ?? 0))
  const leaveDeduction = deductableLeave * dailyRate

  // Late deduction: every 3 late days = 1 day salary
  const lateDeduction = Math.floor(record.lateDays / 3) * dailyRate

  // OT: 1 day = 1 day salary
  const otAddition = record.otDays * dailyRate

  // Use monthly conveyance override if set, else employee default
  const conveyance = record.conveyanceOverride ?? employee.conveyance

  const netPayable =
    employee.basicSalary
    - (record.trackerAdvanceTotal + record.hrAdvanceDeducted)
    - leaveDeduction
    - lateDeduction
    + otAddition
    + conveyance
    + record.attendanceBonus

  return {
    employee,
    record,
    basicSalary: employee.basicSalary,
    advanceDeducted: record.trackerAdvanceTotal + record.hrAdvanceDeducted,
    leaveDeduction,
    lateDeduction,
    otAddition,
    conveyance,
    attendanceBonus: record.attendanceBonus,
    netPayable: Math.round(netPayable / 10) * 10,
    dailyRate,
    yearlyUsedLeave,
  }
}

export function calcEid(employee: Employee, record: EidRecord): EidCalc {
  const salaryPayment = Math.round(employee.basicSalary * record.salaryPaymentPct / 100)
  const eidBonus = Math.round(employee.basicSalary * record.eidBonusPct / 100)
  const advanceDeducted = (record.trackerAdvanceTotal ?? 0) + (record.hrAdvanceDeducted ?? 0)
  const netPayable = salaryPayment - advanceDeducted + eidBonus

  return {
    employee,
    record,
    basicSalary: employee.basicSalary,
    salaryPayment,
    advanceDeducted,
    eidBonus,
    netPayable: Math.round(netPayable / 10) * 10,
  }
}

export function formatTaka(amount: number) {
  return `৳ ${amount.toLocaleString('en-BD')}`
}
