import 'dotenv/config'
import { prisma } from './lib/prisma'
import * as bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { faker } from '@faker-js/faker'

const BRANCHES = [
  { name: 'Aziz 1',       code: 'AZIZ1' },
  { name: 'Aziz-2',       code: 'AZIZ2' },
  { name: "Cox's Bazar-1", code: 'COX1' },
  { name: "Cox's Bazar-2", code: 'COX2' },
  { name: "Cox's Bazar-3", code: 'COX3' },
  { name: 'Basurhat',     code: 'BASURHAT' },
  { name: 'Dorgahgate',   code: 'DORGAHGATE' },
  { name: 'Lamabazar',    code: 'LAMABAZAR' },
  { name: 'Barishal',     code: 'BARISHAL' },
  { name: 'Teknaf',       code: 'TEKNAF' },
  { name: 'Jashore',      code: 'JASHORE' },
  { name: 'Sylhet',       code: 'SYLHET' },
  { name: 'Office',       code: 'OFFICE' },
]

const DEFAULT_INCOME_CATEGORIES = [
  'Opening Balance', 'Cash Sale', 'Due Received', 'Condition Rec.', 
  'bKash Income', 'Nagad Income', 'Rocket Income', 'POS Pubali', 
  'POS City', 'POS BRAC', 'POS DBBL', 'A/C Bindu', 'Bindu-2 Transfer', 'Received Aziz-1'
]

const DEFAULT_EXPENSE_CATEGORIES = [
  'Advance TK', 'Condition Change', 'Party Payment', 'Aziz-2 Transfer', 
  'Bank Deposit', 'DMCB', 'Sale Bonus', 'Courier/Labor Bill', 'Snacks/Tea', 
  'Lunch', 'Conveyance', 'Other Expense', 'Donation', 'Stationary', 
  'Net/WIFI', 'Utilities', 'Water Bill', 'Daily Somity', 'Electric Recharge', 
  'Petrol/Mobil', 'Phone Bill', 'Shop Rent', 'Salary', 'Return Exp.', 
  'bKash Expense', 'Nagad Expense', 'POS Expense', 'Rocket DBBL', 
  'Boss Personal/All', 'A/C Bindu Expense', 'VAT', 'VAT Exp', 'Emg Fund', 'Boss Gift'
]

async function main() {
  console.log('Seeding massive data with Faker.js...')

  // Seed Categories
  const categoryIds = { income: [] as number[], expense: [] as number[] }
  for (const name of DEFAULT_INCOME_CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, type: 'INCOME', isDefault: true, isActive: true }
    })
    categoryIds.income.push(cat.id)
  }
  for (const name of DEFAULT_EXPENSE_CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, type: 'EXPENSE', isDefault: true, isActive: true }
    })
    categoryIds.expense.push(cat.id)
  }
  console.log('✅ Categories seeded.')

  const branchRecords = []
  for (const b of BRANCHES) {
    const branch = await prisma.branch.upsert({
      where: { code: b.code },
      update: {},
      create: { name: b.name, code: b.code, isActive: true }
    })
    branchRecords.push(branch)
  }

  // Create Users
  const adminPasswordPlain = 'admin123'
  const branchPasswordPlain = 'branch123'
  const adminPasswordHash = await bcrypt.hash(adminPasswordPlain, 10)
  const branchPasswordHash = await bcrypt.hash(branchPasswordPlain, 10)

  // Admin User
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', passwordHash: adminPasswordHash, role: 'ADMIN' }
  })
  
  await prisma.user.upsert({
    where: { username: 'hr_admin' },
    update: {},
    create: { username: 'hr_admin', passwordHash: adminPasswordHash, role: 'HR_ADMIN' }
  })

  for (const branch of branchRecords) {
    const username = `${branch.code.toLowerCase()}_branch`
    await prisma.user.upsert({
      where: { username },
      update: {},
      create: { username, passwordHash: branchPasswordHash, role: 'BRANCH', branchId: branch.id }
    })
  }
  console.log(`✅ Users seeded.`)

  // Employees (3 to 8 per branch)
  const allEmployees = []
  for (const branch of branchRecords) {
    const numEmployees = faker.number.int({ min: 3, max: 8 })
    for (let i = 0; i < numEmployees; i++) {
      const emp = await prisma.employee.create({
        data: {
          name: faker.person.fullName(),
          designation: faker.helpers.arrayElement(['Manager', 'Sales Associate', 'Cashier', 'Staff']),
          basicSalary: faker.number.int({ min: 12000, max: 35000 }),
          branchId: branch.id,
          joiningDate: faker.date.past({ years: 3 }).toISOString().split('T')[0],
          isActive: true
        }
      })
      allEmployees.push(emp)
    }
  }
  console.log(`✅ ${allEmployees.length} Employees seeded.`)

  // Generate 90 days of daily entries
  const now = new Date()
  
  let entryCount = 0
  let itemCount = 0

  // 90 days loop
  for (let d = 90; d >= 0; d--) {
    const date = new Date(now)
    date.setDate(date.getDate() - d)
    date.setHours(0, 0, 0, 0)
    
    // Create entries for each branch
    for (const branch of branchRecords) {
      // 10% chance a branch is closed
      if (faker.number.int({ min: 1, max: 100 }) <= 10) continue

      const incomeItems = []
      let totalIncome = 0
      
      // Random incomes (Cash Sales, POS, etc.)
      const numIncomes = faker.number.int({ min: 2, max: 8 })
      for (let i = 0; i < numIncomes; i++) {
        const amount = faker.number.int({ min: 1000, max: 50000 })
        incomeItems.push({
          categoryId: faker.helpers.arrayElement(categoryIds.income),
          amount,
          note: faker.lorem.words(2)
        })
        totalIncome += amount
      }

      const expenseItems = []
      let totalExpense = 0
      
      // Random expenses
      const numExpenses = faker.number.int({ min: 1, max: 5 })
      for (let i = 0; i < numExpenses; i++) {
        const amount = faker.number.int({ min: 500, max: 15000 })
        expenseItems.push({
          categoryId: faker.helpers.arrayElement(categoryIds.expense),
          amount,
          note: faker.lorem.words(3)
        })
        totalExpense += amount
      }

      // Expected Cash
      const expectedNetBalance = totalIncome - totalExpense
      
      // 5% chance of discrepancy
      let actualPhysicalCash = expectedNetBalance
      let cashDifferenceNote = null
      if (faker.number.int({ min: 1, max: 100 }) <= 5) {
        const difference = faker.number.int({ min: -5000, max: 5000 })
        if (difference !== 0) {
          actualPhysicalCash = expectedNetBalance + difference
          cashDifferenceNote = faker.lorem.sentence()
        }
      }

      try {
        const entry = await prisma.dailyEntry.upsert({
          where: {
            date_branchId: { date, branchId: branch.id }
          },
          update: {},
          create: {
            date,
            branchId: branch.id,
            actualPhysicalCash,
            expectedNetBalance,
            cashDifferenceNote,
            openingTime: "10:00",
            closingTime: "22:00",
            notes: faker.number.int({ min: 1, max: 100 }) <= 20 ? faker.lorem.sentence() : null,
            items: {
              create: [...incomeItems, ...expenseItems]
            }
          }
        })
        entryCount++
        itemCount += incomeItems.length + expenseItems.length
      } catch (e: any) {
        // Skip if exists
      }
    }
  }

  console.log(`✅ Seeded ${entryCount} Daily Entries with ${itemCount} Items over 90 days.`)
  console.log('Seeding complete! Enjoy your massive dataset.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
