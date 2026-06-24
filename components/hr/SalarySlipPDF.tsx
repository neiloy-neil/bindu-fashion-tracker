'use client'

import { Document, Page, View, Text, Image, StyleSheet, Font, pdf } from '@react-pdf/renderer'
import type { SalaryCalc } from '@/lib/hr/calculations'
import { BINDU_LOGO } from '@/lib/logo-base64'

Font.register({
  family: 'Helvetica',
  fonts: [],
})

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const GRAY_BG = '#f2f2f2'
const BORDER  = '#cccccc'
const BLACK   = '#000000'
const DARK    = '#1a1a1a'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: DARK,
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingTop: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    gap: 24,
  },
  slip: { flex: 1, flexDirection: 'column' },
  logoWrap: { alignItems: 'center', marginBottom: 4 },
  logo: { width: 110, height: 34, objectFit: 'contain' },
  title: { textAlign: 'center', fontSize: 9, letterSpacing: 1, marginBottom: 4, color: DARK },
  monthBox: { backgroundColor: GRAY_BG, paddingVertical: 5, paddingHorizontal: 8, marginBottom: 10 },
  monthText: { textAlign: 'center', fontSize: 11, fontFamily: 'Helvetica-BoldOblique', color: BLACK },
  empName: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 3, color: BLACK },
  empRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  empDesig: { fontSize: 8.5, color: DARK },
  empDesigBold: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: BLACK },
  empId: { fontSize: 8.5, color: DARK },
  empIdBold: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: BLACK },
  table: { borderTop: `1 solid ${BORDER}`, borderLeft: `1 solid ${BORDER}`, borderRight: `1 solid ${BORDER}` },
  tHead: { flexDirection: 'row', backgroundColor: GRAY_BG, borderBottom: `1 solid ${BORDER}` },
  tHeadDesc: { flex: 1, padding: '4 6', fontFamily: 'Helvetica-Oblique', fontSize: 8.5 },
  tHeadQty: { width: 34, padding: '4 4', textAlign: 'center', fontFamily: 'Helvetica-Oblique', fontSize: 8.5, borderLeft: `1 solid ${BORDER}` },
  tHeadOp: { width: 22, padding: '4 2', textAlign: 'center', fontFamily: 'Helvetica-Oblique', fontSize: 8.5, borderLeft: `1 solid ${BORDER}` },
  tHeadAmt: { width: 52, padding: '4 5', textAlign: 'right', fontFamily: 'Helvetica-Oblique', fontSize: 8.5, borderLeft: `1 solid ${BORDER}` },
  tRow: { flexDirection: 'row', borderBottom: `1 solid ${BORDER}`, minHeight: 20 },
  tDesc: { flex: 1, padding: '3 6', fontSize: 8.5, justifyContent: 'center' },
  tQty: { width: 34, padding: '3 4', textAlign: 'center', fontSize: 8.5, borderLeft: `1 solid ${BORDER}`, justifyContent: 'center' },
  tOp: { width: 22, padding: '3 2', textAlign: 'center', fontSize: 8.5, borderLeft: `1 solid ${BORDER}`, justifyContent: 'center' },
  tAmt: { width: 52, padding: '3 5', textAlign: 'right', fontSize: 8.5, borderLeft: `1 solid ${BORDER}`, justifyContent: 'center' },
  tSubAmt: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', textDecoration: 'underline', color: BLACK },
  tPayableDesc: { flex: 1, padding: '4 6', textAlign: 'right', fontFamily: 'Helvetica-BoldOblique', fontSize: 9, justifyContent: 'center' },
  tPayableAmt: { width: 52, padding: '4 5', textAlign: 'right', fontSize: 9, fontFamily: 'Helvetica-Bold', textDecoration: 'underline', borderLeft: `1 solid ${BORDER}`, justifyContent: 'center', color: BLACK },
  sigRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, paddingHorizontal: 12 },
  sigText: { fontSize: 8.5, color: DARK, marginTop: 5 },
  noteText: { fontSize: 8.5, marginTop: 8, color: DARK, fontFamily: 'Helvetica-Oblique' },
})

type SlipEmployee = SalaryCalc['employee'] & { branch?: { name: string } | null }
type CellStyle = React.ComponentProps<typeof View>['style']

