import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { ChequesClient } from './ChequesClient'

export const dynamic = 'force-dynamic'

export default async function ChequesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  if (!['ADMIN', 'SUPER_ADMIN', 'ACCOUNTS', 'AUDITOR'].includes(session.user.role)) redirect('/entries')

  return (
    <div className="flex-1 p-6 space-y-6">
      <ChequesClient />
    </div>
  )
}