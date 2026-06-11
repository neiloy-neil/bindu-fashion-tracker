const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding data...')

  // Ensure some branches exist
  let branch1 = await prisma.branch.findFirst({ where: { name: 'Mirpur' } })
  if (!branch1) {
    branch1 = await prisma.branch.create({
      data: { name: 'Mirpur', code: 'MIR01', isActive: true }
    })
  }

  let branch2 = await prisma.branch.findFirst({ where: { name: 'Dhanmondi' } })
  if (!branch2) {
    branch2 = await prisma.branch.create({
      data: { name: 'Dhanmondi', code: 'DHA01', isActive: true }
    })
  }

  // Current month
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  // Generate 20 random entries for the current month
  for (let i = 1; i <= 20; i++) {
    const date = new Date(year, month, i)
    
    for (const branch of [branch1, branch2]) {
      // Random sales data
      const cashSale = Math.floor(Math.random() * 50000) + 10000
      const bkashIncome = Math.floor(Math.random() * 20000)
      const dueReceived = Math.floor(Math.random() * 5000)
      
      // Random expense data
      const lunch = Math.floor(Math.random() * 500) + 200
      const conveyance = Math.floor(Math.random() * 300) + 100
      const bankDeposit = Math.floor(Math.random() * 30000)
      
      await prisma.dailyEntry.create({
        data: {
          date: date,
          branchId: branch.id,
          openingBalance: 5000,
          cashSale,
          bkashIncome,
          dueReceived,
          conditionRec: 0,
          nagadIncome: 0,
          rocketIncome: 0,
          posPubali: 0,
          posCity: 0,
          posBrac: 0,
          posDbbl: 0,
          acBindu: 0,
          bindu2Transfer: 0,
          receivedAziz1: 0,
          
          advanceTk: 0,
          conditionChange: 0,
          partyPayment: 0,
          aziz2Transfer: 0,
          bankDeposit,
          dmcb: 0,
          saleBonus: 0,
          courierLbrBill: 0,
          snacksTea: 0,
          lunch,
          conveyance,
          otherExpense: 0,
          donation: 0,
          stationary: 0,
          netWife: 0,
          utilities: 0,
          waterBill: 0,
          dailySomity: 0,
          electricRecharge: 0,
          petrolMobil: 0,
          phoneBill: 0,
          shopRent: 0,
          salary: 0,
          returnExp: 0,
          bkashExpense: 0,
          nagadExpense: 0,
          posExpense: 0,
          rocketDbbl: 0,
          bossPersonalAll: 0,
          acBinduExpense: 0,
          vat: 0,
          vatExp: 0,
          emgFund: 0,
          bossGift: 0
        }
      })
    }
  }

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
