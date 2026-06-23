# Audit Remediation Plan

This document turns the audit findings into an execution plan we can follow phase by phase.

## How To Use This Plan

- Work top to bottom. Do not skip earlier phases unless explicitly approved.
- Treat each phase as a small release with its own verification gate.
- Keep changes scoped to the files listed for that phase.
- Do not merge a phase until its verification checklist is green.

## Current Audit Priorities

### Critical

- [x] Lock down the unauthenticated operational endpoint in `app/api/run-backfill/route.ts`

### High

- [x] Fix employee PII exposure in `app/api/hr/employees/[id]/route.ts`
- [x] Fix edit request spoofing and arbitrary change application in `app/api/edit-requests/route.ts`
- [x] Add strict validation to legacy financial mutation routes
- [x] Replace or isolate vulnerable `xlsx` usage

### Medium

- [x] Fix transfer acknowledge race conditions
- [x] Add missing database indexes for reporting and ledger queries
- [x] Rename `middleware.ts` to `proxy.ts` for Next.js 16
- [x] Make lint usable as a real gate
- [x] Improve logging and observability

## Phase 1: Critical Security Hotfixes

### Goal

Close the highest-risk server-side security gaps before touching cleanup or UX.

### Scope

- `app/api/run-backfill/route.ts`
- `app/api/hr/employees/[id]/route.ts`
- `app/api/hr/employees/route.ts`
- `app/api/auth/[...nextauth]/route.ts`
- `middleware.ts` or `proxy.ts`

### Tasks

- [x] Require `ADMIN` access for `run-backfill`, or remove the route entirely if it is one-time only
- [x] Convert the backfill endpoint from `GET` to `POST`
- [x] Restrict employee detail reads by role and branch ownership
- [x] Return role-safe employee DTOs instead of full raw records for non-admin users
- [x] Re-check that all protected API routes are covered by the auth request layer

### Success Criteria

- [x] Operational mutation endpoints are no longer callable anonymously
- [x] Branch users cannot read employee PII outside their own allowed scope
- [x] Sensitive API routes rely on server-side role checks, not UI assumptions

### Verification

- [x] Unauthenticated access to `/api/run-backfill` is rejected
- [x] Branch users cannot fetch another branch employee record
- [x] Admin and HR Admin can still fetch allowed employee data
- [x] `npx tsc --noEmit`
- [x] `npm test`
- [x] `npm run build`

## Phase 2: Authorization And Input Validation Hardening

### Goal

Remove the older loose mutation paths that can still write bad or spoofed data.

### Scope

- `app/api/edit-requests/route.ts`
- `app/api/payments/route.ts`
- `app/api/transfers/route.ts`
- `app/api/advance-salaries/route.ts`
- `lib/schemas.ts`
- `lib/new-entry.ts`

### Tasks

- [x] Stop accepting `requestedById` from the client for edit requests
- [x] Derive requester identity from authenticated server headers or session only
- [x] Add branch ownership verification before creating edit requests
- [x] Replace free-form `changes` payloads with a whitelist schema
- [x] Prevent edit approval from spreading arbitrary fields into `DailyEntry.update`
- [x] Add strict Zod schemas for legacy financial routes
- [x] Reject invalid IDs, negative amounts, invalid methods, missing cheque dates, and malformed payloads
- [x] Standardize error responses for validation failures

### Success Criteria

- [x] Edit requests cannot impersonate another user
- [x] Edit approvals only apply explicit, allowed fields
- [x] Legacy payment, transfer, and advance routes are as strict as the newer entry flow

### Verification

- [x] Add focused tests for edit request validation and authorization
- [x] Add focused tests for payment, transfer, and advance payload validation
- [x] `npm test`
- [x] `npx tsc --noEmit`
- [x] `npm run build`

## Phase 3: Financial Integrity And Concurrency

### Goal

Make ledger-affecting workflows safe under retries, races, and reporting load.

### Scope

- `app/api/transfers/[id]/acknowledge/route.ts`
- `app/api/entries/route.ts`
- `app/api/summary/route.ts`
- `app/api/reports/daily/route.ts`
- `prisma/schema.prisma`

### Tasks

- [x] Make transfer acknowledgement atomic with `updateMany` or equivalent status-guarded claim logic
- [x] Ensure a transfer cannot be acknowledged twice during concurrent requests
- [x] Review entry creation and related side effects for duplicate-write safety
- [x] Add indexes for hot paths:
- `Transfer.dailyEntryId`
- `Transfer.accountId + status`
- `Transfer.receivingEntryId`
- `Payment.partyId`
- `Payment.dailyEntryId`
- `AdvanceSalary.employeeId + createdAt`
- [x] Review summary and report queries after indexes are added

### Success Criteria

- [x] Double acknowledgement is prevented at the database write level
- [x] Reporting and ledger queries have matching indexes for their main filters and joins

### Verification

- [x] Add migration for new indexes
- [x] `npx prisma validate`
- [x] `npx prisma migrate deploy`
- [x] `npm test`
- [x] `npx tsc --noEmit`
- [x] `npm run build`

## Phase 4: Frontend Stability, Lint Debt, And A11y

### Goal

Make the frontend maintainable again and turn lint into a signal instead of noise.

### Scope

- `eslint.config.mjs`
- `app/admin/page.tsx`
- `app/admin/audit-logs/page.tsx`
- `app/admin/cheques/ChequesClient.tsx`
- `components/layout/Sidebar.tsx`
- `components/layout/LayoutWrapper.tsx`
- `components/hr/*`
- `components/reports/DailyReportTemplate.tsx`

### Tasks

