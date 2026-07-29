import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/server-auth'
import PartyProfileClient from './PartyProfileClient'

export default async function PartyProfilePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth('parties.view')

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
