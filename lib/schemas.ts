import { z } from 'zod'

const numericStringOrNumber = z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseFloat(val) : val).refine(val => !isNaN(val) && val >= 0, { message: "Must be a non-negative number" }).optional()
const idSchema = z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseInt(val, 10) : val).refine(val => Number.isInteger(val) && val > 0, { message: 'Must be a valid id' })
const nonNegativeNumberSchema = z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseFloat(val) : val).refine(val => Number.isFinite(val) && val >= 0, { message: 'Must be a non-negative number' })
const positiveNumberSchema = z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseFloat(val) : val).refine(val => Number.isFinite(val) && val > 0, { message: 'Must be greater than zero' })
const finiteNumberSchema = z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseFloat(val) : val).refine(val => Number.isFinite(val), { message: 'Must be a valid number' })
const hhmmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:MM format')

export const dailyEntrySchema = z.object({
  date: z.string().or(z.date()),
  branchId: z.union([z.string(), z.number()]),
  notes: z.string().optional().nullable(),
  actualPhysicalCash: z.union([z.string(), z.number()]).optional().nullable().transform(val => {
    if (val === undefined || val === null || val === '') return null
    const num = typeof val === 'string' ? parseFloat(val) : val
    return isNaN(num) ? null : num
  }),
  cashDifferenceNote: z.string().optional().nullable(),
  eodChecklist: z.any().optional().nullable(),
  items: z.array(z.object({
    categoryId: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseInt(val) : val),
    amount: numericStringOrNumber,
    note: z.string().optional().nullable(),
    partyName: z.string().optional().nullable(),
    receiptUrls: z.array(z.string()).optional()
  })).optional()
}).passthrough()

export const userSchema = z.object({
  username: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'BRANCH', 'AUDITOR', 'AREA_MANAGER', 'HR_ADMIN', 'SUPER_ADMIN', 'ACCOUNTS']),
  branchId: z.union([z.string(), z.number()]).optional().nullable(),
  isActive: z.boolean().optional(),
  managedBranchIds: z.array(z.number()).optional(),
  employeeId: z.union([z.string(), z.number()]).optional().nullable(),
  phoneNumber: z.string().optional().nullable()
})

export const branchRequestSchema = z.object({
  requestedById: z.union([z.string(), z.number()]),
  type: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  attachmentUrl: z.string().optional().nullable(),
  assignedToId: z.union([z.string(), z.number()]).optional().nullable()
})

export const editRequestSchema = z.object({
  entryId: idSchema,
  changes: z.object({
    items: z.array(z.object({
      categoryId: idSchema,
      amount: nonNegativeNumberSchema,
    })).max(20).optional(),
    actualPhysicalCash: finiteNumberSchema.optional(),
    expectedNetBalance: finiteNumberSchema.optional(),
    notes: z.string().trim().max(2000).optional(),
    cashDifferenceNote: z.string().trim().max(2000).optional(),
  }).strict().refine(
    changes => Boolean(changes.items?.length) || changes.actualPhysicalCash !== undefined || changes.expectedNetBalance !== undefined || changes.notes !== undefined || changes.cashDifferenceNote !== undefined,
    { message: 'At least one allowed change is required' }
  ),
  reason: z.string().optional().nullable()
})

export const editRequestActionSchema = z.object({
  requestId: idSchema,
  status: z.enum(['APPROVED', 'REJECTED']),
})


