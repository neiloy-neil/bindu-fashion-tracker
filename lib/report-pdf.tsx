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

type WholesaleChallanRow = {
  challanNumber: string
  buyerName: string
  date: string
  netAmount: number
  collected: number
  remainingDue: number
  status: string
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
  wholesale?: {
    invoiced: number
    collected: number
    outstanding: number
    challans: WholesaleChallanRow[]
  } | null
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

  const allChallans = branchData.flatMap(b => (b.wholesale?.challans || []).map(c => ({ ...c, branchName: b.branchName })))
  const totalWholesaleInvoiced = branchData.reduce((s, b) => s + (b.wholesale?.invoiced ?? 0), 0)
  const totalWholesaleCollected = branchData.reduce((s, b) => s + (b.wholesale?.collected ?? 0), 0)
  const totalWholesaleOutstanding = branchData.reduce((s, b) => s + (b.wholesale?.outstanding ?? 0), 0)

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
      {allChallans.length > 0 && (
        <Page size="A4" orientation="landscape" style={styles.page}>
          <Text style={styles.title}>Wholesale Challans — {monthName} {year}</Text>
          <View style={[styles.statRow, { marginBottom: 12 }]}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Invoiced</Text>
              <Text style={styles.statValue}>{amount(totalWholesaleInvoiced)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Collected</Text>
              <Text style={styles.statValue}>{amount(totalWholesaleCollected)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Outstanding</Text>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>{amount(totalWholesaleOutstanding)}</Text>
            </View>
          </View>
          <View style={styles.section}>
            <Table
              headers={['Date', 'Challan #', 'Buyer', 'Branch', 'Net Amount', 'Collected', 'Due', 'Status']}
              widths={[10, 14, 20, 14, 11, 11, 11, 9]}
              rows={allChallans.map(c => [
                new Date(c.date).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' }),
                c.challanNumber,
                c.buyerName,
                c.branchName,
                amount(c.netAmount),
                amount(c.collected),
                c.remainingDue > 0 ? amount(c.remainingDue) : '-',
                c.status.replace('_', ' '),
              ])}
            />
          </View>
        </Page>
      )}
    </Document>
  )
}

type WholesaleSummary = {
  totalChallans: number
  totalNetAmount: number
  totalCollected: number
  totalOutstanding: number
  activeBuyers: number
  pendingChallans: number
  methodBreakdown?: Record<string, number>
}

function SummaryReportDocument({
  data,
  month,
  year,
  branchName,
  wholesaleData,
}: {
  data: SummaryStats
  month: number
  year: number
  branchName?: string
  wholesaleData?: WholesaleSummary
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

        {wholesaleData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Wholesale Summary</Text>
            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Invoiced</Text>
                <Text style={styles.statValue}>{amount(wholesaleData.totalNetAmount)}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Collected</Text>
                <Text style={styles.statValue}>{amount(wholesaleData.totalCollected)}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Outstanding</Text>
                <Text style={styles.statValue}>{amount(wholesaleData.totalOutstanding)}</Text>
              </View>
            </View>
            <Table
              headers={['Metric', 'Value']}
              widths={[70, 30]}
              rows={[
                ['Total Challans', String(wholesaleData.totalChallans)],
                ['Active Buyers', String(wholesaleData.activeBuyers)],
                ['Unpaid / Partial Challans', String(wholesaleData.pendingChallans)],
                ...Object.entries(wholesaleData.methodBreakdown || {}).map(([m, v]) => [`Payment – ${m.replace(/_/g, ' ')}`, amount(v as number)]),
              ]}
            />
          </View>
        )}
      </Page>
    </Document>
  )
}

type LedgerEntry = {
  type: 'PURCHASE' | 'PAYMENT'
  date: string
  amount: number
  runningBalance: number
  invoiceNumber?: string | null
  note?: string | null
  method?: string | null
  approvalStatus?: string | null
  isOpeningDue?: boolean
  branch?: { name: string } | null
  transactionRef?: string | null
}

