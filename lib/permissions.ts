import { prisma } from './prisma'

export const FEATURES = [
  // Cash flow
  'entries.create',
  'entries.view',
  'entries.delete',
  'entries.approve_expense',
  'transfers.view',
  'reports.daily',
  'reports.monthly',
  'reports.petty_cash',
  // HR
  'hr.employees.view',
  'hr.employees.write',
  'hr.attendance.view',
  'hr.attendance.record',
  'hr.leaves.view',
  'hr.leaves.approve',
  // Payroll
  'payroll.slips.view',
  'payroll.slips.approve',
  'payroll.salary.process',
  'payroll.salary.lock',
  'payroll.eid',
  'payroll.advances',
  // Wholesale
  'wholesale.view',
  'wholesale.write',
  // Parties & payments
  'parties.view',
  'parties.write',
  // Admin
  'admin.users',
  'admin.branches',
  'admin.categories',
  'admin.import',
  'admin.audit',
  'admin.lock_months',
] as const

export type Feature = (typeof FEATURES)[number]

// Role defaults — true means the role has this feature by default
const ROLE_DEFAULTS: Record<string, Feature[]> = {
  SUPER_ADMIN: FEATURES as unknown as Feature[],
  ADMIN: [
    'entries.create', 'entries.view', 'entries.delete', 'entries.approve_expense',
    'transfers.view', 'reports.daily', 'reports.monthly', 'reports.petty_cash',
    'hr.employees.view', 'hr.employees.write', 'hr.attendance.view', 'hr.attendance.record',
    'hr.leaves.view', 'hr.leaves.approve',
    'payroll.slips.view', 'payroll.slips.approve', 'payroll.salary.process', 'payroll.salary.lock',
    'payroll.eid', 'payroll.advances',
    'wholesale.view', 'wholesale.write',
    'parties.view', 'parties.write',
    'admin.users', 'admin.branches', 'admin.categories', 'admin.import', 'admin.audit', 'admin.lock_months',
  ],
  HR_ADMIN: [
    'entries.view', 'reports.daily', 'reports.monthly', 'reports.petty_cash',
    'hr.employees.view', 'hr.employees.write',
    'hr.attendance.view', 'hr.leaves.view', 'hr.leaves.approve',
    'payroll.slips.view', 'payroll.slips.approve', 'payroll.salary.process',
    'payroll.eid', 'payroll.advances',
  ],
  AUDITOR: [
    'entries.view', 'transfers.view', 'reports.daily', 'reports.monthly', 'reports.petty_cash',
    'hr.employees.view', 'wholesale.view', 'admin.audit',
  ],
  AREA_MANAGER: [
    'entries.view', 'transfers.view', 'reports.daily', 'reports.monthly', 'reports.petty_cash',
    'wholesale.view',
  ],
  ACCOUNTS: [
    'entries.view', 'transfers.view', 'reports.daily', 'reports.monthly', 'reports.petty_cash',
    'wholesale.view', 'wholesale.write',
  ],
  BRANCH: [
    'entries.create', 'entries.view', 'entries.delete',
    'transfers.view', 'reports.petty_cash',
    'hr.employees.view', 'hr.attendance.view', 'hr.attendance.record',
    'hr.leaves.view', 'payroll.slips.view', 'payroll.advances',
  ],
}

export type PermissionOverride = { feature: string; granted: boolean }

/**
 * Resolves whether a user has access to a feature.
 * Resolution order:
 *   1. SUPER_ADMIN → always true
 *   2. Explicit deny override → false
 *   3. Explicit grant override → true
 *   4. Role default
 */
export function hasPermission(
  role: string,
  feature: Feature,
  overrides: PermissionOverride[] = [],
): boolean {
  if (role === 'SUPER_ADMIN') return true

  const override = overrides.find(o => o.feature === feature)
  if (override !== undefined) return override.granted

  return (ROLE_DEFAULTS[role] ?? []).includes(feature)
}

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
