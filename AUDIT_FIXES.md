# Bindu Audit Fix Plan — v10 (2026-06-28)

## Pre-check Results

| ID | Status | Note |
|----|--------|------|
| CRIT-1 | ✅ Already fixed | globals.css was rewritten in the design-system prompt. No collision present. |
| CRIT-3 | ✅ False positive | checkbox.tsx and avatar.tsx are plain-React implementations. No @radix-ui imports needed. |
| HIGH-4 | 🚫 Skip | `lib/prisma.ts as any` is required for Prisma preview driverAdapters — cannot remove safely. |
| MED-7 | 🚫 Absorbed | computeTotals already separates Opening Balance. Monthly route (HIGH-2) is the real fix. |

---

## Fix Queue

| # | ID | File(s) | Severity | Status |
|---|-----|---------|----------|--------|
| 1 | CRIT-2 + MED-1 | entries/route.ts, 7 HR routes | 🔴 | ☐ |
| 2 | HIGH-1 | parties/[id]/ledger/route.ts | 🟠 | ☐ |
| 3 | HIGH-2 | reports/monthly/route.ts | 🟠 | ☐ |
| 4 | HIGH-3 | categories/route.ts, categories/[id]/route.ts | 🟠 | ☐ |
| 5 | HIGH-5 | hr/attendance/route.ts | 🟠 | ☐ |
| 6 | HIGH-6 | entries/[id]/route.ts | 🟠 | ☐ |
| 7 | HIGH-7 | entries/route.ts | 🟠 | ☐ |
| 8 | HIGH-8 | hr/employees/route.ts | 🟠 | ☐ |
| 9 | MED-2 | hr/leaves/route.ts | 🟡 | ☐ |
| 10 | MED-3 + MED-4 | prisma/schema.prisma | 🟡 | ☐ |
| 11 | MED-5 | lib/prisma.js, lib/hr/calculations.js, seed.js, scratch/, test.js, update_schema.js | 🟡 | ☐ |
| 12 | MED-6 | app/api/run-backfill/route.ts | 🟡 | ☐ |
| 13 | MED-8 | app/api/employees/* | 🟡 | ☐ |
| 14 | MED-9 | hr/eid-records/route.ts | 🟡 | ☐ |

---

## Fix Details

### Fix 1 — SUPER_ADMIN access (CRIT-2 + MED-1)
Add `'SUPER_ADMIN'` to every role allowlist that includes `'ADMIN'` but omits SUPER_ADMIN.

Routes to patch:
- `app/api/entries/route.ts` POST → `['ADMIN', 'SUPER_ADMIN', 'BRANCH']`
- `app/api/hr/salary-records/route.ts` GET → add SUPER_ADMIN; POST → add SUPER_ADMIN
- `app/api/hr/salary-records/lock/route.ts` → add SUPER_ADMIN
- `app/api/hr/eid-records/route.ts` GET + POST → add SUPER_ADMIN
- `app/api/hr/slips/route.ts` GET → add SUPER_ADMIN
- `app/api/hr/employees/route.ts` GET + POST → add SUPER_ADMIN
- `app/api/hr/attendance/route.ts` POST → add SUPER_ADMIN
- `app/api/reports/monthly/route.ts` GET → add SUPER_ADMIN

### Fix 2 — Party ledger running balance excludes PENDING payments (HIGH-1)
Include `approvalStatus` in payment select. In the running balance loop, only subtract payment amount if `approvalStatus === 'APPROVED'` (or the payment was directly from an admin-created record — i.e., `method === 'CASH'` from ADMIN).

Actually the simplest correct rule: only subtract a payment if `approvalStatus === 'APPROVED'`. The `party.balance` in the DB is only decremented on approval.

### Fix 3 — Monthly report excludes Opening Balance from income (HIGH-2)
Fetch `items: { include: { category: { select: { name: true, type: true } } } }` and filter `item.category.name !== 'Opening Balance' && item.category.type === 'INCOME'` before summing.

### Fix 4 — Remove `as any` from categories routes (HIGH-3)
Run `npx prisma generate` to regenerate types, then remove `(prisma.category.create as any)` and `(prisma.category.update as any)`.

### Fix 5 — Zod validation for attendance POST (HIGH-5)
Add Zod schema validating `branchId`, `date` (regex `YYYY-MM-DD`), `attendances` array with `employeeId` (number), `checkInTimeStr` (HH:MM regex, optional), `isAbsent` (boolean, optional).

### Fix 6 — Recalculate expectedNetBalance in entries PUT (HIGH-6)
After upserting items and expense entries, recompute `expectedNetBalance = income - expenses - transfers - payments - advances` using the updated DB state and `prisma.dailyEntry.update` to store it.

### Fix 7 — Floating point equality for opening balance (HIGH-7)
Change `openingBalanceItem.amount !== expectedOpeningBalance` to `Math.abs(openingBalanceItem.amount - expectedOpeningBalance) > 0.01`.

### Fix 8 — Zod validation for HR employees POST (HIGH-8)
Add Zod schema before `prisma.employee.create`.

### Fix 9 — Leave date validation (MED-2)
Change:
```ts
startDate: z.string().transform(v => new Date(v)),
```
To:
```ts
startDate: z.string().pipe(z.coerce.date()),
```

### Fix 10 — Schema comments (MED-3 + MED-4)
- Update role comment: `// ADMIN, SUPER_ADMIN, BRANCH, AUDITOR, AREA_MANAGER, HR_ADMIN, ACCOUNTS`
- Update LeaveRecord type comment: `// SICK, CASUAL, UNPAID, ANNUAL, MARRIAGE`

### Fix 11 — Delete stale files (MED-5)
Delete: `lib/prisma.js`, `lib/hr/calculations.js`, `seed.js` (keep seed.ts), `test.js`, `update_schema.js`, `scratch/` folder.

### Fix 12 — Delete run-backfill route (MED-6)
Delete `app/api/run-backfill/route.ts` (one-time migration endpoint, should not be permanently exposed).

### Fix 13 — Resolve duplicate employee routes (MED-8)
Determine which route is canonical and delete the dead one.

### Fix 14 — Zod validation for eid-records POST (MED-9)
Add Zod schema to `app/api/hr/eid-records/route.ts` POST handler.