function PartyLedgerDocument({ partyName, balance, entries, startDate, endDate }: {
  partyName: string
  balance: number
  entries: LedgerEntry[]
  startDate?: string
  endDate?: string
}) {
  const dateLabel = startDate && endDate
    ? `${new Date(startDate).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })} – ${new Date(endDate).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}`
    : 'All time'
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.logoWrap}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={BINDU_LOGO} style={styles.logo} />
        </View>
        <Text style={styles.title}>Party Ledger — {partyName}</Text>
        <Text style={styles.subtitle}>
          Period: {dateLabel} · Generated: {new Date().toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
        <View style={[styles.statRow, { marginBottom: 12 }]}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Current Balance Due</Text>
            <Text style={[styles.statValue, { color: balance > 0 ? '#EF4444' : '#10B981' }]}>Tk {formatCurrency(balance)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Period Transactions</Text>
            <Text style={styles.statValue}>{entries.length}</Text>
          </View>
        </View>
        <View style={styles.section}>
          <Table
            headers={['Date', 'Type', 'Details', 'Debit (Owed)', 'Credit (Paid)', 'Balance']}
            widths={[12, 10, 36, 14, 14, 14]}
            rows={entries.map(e => [
              new Date(e.date).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' }),
              e.type === 'PURCHASE' ? (e.isOpeningDue ? 'Opening Due' : 'Purchase') : 'Payment',
              e.type === 'PURCHASE'
                ? [e.invoiceNumber ? `Inv: ${e.invoiceNumber}` : '', e.note || ''].filter(Boolean).join(' · ') || '-'
                : [e.method || '', e.transactionRef ? `Ref: ${e.transactionRef}` : '', e.branch?.name || '', e.note || ''].filter(Boolean).join(' · ') || '-',
              e.type === 'PURCHASE' ? amount(e.amount) : '-',
              e.type === 'PAYMENT' ? amount(e.amount) : '-',
              amount(e.runningBalance),
            ])}
          />
        </View>
      </Page>
    </Document>
  )
}

type WholesaleBuyerLedgerEntry = {
  kind: 'challan' | 'payment' | 'return'
  date: string
  ref: string
  details: string
  debit: number
  credit: number
  balance: number
}

function WholesaleBuyerLedgerDocument({ buyerName, balance, entries }: { buyerName: string; balance: number; entries: WholesaleBuyerLedgerEntry[] }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.logoWrap}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={BINDU_LOGO} style={styles.logo} />
        </View>
        <Text style={styles.title}>Wholesale Buyer Ledger — {buyerName}</Text>
        <Text style={styles.subtitle}>Generated: {new Date().toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
        <View style={[styles.statRow, { marginBottom: 12 }]}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Outstanding Balance</Text>
            <Text style={[styles.statValue, { color: balance > 0 ? '#EF4444' : '#10B981' }]}>Tk {formatCurrency(balance)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Transactions</Text>
            <Text style={styles.statValue}>{entries.length}</Text>
          </View>
        </View>
        <View style={styles.section}>
          <Table
            headers={['Date', 'Type', 'Reference', 'Details', 'Debit', 'Credit', 'Balance']}
            widths={[10, 10, 16, 28, 12, 12, 12]}
            rows={entries.map(e => [
              new Date(e.date).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' }),
              e.kind === 'challan' ? 'Challan' : e.kind === 'payment' ? 'Payment' : 'Return',
              e.ref,
              e.details,
              e.debit > 0 ? amount(e.debit) : '-',
              e.credit > 0 ? amount(e.credit) : '-',
              amount(e.balance),
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

type ChallanData = {
  challanNumber: string
  date: string
  status: string
  totalAmount: number
  discount: number
  netAmount: number
  paidAtDelivery: number
  remainingDue: number
  deliveryPerson: string | null
  notes: string | null
  buyer: { name: string; contactPerson: string | null; contactNumber: string | null; address: string | null }
  branch: { name: string; address: string | null }
  items: { description: string; quantity: number | null; unitPrice: number | null; amount: number; note: string | null }[]
  payments: { amount: number; method: string; note: string | null; collectedAt: string }[]
  returns: { amount: number; reason: string | null; date: string }[]
  companyName?: string
}

function ChallanDocument({ challan }: { challan: ChallanData }) {
  const totalPaid = challan.payments.reduce((s, p) => s + p.amount, 0)
  const totalReturns = challan.returns.reduce((s, r) => s + r.amount, 0)
  const companyName = challan.companyName || 'Bindu Premium'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.logoWrap}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={BINDU_LOGO} style={styles.logo} />
        </View>

        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: '#1a1a1a', paddingBottom: 12, marginBottom: 16 }}>
          <View>
            <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold' }}>{companyName}</Text>
            <Text style={{ fontSize: 10, color: '#666', marginTop: 3 }}>{challan.branch.name}{challan.branch.address ? ` · ${challan.branch.address}` : ''}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#2563eb' }}>CHALLAN</Text>
            <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 2 }}>#{challan.challanNumber}</Text>
            <Text style={{ fontSize: 9, color: '#666', marginTop: 2 }}>{new Date(challan.date).toLocaleDateString('en-BD', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
          </View>
        </View>

        {/* Bill To */}
        <View style={{ flexDirection: 'row', gap: 20, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Bill To</Text>
            <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold' }}>{challan.buyer.name}</Text>
            {challan.buyer.contactPerson && <Text style={{ fontSize: 9, color: '#555', marginTop: 2 }}>{challan.buyer.contactPerson}</Text>}
            {challan.buyer.contactNumber && <Text style={{ fontSize: 9, color: '#555', marginTop: 1 }}>{challan.buyer.contactNumber}</Text>}
            {challan.buyer.address && <Text style={{ fontSize: 9, color: '#777', marginTop: 2 }}>{challan.buyer.address}</Text>}
          </View>
          {challan.deliveryPerson && (
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Delivery By</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold' }}>{challan.deliveryPerson}</Text>
            </View>
          )}
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Table
            headers={['Description', 'Qty', 'Unit Price', 'Amount']}
            widths={[52, 12, 18, 18]}
            rows={challan.items.map(item => [
              item.description + (item.note ? ` (${item.note})` : ''),
              item.quantity != null ? String(item.quantity) : '—',
              item.unitPrice != null ? amount(item.unitPrice) : '—',
              amount(item.amount),
            ])}
          />
        </View>

        {/* Totals */}
        <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
          <View style={{ minWidth: 200 }}>
            {challan.discount > 0 && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                  <Text style={{ color: '#666', fontSize: 9 }}>Subtotal</Text>
                  <Text style={{ fontSize: 9 }}>{amount(challan.totalAmount)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                  <Text style={{ color: '#666', fontSize: 9 }}>Discount</Text>
                  <Text style={{ fontSize: 9, color: '#dc2626' }}>−{amount(challan.discount)}</Text>
                </View>
              </>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 4, paddingBottom: 2 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11 }}>Net Total</Text>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11 }}>{amount(challan.netAmount)}</Text>
            </View>
            {challan.paidAtDelivery > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                <Text style={{ color: '#059669', fontSize: 9 }}>Paid at Delivery</Text>
                <Text style={{ color: '#059669', fontSize: 9 }}>{amount(challan.paidAtDelivery)}</Text>
              </View>
            )}
            {totalPaid > challan.paidAtDelivery && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                <Text style={{ color: '#059669', fontSize: 9 }}>Total Paid</Text>
                <Text style={{ color: '#059669', fontSize: 9 }}>{amount(totalPaid)}</Text>
              </View>
            )}
            {totalReturns > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                <Text style={{ color: '#d97706', fontSize: 9 }}>Returns</Text>
                <Text style={{ color: '#d97706', fontSize: 9 }}>−{amount(totalReturns)}</Text>
              </View>
            )}
            {challan.remainingDue > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 4 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', color: '#dc2626', fontSize: 11 }}>Balance Due</Text>
                <Text style={{ fontFamily: 'Helvetica-Bold', color: '#dc2626', fontSize: 11 }}>{amount(challan.remainingDue)}</Text>
              </View>
            )}
          </View>
        </View>

        {challan.notes && (
          <View style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10, marginTop: 10 }}>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#666', textTransform: 'uppercase', marginBottom: 3 }}>Notes</Text>
            <Text style={{ fontSize: 9, color: '#555' }}>{challan.notes}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={{ flexDirection: 'row', gap: 40, marginTop: 40, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#eee' }}>
          <View style={{ flex: 1 }}>
            <View style={{ borderBottomWidth: 1, borderBottomColor: '#1a1a1a', height: 28, marginBottom: 4 }} />
            <Text style={{ fontSize: 9, color: '#666' }}>Authorised Signature</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ borderBottomWidth: 1, borderBottomColor: '#1a1a1a', height: 28, marginBottom: 4 }} />
            <Text style={{ fontSize: 9, color: '#666' }}>Receiver Signature</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export async function exportChallanPdf(challan: ChallanData) {
  await saveDocument(
    <ChallanDocument challan={challan} />,
    `challan-${challan.challanNumber}.pdf`
  )
}

