import re

with open('components/dashboard/EntryViewModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add transfers render section after expense details
transfer_addition = """          {renderSection('Expense Details', 'EXPENSE')}

          {entry.transfers && entry.transfers.length > 0 && (
            <div className="mb-6">
              <h4 className="font-bold text-[#a78bfa] mb-3 pb-1 border-b border-[#1e2d45]">Sent Transfers</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {entry.transfers.map((t: any, i: number) => (
                  <div key={`st-${i}`} className="p-3 rounded-lg border border-[#1e2d45] bg-[#0a0f18]">
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-xs text-[#8899aa]">{t.account?.name || '-'}</div>
                      {t.status === 'PENDING' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f59e0b]/20 text-[#f59e0b]">PENDING</span>}
                      {t.status === 'ACKNOWLEDGED' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#10b981]/20 text-[#10b981]">ACKNOWLEDGED</span>}
                      {t.status === 'REJECTED' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ef4444]/20 text-[#ef4444]">REJECTED</span>}
                      {t.status === 'NOT_APPLICABLE' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#64748b]/20 text-[#64748b]">N/A</span>}
                    </div>
                    <div className="text-[#a78bfa] font-bold">৳{formatCurrency(t.amount)}</div>
                    {t.rejectionReason && t.status === 'REJECTED' && <div className="text-xs text-[#ef4444] mt-1 italic">Reason: {t.rejectionReason}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {entry.receivedTransfers && entry.receivedTransfers.length > 0 && (
            <div className="mb-6">
              <h4 className="font-bold text-[#34d399] mb-3 pb-1 border-b border-[#1e2d45]">Acknowledged Incoming Transfers</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {entry.receivedTransfers.map((t: any, i: number) => (
                  <div key={`rt-${i}`} className="p-3 rounded-lg border border-[#1e2d45] bg-[#0a0f18]">
                    <div className="text-xs text-[#8899aa] mb-1">From: {t.dailyEntry?.branch?.name || '-'}</div>
                    <div className="text-[#34d399] font-bold">৳{formatCurrency(t.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}"""

content = content.replace("          {renderSection('Expense Details', 'EXPENSE')}", transfer_addition)

with open('components/dashboard/EntryViewModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
