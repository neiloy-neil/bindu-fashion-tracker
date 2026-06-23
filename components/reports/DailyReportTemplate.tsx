import Image from 'next/image'
import { formatCurrency, formatDate } from '@/lib/utils'

type ReportReceivedTransfer = {
  amount: number
  note?: string | null
  dailyEntry?: {
    branch?: { name: string } | null
  } | null
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

export default function DailyReportTemplate({ entryData }: { entryData: ReportEntryData | null }) {
  const incomeItems = entryData?.items?.filter((item) => item.amount > 0) || []
  const receivedTransfers = entryData?.receivedTransfers || []
  const expenseEntries = entryData?.expenseEntries || []
  const transfers = entryData?.transfers || []
  const payments = entryData?.payments || []
  const advanceSalaries = entryData?.advanceSalaries || []

  if (!entryData) return null;

  return (
    <div className="bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border)] shadow-xl text-foreground">
      <div className="text-center mb-8 border-b border-[var(--border)] pb-6">
        <Image src="/bindu-logo.webp" alt="Bindu Premium" width={192} height={64} className="h-16 w-auto mx-auto mb-4 object-contain" />
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>Bindu Premium - Daily Report</h1>
        <div className="flex justify-center gap-8 text-[var(--text-secondary)]">
          <span>Branch: <strong className="text-foreground">{entryData.branch?.name}</strong></span>
          <span>Date: <strong className="text-foreground">{formatDate(entryData.date)}</strong></span>
        </div>
      </div>

      {/* Store Timings */}
      <div className="mb-8">
        <h3 className="text-[var(--accent)] font-semibold uppercase tracking-wider font-bold text-sm mb-4 border-b border-[var(--border)] pb-2">Store Timing</h3>
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

      {/* Income Section */}
      <div className="mb-8">
        <h3 className="text-[var(--accent)] font-semibold uppercase tracking-wider font-bold text-sm mb-4 border-b border-[var(--border)] pb-2">Income</h3>
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
              {incomeItems.map((item, i: number) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0 bg-[var(--bg-card)]">
                  <td className="px-4 py-3 font-medium text-foreground">{item.category?.name || '-'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{item.note || '-'}{item.partyName ? ` — ${item.partyName}` : ''}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums font-mono text-[var(--accent)]">৳{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-[var(--text-secondary)] italic text-sm py-2 mb-4">No income items recorded.</div>
        )}

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
                {receivedTransfers.map((item, i: number) => (
                  <tr key={`rt-${i}`} className="border-b border-[var(--border)] last:border-0 bg-[var(--bg-card)]">
                    <td className="px-4 py-3 font-medium text-foreground">{item.dailyEntry?.branch?.name || '-'}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{item.note || '-'}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums font-mono text-[var(--accent)]">৳{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expenses Section */}
      <div className="mb-8">
        <h3 className="text-[var(--accent)] font-semibold uppercase tracking-wider font-bold text-sm mb-4 border-b border-[var(--border)] pb-2">Expenses</h3>
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
              {expenseEntries.map((item, i: number) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0 bg-[var(--bg-card)]">
                  <td className="px-4 py-3 font-medium text-foreground">{item.category?.name || '-'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{item.note || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums font-mono text-[var(--accent)]">৳{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-[var(--text-secondary)] italic text-sm py-2">No expenses recorded.</div>
        )}
      </div>

      {/* Transfers Section */}
      <div className="mb-8">
        <h3 className="text-[var(--accent)] font-semibold uppercase tracking-wider font-bold text-sm mb-4 border-b border-[var(--border)] pb-2">Transfers</h3>
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
              {transfers.map((item, i: number) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0 bg-[var(--bg-card)]">
                  <td className="px-4 py-3 font-medium text-foreground">{item.account?.name || '-'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{item.note || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums font-mono text-[var(--accent)]">৳{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-[var(--text-secondary)] italic text-sm py-2">No transfers recorded.</div>
        )}
      </div>

      {/* Payments Section */}
      <div className="mb-8">
        <h3 className="text-[var(--accent)] font-semibold uppercase tracking-wider font-bold text-sm mb-4 border-b border-[var(--border)] pb-2">Party Payments</h3>
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
              {payments.map((item, i: number) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0 bg-[var(--bg-card)]">
                  <td className="px-4 py-3 font-medium text-foreground">{item.party?.name || '-'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {item.method}
                    {item.attachmentUrl && (
                      <a href={item.attachmentUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline ml-2 text-xs font-medium">
                        (View Payslip)
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.method === 'CHEQUE' 
                      ? <span className={`px-2 py-1 rounded text-xs font-bold ${item.cheque?.status === 'APPROVED' ? 'bg-[var(--success)]/20 text-[var(--success)]' : item.cheque?.status === 'REJECTED' ? 'bg-[var(--danger)]/20 text-[var(--danger)]' : 'bg-[var(--accent)]/20 text-[var(--accent)]'}`}>{item.cheque?.status}</span>
                      : <span className="px-2 py-1 rounded text-xs font-bold bg-[var(--success)]/20 text-[var(--success)]">CLEARED</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{item.note || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums font-mono text-[var(--accent)]">৳{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-[var(--text-secondary)] italic text-sm py-2">No party payments recorded.</div>
        )}
      </div>

      {/* Advance Salary Section */}
      <div className="mb-4">
        <h3 className="text-[var(--accent)] font-semibold uppercase tracking-wider font-bold text-sm mb-4 border-b border-[var(--border)] pb-2">Advance Salary</h3>
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
              {advanceSalaries.map((item, i: number) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0 bg-[var(--bg-card)]">
                  <td className="px-4 py-3 font-medium text-foreground">{item.employee?.name || '-'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{item.type}</td>
                  <td className="px-4 py-3 text-foreground">{item.type === 'PRODUCT' ? item.productDescription : '-'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{item.note || '-'}</td>
                   <td className="px-4 py-3 text-right font-bold tabular-nums font-mono text-[var(--accent)]">{item.type === 'CASH' ? `৳${formatCurrency(item.amount ?? 0)}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-[var(--text-secondary)] italic text-sm py-2">No advance salary recorded.</div>
        )}
      </div>

    </div>
  )
}
