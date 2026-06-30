import { prisma } from './lib/prisma'

async function main() {
  const autoTransferCategories = ['Bkash', 'Rocket', 'Nagad', 'POS']
  
  const result = await prisma.category.updateMany({
    where: {
      name: { in: autoTransferCategories }
    },
    data: {
      isAutoTransferred: true
    }
  })
  
  console.log(`Updated ${result.count} categories to isAutoTransferred = true`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
