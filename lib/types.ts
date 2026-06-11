export interface Branch {
  id: number
  name: string
  code: string
  isActive: boolean
}

export interface DailyEntry {
  id: number
  date: string
  branchId: number
  branch?: Branch
  // Income
  openingBalance: number
  cashSale: number
  dueReceived: number
  conditionRec: number
  bkashIncome: number
  nagadIncome: number
  rocketIncome: number
  posPubali: number
  posCity: number
  posBrac: number
  posDbbl: number
  acBindu: number
  bindu2Transfer: number
  receivedAziz1: number
  // Expenses
  advanceTk: number
  conditionChange: number
  partyPayment: number
  aziz2Transfer: number
  bankDeposit: number
  dmcb: number
  saleBonus: number
  courierLbrBill: number
  snacksTea: number
  lunch: number
  conveyance: number
  otherExpense: number
  donation: number
  stationary: number
  netWife: number
  utilities: number
  waterBill: number
  dailySomity: number
  electricRecharge: number
  petrolMobil: number
  phoneBill: number
  shopRent: number
  salary: number
  returnExp: number
  bkashExpense: number
  nagadExpense: number
  posExpense: number
  rocketDbbl: number
  bossPersonalAll: number
  acBinduExpense: number
  vat: number
  vatExp: number
  emgFund: number
  bossGift: number
}

export type DailyEntryFormData = Omit<DailyEntry, 'id' | 'branch' | 'date'> & {
  date: string
}

export interface ColumnDef {
  key: keyof DailyEntry
  label: string
  group: 'income' | 'expense' | 'meta' | 'computed'
  width?: number
}

export const INCOME_COLUMNS: ColumnDef[] = [
  { key: 'openingBalance',  label: 'Opening Balance',   group: 'income' },
  { key: 'cashSale',        label: 'Cash Sale',         group: 'income' },
  { key: 'dueReceived',     label: 'Due Received',      group: 'income' },
  { key: 'conditionRec',    label: 'Condition Rec',     group: 'income' },
  { key: 'bkashIncome',     label: 'Bkash',             group: 'income' },
  { key: 'nagadIncome',     label: 'Nagad',             group: 'income' },
  { key: 'rocketIncome',    label: 'Rocket',            group: 'income' },
  { key: 'posPubali',       label: 'POS/Pubali',        group: 'income' },
  { key: 'posCity',         label: 'POS City',          group: 'income' },
  { key: 'posBrac',         label: 'POS BRAC',          group: 'income' },
  { key: 'posDbbl',         label: 'POS DBBL',          group: 'income' },
  { key: 'acBindu',         label: 'A/C Bindu',         group: 'income' },
  { key: 'bindu2Transfer',  label: 'Bindu2 Transfer',   group: 'income' },
  { key: 'receivedAziz1',   label: 'Received Aziz 1',  group: 'income' },
]

export const EXPENSE_COLUMNS: ColumnDef[] = [
  { key: 'advanceTk',       label: 'Advance TK',        group: 'expense' },
  { key: 'conditionChange', label: 'Condition Change',  group: 'expense' },
  { key: 'partyPayment',    label: 'Party Payment',     group: 'expense' },
  { key: 'aziz2Transfer',   label: 'Aziz 2 Transfer',   group: 'expense' },
  { key: 'bankDeposit',     label: 'Bank Deposit',      group: 'expense' },
  { key: 'dmcb',            label: 'DMCB',              group: 'expense' },
  { key: 'saleBonus',       label: 'Sale Bonus',        group: 'expense' },
  { key: 'courierLbrBill',  label: 'Courier & Lbr Bill',group: 'expense' },
  { key: 'snacksTea',       label: 'Snacks & Tea',      group: 'expense' },
  { key: 'lunch',           label: 'Lunch',             group: 'expense' },
  { key: 'conveyance',      label: 'Conveyance',        group: 'expense' },
  { key: 'otherExpense',    label: 'Other Expense',     group: 'expense' },
  { key: 'donation',        label: 'Donation',          group: 'expense' },
  { key: 'stationary',      label: 'Stationary',        group: 'expense' },
  { key: 'netWife',         label: 'Net/Wife',          group: 'expense' },
  { key: 'utilities',       label: 'Utilities',         group: 'expense' },
  { key: 'waterBill',       label: 'Water Bill',        group: 'expense' },
  { key: 'dailySomity',     label: 'Daily Somity',      group: 'expense' },
  { key: 'electricRecharge',label: 'Electric Recharge', group: 'expense' },
  { key: 'petrolMobil',     label: 'Petrol/Mobil',      group: 'expense' },
  { key: 'phoneBill',       label: 'Phone Bill',        group: 'expense' },
  { key: 'shopRent',        label: 'Shop Rent',         group: 'expense' },
  { key: 'salary',          label: 'Salary',            group: 'expense' },
  { key: 'returnExp',       label: 'Return Exp.',       group: 'expense' },
  { key: 'bkashExpense',    label: 'Bkash (Exp)',       group: 'expense' },
  { key: 'nagadExpense',    label: 'Nagad (Exp)',        group: 'expense' },
  { key: 'posExpense',      label: 'POS (Exp)',          group: 'expense' },
  { key: 'rocketDbbl',      label: 'Rocket DBBL',       group: 'expense' },
  { key: 'bossPersonalAll', label: 'Boss Personal All', group: 'expense' },
  { key: 'acBinduExpense',  label: 'A/C Bindu (Exp)',   group: 'expense' },
  { key: 'vat',             label: 'VAT',               group: 'expense' },
  { key: 'vatExp',          label: 'VAT Exp.',          group: 'expense' },
  { key: 'emgFund',         label: 'Emg. Fund',         group: 'expense' },
  { key: 'bossGift',        label: 'Boss Gift',         group: 'expense' },
]

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
