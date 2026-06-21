import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import PartyProfileClient from './PartyProfileClient'

export default async function PartyProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  const resolvedParams = await params
  const id = parseInt(resolvedParams.id)

  const party = await prisma.party.findUnique({
    where: { id },
    include: {
      bankInfo: true
    }
  })

  if (!party) {
    redirect('/parties')
  }

  return <PartyProfileClient party={party} />
}