- [x] Exclude generated and scratch artifacts from lint:
- `dist/**`
- `scratch/**`
- generated `.js` files that are not source-of-truth
- [x] Fix real React 19 hook-rule violations in app code
- [x] Remove `any` from high-churn components and shared libs first
- [x] Fix `img` and alt-text issues where they affect real app surfaces
- [x] Clean up static component creation inside render

### Success Criteria

- [x] Lint failure count drops from broad repo noise to real source issues
- [x] Admin and HR surfaces no longer violate the main React lint rules
- [x] Remaining lint output is warning-only and now concentrated in follow-up typing and image cleanup work

### Verification

- [x] `npm run lint`
- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] Smoke-check admin dashboard, cheques, audit logs, sidebar, and HR modals

### Phase 4 Notes

- Lint is now a usable gate again: the repo moved from hundreds of mixed source and generated-file failures to warning-only output.
- `@typescript-eslint/no-explicit-any` is temporarily warning-level so the remaining typing debt can be burned down incrementally without hiding real React, a11y, or build-breaking issues.
- Remaining warnings should be handled as follow-up cleanup, not as blockers for Phase 4 stability.

## Phase 5: Dependencies, DevOps, And Observability

### Goal

Reduce supply-chain risk and modernize runtime/platform edges.

### Scope

- `package.json`
- `package-lock.json`
- `lib/hr/excel.ts`
- `middleware.ts` or `proxy.ts`
- logging touchpoints in API routes

### Tasks

- [x] Replace `xlsx` with a maintained alternative, or isolate it behind strict constraints until replacement is complete
- [x] Review `npm audit` findings and separate runtime risk from dev-only risk
- [x] Rename `middleware.ts` to `proxy.ts`
- [x] Update docs and code comments that still refer to middleware if needed
- [x] Introduce structured logging for key mutations and background flows
- [x] Remove low-signal `console.log` calls from production paths

### Success Criteria

- [x] Known high-risk dependency usage is removed or contained
- [x] Next.js 16 deprecation warning for middleware is resolved
- [x] Logs are structured enough to debug auth, entries, transfers, and payroll flows

### Verification

- [x] `npm audit --json`
- [x] `npm run lint`
- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] Manual check that proxy behavior still protects routes

### Phase 5 Notes

- Spreadsheet import/export runtime no longer depends on `xlsx`; the app now uses `exceljs`, and import paths are narrowed to `.xlsx` only with file-size and row-count guards.
- `npm audit` no longer reports the prior high-severity `xlsx` findings. Remaining advisories are moderate and split into:
- runtime/transitive app stack: `next` -> `postcss`, `next-auth`/`uuid`, `exceljs`/`uuid`
- tooling/dev-path: `prisma` -> `@prisma/dev` -> `@hono/node-server`
- low-confidence transitive frontend utility path: `dompurify`
- Structured JSON logging now covers entry creation, branch requests, cheque fetch failures, audit-log write failures, payroll advance sync, and the daily cron summary.

## Phase 6: Final Verification And Release Readiness

### Goal

Finish with confidence and avoid shipping partial hardening.

### Tasks

- [x] Re-run full verification:
- `npm test`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- [x] Manually test:
- login and role-based navigation
- New Entry flow
- direct payments and transfers
- edit request submission and approval
- HR employee access rules
- cheque approval and rejection
- [x] Update `README.md` or operational docs if workflow or env requirements changed
- [x] Capture any remaining deferred items in a short backlog section

### Exit Criteria

- [x] No open critical findings
- [x] No open high findings
- [x] Lint is either green or reduced to explicitly accepted leftovers
- [x] Build, tests, and typecheck are green

### Phase 6 Notes

- Full verification passed:
- `npm test` -> 23 tests passed
- `npx tsc --noEmit` -> passed
- `npm run lint` -> passed with warning-only debt
- `npm run build` -> passed
- Manual QA against the built app on `127.0.0.1` confirmed:
- admin can access `/admin`
- branch users are redirected from `/admin` to `/entries/new`
- HR Admin is redirected away from `/entries/new` to `/entries`
- branch access to `/api/hr/employees` is denied with `403`
- HR Admin access to `/api/hr/employees` succeeds
- branch new entry creation works with direct cash payments and branch transfers
- receiving-branch transfer acknowledgement completes and marks the transfer `ACKNOWLEDGED`
- past branch entries cannot be edited directly and must go through edit requests
- admin approval applies edit requests successfully
- cheque approval decrements party balance and marks the cheque `APPROVED`
- cheque rejection leaves the cheque `REJECTED` without an additional party-balance decrement

## Deferred Backlog

- Burn down the remaining lint warnings, especially `no-explicit-any`, unused vars, and the last `no-img-element` surfaces in:
- `app/admin/requests/page.tsx`
- `app/admin/settings/page.tsx`
- `app/entries/page.tsx`
- `app/hr/*`
- `components/entries/*`
- `components/dashboard/*`
- `lib/exportPdf.ts`, `lib/utils.ts`, and `lib/types.ts`
- Replace remaining ad hoc `console.error` usage in routes that were outside the scoped Phase 5 logging touchpoints, including cheque approve/reject and transfer pending-count handlers.
- Reassess the remaining moderate `npm audit` advisories after upstream releases for `next`, `next-auth`, `exceljs`, and the Prisma dev toolchain.

## Recommended Execution Order

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6

## Notes And Guardrails

- `app/api/entries/route.ts` is already the strongest financial write path in the repo. Reuse its validation patterns instead of inventing a second style.
- Keep auth and validation fixes server-side first. UI restrictions are helpful, but they are not a security boundary.
- Do not combine dependency replacement, schema migrations, and lint cleanup in one commit unless the scope is tiny. Smaller reviewable phases will be much safer here.
