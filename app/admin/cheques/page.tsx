import { requireAuth } from '@/lib/server-auth'
import { ChequesClient } from './ChequesClient'

export const dynamic = 'force-dynamic'

export default async function ChequesPage() {
  await requireAuth('parties.view')

  return (
    <div className="flex-1 p-6 space-y-6">
      <ChequesClient />
    </div>
  )
}