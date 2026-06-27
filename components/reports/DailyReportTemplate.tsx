import Image from 'next/image'
import { formatCurrency, formatDate } from '@/lib/utils'

type ReportReceivedTransfer = {
  amount: number
  note?: string | null
  dailyEntry?: { branch?: { name: string } | null } | null
}

type ReportEntryItem = {
  amount: number
  note?: string | null
  partyName?: string | null
  category?: { name: string; type: 'INCOME' | 'EXPENSE' } | null
}

type ReportTransfer = {
  amount: number
  note?: string | null
  account?: { name: string } | null
}

type ReportPayment = {
  method: string
  amount: number
  note?: string | null
  party?: { name: string } | null
  cheque?: { status?: string | null } | null
  attachmentUrl?: string | null
  approvalStatus?: string | null
}

type ReportExpenseEntry = {
  amount: number
  note?: string | null
  category?: { name: string } | null
}

type ReportAdvanceSalary = {
  type: string
  amount?: number | null
  note?: string | null
  productDescription?: string | null
  employee?: { name: string } | null
}

type ReportEntryData = {
  date: string
  openingTime?: string | null
  closingTime?: string | null
  branch?: { name: string } | null
  items?: ReportEntryItem[]
  receivedTransfers?: ReportReceivedTransfer[]
  expenseEntries?: ReportExpenseEntry[]
  transfers?: ReportTransfer[]
  payments?: ReportPayment[]
  advanceSalaries?: ReportAdvanceSalary[]
}

function SectionTotal({ label, amount }: { label: string; amount: number }) {
  return (
    <tr className="bg-[var(--bg-primary)]">
      <td colSpan={2} className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">{label}</td>
      <td className="px-4 py-2 text-right font-bold tabular-nums font-mono text-[var(--accent)]">৳{formatCurrency(amount)}</td>
    </tr>
  )
}

