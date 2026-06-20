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
        <h4 className="font-bold text-[#00d2ff] mb-3 pb-1 border-b border-[#1e2d45]">{title}</h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cats.map(c => {
            const item = entry.items?.find((i: any) => i.categoryId === c.id)
            const oldVal = item?.amount || 0
            const isChanged = c.name in changes
            const newVal = isChanged ? changes[c.name] : oldVal
            
            if (oldVal === 0 && !isChanged) return null // Hide zero values unless they are changed

            return (
              <div key={c.id} className={`p-3 rounded-lg border ${isChanged ? 'border-[#f59e0b] bg-[rgba(245,158,11,0.1)]' : 'border-[#1e2d45] bg-[#0a0f18]'}`}>
                <div className="text-xs text-[#8899aa] mb-1">{c.name}</div>
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
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-4 border-b border-[#1e2d45] flex justify-between items-center bg-[#0a0f18]">
          <div>
            <h3 className="font-bold text-white text-lg">Daily Entry Details</h3>
            <p className="text-sm text-[#8899aa]">{entry.branch?.name} Branch • {new Date(entry.date).toLocaleDateString('en-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-4">
            {(userRole === 'ADMIN' || (userRole === 'BRANCH' && new Date(entry.date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0])) && (
              <button onClick={handleDelete} className="text-[#ef4444] hover:bg-[#ef4444]/10 p-2 rounded transition-colors flex items-center gap-1 text-sm font-bold">
                <Trash2 size={16} /> Delete
              </button>
            )}
            <button onClick={onClose} className="text-[#8899aa] hover:text-white transition-colors text-xl font-bold px-2">
              ✕
            </button>
          </div>
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

          {renderSection('Income Details', 'INCOME')}
          {renderSection('Expense Details', 'EXPENSE')}

          {(entry.notes || entry.cashDifferenceNote) && (
            <div className="mt-6 p-4 bg-[rgba(0,210,255,0.05)] border border-[rgba(0,210,255,0.1)] rounded-xl">
              {entry.notes && (
                <div className="mb-2">
                  <span className="text-[#00d2ff] font-bold text-sm">Notes: </span>
                  <span className="text-white text-sm whitespace-pre-wrap">{entry.notes}</span>
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

          {entry.items && entry.items.some((i: any) => i.receiptUrls?.length > 0) && (
            <div className="mt-6">
              <h4 className="font-bold text-[#00d2ff] mb-3 pb-1 border-b border-[#1e2d45]">Attachments & Receipts</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {entry.items.map((item: any) => {
                  if (!item.receiptUrls || item.receiptUrls.length === 0) return null;
                  const catName = categories.find(c => c.id === item.categoryId)?.name || 'Item';
                  return item.receiptUrls.map((url: string, idx: number) => (
                    <div key={`${item.id}-${idx}`} className="flex flex-col gap-1 p-2 bg-[#0a0f18] border border-[#1e2d45] rounded-lg">
                      <div className="text-xs text-[#8899aa]">{catName}</div>
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