function Cell({ style, children }: { style: CellStyle; children?: React.ReactNode }) {
  return <View style={style}><Text>{children ?? ''}</Text></View>
}

function fmt(n: number) {
  if (n === 0) return '0'
  return n.toLocaleString('en-BD')
}

function Slip({ calc, month, year, generatedBy, paymentBy }: {
  calc: SalaryCalc
  month: number
  year: number
  generatedBy: string
  paymentBy: string
}) {
  const { employee: emp, record, basicSalary,
          leaveDeduction, lateDeduction, otAddition, conveyance,
          attendanceBonus, netPayable } = calc

  const branchAdvance = record.trackerAdvanceTotal ?? 0
  const hrAdvance = record.hrAdvanceDeducted ?? 0
  const advanceDeducted = branchAdvance + hrAdvance

  const now = new Date()
  const genTimeStr = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-GB')
  const monthName = `${MONTHS[month - 1]} ${year}`

  const sub1 = basicSalary - advanceDeducted
  const deductible_leave = Math.max(0, (record.leaveDaysTaken ?? 0) - emp.yearlyLeaveAllowance - (record.leaveAdjustment ?? 0))
  const sub2 = sub1 - leaveDeduction - lateDeduction
  const sub3 = sub2 + attendanceBonus

  const branchName = (emp as SlipEmployee).branch?.name ?? ''

  return (
    <View style={s.slip}>
      <View style={s.logoWrap}>
        <Image src={BINDU_LOGO} style={s.logo} />
      </View>

      <Text style={s.title}>SALARY SHEET</Text>

      <View style={s.monthBox}>
        <Text style={s.monthText}>{monthName}</Text>
      </View>

      <Text style={s.empName}>{emp.name}</Text>

      <View style={s.empRow}>
        <Text style={s.empDesig}>
          Designation: <Text style={s.empDesigBold}>{emp.designation}{branchName ? ` (${branchName})` : ''}</Text>
        </Text>
        <Text style={s.empId}>
          ID NO: <Text style={s.empIdBold}>{emp.employeeId}</Text>
        </Text>
      </View>

      <View style={s.table}>
        <View style={s.tHead}>
          <Text style={s.tHeadDesc}>Description</Text>
          <Text style={s.tHeadQty}>QTY</Text>
          <Text style={s.tHeadOp}></Text>
          <Text style={s.tHeadAmt}>Amount</Text>
        </View>

        <View style={s.tRow}>
          <Cell style={s.tDesc}>Salary</Cell>
          <Cell style={s.tQty}></Cell>
          <Cell style={s.tOp}></Cell>
          <View style={s.tAmt}><Text style={{ fontFamily: 'Helvetica-Bold' }}>{fmt(basicSalary)}</Text></View>
        </View>

        <View style={s.tRow}>
          <Cell style={s.tDesc}>Advance Deducted</Cell>
          <Cell style={s.tQty}></Cell>
          <Cell style={s.tOp}>(-)</Cell>
          <Cell style={s.tAmt}>{fmt(advanceDeducted)}</Cell>
        </View>

        <View style={s.tRow}>
          <Cell style={s.tDesc}></Cell>
          <Cell style={s.tQty}></Cell>
          <Cell style={s.tOp}>(=)</Cell>
          <View style={s.tAmt}><Text style={s.tSubAmt}>{fmt(sub1)}</Text></View>
        </View>

        <View style={s.tRow}>
          <Cell style={s.tDesc}>
            {`Leave: ${record.leaveDaysTaken ?? 0}, Less from yearly leave ${record.leaveAdjustment ?? 0} (Used: ${String(calc.yearlyUsedLeave ?? 0).padStart(2, '0')}/ Left: ${String(emp.yearlyLeaveAllowance - (calc.yearlyUsedLeave ?? 0)).padStart(2, '0')})`}
          </Cell>
          <Cell style={s.tQty}>{deductible_leave > 0 ? String(deductible_leave) : '0'}</Cell>
          <Cell style={s.tOp}>(-)</Cell>
          <Cell style={s.tAmt}>{fmt(Math.round(leaveDeduction))}</Cell>
        </View>

        <View style={s.tRow}>
          <Cell style={s.tDesc}>Late Absent</Cell>
          <Cell style={s.tQty}>{fmt(record.lateDays ?? 0)}</Cell>
          <Cell style={s.tOp}>(-)</Cell>
          <Cell style={s.tAmt}>{fmt(Math.round(lateDeduction))}</Cell>
        </View>

        <View style={s.tRow}>
          <Cell style={s.tDesc}></Cell>
          <Cell style={s.tQty}></Cell>
          <Cell style={s.tOp}>(=)</Cell>
          <View style={s.tAmt}><Text style={s.tSubAmt}>{fmt(Math.round(sub2))}</Text></View>
        </View>

        <View style={s.tRow}>
          <Cell style={s.tDesc}>Attendance Bonus</Cell>
          <Cell style={s.tQty}></Cell>
          <Cell style={s.tOp}>(+)</Cell>
          <Cell style={s.tAmt}>{fmt(attendanceBonus)}</Cell>
        </View>

        <View style={s.tRow}>
          <Cell style={s.tDesc}></Cell>
          <Cell style={s.tQty}></Cell>
          <Cell style={s.tOp}>(=)</Cell>
          <View style={s.tAmt}><Text style={s.tSubAmt}>{fmt(Math.round(sub3))}</Text></View>
        </View>

        <View style={s.tRow}>
          <Cell style={s.tDesc}>Conveyance</Cell>
          <Cell style={s.tQty}>0</Cell>
          <Cell style={s.tOp}>(+)</Cell>
          <Cell style={s.tAmt}>{fmt(conveyance)}</Cell>
        </View>

        <View style={s.tRow}>
          <Cell style={s.tDesc}>Over Time</Cell>
          <Cell style={s.tQty}>{fmt(record.otDays ?? 0)}</Cell>
          <Cell style={s.tOp}>(+)</Cell>
          <Cell style={s.tAmt}>{fmt(Math.round(otAddition))}</Cell>
        </View>

        <View style={s.tRow}>
          <View style={s.tPayableDesc}><Text>Payable Amount</Text></View>
          <View style={{ width: 34, borderLeft: `1 solid ${BORDER}` }} />
          <View style={{ width: 22, borderLeft: `1 solid ${BORDER}` }} />
          <View style={s.tPayableAmt}><Text>{fmt(Math.round(netPayable / 10) * 10)}</Text></View>
        </View>
      </View>

      {record.notes && (
        <Text style={s.noteText}>Note: {record.notes}</Text>
      )}

      <View style={[s.sigRow, { marginTop: 24 }]}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 100, borderBottom: `1 solid ${DARK}` }} />
          <Text style={s.sigText}>{paymentBy}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 100, borderBottom: `1 solid ${DARK}` }} />
          <Text style={s.sigText}>Received by</Text>
        </View>
      </View>

      <View style={{ borderTop: `1 solid ${BORDER}`, marginTop: 10, paddingTop: 5 }}>
        <Text style={{ fontFamily: 'Courier', fontSize: 7, color: '#666' }}>
          Salary Generated by {generatedBy}, {genTimeStr}
        </Text>
      </View>
    </View>
  )
}

export type SalarySlipDocProps = {
  calcs: SalaryCalc[]
  month: number
  year: number
  generatedBy: string
  paymentBy: string
  companyName: string
}

export function SalarySlipDoc({ calcs, month, year, generatedBy, paymentBy }: SalarySlipDocProps) {
  const pages: SalaryCalc[][] = []
  for (let i = 0; i < calcs.length; i += 2) pages.push(calcs.slice(i, i + 2))

  return (
    <Document>
      {pages.map((pair, pi) => (
        <Page key={pi} size="A4" orientation="landscape" style={s.page}>
          <Slip calc={pair[0]} month={month} year={year} generatedBy={generatedBy} paymentBy={paymentBy} />
          {pair[1]
            ? <Slip calc={pair[1]} month={month} year={year} generatedBy={generatedBy} paymentBy={paymentBy} />
            : <View style={{ flex: 1 }} />
          }
        </Page>
      ))}
    </Document>
  )
}

export async function downloadPDF(props: SalarySlipDocProps, filename: string) {
  const blob = await pdf(<SalarySlipDoc {...props} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
