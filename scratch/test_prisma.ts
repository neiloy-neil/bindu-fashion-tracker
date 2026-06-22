import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  try {
    const emps = await prisma.employee.findMany()
    console.log(`Found ${emps.length} employees`)
  } catch (e: any) {
    console.error('Error:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
