import { formatCurrency, computeTotals } from '@/lib/utils'
import { Category } from '@/lib/types'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'

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
      const itemChange = Array.isArray(changes.items)
        ? changes.items.find((changed: { categoryId: number; amount: number }) => changed.categoryId === i.categoryId)
        : null

      if (itemChange) {
        return { ...i, amount: itemChange.amount }
      }

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
            const itemChange = Array.isArray(changes.items)
              ? changes.items.find((changed: { categoryId: number; amount: number }) => changed.categoryId === c.id)
              : null
            const legacyChanged = c.name in changes
            const isChanged = Boolean(itemChange) || legacyChanged
            const newVal = itemChange ? itemChange.amount : legacyChanged ? changes[c.name] : oldVal
            
             if (oldVal === 0 && !isChanged) return null // Hide zero values unless they are changed

             return (
              <div key={c.id} className={`rounded-lg border p-3 ${isChanged ? 'border-[var(--warning)] bg-[var(--warning-subtle)]' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
                <div className="text-xs text-[var(--text-secondary)] mb-1">{c.name}</div>
                {isChanged ? (
                  <div className="flex items-center gap-2">
                    <span className="line-through text-[var(--text-secondary)] text-sm">৳{formatCurrency(oldVal)}</span>
                    <span className="text-[var(--warning)] font-bold">৳{formatCurrency(newVal)}</span>
                  </div>
                ) : (
                  <div className="font-medium text-[var(--text-primary)]">৳{formatCurrency(oldVal)}</div>
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
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Daily Entry Details</h3>
            <p className="text-sm text-[var(--text-secondary)]">{entry.branch?.name} Branch • {new Date(entry.date).toLocaleDateString('en-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-4">
            {(userRole === 'ADMIN' || (userRole === 'BRANCH' && new Date(entry.date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0])) && (
              <Button variant="ghost" onClick={handleDelete} className="gap-1 text-sm font-bold text-[var(--danger)] hover:bg-[var(--danger-subtle)] hover:text-[var(--danger)]">
                <Trash2 size={16} /> Delete
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <X size={18} />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 md:grid-cols-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Total Sales</div>
              <div className="text-lg font-bold text-[var(--success)]">৳{formatCurrency(simulatedTotals.totalSale)}</div>
              {simulatedTotals.totalSale !== totals.totalSale && (
                <div className="text-xs text-[var(--warning)]">Was: ৳{formatCurrency(totals.totalSale)}</div>
              )}
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Total Amount</div>
              <div className="text-lg font-bold text-[var(--success)]">৳{formatCurrency(simulatedTotals.totalAmount)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Total Expenses</div>
              <div className="text-lg font-bold text-[var(--danger)]">৳{formatCurrency(simulatedTotals.totalExpense)}</div>
              {simulatedTotals.totalExpense !== totals.totalExpense && (
                <div className="text-xs text-[var(--warning)]">Was: ৳{formatCurrency(totals.totalExpense)}</div>
              )}
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Net Balance</div>
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
                  <div key={`st-${i}`} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-xs text-[var(--text-secondary)]">{t.account?.name || '-'}</div>
                      {t.status === 'PENDING' && <span className="inline-flex rounded-full bg-[var(--warning-subtle)] px-2 py-0.5 text-[11px] font-semibold text-[var(--warning)]">PENDING</span>}
                      {t.status === 'ACKNOWLEDGED' && <span className="inline-flex rounded-full bg-[var(--success-subtle)] px-2 py-0.5 text-[11px] font-semibold text-[var(--success)]">ACKNOWLEDGED</span>}
                      {t.status === 'REJECTED' && <span className="inline-flex rounded-full bg-[var(--danger-subtle)] px-2 py-0.5 text-[11px] font-semibold text-[var(--danger)]">REJECTED</span>}
                      {t.status === 'NOT_APPLICABLE' && <span className="inline-flex rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">N/A</span>}
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
                  <div key={`rt-${i}`} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                    <div className="text-xs text-[var(--text-secondary)] mb-1">From: {t.dailyEntry?.branch?.name || '-'}</div>
                    <div className="text-[var(--success)] font-bold">৳{formatCurrency(t.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(entry.notes || entry.cashDifferenceNote) && (
            <div className="mt-6 rounded-xl border border-[var(--accent-subtle)] bg-[var(--accent-subtle)]/40 p-4">
              {entry.notes && (
                <div className="mb-2">
                  <span className="text-[var(--accent)] font-bold text-sm">Notes: </span>
                  <span className="text-[var(--text-primary)] text-sm whitespace-pre-wrap">{entry.notes}</span>
                </div>
              )}
              {entry.cashDifferenceNote && (
                <div>
                  <span className="text-[var(--accent)] font-bold text-sm">Cash Difference Note: </span>
                  <span className="text-[var(--text-primary)] text-sm">{entry.cashDifferenceNote}</span>
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
                    <div key={`${item.id}-${idx}`} className="flex flex-col gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
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
