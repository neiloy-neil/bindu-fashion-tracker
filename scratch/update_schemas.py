import re

with open('lib/schemas.ts', 'r', encoding='utf-8') as f:
    content = f.read()

schemas_addition = """
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
"""

content += schemas_addition

with open('lib/schemas.ts', 'w', encoding='utf-8') as f:
    f.write(content)
