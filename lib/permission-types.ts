// Client-safe — no server imports

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
  'reports.category',
  'targets.view',
  'targets.write',
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
  'parties.approve',
  // Admin
  'admin.users',
  'admin.branches',
  'admin.categories',
  'admin.import',
  'admin.audit',
  'admin.lock_months',
] as const

export type Feature = (typeof FEATURES)[number]

export type PermissionOverride = { feature: string; granted: boolean }

// Role defaults — true means the role has this feature by default
export const ROLE_DEFAULTS: Record<string, Feature[]> = {
  SUPER_ADMIN: FEATURES as unknown as Feature[],
  ADMIN: [
    'entries.create', 'entries.view', 'entries.delete', 'entries.approve_expense',
    'transfers.view', 'reports.daily', 'reports.monthly', 'reports.petty_cash', 'reports.category',
    'targets.view', 'targets.write',
    'hr.employees.view', 'hr.employees.write', 'hr.attendance.view', 'hr.attendance.record',
    'hr.leaves.view', 'hr.leaves.approve',
    'payroll.slips.view', 'payroll.slips.approve', 'payroll.salary.process', 'payroll.salary.lock',
    'payroll.eid', 'payroll.advances',
    'wholesale.view', 'wholesale.write',
    'parties.view', 'parties.write', 'parties.approve',
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
    'entries.view', 'transfers.view', 'reports.daily', 'reports.monthly', 'reports.petty_cash', 'reports.category',
    'targets.view',
    'hr.employees.view', 'wholesale.view', 'parties.view', 'admin.audit',
  ],
  AREA_MANAGER: [
    'entries.view', 'transfers.view', 'reports.daily', 'reports.monthly', 'reports.petty_cash', 'reports.category',
    'targets.view', 'targets.write',
    'wholesale.view', 'parties.view',
  ],
  ACCOUNTS: [
    'entries.view', 'transfers.view', 'reports.daily', 'reports.monthly', 'reports.petty_cash', 'reports.category',
    'targets.view',
    'wholesale.view', 'wholesale.write', 'parties.view', 'parties.write',
  ],
  BRANCH: [
    'entries.create', 'entries.view', 'entries.delete',
    'transfers.view', 'reports.petty_cash', 'targets.view',
    'hr.employees.view', 'hr.attendance.view', 'hr.attendance.record',
    'hr.leaves.view', 'payroll.slips.view', 'payroll.advances',
  ],
}

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
