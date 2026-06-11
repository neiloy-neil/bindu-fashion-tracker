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

export function computeTotals(entry: Record<string, number>) {
  const incomeFields = [
    'cashSale', 'dueReceived', 'conditionRec', 'bkashIncome',
    'nagadIncome', 'rocketIncome', 'posPubali', 'posCity', 'posBrac',
    'posDbbl', 'acBindu', 'bindu2Transfer', 'receivedAziz1',
  ]
  const expenseFields = [
    'advanceTk', 'conditionChange', 'partyPayment', 'aziz2Transfer',
    'bankDeposit', 'dmcb', 'saleBonus', 'courierLbrBill', 'snacksTea',
    'lunch', 'conveyance', 'otherExpense', 'donation', 'stationary',
    'netWife', 'utilities', 'waterBill', 'dailySomity', 'electricRecharge',
    'petrolMobil', 'phoneBill', 'shopRent', 'salary', 'returnExp',
    'bkashExpense', 'nagadExpense', 'posExpense', 'rocketDbbl',
    'bossPersonalAll', 'acBinduExpense', 'vat', 'vatExp', 'emgFund', 'bossGift',
  ]

  const totalSale = incomeFields.reduce((sum, f) => sum + (entry[f] || 0), 0)
  const totalAmount = (entry.openingBalance || 0) + totalSale
  const totalExpense = expenseFields.reduce((sum, f) => sum + (entry[f] || 0), 0)
  const netBalance = totalAmount - totalExpense

  return { totalSale, totalAmount, totalExpense, netBalance }
}
