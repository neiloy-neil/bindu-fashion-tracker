import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-BD', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-BD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function computeTotals(entry: any) {
  let totalSale = 0
  let totalExpense = 0
  let openingBalance = 0

  if (entry && entry.items && Array.isArray(entry.items)) {
    for (const item of entry.items) {
      if (item.category) {
        if (item.category.name === 'Opening Balance') {
          openingBalance += item.amount || 0
        } else if (item.category.type === 'INCOME') {
          totalSale += item.amount || 0
        } else if (item.category.type === 'EXPENSE') {
          totalExpense += item.amount || 0
        }
      }
    }
  }
  
  if (entry && entry.transfers && Array.isArray(entry.transfers)) {
    for (const t of entry.transfers) {
      totalExpense += t.amount || 0
    }
  }
  if (entry && entry.receivedTransfers && Array.isArray(entry.receivedTransfers)) {
    for (const t of entry.receivedTransfers) {
      totalSale += t.amount || 0
    }
  }
  if (entry && entry.payments && Array.isArray(entry.payments)) {
    for (const p of entry.payments) {
      // Pending cheques do not deduct from net balance yet? Wait, according to Phase 3, 
      // CHEQUE status PENDING does not deduct. It only deducts when APPROVED.
      // But in DailyEntry math, normally it's an expense immediately? No, the transaction logic says PENDING doesn't affect balance.
      if (p.method === 'CHEQUE' && p.cheque?.status !== 'APPROVED') {
        continue
      }
      totalExpense += p.amount || 0
    }
  }
  if (entry && entry.expenseEntries && Array.isArray(entry.expenseEntries)) {
    for (const e of entry.expenseEntries) {
      totalExpense += e.amount || 0
    }
  }
  if (entry && entry.advanceSalaries && Array.isArray(entry.advanceSalaries)) {
    for (const a of entry.advanceSalaries) {
      if (a.type === 'CASH') {
        totalExpense += a.amount || 0
      }
    }
  }

  const totalAmount = openingBalance + totalSale
  const netBalance = totalAmount - totalExpense

  return { totalSale, totalAmount, totalExpense, netBalance, openingBalance }
}