export const newEntryFormSchema = z.object({
  formMeta: z.object({
    date: z.string().min(1, 'Date is required'),
    branchId: z.string().min(1, 'Branch is required'),
    openingTime: hhmmSchema,
    closingTime: hhmmSchema,
  }),
  incomeItems: z.array(z.object({
    id: z.string(),
    categoryId: z.union([z.string(), z.number()]).refine(v => v !== '', { message: 'Required' }),
    amount: z.union([z.string(), z.number()]).refine(v => Number(v) > 0, 'Amount must be greater than zero'),
    detail: z.object({
      note: z.string().default(''),
      partyName: z.string().default(''),
      files: z.array(z.any())
    })
  })),
  transfers: z.array(z.object({
    id: z.string(),
    accountId: z.string().min(1, 'Required'),
    amount: z.union([z.string(), z.number()]).refine(v => Number(v) > 0, 'Amount must be greater than zero'),
    note: z.string()
  })),
  payments: z.array(z.object({
    id: z.string(),
    partyId: z.string().min(1, 'Required'),
    method: z.string().min(1, 'Required'),
    amount: z.union([z.string(), z.number()]).refine(v => Number(v) > 0, 'Amount must be greater than zero'),
    note: z.string(),
    issueDate: z.string().optional(),
    withdrawDate: z.string().optional(),
    attachmentKey: z.any().optional()
  })),
  expenseEntries: z.array(z.object({
    id: z.string(),
    categoryId: z.string().min(1, 'Required'),
    amount: z.union([z.string(), z.number()]).refine(v => Number(v) > 0, 'Amount must be greater than zero'),
    note: z.string(),
    attachmentKey: z.any().optional()
  })),
  advanceSalaries: z.array(z.object({
    id: z.string(),
    employeeId: z.string().min(1, 'Required'),
    type: z.string().min(1, 'Required'),
    amount: z.union([z.string(), z.number()]).refine(v => Number(v) >= 0, 'Amount cannot be negative'),
    productDescription: z.string().optional(),
    note: z.string().optional()
  })),
  globalNotes: z.string().optional(),
  actualPhysicalCash: z.union([z.string(), z.number()]).refine(v => v !== '' && Number(v) >= 0, 'Physical cash is required'),
  cashDifferenceNote: z.string().optional(),
  eodChecklist: z.object({
    safeLocked: z.boolean(),
    acOff: z.boolean(),
    shopClean: z.boolean(),
    shuttersDown: z.boolean(),
    cashVerified: z.boolean(),
    signature: z.string().optional()
  })
})

export type NewEntryFormValues = z.input<typeof newEntryFormSchema>

export const partyBankInfoSchema = z.object({
  bankName: z.string().min(1, 'Bank name is required'),
  branchName: z.string().min(1, 'Branch name is required'),
  accountNo: z.string().min(1, 'Account number is required'),
  routingNo: z.string().optional()
})

export const purchaseSchema = z.object({
  partyId: z.union([z.string(), z.number()]).transform(v => Number(v)),
  date: z.string().or(z.date()),
  amount: z.union([z.string(), z.number()]).transform(v => Number(v)),
  invoiceNumber: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  attachmentUrl: z.string().optional().nullable(),
  isOpeningDue: z.boolean().optional()
})

export const partyUpdateSchema = z.object({
  name: z.string().min(1, 'Company Name is required').optional(),
  contactPerson: z.string().optional().nullable(),
  contactNumber: z.string().optional().nullable(),
  secondaryNumber: z.string().optional().nullable(),
  email: z.union([z.string().email('Invalid email address'), z.literal('')]).optional().nullable(),
  address: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
}).strict()

export const directPaymentSchema = z.object({
  dailyEntryId: idSchema.optional().nullable(),
  partyId: z.union([z.string(), z.number()]).transform(v => Number(v)),
  method: z.enum(['CASH', 'BANK', 'BKASH', 'NAGAD', 'CHEQUE']),
  amount: positiveNumberSchema,
  note: z.string().optional().nullable(),
  attachmentUrl: z.string().optional().nullable(),
  issueDate: z.string().optional().nullable(),
  withdrawDate: z.string().optional().nullable(),
  partyBankInfoId: z.number().int().positive().optional().nullable(),
  transactionRef: z.string().max(200).optional().nullable(),
}).superRefine((value, context) => {
  if ((value.method === 'BANK' || value.method === 'CHEQUE') && !value.attachmentUrl) {
    context.addIssue({ code: 'custom', path: ['attachmentUrl'], message: 'Attachment is required for bank and cheque payments' })
  }
  if (value.method === 'CHEQUE') {
    if (!value.issueDate) {
      context.addIssue({ code: 'custom', path: ['issueDate'], message: 'Issue date is required for cheque payments' })
    }
    if (!value.withdrawDate) {
      context.addIssue({ code: 'custom', path: ['withdrawDate'], message: 'Withdraw date is required for cheque payments' })
    }
  }
}).strict()

export const transferMutationSchema = z.object({
  dailyEntryId: idSchema,
  accountId: idSchema,
  amount: positiveNumberSchema,
  note: z.string().trim().max(2000).optional().nullable(),
}).strict()

export const advanceSalaryMutationSchema = z.object({
  dailyEntryId: idSchema,
  employeeId: idSchema,
  type: z.enum(['CASH', 'PRODUCT']),
  amount: nonNegativeNumberSchema.optional(),
  productDescription: z.string().trim().max(2000).optional().nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
}).superRefine((value, context) => {
  if (value.type === 'CASH' && value.amount === undefined) {
    context.addIssue({ code: 'custom', path: ['amount'], message: 'Amount is required for cash advances' })
  }
  if (value.type === 'PRODUCT' && !value.productDescription) {
    context.addIssue({ code: 'custom', path: ['productDescription'], message: 'Product description is required for product advances' })
  }
}).strict()
