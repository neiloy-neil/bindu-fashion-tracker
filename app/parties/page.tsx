import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/server-auth'
import PartyListClient from './PartyListClient'

export default async function PartiesPage() {
  await requireAuth('parties.view')

  const parties = await prisma.party.findMany({
    orderBy: { name: 'asc' },
    include: {
      bankInfo: true
    }
  })

  // We can also fetch some summary data, but we will pass the parties down to the client component
  return <PartyListClient initialParties={parties} />
}
