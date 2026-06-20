import { z } from 'zod'

const nonNegativeNumber = z.number().min(0).optional()
const numericStringOrNumber = z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseFloat(val) : val).refine(val => !isNaN(val) && val >= 0, { message: "Must be a non-negative number" }).optional()

export const entryItemSchema = z.object({
  categoryId: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseInt(val) : val),
  amount: numericStringOrNumber,
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
