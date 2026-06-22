import { formatCurrency, computeTotals } from '@/lib/utils'
import { Category } from '@/lib/types'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EntryViewModal({ entry, changesStr, onClose, onDeleted }: { entry: any, changesStr?: string, onClose: () => void, onDeleted?: () => void }) {
  const changes = JSON.parse(changesStr || '{}')
  const [userRole, setUserRole] = useState<'ADMIN'|'BRANCH'|null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  
  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(session => {
      if (session?.user) setUserRole(session.user.role)
    })
    fetch('/api/categories').then(r => r.json()).then(setCategories)
  }, [])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this entry? This cannot be undone.')) return
    
    try {
      const res = await fetch(`/api/entries/${entry.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete entry')
      }
      toast.success('Entry deleted successfully')
      if (onDeleted) onDeleted()
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const totals = computeTotals(entry)
  
  // Compute what totals would be if changes were applied
  const simulatedEntry = { ...entry }
  if (simulatedEntry.items) {
    simulatedEntry.items = simulatedEntry.items.map((i: any) => {
      if (i.category?.name in changes) {
        return { ...i, amount: changes[i.category.name] }
      }
      return i
    })
  }
  const simulatedTotals = computeTotals(simulatedEntry)

  const renderSection = (title: string, catType: 'INCOME'|'EXPENSE') => {
    const cats = categories.filter(c => c.type === catType)
    if (cats.length === 0) return null

    return (
      <div className="mb-6">
        <h4 className="font-bold text-[var(--accent)] mb-3 pb-1 border-b border-[var(--border)]">{title}</h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cats.map(c => {
            const item = entry.items?.find((i: any) => i.categoryId === c.id)
            const oldVal = item?.amount || 0
            const isChanged = c.name in changes
            const newVal = isChanged ? changes[c.name] : oldVal
            
            if (oldVal === 0 && !isChanged) return null // Hide zero values unless they are changed

            return (
              <div key={c.id} className={`p-3 rounded-lg border ${isChanged ? 'border-[var(--warning)] bg-[rgba(245,158,11,0.1)]' : 'border-[var(--border)] bg-[var(--bg-card)]'}`}>
                <div className="text-xs text-[var(--text-secondary)] mb-1">{c.name}</div>
                {isChanged ? (
                  <div className="flex items-center gap-2">
                    <span className="line-through text-[var(--text-secondary)] text-sm">৳{formatCurrency(oldVal)}</span>
                    <span className="text-[var(--warning)] font-bold">৳{formatCurrency(newVal)}</span>
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
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-card)]">
          <div>
            <h3 className="font-bold text-white text-lg">Daily Entry Details</h3>
            <p className="text-sm text-[var(--text-secondary)]">{entry.branch?.name} Branch • {new Date(entry.date).toLocaleDateString('en-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-4">
            {(userRole === 'ADMIN' || (userRole === 'BRANCH' && new Date(entry.date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0])) && (
              <button onClick={handleDelete} className="text-[var(--danger)] hover:bg-[var(--danger)]/10 p-2 rounded transition-colors flex items-center gap-1 text-sm font-bold">
                <Trash2 size={16} /> Delete
              </button>
            )}
            <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white transition-colors text-xl font-bold px-2">
              ✕
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto" style={{ flex: 1 }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
            <div>
              <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Total Sales</div>
              <div className="text-lg font-bold text-[var(--success)]">৳{formatCurrency(simulatedTotals.totalSale)}</div>
              {simulatedTotals.totalSale !== totals.totalSale && (
                <div className="text-xs text-[var(--warning)]">Was: ৳{formatCurrency(totals.totalSale)}</div>
              )}
            </div>
            <div>
              <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Total Amount</div>
              <div className="text-lg font-bold text-[var(--success)]">৳{formatCurrency(simulatedTotals.totalAmount)}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Total Expenses</div>
              <div className="text-lg font-bold text-[var(--danger)]">৳{formatCurrency(simulatedTotals.totalExpense)}</div>
              {simulatedTotals.totalExpense !== totals.totalExpense && (
                <div className="text-xs text-[var(--warning)]">Was: ৳{formatCurrency(totals.totalExpense)}</div>
              )}
            </div>
            <div>
              <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Net Balance</div>
              <div className={`text-lg font-bold ${simulatedTotals.netBalance >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                ৳{formatCurrency(simulatedTotals.netBalance)}
              </div>
            </div>
          </div>

          {renderSection('Income Details', 'INCOME')}
          {renderSection('Expense Details', 'EXPENSE')}

          {entry.transfers && entry.transfers.length > 0 && (
            <div className="mb-6">
              <h4 className="font-bold text-[var(--accent)] mb-3 pb-1 border-b border-[var(--border)]">Sent Transfers</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {entry.transfers.map((t: any, i: number) => (
                  <div key={`st-${i}`} className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-xs text-[var(--text-secondary)]">{t.account?.name || '-'}</div>
                      {t.status === 'PENDING' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--warning)]/20 text-[var(--warning)]">PENDING</span>}
                      {t.status === 'ACKNOWLEDGED' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--success)]/20 text-[var(--success)]">ACKNOWLEDGED</span>}
                      {t.status === 'REJECTED' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--danger)]/20 text-[var(--danger)]">REJECTED</span>}
                      {t.status === 'NOT_APPLICABLE' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--text-secondary)]/20 text-[var(--text-secondary)]">N/A</span>}
                    </div>
                    <div className="text-[var(--accent)] font-bold">৳{formatCurrency(t.amount)}</div>
                    {t.rejectionReason && t.status === 'REJECTED' && <div className="text-xs text-[var(--danger)] mt-1 italic">Reason: {t.rejectionReason}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {entry.receivedTransfers && entry.receivedTransfers.length > 0 && (
            <div className="mb-6">
              <h4 className="font-bold text-[var(--success)] mb-3 pb-1 border-b border-[var(--border)]">Acknowledged Incoming Transfers</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {entry.receivedTransfers.map((t: any, i: number) => (
                  <div key={`rt-${i}`} className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
                    <div className="text-xs text-[var(--text-secondary)] mb-1">From: {t.dailyEntry?.branch?.name || '-'}</div>
                    <div className="text-[var(--success)] font-bold">৳{formatCurrency(t.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(entry.notes || entry.cashDifferenceNote) && (
            <div className="mt-6 p-4 bg-[rgba(0,210,255,0.05)] border border-[rgba(0,210,255,0.1)] rounded-xl">
              {entry.notes && (
                <div className="mb-2">
                  <span className="text-[var(--accent)] font-bold text-sm">Notes: </span>
                  <span className="text-white text-sm whitespace-pre-wrap">{entry.notes}</span>
                </div>
              )}
              {entry.cashDifferenceNote && (
                <div>
                  <span className="text-[var(--accent)] font-bold text-sm">Cash Difference Note: </span>
                  <span className="text-white text-sm">{entry.cashDifferenceNote}</span>
                </div>
              )}
            </div>
          )}

          {entry.items && entry.items.some((i: any) => i.receiptUrls?.length > 0) && (
            <div className="mt-6">
              <h4 className="font-bold text-[var(--accent)] mb-3 pb-1 border-b border-[var(--border)]">Attachments & Receipts</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {entry.items.map((item: any) => {
                  if (!item.receiptUrls || item.receiptUrls.length === 0) return null;
                  const catName = categories.find(c => c.id === item.categoryId)?.name || 'Item';
                  return item.receiptUrls.map((url: string, idx: number) => (
                    <div key={`${item.id}-${idx}`} className="flex flex-col gap-1 p-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg">
                      <div className="text-xs text-[var(--text-secondary)]">{catName}</div>
                      <a href={url} target="_blank" rel="noreferrer" className="relative h-32 w-full block rounded overflow-hidden">
                        <Image src={url} alt={`Receipt for ${catName}`} fill className="object-cover hover:scale-105 transition-transform" unoptimized />
                      </a>
                    </div>
                  ));
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
