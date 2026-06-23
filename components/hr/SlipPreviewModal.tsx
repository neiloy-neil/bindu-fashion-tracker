'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Eye, Download } from 'lucide-react'
import type { SalaryCalc } from '@/lib/hr/calculations'
import { BINDU_LOGO } from '@/lib/logo-base64'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function formatTaka(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

function fmt(n: number) {
  if (n === 0) return '0'
  return n.toLocaleString('en-BD')
}

type Settings = {
  companyName: string
  generatedBy: string
  paymentBy: string
}

export type SlipPreviewProps = {
  calc: SalaryCalc
  month: number
  year: number
  settings?: Settings
}

type SlipEmployee = SalaryCalc['employee'] & { branch?: { name: string } | null }

export function SlipPreview({ calc, month, year, settings }: SlipPreviewProps) {
  const { employee: emp, record, basicSalary,
          leaveDeduction, lateDeduction, otAddition, conveyance,
          attendanceBonus, netPayable } = calc

  const branchAdvance = record.trackerAdvanceTotal ?? 0
  const hrAdvance = record.hrAdvanceDeducted ?? 0
  const advanceDeducted = branchAdvance + hrAdvance

  const monthName = `${MONTHS[month - 1]} ${year}`
  const branchName = (emp as SlipEmployee).branch?.name ?? ''

  const deductible_leave = Math.max(0, (record.leaveDaysTaken ?? 0) - emp.yearlyLeaveAllowance - (record.leaveAdjustment ?? 0))
  const sub1 = basicSalary - advanceDeducted
  const sub2 = sub1 - Math.round(leaveDeduction) - Math.round(lateDeduction)
  const sub3 = sub2 + attendanceBonus

  const row = (label: string, qty: string, op: string, amount: number, bold = false, underline = false) => (
    <tr className="border-b border-gray-200">
      <td className="px-3 py-2 text-sm">{label}</td>
      <td className="px-2 py-2 text-center text-sm border-l border-gray-200 w-10">{qty}</td>
      <td className="px-2 py-2 text-center text-sm border-l border-gray-200 w-8">{op}</td>
      <td className={`px-3 py-2 text-right text-sm border-l border-gray-200 w-20 ${bold ? 'font-bold' : ''} ${underline ? 'underline decoration-gray-700' : ''}`}>
        {fmt(amount)}
      </td>
    </tr>
  )

  const subtotalRow = (value: number) => (
    <tr className="border-b border-gray-200">
      <td className="px-3 py-1.5" />
      <td className="px-2 py-1.5 border-l border-gray-200" />
      <td className="px-2 py-1.5 text-center text-sm border-l border-gray-200">(=)</td>
      <td className="px-3 py-1.5 text-right font-bold underline text-sm border-l border-gray-200">{fmt(Math.round(value))}</td>
    </tr>
  )

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 max-w-sm mx-auto text-gray-800 font-sans">
      <div className="flex justify-center mb-1">
        <Image src={BINDU_LOGO} alt="Bindu Premium" width={160} height={36} className="h-9 w-auto object-contain" unoptimized />
      </div>

      <p className="text-center text-xs tracking-widest text-gray-600 mb-2">SALARY SHEET</p>

      <div className="bg-gray-100 text-center font-bold italic text-sm py-2 px-3 mb-3 rounded">
        {monthName}
      </div>

      <p className="font-bold text-base text-gray-900 mb-1">{emp.name}</p>
      <div className="flex justify-between text-xs text-gray-600 mb-3">
        <span>Designation: <strong>{emp.designation}{branchName ? ` (${branchName})` : ''}</strong></span>
        <span>ID NO: <strong>{emp.employeeId}</strong></span>
      </div>

      <table className="w-full border border-gray-200 rounded overflow-hidden text-xs">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200">
            <th className="text-left px-3 py-2 italic font-normal">Description</th>
            <th className="text-center px-2 py-2 italic font-normal border-l border-gray-200 w-10">QTY</th>
            <th className="px-2 py-2 border-l border-gray-200 w-8" />
            <th className="text-right px-3 py-2 italic font-normal border-l border-gray-200 w-20">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-200">
            <td className="px-3 py-2 text-sm">Salary</td>
            <td className="px-2 py-2 border-l border-gray-200" />
            <td className="px-2 py-2 border-l border-gray-200" />
            <td className="px-3 py-2 text-right font-bold text-sm border-l border-gray-200">{fmt(basicSalary)}</td>
          </tr>
          {row('Branch Advance', '', '(-)', branchAdvance)}
          {row('HR Advance', '', '(-)', hrAdvance)}
          {subtotalRow(sub1)}
          <tr className="border-b border-gray-200">
            <td className="px-3 py-2 text-sm">
              {`Leave: ${record.leaveDaysTaken ?? 0}, Less from yearly leave ${record.leaveAdjustment ?? 0} (Used: ${String(calc.yearlyUsedLeave ?? 0).padStart(2, '0')}/ Left: ${String(emp.yearlyLeaveAllowance - (calc.yearlyUsedLeave ?? 0)).padStart(2, '0')})`}
            </td>
            <td className="px-2 py-2 text-center text-sm border-l border-gray-200">{deductible_leave > 0 ? deductible_leave : '0'}</td>
            <td className="px-2 py-2 text-center text-sm border-l border-gray-200">(-)</td>
            <td className="px-3 py-2 text-right text-sm border-l border-gray-200">{fmt(Math.round(leaveDeduction))}</td>
          </tr>
          {row('Late Absent', String(record.lateDays ?? 0), '(-)', Math.round(lateDeduction))}
          {subtotalRow(sub2)}
          {row('Attendance Bonus', '', '(+)', attendanceBonus)}
          {subtotalRow(sub3)}
          {row('Conveyance', '0', '(+)', conveyance)}
          {row('Over Time', String(record.otDays ?? 0), '(+)', Math.round(otAddition))}
          <tr>
            <td colSpan={2} className="px-3 py-2.5 text-right font-bold italic text-sm">Payable Amount</td>
            <td className="px-2 py-2 border-l border-gray-200" />
            <td className="px-3 py-2.5 text-right font-bold underline text-sm border-l border-gray-200">{fmt(netPayable)}</td>
          </tr>
        </tbody>
      </table>

      {record.notes && (
        <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 text-xs italic border border-yellow-100 rounded">
          Note: {record.notes}
        </div>
      )}

      <div className="flex justify-between mt-8 px-4">
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-28 border-b border-gray-800" />
          <span className="text-xs text-gray-600">{settings?.paymentBy || 'Payment by'}</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-28 border-b border-gray-800" />
          <span className="text-xs text-gray-600">Received by</span>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-gray-200">
        <p className="font-mono text-[10px] text-gray-500">
          Salary Generated by {settings?.generatedBy ?? 'Admin'}, {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-GB')}
        </p>
      </div>
    </div>
  )
}

export function SlipPreviewButton({ calc, month, year, settings }: SlipPreviewProps) {
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)

  async function downloadSingle() {
    setDownloading(true)
    try {
      const { downloadPDF } = await import('@/components/hr/SalarySlipPDF')
      await downloadPDF({
        calcs: [calc],
        month, year,
        generatedBy: settings?.generatedBy ?? 'Admin',
        paymentBy: settings?.paymentBy ?? '',
        companyName: settings?.companyName ?? 'Bindu Premium',
      }, `${calc.employee.name}-${MONTHS[month - 1]}-${year}.pdf`)
    } catch {
      toast.error('PDF generation failed')
    }
    setDownloading(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        title="Preview slip"
      >
        <Eye size={14} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              Salary Slip - {calc.employee.name} - {MONTHS[month - 1]} {year}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 max-h-[70vh] overflow-y-auto px-1">
            <SlipPreview calc={calc} month={month} year={year} settings={settings} />
          </div>
          <div className="flex justify-between items-center mt-2 pt-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Net Payable: <strong className="text-blue-700">{formatTaka(calc.netPayable)}</strong>
            </span>
            <Button onClick={downloadSingle} disabled={downloading} size="sm" className="gap-2">
              <Download size={14} />
              {downloading ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
