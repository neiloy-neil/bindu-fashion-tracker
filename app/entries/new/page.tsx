import { Category } from '@/lib/types'
import { prisma } from '@/lib/prisma'
import { NewEntryForm } from '@/components/entries/NewEntryForm'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

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
    prisma.category.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }) as Promise<Category[]>,
    prisma.ledgerAccount.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.party.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.expenseCategory.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.employee.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
  ])

  const initialData = {
    branches,
    categories,
    accounts,
    parties,
    expenseCategories,
    employees
  }

  return <NewEntryForm initialData={initialData} userId={session.user.id} />
}
