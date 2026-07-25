// Server-only — imports prisma. Client code must import from ./permission-types
import { prisma } from './prisma'
import { FEATURES, hasPermission, type Feature, type PermissionOverride } from './permission-types'

export { FEATURES, hasPermission, type Feature, type PermissionOverride } from './permission-types'

/** Fetch all overrides for a user from DB (call server-side only). */
export async function getUserOverrides(userId: number): Promise<PermissionOverride[]> {
  const rows = await prisma.userPermission.findMany({
    where: { userId },
    select: { feature: true, granted: true },
  })
  return rows
}

/** Returns a flat map of all features → boolean for a given user. */
export async function resolveUserPermissions(
  userId: number,
  role: string,
): Promise<Record<Feature, boolean>> {
  if (role === 'SUPER_ADMIN') {
    return Object.fromEntries(FEATURES.map(f => [f, true])) as Record<Feature, boolean>
  }
  const overrides = await getUserOverrides(userId)
  return Object.fromEntries(
    FEATURES.map(f => [f, hasPermission(role, f, overrides)])
  ) as Record<Feature, boolean>
}