export default function DailyReportTemplate({ entryData }: { entryData: ReportEntryData | null }) {
  if (!entryData) return null

  const incomeItems = entryData.items?.filter(item => item.category?.type === 'INCOME' && item.amount > 0) ?? []
  const receivedTransfers = entryData.receivedTransfers ?? []
  const expenseEntries = entryData.expenseEntries ?? []
  const transfers = entryData.transfers ?? []
  const payments = entryData.payments ?? []
  const advanceSalaries = entryData.advanceSalaries ?? []

  const totalIncome = incomeItems.reduce((s, i) => s + i.amount, 0)
    + receivedTransfers.reduce((s, t) => s + t.amount, 0)

  const totalExpenses = expenseEntries.reduce((s, e) => s + e.amount, 0)
  const totalTransfers = transfers.reduce((s, t) => s + t.amount, 0)
  const totalPayments = payments
    .filter(p => p.method !== 'CHEQUE' || p.cheque?.status === 'APPROVED')
    .reduce((s, p) => s + p.amount, 0)
  const totalAdvanceCash = advanceSalaries
    .filter(a => a.type === 'CASH')
    .reduce((s, a) => s + (a.amount ?? 0), 0)

  const grandTotalExpenses = totalExpenses + totalTransfers + totalPayments + totalAdvanceCash

  const sectionHeader = (title: string) => (
    <h3 className="text-[var(--accent)] font-semibold uppercase tracking-wider font-bold text-sm mb-4 border-b border-[var(--border)] pb-2">{title}</h3>
  )

  const emptyRow = (msg: string) => (
    <div className="text-[var(--text-secondary)] italic text-sm py-2">{msg}</div>
  )

  return (
    <div className="bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border)] shadow-xl text-foreground">
      {/* Header */}
      <div className="text-center mb-6 border-b border-[var(--border)] pb-6">
        <Image src="/bindu-logo.webp" alt="Bindu Premium" width={192} height={64} className="h-16 w-auto mx-auto mb-4 object-contain" />
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>Bindu Premium — Daily Report</h1>
        <div className="flex justify-center gap-8 text-[var(--text-secondary)] mb-6">
          <span>Branch: <strong className="text-foreground">{entryData.branch?.name}</strong></span>
          <span>Date: <strong className="text-foreground">{formatDate(entryData.date)}</strong></span>
        </div>

        {/* Summary cards — visible at a glance before reading sections */}
        <div className="grid grid-cols-3 gap-4 mt-2">
          <div className="bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-xl p-4 text-center">
            <div className="text-xs uppercase tracking-wider text-[var(--text-secondary)] mb-1">Total Sale</div>
            <div className="text-2xl font-bold font-mono text-[var(--success)]">৳{formatCurrency(totalIncome)}</div>
          </div>
          <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-xl p-4 text-center">
            <div className="text-xs uppercase tracking-wider text-[var(--text-secondary)] mb-1">Total Expenses</div>
            <div className="text-2xl font-bold font-mono" style={{ color: 'var(--danger)' }}>৳{formatCurrency(grandTotalExpenses)}</div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">
              Exp ৳{formatCurrency(totalExpenses)} · Transfers ৳{formatCurrency(totalTransfers)} · Payments ৳{formatCurrency(totalPayments)} · Advance ৳{formatCurrency(totalAdvanceCash)}
            </div>
          </div>
          <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-xl p-4 text-center">
            <div className="text-xs uppercase tracking-wider text-[var(--text-secondary)] mb-1">Total Cash in Hand</div>
            <div className={`text-2xl font-bold font-mono ${totalIncome - grandTotalExpenses >= 0 ? 'text-[var(--accent)]' : 'text-[var(--danger)]'}`}>
              ৳{formatCurrency(totalIncome - grandTotalExpenses)}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">Sale − Expenses</div>
          </div>
        </div>
      </div>

      {/* Store Timings */}
      <div className="mb-8">
        {sectionHeader('Store Timing')}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[var(--bg-primary)] p-4 rounded-lg">
            <div className="text-[var(--text-secondary)] text-xs uppercase mb-1">Opening Time</div>
            <div className="font-bold text-lg">{entryData.openingTime || 'N/A'}</div>
          </div>
          <div className="bg-[var(--bg-primary)] p-4 rounded-lg">
            <div className="text-[var(--text-secondary)] text-xs uppercase mb-1">Closing Time</div>
            <div className="font-bold text-lg">{entryData.closingTime || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Income */}
      <div className="mb-8">
        {sectionHeader('Income')}
        {incomeItems.length > 0 ? (
          <table className="w-full text-sm text-left mb-4">
            <thead className="text-xs text-[var(--text-secondary)] uppercase bg-[var(--bg-primary)] border-b border-[var(--border)]">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {incomeItems.map((item, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0 bg-[var(--bg-card)]">
                  <td className="px-4 py-3 font-medium text-foreground">{item.category?.name || '-'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{item.note || '-'}{item.partyName ? ` — ${item.partyName}` : ''}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums font-mono text-[var(--accent)]">৳{formatCurrency(item.amount)}</td>
                </tr>
              ))}
              <SectionTotal label="Income Subtotal" amount={incomeItems.reduce((s, i) => s + i.amount, 0)} />
            </tbody>
          </table>
        ) : emptyRow('No income items recorded.')}

        {receivedTransfers.length > 0 && (
          <div className="mt-4">
            <h4 className="text-[var(--accent)] font-semibold text-xs uppercase mb-2">Acknowledged Incoming Transfers</h4>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[var(--text-secondary)] uppercase bg-[var(--bg-primary)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-4 py-3">From Branch</th>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {receivedTransfers.map((item, i) => (
                  <tr key={i} className="border-b border-[var(--border)] last:border-0 bg-[var(--bg-card)]">
                    <td className="px-4 py-3 font-medium text-foreground">{item.dailyEntry?.branch?.name || '-'}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{item.note || '-'}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums font-mono text-[var(--accent)]">৳{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 flex justify-end">
          <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg px-6 py-2 text-right">
            <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Total Income</div>
            <div className="text-xl font-bold font-mono text-[var(--accent)]">৳{formatCurrency(totalIncome)}</div>
          </div>
        </div>
      </div>

      {/* Expenses */}
      <div className="mb-8">
        {sectionHeader('Expenses')}
        {expenseEntries.length > 0 ? (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[var(--text-secondary)] uppercase bg-[var(--bg-primary)] border-b border-[var(--border)]">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenseEntries.map((item, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0 bg-[var(--bg-card)]">
                  <td className="px-4 py-3 font-medium text-foreground">{item.category?.name || '-'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{item.note || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums font-mono text-[var(--accent)]">৳{formatCurrency(item.amount)}</td>
                </tr>
              ))}
              <SectionTotal label="Expenses Subtotal" amount={totalExpenses} />
            </tbody>
          </table>
        ) : emptyRow('No expenses recorded.')}
      </div>

      {/* Transfers */}
      <div className="mb-8">
        {sectionHeader('Transfers')}
        {transfers.length > 0 ? (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[var(--text-secondary)] uppercase bg-[var(--bg-primary)] border-b border-[var(--border)]">
              <tr>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((item, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0 bg-[var(--bg-card)]">
                  <td className="px-4 py-3 font-medium text-foreground">{item.account?.name || '-'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{item.note || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums font-mono text-[var(--accent)]">৳{formatCurrency(item.amount)}</td>
                </tr>
              ))}
              <SectionTotal label="Transfers Subtotal" amount={totalTransfers} />
            </tbody>
          </table>
        ) : emptyRow('No transfers recorded.')}
      </div>

      {/* Party Payments */}
      <div className="mb-8">
        {sectionHeader('Party Payments')}
        {payments.length > 0 ? (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[var(--text-secondary)] uppercase bg-[var(--bg-primary)] border-b border-[var(--border)]">
              <tr>
                <th className="px-4 py-3">Party</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((item, i) => {
                const statusLabel = item.method === 'CHEQUE'
                  ? item.cheque?.status
                  : (item.approvalStatus === 'PENDING' ? 'PENDING APPROVAL' : 'CLEARED')
                const statusClass = statusLabel === 'APPROVED' || statusLabel === 'CLEARED'
                  ? 'bg-[var(--success)]/20 text-[var(--success)]'
                  : statusLabel === 'REJECTED'
                  ? 'bg-[var(--danger)]/20 text-[var(--danger)]'
                  : 'bg-[var(--accent)]/20 text-[var(--accent)]'
                return (
                  <tr key={i} className="border-b border-[var(--border)] last:border-0 bg-[var(--bg-card)]">
                    <td className="px-4 py-3 font-medium text-foreground">{item.party?.name || '-'}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {item.method}
                      {item.attachmentUrl && (
                        <a href={item.attachmentUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline ml-2 text-xs font-medium">(View Payslip)</a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${statusClass}`}>{statusLabel}</span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{item.note || '-'}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums font-mono text-[var(--accent)]">৳{formatCurrency(item.amount)}</td>
                  </tr>
                )
              })}
              <SectionTotal label="Payments Subtotal" amount={totalPayments} />
            </tbody>
          </table>
        ) : emptyRow('No party payments recorded.')}
      </div>

      {/* Advance Salary */}
      <div className="mb-8">
        {sectionHeader('Advance Salary')}
        {advanceSalaries.length > 0 ? (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[var(--text-secondary)] uppercase bg-[var(--bg-primary)] border-b border-[var(--border)]">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {advanceSalaries.map((item, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0 bg-[var(--bg-card)]">
                  <td className="px-4 py-3 font-medium text-foreground">{item.employee?.name || '-'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{item.type}</td>
                  <td className="px-4 py-3 text-foreground">{item.type === 'PRODUCT' ? item.productDescription : '-'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{item.note || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums font-mono text-[var(--accent)]">
                    {item.type === 'CASH' ? `৳${formatCurrency(item.amount ?? 0)}` : '-'}
                  </td>
                </tr>
              ))}
              {totalAdvanceCash > 0 && <SectionTotal label="Advance Cash Subtotal" amount={totalAdvanceCash} />}
            </tbody>
          </table>
        ) : emptyRow('No advance salary recorded.')}
      </div>

    </div>
  )
}
