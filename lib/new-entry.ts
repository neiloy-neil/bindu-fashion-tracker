import { z } from 'zod'

const positiveAmount = z.coerce.number().finite().positive('Amount must be greater than zero')
const optionalText = z.string().trim().optional().default('')
const storageReference = z.string().min(1)

export const checklistSchema = z.object({
  safeLocked: z.boolean(),
  acOff: z.boolean(),
  shopClean: z.boolean(),
  shuttersDown: z.boolean(),
  cashVerified: z.boolean(),
  signature: z.string().optional(),
})

const paymentSchema = z.object({
  partyId: z.coerce.number().int().positive(),
  method: z.enum(['CASH', 'BANK', 'CHEQUE']),
  amount: positiveAmount,
  note: optionalText,
  attachmentKey: z.string().optional(),
  issueDate: z.string().optional(),
  withdrawDate: z.string().optional(),
}).superRefine((payment, context) => {
  if ((payment.method === 'BANK' || payment.method === 'CHEQUE') && !payment.attachmentKey) {
    context.addIssue({ code: 'custom', path: ['attachmentKey'], message: 'A payslip attachment is required' })
  }
  if (payment.method === 'CHEQUE') {
    if (!payment.issueDate) context.addIssue({ code: 'custom', path: ['issueDate'], message: 'Issue date is required' })
    if (!payment.withdrawDate) context.addIssue({ code: 'custom', path: ['withdrawDate'], message: 'Withdrawal date is required' })
  }
})

export const newEntryPayloadSchema = z.object({
  date: z.iso.date(),
  branchId: z.coerce.number().int().positive(),
  openingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  closingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  notes: optionalText,
  actualPhysicalCash: z.coerce.number().finite().nonnegative(),
  cashDifferenceNote: optionalText,
  expectedNetBalance: z.coerce.number().finite(),
  pettyCashOpening: z.coerce.number().finite().nonnegative().default(0),
  pettyCashUsed: z.coerce.number().finite().nonnegative().default(0),
  pettyCashReplenished: z.coerce.number().finite().nonnegative().default(0),
  pettyCashClosing: z.coerce.number().finite().nonnegative().default(0),
  eodChecklist: checklistSchema,
  items: z.array(z.object({
    categoryId: z.coerce.number().int().positive(),
    amount: positiveAmount,
    note: optionalText,
    partyName: optionalText,
    receiptKeys: z.array(storageReference).default([]),
  })),
  transfers: z.array(z.object({
    accountId: z.coerce.number().int().positive(),
    amount: positiveAmount,
    note: optionalText,
  })),
  payments: z.array(paymentSchema),
  expenseEntries: z.array(z.object({
    categoryId: z.coerce.number().int().positive(),
    amount: positiveAmount,
    note: optionalText,
    attachmentKey: z.string().optional(),
  })),
  advanceSalaries: z.array(z.object({
    employeeId: z.coerce.number().int().positive(),
    type: z.enum(['CASH', 'PRODUCT']),
    amount: z.coerce.number().finite().nonnegative(),
    productDescription: optionalText,
    note: optionalText,
  })),
}).superRefine((entry, context) => {
  if (new Set(entry.items.map(item => item.categoryId)).size !== entry.items.length) {
    context.addIssue({ code: 'custom', path: ['items'], message: 'Income categories cannot be duplicated' })
  }
  if (entry.actualPhysicalCash !== entry.expectedNetBalance && !entry.cashDifferenceNote) {
    context.addIssue({ code: 'custom', path: ['cashDifferenceNote'], message: 'A discrepancy reason is required' })
  }
})

export type NewEntryPayload = z.infer<typeof newEntryPayloadSchema>

export function dateOnlyToUtc(date: string) {
  return new Date(`${date}T00:00:00.000Z`)
}

export function dhakaDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date)
}
