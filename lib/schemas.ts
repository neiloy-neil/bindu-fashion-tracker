import { z } from 'zod'

const numericStringOrNumber = z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseFloat(val) : val).refine(val => !isNaN(val) && val >= 0, { message: "Must be a non-negative number" }).optional()

export const entryItemSchema = z.object({
  categoryId: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseInt(val) : val),
  amount: numericStringOrNumber,
  note: z.string().optional().nullable(),
  partyName: z.string().optional().nullable(),
  receiptUrls: z.array(z.string()).optional()
})

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
  items: z.array(entryItemSchema).optional()
}).passthrough()

export const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['INCOME', 'EXPENSE']),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional()
})

export const userSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'BRANCH', 'AUDITOR', 'AREA_MANAGER']),
  branchId: z.union([z.string(), z.number()]).optional().nullable(),
  isActive: z.boolean().optional(),
  managedBranchIds: z.array(z.number()).optional()
})

export const branchRequestSchema = z.object({
  requestedById: z.union([z.string(), z.number()]),
  type: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional()
})

export const editRequestSchema = z.object({
  entryId: z.union([z.string(), z.number()]),
  requestedById: z.union([z.string(), z.number()]),
  changes: z.record(z.string(), z.any()),
  reason: z.string().optional().nullable()
})


export const newEntryFormSchema = z.object({
  formMeta: z.object({
    date: z.string().min(1, 'Date is required'),
    branchId: z.string().min(1, 'Branch is required'),
    openingTime: z.string().optional(),
    closingTime: z.string().optional(),
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
  name: z.string().min(1, 'Company Name is required'),
  contactPerson: z.string().optional().nullable(),
  contactNumber: z.string().optional().nullable(),
  secondaryNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable()
})

export const directPaymentSchema = z.object({
  partyId: z.union([z.string(), z.number()]).transform(v => Number(v)),
  method: z.string().min(1, 'Payment method is required'),
  amount: z.union([z.string(), z.number()]).transform(v => Number(v)),
  note: z.string().optional().nullable(),
  attachmentUrl: z.string().optional().nullable(),
  issueDate: z.string().optional().nullable(),
  withdrawDate: z.string().optional().nullable(),
})
