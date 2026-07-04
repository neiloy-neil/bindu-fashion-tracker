import React from 'react'
import { Document, Page, StyleSheet, Text, View, Image, pdf } from '@react-pdf/renderer'
import { BINDU_LOGO } from '@/lib/logo-base64'
import { saveAs } from 'file-saver'
import type { SummaryStats } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'

type DailyReportData = {
  branch?: { name?: string | null } | null
  items?: Array<{ amount: number; note?: string | null; category?: { name?: string | null } | null }>
  expenseEntries?: Array<{ amount: number; note?: string | null; category?: { name?: string | null } | null; isTransferEntry?: boolean }>
  transfers?: Array<{ amount: number; note?: string | null; account?: { name?: string | null } | null }>
  payments?: Array<{ amount: number; method: string; party?: { name?: string | null } | null; cheque?: { status?: string | null } | null }>
  advanceSalaries?: Array<{ amount?: number | null; type: string; productDescription?: string | null; employee?: { name?: string | null } | null }>
  openingTime?: string | null
  closingTime?: string | null
}

type MonthlyBranchRow = {
  branchName: string
  totalIncome: number
  grossIncome?: number
  totalExpense: number
  totalTransfers: number
  totalPayments: number
  totalAdvances: number
  netCashFlow: number
}

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    color: '#111827',
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#2A356E',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 10,
    color: '#4B5563',
    marginBottom: 2,
  },
  logoWrap: {
    marginBottom: 10,
    alignItems: 'center',
  },
  logo: {
    width: 110,
    height: 34,
    objectFit: 'contain',
  },
  section: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#2A356E',
    marginBottom: 6,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#F9FAFB',
  },
  statLabel: {
    fontSize: 8,
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  table: {
    display: 'flex',
    width: '100%',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerRow: {
    backgroundColor: '#2A356E',
    color: '#FFFFFF',
  },
  totalRow: {
    backgroundColor: '#F3F4F6',
  },
  cell: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    fontSize: 9,
  },
  headerCell: {
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
  },
  right: {
    textAlign: 'right',
  },
  note: {
    fontSize: 9,
    color: '#6B7280',
  },
})

function amount(value: number) {
  return `Tk ${formatCurrency(value)}`
}

function Table({
  headers,
  rows,
  widths,
}: {
  headers: string[]
  rows: string[][]
  widths: number[]
}) {
  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.headerRow]}>
        {headers.map((header, index) => (
          <Text
            key={header}
            style={[
              styles.cell,
              styles.headerCell,
              { width: `${widths[index]}%` },
              ...(index === headers.length - 1 ? [{ borderRightWidth: 0 }] : []),
            ]}
          >
            {header}
          </Text>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View
          key={`${row[0]}-${rowIndex}`}
          style={[
            styles.tableRow,
            ...(rowIndex === rows.length - 1 ? [{ borderBottomWidth: 0 }] : []),
          ]}
        >
          {row.map((value, cellIndex) => (
            <Text
              key={`${value}-${cellIndex}`}
            style={[
              styles.cell,
              { width: `${widths[cellIndex]}%` },
              ...(cellIndex === row.length - 1 ? [styles.right, { borderRightWidth: 0 }] : []),
            ]}
          >
              {value}
            </Text>
          ))}
        </View>
      ))}
    </View>
  )
}

