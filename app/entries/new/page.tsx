import { prisma } from '@/lib/prisma'
import { NewEntryForm } from '@/components/entries/NewEntryForm'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import type { Category } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function NewEntryPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'ADMIN' && session.user.role !== 'BRANCH') redirect('/entries')

  const [branches, categories, accounts, parties, expenseCategories, employees] = await Promise.all([
    prisma.branch.findMany({
      where: { isActive: true, ...(session.user.role === 'BRANCH' ? { id: session.user.branchId ?? -1 } : {}) },
      orderBy: { name: 'asc' },
    }),
    prisma.category.findMany({ where: { isActive: true, type: 'INCOME' }, orderBy: { name: 'asc' } }) as Promise<Category[]>,
    prisma.ledgerAccount.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.party.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    (prisma.category as any).findMany({ where: { isActive: true, type: 'EXPENSE' }, orderBy: { name: 'asc' } }) as Promise<Category[]>,
    prisma.employee.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
  ])

  return (
    <NewEntryForm
      initialData={{ branches, categories, accounts, parties, expenseCategories, employees }}
      userId={session.user.id}
    />
  )
}
