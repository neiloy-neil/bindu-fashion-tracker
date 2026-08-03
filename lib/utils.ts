import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Income categories that count as "Total Sale" (cash + digital sales only).
// Due Received, Condition Rec., A/C Bindu, Opening Balance, Branch Transfer Received, etc. are excluded.
export const SALE_CATEGORIES = new Set([
  'Cash Sale', 'Bkash', 'Nagad', 'Rocket Income',
  'POS Brac', 'POS City', 'POS DBBL', 'POS Pubali',
])

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function computeTotals(entry: any) {
  let totalSale = 0
  let totalExpense = 0
  let openingBalance = 0

  if (entry && entry.items && Array.isArray(entry.items)) {
    for (const item of entry.items) {
      if (item.category) {
        if (item.category.name === 'Opening Balance') {
          openingBalance += item.amount || 0
        } else if (item.category.type === 'INCOME' && SALE_CATEGORIES.has(item.category.name)) {
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
    // Received transfers count toward inflow but not toward sale target
    for (const t of entry.receivedTransfers) {
      openingBalance += t.amount || 0
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
      if (e.isTransferEntry) continue
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

  // Petty cash replenishment moves money from main cash into the petty drawer — it's a cash outflow
  const pettyCashReplenished = typeof entry?.pettyCashReplenished === 'number' ? entry.pettyCashReplenished : 0
  totalExpense += pettyCashReplenished

  const totalAmount = openingBalance + totalSale
  const netBalance = totalAmount - totalExpense

  return { totalSale, totalAmount, totalExpense, netBalance, openingBalance }
}
