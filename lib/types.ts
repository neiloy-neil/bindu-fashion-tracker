export interface Branch {
  id: number
  name: string
  code: string
  isActive: boolean
}

export interface Category {
  id: number
  name: string
  type: 'INCOME' | 'EXPENSE'
  isActive: boolean
  isDefault: boolean
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
  eodChecklist?: any | null
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
  createdAt?: string | Date
}

export interface LedgerAccount extends Account {}

export interface Transfer {
  id: number
  dailyEntryId: number
  accountId: number
  amount: number
  note?: string | null
  createdAt?: string | Date
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

export interface ExpenseCategory {
  id: number
  name: string
  frequency: string
  isActive: boolean
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
