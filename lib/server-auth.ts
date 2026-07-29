import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import type { Feature } from '@/lib/permission-types'
import { resolveUserPermissions } from '@/lib/permissions'

export type SessionUser = {
  id: string
  username: string
  role: string
  branchId?: number | null
  branchType?: string | null
  permissions: Record<Feature, boolean>
}

/**
 * Get the current session and resolved permissions.
 * Falls back to a fresh DB lookup if the JWT predates the permissions field.
 */
export async function requireAuth(feature?: Feature): Promise<SessionUser> {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const user = session.user as any
  let permissions: Record<Feature, boolean> = user.permissions ?? {}

  // JWT may predate the permissions field, or permissions may be empty — re-derive from DB
  if (!user.permissions || Object.keys(user.permissions).length === 0) {
    permissions = await resolveUserPermissions(parseInt(user.id), user.role)
  }

  if (feature && !permissions[feature]) {
    redirect('/entries')
  }

  return { ...user, permissions }
}
