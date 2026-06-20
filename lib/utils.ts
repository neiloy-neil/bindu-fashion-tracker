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

  const totalAmount = openingBalance + totalSale
  const netBalance = totalAmount - totalExpense

  return { totalSale, totalAmount, totalExpense, netBalance, openingBalance }
}
