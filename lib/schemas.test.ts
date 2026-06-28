import { describe, expect, it } from 'vitest'
import { newEntryFormSchema, partyUpdateSchema } from './schemas'

const validForm = {
  formMeta: {
    date: '2026-06-28',
    branchId: '1',
    openingTime: '09:00',
    closingTime: '21:00',
  },
  incomeItems: [],
  transfers: [],
  payments: [],
  expenseEntries: [],
  advanceSalaries: [],
  globalNotes: '',
  actualPhysicalCash: 100,
  cashDifferenceNote: '',
  eodChecklist: {
    safeLocked: true,
    acOff: true,
    shopClean: true,
    shuttersDown: true,
    cashVerified: true,
    signature: '',
  },
}

describe('newEntryFormSchema', () => {
  it('requires opening and closing times in HH:MM format', () => {
    expect(newEntryFormSchema.safeParse(validForm).success).toBe(true)
    expect(newEntryFormSchema.safeParse({
      ...validForm,
      formMeta: {
        ...validForm.formMeta,
        openingTime: '',
      },
    }).success).toBe(false)
  })
})

describe('partyUpdateSchema', () => {
  it('accepts the fields used by the party update route', () => {
    const result = partyUpdateSchema.partial().safeParse({
      name: 'Vendor One',
      email: '',
      isActive: false,
    })

    expect(result.success).toBe(true)
  })
})
