import { formatCurrency, formatDate } from '@/lib/utils'

export default function DailyReportTemplate({ entryData }: { entryData: any }) {
  const incomeItems = entryData?.items?.filter((i: any) => i.amount > 0) || []
  const receivedTransfers = entryData?.receivedTransfers || []
  const expenseEntries = entryData?.expenseEntries || []
  const transfers = entryData?.transfers || []
  const payments = entryData?.payments || []
  const advanceSalaries = entryData?.advanceSalaries || []

  if (!entryData) return null;

  return (
    <div className="bg-[#0f172a] p-8 rounded-xl border border-[#1e2d45] shadow-xl text-white">
      <div className="text-center mb-8 border-b border-[#1e2d45] pb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Bindu Fashion - Daily Report</h1>
        <div className="flex justify-center gap-8 text-[#8899aa]">
          <span>Branch: <strong className="text-white">{entryData.branch?.name}</strong></span>
          <span>Date: <strong className="text-white">{formatDate(entryData.date)}</strong></span>
        </div>
      </div>

      {/* Store Timings */}
      <div className="mb-8">
        <h3 className="text-[#3b82f6] font-semibold uppercase tracking-wider text-sm mb-4 border-b border-[#1e2d45] pb-2">Store Timing</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#162033] p-4 rounded-lg">
            <div className="text-[#8899aa] text-xs uppercase mb-1">Opening Time</div>
            <div className="font-bold text-lg">{entryData.openingTime || 'N/A'}</div>
          </div>
          <div className="bg-[#162033] p-4 rounded-lg">
            <div className="text-[#8899aa] text-xs uppercase mb-1">Closing Time</div>
            <div className="font-bold text-lg">{entryData.closingTime || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Income Section */}
      <div className="mb-8">
        <h3 className="text-[#34d399] font-semibold uppercase tracking-wider text-sm mb-4 border-b border-[#1e2d45] pb-2">Income</h3>
        {incomeItems.length > 0 ? (
          <table className="w-full text-sm text-left mb-4">
            <thead className="text-xs text-[#8899aa] uppercase bg-[#162033] border-b border-[#1e2d45]">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {incomeItems.map((item: any, i: number) => (
                <tr key={i} className="border-b border-[#1e2d45] last:border-0 bg-[#0a0f1e]">
                  <td className="px-4 py-3 font-medium text-white">{item.category?.name || '-'}</td>
                  <td className="px-4 py-3 text-[#8899aa]">{item.note || '-'}{item.partyName ? ` — ${item.partyName}` : ''}</td>
                  <td className="px-4 py-3 text-right font-bold text-[#34d399]">৳{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-[#8899aa] italic text-sm py-2 mb-4">No income items recorded.</div>
        )}

        {receivedTransfers.length > 0 && (
          <div className="mt-4">
            <h4 className="text-[#34d399] font-semibold text-xs uppercase mb-2">Acknowledged Incoming Transfers</h4>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[#8899aa] uppercase bg-[#162033] border-b border-[#1e2d45]">
                <tr>
                  <th className="px-4 py-3">From Branch</th>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {receivedTransfers.map((item: any, i: number) => (
                  <tr key={`rt-${i}`} className="border-b border-[#1e2d45] last:border-0 bg-[#0a0f1e]">
                    <td className="px-4 py-3 font-medium text-white">{item.dailyEntry?.branch?.name || '-'}</td>
                    <td className="px-4 py-3 text-[#8899aa]">{item.note || '-'}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#34d399]">৳{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expenses Section */}
      <div className="mb-8">
        <h3 className="text-[#f87171] font-semibold uppercase tracking-wider text-sm mb-4 border-b border-[#1e2d45] pb-2">Expenses</h3>
        {expenseEntries.length > 0 ? (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[#8899aa] uppercase bg-[#162033] border-b border-[#1e2d45]">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenseEntries.map((item: any, i: number) => (
                <tr key={i} className="border-b border-[#1e2d45] last:border-0 bg-[#0a0f1e]">
                  <td className="px-4 py-3 font-medium text-white">{item.category?.name || '-'}</td>
                  <td className="px-4 py-3 text-[#8899aa]">{item.note || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold text-[#f87171]">৳{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-[#8899aa] italic text-sm py-2">No expenses recorded.</div>
        )}
      </div>

      {/* Transfers Section */}
      <div className="mb-8">
        <h3 className="text-[#a78bfa] font-semibold uppercase tracking-wider text-sm mb-4 border-b border-[#1e2d45] pb-2">Transfers</h3>
        {transfers.length > 0 ? (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[#8899aa] uppercase bg-[#162033] border-b border-[#1e2d45]">
              <tr>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((item: any, i: number) => (
                <tr key={i} className="border-b border-[#1e2d45] last:border-0 bg-[#0a0f1e]">
                  <td className="px-4 py-3 font-medium text-white">{item.account?.name || '-'}</td>
                  <td className="px-4 py-3 text-[#8899aa]">{item.note || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold text-[#a78bfa]">৳{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-[#8899aa] italic text-sm py-2">No transfers recorded.</div>
        )}
      </div>

      {/* Payments Section */}
      <div className="mb-8">
        <h3 className="text-[#fb923c] font-semibold uppercase tracking-wider text-sm mb-4 border-b border-[#1e2d45] pb-2">Party Payments</h3>
        {payments.length > 0 ? (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[#8899aa] uppercase bg-[#162033] border-b border-[#1e2d45]">
              <tr>
                <th className="px-4 py-3">Party</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((item: any, i: number) => (
                <tr key={i} className="border-b border-[#1e2d45] last:border-0 bg-[#0a0f1e]">
                  <td className="px-4 py-3 font-medium text-white">{item.party?.name || '-'}</td>
                  <td className="px-4 py-3 text-[#8899aa]">
                    {item.method}
                    {item.attachmentUrl && (
                      <a href={item.attachmentUrl} target="_blank" rel="noreferrer" className="text-[#00d2ff] hover:underline ml-2 text-xs font-medium">
                        (View Payslip)
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.method === 'CHEQUE' 
                      ? <span className={`px-2 py-1 rounded text-xs font-bold ${item.cheque?.status === 'APPROVED' ? 'bg-[#10b981]/20 text-[#10b981]' : item.cheque?.status === 'REJECTED' ? 'bg-[#ef4444]/20 text-[#ef4444]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'}`}>{item.cheque?.status}</span>
                      : <span className="px-2 py-1 rounded text-xs font-bold bg-[#10b981]/20 text-[#10b981]">CLEARED</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-[#8899aa]">{item.note || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold text-[#fb923c]">৳{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-[#8899aa] italic text-sm py-2">No party payments recorded.</div>
        )}
      </div>

      {/* Advance Salary Section */}
      <div className="mb-4">
        <h3 className="text-[#38bdf8] font-semibold uppercase tracking-wider text-sm mb-4 border-b border-[#1e2d45] pb-2">Advance Salary</h3>
        {advanceSalaries.length > 0 ? (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[#8899aa] uppercase bg-[#162033] border-b border-[#1e2d45]">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {advanceSalaries.map((item: any, i: number) => (
                <tr key={i} className="border-b border-[#1e2d45] last:border-0 bg-[#0a0f1e]">
                  <td className="px-4 py-3 font-medium text-white">{item.employee?.name || '-'}</td>
                  <td className="px-4 py-3 text-[#8899aa]">{item.type}</td>
                  <td className="px-4 py-3 text-white">{item.type === 'PRODUCT' ? item.productDescription : '-'}</td>
                  <td className="px-4 py-3 text-[#8899aa]">{item.note || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold text-[#38bdf8]">{item.type === 'CASH' ? `৳${formatCurrency(item.amount)}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-[#8899aa] italic text-sm py-2">No advance salary recorded.</div>
        )}
      </div>

    </div>
  )
}
