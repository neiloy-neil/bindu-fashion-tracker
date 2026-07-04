import 'dotenv/config'
import { prisma } from '../lib/prisma'

const FACTORY_EXPENSE_CATEGORIES = [
  'Fabric Purchase',
  'Raw Material',
  'Worker Salary',
  'Worker Conveyance',
  'Worker Overtime',
  'Machine Maintenance',
  'Electricity Bill',
  'Water Bill',
  'Factory Rent',
  'Packaging Material',
  'Transport / Delivery',
  'Factory Miscellaneous',
]

async function main() {
  console.log('Seeding factory expense categories...')
  for (const name of FACTORY_EXPENSE_CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, type: 'EXPENSE', isDefault: false, isActive: true },
    })
    console.log(`  ✅ ${cat.name}`)
  }
  console.log('Done.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
