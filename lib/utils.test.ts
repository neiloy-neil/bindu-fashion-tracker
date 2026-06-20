import { describe, it, expect } from 'vitest'
import { formatCurrency, computeTotals } from './utils'

describe('utils', () => {
  describe('formatCurrency', () => {
    it('formats numbers properly', () => {
      expect(formatCurrency(1000)).toBe('1,000')
      expect(formatCurrency(1234567.89)).toBe('1,234,568')
    })
  })

  describe('computeTotals', () => {
    it('computes simple income and expenses correctly', () => {
      const entry = {
        items: [
          { category: { name: 'Opening Balance', type: 'INCOME' }, amount: 1000 },
          { category: { name: 'Cash Sale', type: 'INCOME' }, amount: 500 },
          { category: { name: 'Due Received', type: 'INCOME' }, amount: 200 },
          { category: { name: 'Lunch', type: 'EXPENSE' }, amount: 50 },
          { category: { name: 'Stationary', type: 'EXPENSE' }, amount: 150 }
        ]
      }
      const totals = computeTotals(entry)
      
      expect(totals.openingBalance).toBe(1000)
      expect(totals.totalSale).toBe(700)
      expect(totals.totalAmount).toBe(1700)
      expect(totals.totalExpense).toBe(200)
      expect(totals.netBalance).toBe(1500)
    })

    it('handles empty entries without error', () => {
      const totals = computeTotals({})
      expect(totals.openingBalance).toBe(0)
      expect(totals.totalSale).toBe(0)
      expect(totals.totalAmount).toBe(0)
      expect(totals.totalExpense).toBe(0)
      expect(totals.netBalance).toBe(0)
    })
  })
})
