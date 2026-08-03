import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'
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
/**
 * Extract user identity + resolved permissions from API route request headers.
 * Returns null if headers are missing (unauthenticated).
 */
export async function getReqPerms(req: NextRequest): Promise<{
  role: string
  userId: number
  perms: Record<Feature, boolean>
} | null> {
  const role = req.headers.get('x-user-role') ?? ''
  const userId = parseInt(req.headers.get('x-user-id') ?? '0')
  if (!role || !userId) return null
  const perms = await resolveUserPermissions(userId, role)
  return { role, userId, perms }
}

export const FORBIDDEN = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
