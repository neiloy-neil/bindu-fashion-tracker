import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import PartyListClient from './PartyListClient'

export default async function PartiesPage() {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    redirect('/login')
  }

  const parties = await prisma.party.findMany({
    orderBy: { name: 'asc' },
    include: {
      bankInfo: true
    }
  })

  // We can also fetch some summary data, but we will pass the parties down to the client component
  return <PartyListClient initialParties={parties} />
}
