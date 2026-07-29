import { prisma } from '@/lib/prisma'
import { NewEntryForm } from '@/components/entries/NewEntryForm'
import { requireAuth } from '@/lib/server-auth'
import type { Category } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function NewEntryPage() {
  const user = await requireAuth('entries.create')

  const [branches, allBranches, categories, accounts, parties, expenseCategories, employees] = await Promise.all([
    prisma.branch.findMany({
      where: { isActive: true, ...(user.role === 'BRANCH' ? { id: user.branchId ?? -1 } : {}) },
      orderBy: { name: 'asc' },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.category.findMany({ where: { isActive: true, type: 'INCOME' }, orderBy: { name: 'asc' } }) as Promise<Category[]>,
    prisma.ledgerAccount.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.party.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, include: { bankInfo: true } }),
    (prisma.category as any).findMany({ where: { isActive: true, type: 'EXPENSE' }, orderBy: { name: 'asc' } }) as Promise<Category[]>,
    prisma.employee.findMany({
      where: {
        isActive: true,
        ...(user.role === 'BRANCH' && user.branchId ? { branchId: user.branchId } : {}),
      },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <NewEntryForm
      initialData={{ branches, allBranches, categories, accounts, parties, expenseCategories, employees }}
      userId={user.id}
    />
  )
}
