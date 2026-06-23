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
- [ ] Fix edit request spoofing and arbitrary change application in `app/api/edit-requests/route.ts`
- [ ] Add strict validation to legacy financial mutation routes
- [ ] Replace or isolate vulnerable `xlsx` usage

### Medium

- [ ] Fix transfer acknowledge race conditions
- [ ] Add missing database indexes for reporting and ledger queries
- [ ] Rename `middleware.ts` to `proxy.ts` for Next.js 16
- [ ] Make lint usable as a real gate
- [ ] Improve logging and observability

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

- [ ] Stop accepting `requestedById` from the client for edit requests
- [ ] Derive requester identity from authenticated server headers or session only
- [ ] Add branch ownership verification before creating edit requests
- [ ] Replace free-form `changes` payloads with a whitelist schema
- [ ] Prevent edit approval from spreading arbitrary fields into `DailyEntry.update`
- [ ] Add strict Zod schemas for legacy financial routes
- [ ] Reject invalid IDs, negative amounts, invalid methods, missing cheque dates, and malformed payloads
- [ ] Standardize error responses for validation failures

### Success Criteria

- Edit requests cannot impersonate another user
- Edit approvals only apply explicit, allowed fields
- Legacy payment, transfer, and advance routes are as strict as the newer entry flow

### Verification

- [ ] Add focused tests for edit request validation and authorization
- [ ] Add focused tests for payment, transfer, and advance payload validation
- [ ] `npm test`
- [ ] `npx tsc --noEmit`
- [ ] `npm run build`

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

- [ ] Make transfer acknowledgement atomic with `updateMany` or equivalent status-guarded claim logic
- [ ] Ensure a transfer cannot be acknowledged twice during concurrent requests
- [ ] Review entry creation and related side effects for duplicate-write safety
- [ ] Add indexes for hot paths:
- `Transfer.dailyEntryId`
- `Transfer.accountId + status`
- `Transfer.receivingEntryId`
- `Payment.partyId`
- `Payment.dailyEntryId`
- `AdvanceSalary.employeeId + createdAt`
- [ ] Review summary and report queries after indexes are added

### Success Criteria

- Double acknowledgement is prevented at the database write level
- Reporting and ledger queries have matching indexes for their main filters and joins

### Verification

- [ ] Add migration for new indexes
- [ ] `npx prisma validate`
- [ ] `npx prisma migrate dev --name add_audit_indexes`
- [ ] `npm test`
- [ ] `npm run build`

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

- [ ] Exclude generated and scratch artifacts from lint:
- `dist/**`
- `scratch/**`
- generated `.js` files that are not source-of-truth
- [ ] Fix real React 19 hook-rule violations in app code
- [ ] Remove `any` from high-churn components and shared libs first
- [ ] Fix `img` and alt-text issues where they affect real app surfaces
- [ ] Clean up static component creation inside render

### Success Criteria

- Lint failure count drops from broad repo noise to real source issues
- Admin and HR surfaces no longer violate the main React lint rules

### Verification

- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] Smoke-check admin dashboard, cheques, audit logs, sidebar, and HR modals

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

- [ ] Replace `xlsx` with a maintained alternative, or isolate it behind strict constraints until replacement is complete
- [ ] Review `npm audit` findings and separate runtime risk from dev-only risk
- [ ] Rename `middleware.ts` to `proxy.ts`
- [ ] Update docs and code comments that still refer to middleware if needed
- [ ] Introduce structured logging for key mutations and background flows
- [ ] Remove low-signal `console.log` calls from production paths

### Success Criteria

- Known high-risk dependency usage is removed or contained
- Next.js 16 deprecation warning for middleware is resolved
- Logs are structured enough to debug auth, entries, transfers, and payroll flows

### Verification

- [ ] `npm audit --json`
- [ ] `npm run build`
- [ ] Manual check that proxy behavior still protects routes

## Phase 6: Final Verification And Release Readiness

### Goal

Finish with confidence and avoid shipping partial hardening.

### Tasks

- [ ] Re-run full verification:
- `npm test`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- [ ] Manually test:
- login and role-based navigation
- New Entry flow
- direct payments and transfers
- edit request submission and approval
- HR employee access rules
- cheque approval and rejection
- [ ] Update `README.md` or operational docs if workflow or env requirements changed
- [ ] Capture any remaining deferred items in a short backlog section

### Exit Criteria

- No open critical findings
- No open high findings
- Lint is either green or reduced to explicitly accepted leftovers
- Build, tests, and typecheck are green

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
