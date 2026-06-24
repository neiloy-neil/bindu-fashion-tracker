import { prisma } from '../lib/prisma'
import * as fs from 'fs'
import * as path from 'path'

async function main() {
  console.log('Starting backup process...')
  const backupDir = path.join(process.cwd(), 'backups')
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir)
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`)

  try {
    // Fetch all critical data
    const [
      branches,
      users,
      categories,
      employees,
      salaryRecords,
      dailyEntries,
      entryItems,
      transfers,
      expenseEntries,
      advanceSalaries,
      auditLogs
    ] = await Promise.all([
      prisma.branch.findMany(),
      prisma.user.findMany(),
      prisma.category.findMany(),
      prisma.employee.findMany(),
      prisma.salaryRecord.findMany(),
      prisma.dailyEntry.findMany(),
      prisma.entryItem.findMany(),
      prisma.transfer.findMany(),
      prisma.expenseEntry.findMany(),
      prisma.advanceSalary.findMany(),
      prisma.auditLog.findMany()
    ])

    const backupData = {
      timestamp,
      data: {
        branches,
        users,
        categories,
        employees,
        salaryRecords,
        dailyEntries,
        entryItems,
        transfers,
        expenseEntries,
        advanceSalaries,
        auditLogs
      }
    }

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2))
    console.log(`✅ Backup successfully saved to ${backupFile}`)
  } catch (error) {
    console.error('❌ Backup failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
