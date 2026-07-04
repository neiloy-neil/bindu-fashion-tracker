export interface Branch {
  id: number
  name: string
  code: string | null
  type: string
  address: string | null
  contactPerson: string | null
  phoneNumber: string | null
  isActive: boolean
  shiftStartTime?: string | null
}

export interface Category {
  id: number
  name: string
  type: 'INCOME' | 'EXPENSE'
  isActive: boolean
  isDefault: boolean
  isAutoTransferred?: boolean
  frequency?: string | null // DAILY | WEEKLY | MONTHLY | AS_NEEDED — only set for EXPENSE type
  requiresAttachment: boolean
  applicableTo: string[] // empty = all branch types; e.g. ["RETAIL","FACTORY"]
}

export interface EntryItem {
  id: number
  entryId: number
  categoryId: number
  category: Category
  amount: number
  note?: string | null
  partyName?: string | null
  receiptUrls: string[]
}

export interface DailyEntry {
  id: number
  date: string
  branchId: number
  branch?: Branch
  items: EntryItem[]
  
  receiptUrl?: string | null
  notes?: string | null
  actualPhysicalCash?: number | null
  cashDifferenceNote?: string | null
  eodChecklist?: Record<string, unknown> | null
  openingTime?: string | null
  closingTime?: string | null
  
  transfers?: Transfer[]
  payments?: Payment[]
  expenseEntries?: ExpenseEntry[]
  advanceSalaries?: AdvanceSalary[]
}

export interface Account {
  id: number
  name: string
  type: string
  isActive: boolean
  branchId?: number | null
  createdAt?: string | Date
}

export type LedgerAccount = Account

export interface Transfer {
  id: number
  dailyEntryId: number
  accountId: number
  amount: number
  note?: string | null
  createdAt?: string | Date
  status: 'PENDING' | 'ACKNOWLEDGED' | 'REJECTED' | 'NOT_APPLICABLE'
  acknowledgedById?: number | null
  acknowledgedAt?: string | Date | null
  rejectionReason?: string | null
  receivingEntryId?: number | null
}

export interface Party {
  id: number
  name: string
  isActive: boolean
  balance: number
  createdAt?: string | Date
}

export interface Payment {
  id: number
  dailyEntryId: number
  partyId: number
  method: string
  amount: number
  note?: string | null
  createdAt?: string | Date
}

export interface Cheque {
  id: number
  paymentId: number
  issueDate: string | Date
  withdrawDate: string | Date
  status: string
  approvedById?: number | null
  approvedAt?: string | Date | null
  createdAt?: string | Date
}

export interface ExpenseEntry {
  id: number
  dailyEntryId: number
  categoryId: number
  amount: number
  note?: string | null
  createdAt?: string | Date
}

export interface Employee {
  id: number
  name: string
  isActive: boolean
  createdAt?: string | Date
}

export interface AdvanceSalary {
  id: number
  dailyEntryId: number
  employeeId: number
  type: string
  amount?: number | null
  productDescription?: string | null
  note?: string | null
  createdAt?: string | Date
}

export type DailyEntryFormData = Omit<DailyEntry, 'id' | 'branch' | 'date'> & {
  date: string
}

export interface SummaryStats {
  totalSales: number
  totalExpenses: number
  netBalance: number
  totalPayable: number
  pettyCash: number
  branchStats: {
    branchName: string
    totalSale: number
    totalExpense: number
    netBalance: number
    physicalCash: number
  }[]
  dailyTrend: {
    date: string
    totalSale: number
    totalExpense: number
  }[]
  expenseBreakdown: {
    category: string
    amount: number
  }[]
  userRole?: string
}
