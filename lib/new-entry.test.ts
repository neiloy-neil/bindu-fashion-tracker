import { describe, expect, it } from 'vitest'
import { dateOnlyToUtc, dhakaDateString, newEntryPayloadSchema } from './new-entry'

const validEntry = {
  date: '2026-06-22', branchId: 1, openingTime: '09:00', closingTime: '21:00',
  notes: '', actualPhysicalCash: 100, expectedNetBalance: 100, cashDifferenceNote: '',
  eodChecklist: { safeLocked: false, acOff: false, shopClean: false, shuttersDown: false, cashVerified: false, signature: '' },
  items: [{ categoryId: 1, amount: 100, note: '', partyName: '', receiptKeys: [] }],
  transfers: [], payments: [], expenseEntries: [], advanceSalaries: [],
}

describe('newEntryPayloadSchema', () => {
  it('accepts an unchecked checklist', () => {
    expect(newEntryPayloadSchema.safeParse(validEntry).success).toBe(true)
  })

  it('rejects duplicate income categories', () => {
    const result = newEntryPayloadSchema.safeParse({ ...validEntry, items: [...validEntry.items, { ...validEntry.items[0] }] })
    expect(result.success).toBe(false)
  })

  it('requires a discrepancy reason', () => {
    expect(newEntryPayloadSchema.safeParse({ ...validEntry, actualPhysicalCash: 99 }).success).toBe(false)
  })

  it('requires cheque dates and attachment', () => {
    const result = newEntryPayloadSchema.safeParse({
      ...validEntry,
      payments: [{ partyId: 1, method: 'CHEQUE', amount: 10, note: '' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero and negative amounts', () => {
    expect(newEntryPayloadSchema.safeParse({ ...validEntry, items: [{ ...validEntry.items[0], amount: 0 }] }).success).toBe(false)
  })
})

describe('date-only helpers', () => {
  it('stores a date at UTC midnight', () => {
    expect(dateOnlyToUtc('2026-06-22').toISOString()).toBe('2026-06-22T00:00:00.000Z')
  })

  it('uses the Dhaka calendar near a UTC boundary', () => {
    expect(dhakaDateString(new Date('2026-06-21T20:30:00.000Z'))).toBe('2026-06-22')
  })
})
