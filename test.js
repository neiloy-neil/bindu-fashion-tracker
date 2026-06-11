const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    const requests = await prisma.branchRequest.findMany()
    console.log(requests)
  } catch (e) {
    console.error(e)
  }
}
main().finally(() => prisma.$disconnect())