export async function exportPartyLedgerPdf(partyName: string, balance: number, entries: LedgerEntry[], startDate?: string, endDate?: string) {
  const suffix = startDate && endDate ? `${startDate}_to_${endDate}` : new Date().toISOString().slice(0, 10)
  await saveDocument(
    <PartyLedgerDocument partyName={partyName} balance={balance} entries={entries} startDate={startDate} endDate={endDate} />,
    `party-ledger-${partyName.replace(/\s+/g, '_')}-${suffix}.pdf`
  )
}

export async function exportWholesaleBuyerLedgerPdf(buyerName: string, balance: number, entries: WholesaleBuyerLedgerEntry[]) {
  await saveDocument(
    <WholesaleBuyerLedgerDocument buyerName={buyerName} balance={balance} entries={entries} />,
    `wholesale-ledger-${buyerName.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.pdf`
  )
}

export async function exportSummaryReportPdf(data: SummaryStats, month: number, year: number, branchName?: string, wholesaleData?: WholesaleSummary) {
  const monthLabel = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]
  await saveDocument(
    <SummaryReportDocument data={data} month={month} year={year} branchName={branchName} wholesaleData={wholesaleData} />,
    `Bindu_Summary_${branchName ? `${branchName.replace(/\s+/g, '_')}_` : ''}${monthLabel}_${year}.pdf`
  )
}
