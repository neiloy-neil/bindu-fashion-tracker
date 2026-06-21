import re

with open('components/reports/DailyReportTemplate.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

var_addition = """  const incomeItems = entryData?.items?.filter((i: any) => i.amount > 0) || []
  const receivedTransfers = entryData?.receivedTransfers || []
  const expenseEntries = entryData?.expenseEntries || []"""

content = content.replace("  const incomeItems = entryData?.items?.filter((i: any) => i.amount > 0) || []\n  const expenseEntries = entryData?.expenseEntries || []", var_addition)

income_addition = """        {incomeItems.length > 0 ? (
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
                  <td className="px-4 py-3 text-[#8899aa]">{item.note || '-'}</td>
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
        )}"""

old_income = """        {incomeItems.length > 0 ? (
          <table className="w-full text-sm text-left">
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
                  <td className="px-4 py-3 text-[#8899aa]">{item.note || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold text-[#34d399]">৳{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-[#8899aa] italic text-sm py-2">No income items recorded.</div>
        )}"""

content = content.replace(old_income, income_addition)

with open('components/reports/DailyReportTemplate.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
