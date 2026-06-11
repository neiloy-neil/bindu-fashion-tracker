import { INCOME_COLUMNS, EXPENSE_COLUMNS } from '@/lib/types'
import { formatCurrency, computeTotals } from '@/lib/utils'

export default function EntryViewModal({ entry, changesStr, onClose }: { entry: any, changesStr: string, onClose: () => void }) {
  const changes = JSON.parse(changesStr || '{}')
  const totals = computeTotals(entry)
  
  // Compute what totals would be if changes were applied
  const simulatedEntry = { ...entry, ...changes }
  const simulatedTotals = computeTotals(simulatedEntry)

  const renderSection = (title: string, columns: any[]) => (
    <div className="mb-6">
      <h4 className="font-bold text-[#00d2ff] mb-3 pb-1 border-b border-[#1e2d45]">{title}</h4>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {columns.map(c => {
          const oldVal = entry[c.key] || 0
          const isChanged = c.key in changes
          const newVal = isChanged ? changes[c.key] : oldVal
          
          if (oldVal === 0 && !isChanged) return null // Hide zero values unless they are changed

          return (
            <div key={c.key} className={`p-3 rounded-lg border ${isChanged ? 'border-[#f59e0b] bg-[rgba(245,158,11,0.1)]' : 'border-[#1e2d45] bg-[#0a0f18]'}`}>
              <div className="text-xs text-[#8899aa] mb-1">{c.label}</div>
              {isChanged ? (
                <div className="flex items-center gap-2">
                  <span className="line-through text-[#8899aa] text-sm">৳{formatCurrency(oldVal)}</span>
                  <span className="text-[#f59e0b] font-bold">৳{formatCurrency(newVal)}</span>
                </div>
              ) : (
                <div className="text-white font-medium">৳{formatCurrency(oldVal)}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-4 border-b border-[#1e2d45] flex justify-between items-center bg-[#0a0f18]">
          <div>
            <h3 className="font-bold text-white text-lg">Daily Entry Details</h3>
            <p className="text-sm text-[#8899aa]">{entry.branch?.name} Branch • {new Date(entry.date).toLocaleDateString('en-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <button onClick={onClose} className="text-[#8899aa] hover:text-white transition-colors text-xl font-bold px-2">
            ✕
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto" style={{ flex: 1 }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-[#0a1628] rounded-xl border border-[#1e2d45]">
            <div>
              <div className="text-xs text-[#8899aa] uppercase tracking-wider mb-1">Total Sales</div>
              <div className="text-lg font-bold text-[#10b981]">৳{formatCurrency(simulatedTotals.totalSale)}</div>
              {simulatedTotals.totalSale !== totals.totalSale && (
                <div className="text-xs text-[#f59e0b]">Was: ৳{formatCurrency(totals.totalSale)}</div>
              )}
            </div>
            <div>
              <div className="text-xs text-[#8899aa] uppercase tracking-wider mb-1">Total Amount</div>
              <div className="text-lg font-bold text-[#10b981]">৳{formatCurrency(simulatedTotals.totalAmount)}</div>
            </div>
            <div>
              <div className="text-xs text-[#8899aa] uppercase tracking-wider mb-1">Total Expenses</div>
              <div className="text-lg font-bold text-[#ef4444]">৳{formatCurrency(simulatedTotals.totalExpense)}</div>
              {simulatedTotals.totalExpense !== totals.totalExpense && (
                <div className="text-xs text-[#f59e0b]">Was: ৳{formatCurrency(totals.totalExpense)}</div>
              )}
            </div>
            <div>
              <div className="text-xs text-[#8899aa] uppercase tracking-wider mb-1">Net Balance</div>
              <div className={`text-lg font-bold ${simulatedTotals.netBalance >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                ৳{formatCurrency(simulatedTotals.netBalance)}
              </div>
            </div>
          </div>

          {renderSection('Income Details', INCOME_COLUMNS)}
          {renderSection('Expense Details', EXPENSE_COLUMNS)}

          {(entry.notes || entry.cashDifferenceNote) && (
            <div className="mt-6 p-4 bg-[rgba(0,210,255,0.05)] border border-[rgba(0,210,255,0.1)] rounded-xl">
              {entry.notes && (
                <div className="mb-2">
                  <span className="text-[#00d2ff] font-bold text-sm">Notes: </span>
                  <span className="text-white text-sm">{entry.notes}</span>
                </div>
              )}
              {entry.cashDifferenceNote && (
                <div>
                  <span className="text-[#00d2ff] font-bold text-sm">Cash Difference Note: </span>
                  <span className="text-white text-sm">{entry.cashDifferenceNote}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
