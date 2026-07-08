import { prisma } from '@/lib/prisma'

export async function isMonthLocked(branchId: number, date: Date): Promise<boolean> {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const lock = await prisma.lockedMonth.findUnique({
    where: { branchId_year_month: { branchId, year, month } },
    select: { id: true },
  })
  return lock !== null
}
