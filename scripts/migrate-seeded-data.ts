import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function migrateData() {
  console.log('Starting data migration for seeded entries...')

  // 1. Create default master data
  const defaultAccount = await prisma.ledgerAccount.upsert({
    where: { name: 'Main Bank Account' },
    update: {},
    create: { name: 'Main Bank Account', type: 'COMPANY', isActive: true }
  })
  
  const defaultParty = await prisma.party.upsert({
    where: { name: 'Default Supplier' },
    update: {},
    create: { name: 'Default Supplier', isActive: true }
  })
  
  // Actually Employee only has name, isActive, createdAt based on schema
  // Let's create 'Default Employee' by doing a findFirst or create since there is no unique constraint on name
  let defaultEmployee = await prisma.employee.findFirst({ where: { name: 'Default Employee' } })
  if (!defaultEmployee) {
    defaultEmployee = await prisma.employee.create({
      data: { name: 'Default Employee', isActive: true }
    })
  }

  // 2. Fetch all daily entries that have items
  const entries = await prisma.dailyEntry.findMany({
    include: {
      items: {
        include: { category: true }
      }
    }
  })

  console.log(`Found ${entries.length} DailyEntry records. Checking items...`)

  let migratedCount = 0

  for (const entry of entries) {
    for (const item of entry.items) {
      if (!item.category) continue

      const catName = item.category.name

      // Party Payment
      if (catName === 'Party Payment') {
        await prisma.payment.create({
          data: {
            dailyEntryId: entry.id,
            partyId: defaultParty.id,
            amount: item.amount,
            method: 'CASH',
            note: 'Migrated from legacy EntryItem'
          }
        })
        migratedCount++
      }
      
      // Transfers
      else if (['Bank Deposit', 'Aziz-2 Transfer', 'Bindu-2 Transfer', 'Received Aziz-1'].includes(catName)) {
        await prisma.transfer.create({
          data: {
            dailyEntryId: entry.id,
            accountId: defaultAccount.id,
            amount: item.amount,
            note: `Migrated from legacy EntryItem (${catName})`
          }
        })
        migratedCount++
      }

      // Advance Salary
      else if (catName === 'Advance TK') {
        await prisma.advanceSalary.create({
          data: {
            dailyEntryId: entry.id,
            employeeId: defaultEmployee.id,
            amount: item.amount,
            type: 'CASH',
            note: 'Migrated from legacy EntryItem'
          }
        })
        migratedCount++
      }

      // Other Expenses
      else if (item.category.type === 'EXPENSE') {
        // Find or create an ExpenseCategory matching this old category
        const expCat = await prisma.expenseCategory.upsert({
          where: { name: catName },
          update: {},
          create: { name: catName, frequency: 'DAILY', isActive: true }
        })

        await prisma.expenseEntry.create({
          data: {
            dailyEntryId: entry.id,
            categoryId: expCat.id,
            amount: item.amount,
            note: 'Migrated from legacy EntryItem'
          }
        })
        migratedCount++
      }
    }
  }

  console.log(`✅ Migration complete. Migrated ${migratedCount} EntryItems to new tables.`)
  
  // Note: We are keeping the legacy items intact per the plan default.
}

migrateData()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