function DailyReportDocument({
  entryData,
  branchName,
  selectedDate,
}: {
  entryData: DailyReportData
  branchName: string
  selectedDate: string
}) {
  const incomeItems = entryData.items ?? []
  const expenseItems = (entryData.expenseEntries ?? []).filter((e) => !e.isTransferEntry)
  const transfers = entryData.transfers ?? []
  const payments = entryData.payments ?? []
  const advances = entryData.advanceSalaries ?? []

  const totalIncome = incomeItems.reduce((sum, item) => sum + item.amount, 0)
  const totalExpenses = expenseItems.reduce((sum, item) => sum + item.amount, 0)
  const totalTransfers = transfers.reduce((sum, item) => sum + item.amount, 0)
  const totalPayments = payments.reduce((sum, item) => sum + item.amount, 0)
  const totalAdvanceCash = advances.filter((item) => item.type === 'CASH').reduce((sum, item) => sum + (item.amount ?? 0), 0)
  const netCash = totalIncome - totalExpenses - totalTransfers - totalPayments - totalAdvanceCash

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.logoWrap}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={BINDU_LOGO} style={styles.logo} />
        </View>
        <Text style={styles.title}>Bindu Premium - Daily Report</Text>
        <Text style={styles.subtitle}>Branch: {branchName}</Text>
        <Text style={styles.subtitle}>Date: {formatDate(selectedDate)}</Text>
        <Text style={styles.subtitle}>
          Store Timing: {entryData.openingTime || '-'} to {entryData.closingTime || '-'}
        </Text>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Sale</Text>
            <Text style={styles.statValue}>{amount(totalIncome)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Outflow</Text>
            <Text style={styles.statValue}>{amount(totalExpenses + totalTransfers + totalPayments + totalAdvanceCash)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Cash In Hand</Text>
            <Text style={styles.statValue}>{amount(netCash)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Income</Text>
          <Table
            headers={['Category', 'Note', 'Amount']}
            widths={[34, 46, 20]}
            rows={(incomeItems.length ? incomeItems : [{ amount: 0, note: 'No income items recorded', category: { name: '-' } }]).map((item) => [
              item.category?.name || '-',
              item.note || '-',
              amount(item.amount),
            ])}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expenses</Text>
          <Table
            headers={['Category', 'Note', 'Amount']}
            widths={[34, 46, 20]}
            rows={(expenseItems.length ? expenseItems : [{ amount: 0, note: 'No expense entries recorded', category: { name: '-' } }]).map((item) => [
              item.category?.name || '-',
              item.note || '-',
              amount(item.amount),
            ])}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transfers</Text>
          <Table
            headers={['Account', 'Note', 'Amount']}
            widths={[34, 46, 20]}
            rows={(transfers.length ? transfers : [{ amount: 0, note: 'No transfers recorded', account: { name: '-' } }]).map((item) => [
              item.account?.name || '-',
              item.note || '-',
              amount(item.amount),
            ])}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Party Payments</Text>
          <Table
            headers={['Party', 'Method', 'Status', 'Amount']}
            widths={[36, 18, 26, 20]}
            rows={(payments.length ? payments : [{ amount: 0, method: '-', party: { name: 'No payments recorded' }, cheque: { status: '-' } }]).map((item) => [
              item.party?.name || '-',
              item.method,
              item.method === 'CHEQUE' ? (item.cheque?.status || 'PENDING') : 'CLEARED',
              amount(item.amount),
            ])}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advance Salary</Text>
          <Table
            headers={['Employee', 'Type', 'Description', 'Amount']}
            widths={[28, 16, 36, 20]}
            rows={(advances.length ? advances : [{ type: '-', employee: { name: 'No advances recorded' }, productDescription: '-', amount: 0 }]).map((item) => [
              item.employee?.name || '-',
              item.type,
              item.type === 'PRODUCT' ? (item.productDescription || '-') : '-',
              amount(item.type === 'CASH' ? (item.amount ?? 0) : 0),
            ])}
          />
        </View>
      </Page>
    </Document>
  )
}

function MonthlyReportDocument({
  branchData,
  month,
  year,
  selectedBranchId,
}: {
  branchData: MonthlyBranchRow[]
  month: number
  year: number
  selectedBranchId: string
}) {
  const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' })
  const isConsolidated = selectedBranchId === 'all'
  const totals = branchData.reduce((acc, curr) => ({
    grossIncome: acc.grossIncome + (curr.grossIncome ?? curr.totalIncome),
    totalExpense: acc.totalExpense + curr.totalExpense,
    totalTransfers: acc.totalTransfers + curr.totalTransfers,
    totalPayments: acc.totalPayments + curr.totalPayments,
    totalAdvances: acc.totalAdvances + curr.totalAdvances,
    netCashFlow: acc.netCashFlow + curr.netCashFlow,
  }), { grossIncome: 0, totalExpense: 0, totalTransfers: 0, totalPayments: 0, totalAdvances: 0, netCashFlow: 0 })

  const rows = branchData.map((item) => [
    item.branchName,
    amount(item.grossIncome ?? item.totalIncome),
    amount(item.totalExpense),
    amount(item.totalTransfers),
    amount(item.totalPayments),
    amount(item.totalAdvances),
    amount(item.netCashFlow),
  ])

  if (isConsolidated && branchData.length > 1) {
    rows.push([
      'TOTALS',
      amount(totals.grossIncome),
      amount(totals.totalExpense),
      amount(totals.totalTransfers),
      amount(totals.totalPayments),
      amount(totals.totalAdvances),
      amount(totals.netCashFlow),
    ])
  }

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.logoWrap}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={BINDU_LOGO} style={styles.logo} />
        </View>
        <Text style={styles.title}>
          Bindu Premium - {isConsolidated ? 'Consolidated Monthly Summary' : `Monthly Summary: ${branchData[0]?.branchName || '-'}`}
        </Text>
        <Text style={styles.subtitle}>Period: {monthName} {year}</Text>

        <View style={styles.section}>
          <Table
            headers={['Branch Name', 'Total Income', 'Total Expenses', 'Transfers', 'Party Payments', 'Salary Advances', 'Net Cash Flow']}
            widths={[22, 13, 13, 13, 13, 13, 13]}
            rows={rows}
          />
        </View>
      </Page>
    </Document>
  )
}

