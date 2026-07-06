# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Vitest (unit tests)
npm run db:migrate   # Prisma migrate dev
npm run db:studio    # Prisma Studio GUI
npm run db:seed      # Seed database
```

**Turbopack cache corruption** (stale bundle errors after gutting exports or uninstalling packages): stop the server, run `Remove-Item -Recurse -Force .next`, restart.

## Architecture

### Auth & role injection (`proxy.ts`)

`proxy.ts` is the middleware entry point. It validates the NextAuth JWT and injects user identity as request headers — `x-user-id`, `x-user-role`, `x-user-branch-id`, `x-user-managed-branches` — before the request reaches any API route. Every API route reads these headers; **never trust client-supplied role headers**.

Route-level blocks in `proxy.ts`:
- `BRANCH` — blocked from `/admin`, `/parties`, `/branches`, `/categories`
- `HR_ADMIN` — blocked from `/entries/new`, `/parties`, `/categories`, `/admin/users`, `/admin/settings`, `/branches`, `/import`
- `AUDITOR`/`AREA_MANAGER` — blocked from `/admin/users`, `/admin/settings`, `/branches`, `/import`
- `SUPER_ADMIN` — bypasses all middleware blocks; individual API routes must still include it in their allowlists

### Roles

`BRANCH` · `ADMIN` · `SUPER_ADMIN` · `HR_ADMIN` · `AUDITOR` · `AREA_MANAGER` · `ACCOUNTS`

When adding a role check to an API route, always include `SUPER_ADMIN` alongside `ADMIN` unless there is a deliberate reason not to. Missing `SUPER_ADMIN` from an allowlist is a recurring bug pattern.

### Data model spine

`Branch` → `DailyEntry` → `EntryItem` (income categories), `ExpenseEntry`, `Transfer`, `Payment` → `Cheque`

`Employee` → `Attendance`, `LeaveRecord`, `SalaryRecord`, `AdvanceSalary`, `EidRecord`

`Party` → `Payment`, `PartyBankInfo`

`User` → `Notification`, `AuditLog`, `BranchRequest`, `EditRequest`

### Notifications (`lib/notify.ts`)

Three helpers:
- `notifyUsers({ userIds, type, title, body, metadata })` — direct user IDs
- `notifyByRole(roles[], ...)` — all active users of given roles
- `notifyBranchUsers(branchId, ...)` — all active `BRANCH` users for a branch

Always fire-and-forget with `.catch(() => {})` to avoid blocking the response:
```ts
void notifyBranchUsers(...).catch(() => {})
```

Notification types in use: `TRANSFER_INCOMING`, `LEAVE_REQUEST`, `LEAVE_UPDATE`, `EDIT_REQUEST`, `EDIT_REQUEST_UPDATE`, `BRANCH_REQUEST`, `BRANCH_REQUEST_UPDATE`, `EXPENSE_UPDATE`, `CHEQUE_UPDATE`, `PAYMENT_PENDING`, `PAYMENT_UPDATE`, `DAILY_SUMMARY`.

The `NotificationBell` polls `/api/notifications` every 60 s. PATCH with `{}` marks all read; PATCH with `{ ids: [n] }` dismisses a specific notification.

### Prisma client (`lib/prisma.ts`)

Uses `@prisma/adapter-pg` (connection pool via `pg`) instead of the default engine — required for Supabase's connection pooler. The singleton pattern prevents pool exhaustion in dev HMR.

### Audit logging (`lib/audit.ts`)

Call `logAudit({ userId, action, entityType, entityId, oldValues, newValues, reason })` after any write that modifies financial or HR data. Never skip it for approvals/rejections.

### Structured logging (`lib/logger.ts`)

`logger.info(message, context?)` / `logger.error(message, error, context?)` outputs JSON to stdout. Use a dotted-path message key, e.g. `'cheques.approve_failed'`.

### Petty cash

Tracked per-entry via `pettyCashOpening`, `pettyCashUsed`, `pettyCashReplenished`, `pettyCashClosing` on `DailyEntry`. The dashboard card shows closing float (not physical cash). `actualPhysicalCash` is a separate field.

### Approval flows

- **Expenses**: submitted as `PENDING` by BRANCH, approved/rejected via `POST /api/expense-entries/[id]/approve|reject` (ADMIN/SUPER_ADMIN only).
- **Cheques**: `status` on `Cheque`. Approve decrements party balance; reject does not.
- **Party payments (non-cheque)**: `approvalStatus` on `Payment`. BRANCH submissions are PENDING; approve decrements party balance atomically in a transaction.
- **Leaves**: BRANCH submissions are PENDING; ADMIN/SUPER_ADMIN/HR_ADMIN auto-approve their own. Approve/reject via PATCH `/api/hr/leaves/[id]`.

### File storage

Supabase Storage via `lib/storage.ts`. `signEntryAttachments(entry)` generates signed URLs for receipt images before returning entry data to clients.

### Cron

`GET /api/cron/daily-summary` — protected by `Authorization: Bearer ${CRON_SECRET}`. Generates in-app `DAILY_SUMMARY` notifications for ADMIN/SUPER_ADMIN users. Must be scheduled externally (Vercel cron or similar).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Supabase PostgreSQL pooler URL |
| `NEXTAUTH_SECRET` | JWT signing secret |
| `NEXTAUTH_URL` | App base URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase admin access |
| `CRON_SECRET` | Bearer token for cron endpoints |
