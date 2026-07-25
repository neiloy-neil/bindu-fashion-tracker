import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { resolveUserPermissions } from '@/lib/permissions'

// GET /api/me/permissions — returns flat map of feature → boolean for the current user
export async function GET() {
  const h = await headers()
  const role = h.get('x-user-role') ?? ''
  const userId = parseInt(h.get('x-user-id') ?? '0', 10)

  if (!role || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const permissions = await resolveUserPermissions(userId, role)
  return NextResponse.json(permissions)
}
