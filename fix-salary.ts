import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Running SQL command...')
    await prisma.$executeRawUnsafe(`ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS leave_adjustment numeric NOT NULL DEFAULT 0;`)
    console.log('Success!')
  } catch (err) {
    console.error('Failed to run query on salary_records, trying SalaryRecord just in case or showing error:')
    console.error(err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
