import 'dotenv/config'
import { prisma } from './lib/prisma'
import * as bcrypt from 'bcryptjs'
import crypto from 'crypto'

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
  console.log('Seeding data...')

  // Seed Categories
  const categoryMap = new Map<string, number>()
  for (const name of DEFAULT_INCOME_CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, type: 'INCOME', isDefault: true, isActive: true }
    })
    categoryMap.set(name, cat.id)
  }
  for (const name of DEFAULT_EXPENSE_CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, type: 'EXPENSE', isDefault: true, isActive: true }
    })
    categoryMap.set(name, cat.id)
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
  const adminPasswordPlain = crypto.randomBytes(6).toString('hex')
  const branchPasswordPlain = crypto.randomBytes(6).toString('hex')
  
  const adminPasswordHash = await bcrypt.hash(adminPasswordPlain, 10)
  const branchPasswordHash = await bcrypt.hash(branchPasswordPlain, 10)

  // Admin User
  const existingAdmin = await prisma.user.findUnique({ where: { username: 'admin' } })
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        username: 'admin',
        passwordHash: adminPasswordHash,
        role: 'ADMIN'
      }
    })
    console.log(`✅ Admin user seeded! Username: admin | Password: ${adminPasswordPlain} (Change this immediately!)`)
  } else {
    console.log(`✅ Admin user already exists.`)
  }

  for (const branch of branchRecords) {
    const username = `${branch.code.toLowerCase()}_branch`
    const existingBranchUser = await prisma.user.findUnique({ where: { username } })
    if (!existingBranchUser) {
      await prisma.user.create({
        data: {
          username,
          passwordHash: branchPasswordHash,
          role: 'BRANCH',
          branchId: branch.id
        }
      })
    }
  }
  console.log(`✅ Branch users seeded. Default new user password: ${branchPasswordPlain} (Change this immediately!)`)

  // Current month
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  // Generate a few random entries for the current month for the first two branches
  for (let i = 1; i <= 5; i++) {
    const date = new Date(year, month, i)
    
    for (const branch of branchRecords.slice(0, 2)) {
      // Create Entry
      const entry = await prisma.dailyEntry.upsert({
        where: {
          date_branchId: {
            date: date,
            branchId: branch.id
          }
        },
        update: {},
        create: {
          date: date,
          branchId: branch.id,
        }
      })

      // Random sales data
      const itemsData = [
        { categoryId: categoryMap.get('Opening Balance')!, amount: 5000 },
        { categoryId: categoryMap.get('Cash Sale')!, amount: Math.floor(Math.random() * 50000) + 10000 },
        { categoryId: categoryMap.get('bKash Income')!, amount: Math.floor(Math.random() * 20000) },
        { categoryId: categoryMap.get('Due Received')!, amount: Math.floor(Math.random() * 5000) },
        { categoryId: categoryMap.get('Lunch')!, amount: Math.floor(Math.random() * 500) + 200 },
        { categoryId: categoryMap.get('Conveyance')!, amount: Math.floor(Math.random() * 300) + 100 },
        { categoryId: categoryMap.get('Bank Deposit')!, amount: Math.floor(Math.random() * 30000) },
      ]

      for (const item of itemsData) {
        await prisma.entryItem.upsert({
          where: {
            entryId_categoryId: {
              entryId: entry.id,
              categoryId: item.categoryId
            }
          },
          update: { amount: item.amount },
          create: {
            entryId: entry.id,
            categoryId: item.categoryId,
            amount: item.amount
          }
        })
      }
    }
  }

  console.log('✅ Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