function SummaryReportDocument({
  data,
  month,
  year,
  branchName,
}: {
  data: SummaryStats
  month: number
  year: number
  branchName?: string
}) {
  const monthLabel = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.logoWrap}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={BINDU_LOGO} style={styles.logo} />
        </View>
        <Text style={styles.title}>Bindu Premium - {branchName ? `${branchName} Summary` : 'Monthly Summary'}</Text>
        <Text style={styles.subtitle}>Period: {monthLabel} {year}</Text>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Sales</Text>
            <Text style={styles.statValue}>{amount(data.totalSales)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Expenses</Text>
            <Text style={styles.statValue}>{amount(data.totalExpenses)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Net Balance</Text>
            <Text style={styles.statValue}>{amount(data.netBalance)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Branch Performance</Text>
          <Table
            headers={['Branch', 'Sales', 'Expenses', 'Net Balance']}
            widths={[34, 22, 22, 22]}
            rows={data.branchStats.map((branch) => [
              branch.branchName,
              amount(branch.totalSale),
              amount(branch.totalExpense),
              amount(branch.netBalance),
            ])}
          />
        </View>
      </Page>
    </Document>
  )
}

type PdfDocumentElement = Parameters<typeof pdf>[0]

async function saveDocument(document: PdfDocumentElement, filename: string) {
  const blob = await pdf(document).toBlob()
  saveAs(blob, filename)
}

export async function exportDailyReportPdf(entryData: DailyReportData, branchName: string, selectedDate: string) {
  await saveDocument(
    <DailyReportDocument entryData={entryData} branchName={branchName} selectedDate={selectedDate} />,
    `daily-report-${branchName.replace(/\s+/g, '_')}-${selectedDate}.pdf`
  )
}

export async function exportMonthlyReportPdf(branchData: MonthlyBranchRow[], month: number, year: number, selectedBranchId: string) {
  const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' })
  const isConsolidated = selectedBranchId === 'all'
  const filename = isConsolidated
    ? `monthly-consolidated-${monthName}-${year}.pdf`
    : `monthly-${branchData[0].branchName.replace(/\s+/g, '_')}-${monthName}-${year}.pdf`

  await saveDocument(
    <MonthlyReportDocument branchData={branchData} month={month} year={year} selectedBranchId={selectedBranchId} />,
    filename.toLowerCase()
  )
}

export async function exportSummaryReportPdf(data: SummaryStats, month: number, year: number, branchName?: string) {
  const monthLabel = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]
  await saveDocument(
    <SummaryReportDocument data={data} month={month} year={year} branchName={branchName} />,
    `Bindu_Summary_${branchName ? `${branchName.replace(/\s+/g, '_')}_` : ''}${monthLabel}_${year}.pdf`
  )
}
