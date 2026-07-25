import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { FEATURES } from '@/lib/permission-types'

async function getCallerInfo() {
  const h = await headers()
  return {
    role: h.get('x-user-role') ?? '',
    id: parseInt(h.get('x-user-id') ?? '0', 10),
  }
}

// GET /api/admin/permissions/[userId] — list all overrides for a user
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { role } = await getCallerInfo()
  if (role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await params
  const uid = parseInt(userId, 10)
  if (isNaN(uid)) return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })

  const permissions = await prisma.userPermission.findMany({
    where: { userId: uid },
    select: { feature: true, granted: true, note: true, grantedBy: true, updatedAt: true },
  })
  return NextResponse.json(permissions)
}

// PUT /api/admin/permissions/[userId] — full replace of overrides
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { role, id: callerId } = await getCallerInfo()
  if (role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await params
  const uid = parseInt(userId, 10)
  if (isNaN(uid)) return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })

  const body: { feature: string; granted: boolean; note?: string }[] = await req.json()
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'Body must be an array' }, { status: 400 })
  }

  // Validate feature keys
  const validFeatures = new Set(FEATURES as readonly string[])
  for (const item of body) {
    if (!validFeatures.has(item.feature)) {
      return NextResponse.json({ error: `Unknown feature: ${item.feature}` }, { status: 400 })
    }
  }

  // Fetch old permissions for audit
  const oldPerms = await prisma.userPermission.findMany({ where: { userId: uid } })

  // Delete all existing overrides then insert new ones in a transaction
  await prisma.$transaction([
    prisma.userPermission.deleteMany({ where: { userId: uid } }),
    ...(body.length > 0
      ? [prisma.userPermission.createMany({
          data: body.map(item => ({
            userId: uid,
            feature: item.feature,
            granted: item.granted,
            grantedBy: callerId,
            note: item.note ?? null,
          })),
        })]
      : []),
  ])

  void logAudit({
    userId: callerId,
    action: 'UPDATE',
    entityType: 'UserPermission',
    entityId: uid,
    oldValues: { permissions: oldPerms },
    newValues: { permissions: body },
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/permissions/[userId] — remove all overrides (reset to role default)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { role, id: callerId } = await getCallerInfo()
  if (role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await params
  const uid = parseInt(userId, 10)
  if (isNaN(uid)) return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })

  await prisma.userPermission.deleteMany({ where: { userId: uid } })

  void logAudit({
    userId: callerId,
    action: 'DELETE',
    entityType: 'UserPermission',
    entityId: uid,
    oldValues: null,
    newValues: null,
    reason: 'Reset all permission overrides to role default',
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
