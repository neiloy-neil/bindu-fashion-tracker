# Bindu Fashion — Feature Spec v2.0 Gap Analysis
**Spec version:** Product Feature Specification v2.0  
**Codebase version:** v8  
**Date:** 2026-06-27

---

## Summary

| Section | Spec Features | Built | Partial | Missing |
|---|---|---|---|---|
| 1. Finance & Transactions | 12 | 9 | 2 | 1 |
| 2. Factory Module | 5 | 0 | 1 | 4 |
| 3. Party Management | 8 | 6 | 0 | 2 |
| 4. User Roles & Access | 9 | 5 | 1 | 3 |
| 5. Reporting & Dashboard | 10 | 7 | 1 | 2 |
| 6. Attendance & HR Sync | 10 | 3 | 1 | 6 |
| 7. Support Requests | 6 | 4 | 0 | 2 |
| 8. Data Entry Structure | 6 | 5 | 0 | 1 |
| 9. Notifications & Closing | 5 | 2 | 1 | 2 |
| **TOTAL** | **71** | **41 (58%)** | **6 (8%)** | **24 (34%)** |

---

## Section 1 — Finance & Transactions

### ✅ Built
- Daily income/credit entry with dynamic categories (Cash, bKash, Nagad, POS, Bank, custom)
- Each entry captures Date, Branch, Category, Amount, Note
- Daily payments and expenses with sub-categories
- Party payments linked to party records
- Opening balance as a category type
- Cash flow tracking — `actualPhysicalCash`, `expectedNetBalance`, `cashDifferenceNote`
- Cash discrepancy note required when physical ≠ expected
- Branch-to-branch transfers (Transfer model, PENDING → ACKNOWLEDGED flow)
- Bank entries (LedgerAccount model supports BRANCH and BANK types)

### ⚠️ Partial
- **Petty Cash Panel** — petty cash is not tracked as a distinct persistent balance. `actualPhysicalCash` captures day-end cash but there is no running petty cash register that persists between days and is visible on the dashboard at all times.
- **Opening Balance auto-carry** — the spec says "previous day's closing cash automatically becomes next day's opening balance." Currently opening balance is entered manually each day as a category entry. There is no auto-carry mechanism.

### ❌ Missing
- **Payable Cash Amount field** — a dedicated display showing total current cash liabilities (payable to parties). The party `balance` field tracks this per-party but there is no dashboard widget showing the aggregate payable amount.

---

## Section 2 — Factory Module

### ⚠️ Partial
- **Factory as branch** — a factory can be created as a branch in the current system. It can receive transfers and log entries. But it has no dedicated module, no type distinction, and no factory-specific UI.

### ❌ Missing
- **`branchType` field** — the `Branch` model has no `type` field (RETAIL / WHOLESALE / FACTORY). All branches are treated identically regardless of operational type.
- **Factory-specific transaction UI** — no dedicated view for factory income (direct sales), raw material expenses, or vendor payments (e.g. embroidery/dyeing contractors).
- **Dot Fashion integration** — no `DotFashion` entity, sub-brand, or linked account concept anywhere in the codebase. Dot Fashion payments are indistinguishable from any other branch.
- **Third-party vendor/contractor payments** — the spec describes logging payments to service providers like embroidery contractors separately. These would need a separate vendor category or sub-party type.

---

## Section 3 — Party Management

### ✅ Built
- Full party directory (name, contact, address, bank info via `PartyBankInfo` model)
- Previous outstanding due tracked via `balance` and opening purchase record
- New purchase entry with invoice number and note
- Payment entry with automatic balance deduction
- Individual party page with full ledger (opening due, purchases, payments, running balance)
- Due list view (parties page, sortable)

### ❌ Missing
- **Party email address** — the `Party` model has no `email` field. The spec lists email as a required party profile field.
- **Excel/CSV party import** — there is no bulk import route or UI for onboarding existing party data. Employee and salary Excel imports exist but not for parties. The spec explicitly requires this for setup/onboarding.

---

## Section 4 — User Roles & Access

### ✅ Built
- `ADMIN` — full access across all branches
- `BRANCH` — scoped to assigned branch only
- `AREA_MANAGER` — read + report across assigned branches (`managedBranches` relation)
- `HR_ADMIN` — HR and payroll module access only
- `AUDITOR` — read-only across all branches
- Branch-scoped sessions fully enforced via proxy.ts
- Branch and user setup with name, role, assigned branch

### ⚠️ Partial
- **Accounts role** — the spec defines an "Accounts" role with finance entry + reporting access but no user management. The current system has no `ACCOUNTS` role. The settings page references "ACCOUNTS" as a tab label for ledger accounts — not a user role.

### ❌ Missing
- **`SUPER_ADMIN` role** — the spec defines Super Admin with full system access across all branches, factory, and Dot Fashion. The current highest role is `ADMIN`. There is no distinction between Admin and Super Admin, no super-admin-only screens, and no role in the schema or auth callbacks.
- **Branch type on setup** — when creating a branch, the spec requires: name, address, branch type (retail / wholesale / factory), contact person, and phone number. The `Branch` model only stores `name`, `code`, and `isActive`. No address, no type, no contact.
- **User phone number** — the `User` model has no `phoneNumber` field. The spec lists contact number as a required field for user creation. (Note: admin/users page references `phoneNumber` but it doesn't exist in the schema — this would throw a Prisma error.)

---

## Section 5 — Reporting & Dashboard

### ✅ Built
- Dashboard with all key metric cards (Total Sales, Expenses, Net Balance, Branches)
- Real-time updates via SWR
- Daily report view filtered by date and branch
- Monthly report aggregated by branch
- Pivot-style table with categories as columns
- Excel export (`ExcelExport` component, `lib/excel-export.ts`)
- PDF download (`PdfGenerator` component, `lib/exportPdf.ts`)
- PNG export via `html-to-image` on the daily report page

### ⚠️ Partial
- **WhatsApp share** — `html-to-image` is installed and PNG export works on the daily report page. But there is no `navigator.share()` call or WhatsApp deep link (`https://wa.me/?text=...`) implemented anywhere. The spec requires one-tap sharing of the daily report to the branch WhatsApp group.

### ❌ Missing
- **Petty Cash on dashboard** — spec requires a persistent Petty Cash Panel visible on the dashboard at all times. No such widget exists.
- **Payable Amount on dashboard** — spec requires "Summary display: Total Cash | Petty Cash | Payable Amount | Cash in Hand." Only Sales, Expenses, Net Balance, and Branches are shown.

---

## Section 6 — Attendance & HR Sync

### ✅ Built
- Leave management — `LeaveRecord` model with SICK, CASUAL, UNPAID, ANNUAL types, PENDING/APPROVED/REJECTED workflow
- Leave feeds into salary calculations (`leaveDaysTaken` on `SalaryRecord`)
- Monthly salary sheet generated from leave deductions and salary structure

### ⚠️ Partial
- **Leave types** — SICK, CASUAL, UNPAID, ANNUAL are present. The spec adds **Marriage Leave** as a distinct type. Not in the schema.

### ❌ Missing
- **Daily attendance entry** — there is no `Attendance` model, no attendance entry screen, no morning check-in flow, and no On-Time / Late tracking anywhere in the codebase. This is the largest single gap. The spec says attendance is entered each morning per staff member per branch with timestamp and Late/On-Time label based on shift start time.
- **Shift configuration** — no `shiftStartTime` or shift configuration on the `Branch` or `Employee` model. Required for automatic Late/On-Time labeling.
- **Employee attendance dashboard** — no per-employee monthly attendance breakdown view showing present days, absent days, late count, on-time count, leave by type.
- **Employee transfer** — no mechanism to transfer an employee from one branch to another while preserving their full attendance, leave, and HR history. Changing `employee.branchId` would work for assignment but there is no transfer event record, no history preservation confirmation, and no UI.
- **Attendance → payroll sync** — because attendance doesn't exist, the payroll module can't be fed real attendance data. Currently salary records are filled manually or via Excel import. The spec requires payroll to derive from actual attendance records.
- **Present/absent day calculation** — with no attendance model, present days, absent days, and late counts cannot be calculated. The `SalaryRecord` only stores `leaveDaysTaken` and `lateDays` as manually entered numbers, not derived from actual daily records.

---

## Section 7 — Technical Support Requests

### ✅ Built
- Branch support ticket submission (`BranchRequest` model)
- Type field (MAINTENANCE, SUPPLIES, STAFF, OTHER)
- Priority (LOW, MEDIUM, HIGH, URGENT)
- Status workflow (PENDING, IN_PROGRESS, RESOLVED, REJECTED)
- Admin comment field
- Admin review page at `/admin/requests`
- Email notification to admins on new ticket submission (Resend integration)

### ❌ Missing
- **Assignee / responsible person** — the `BranchRequest` model has no `assignedToId` field. The spec says admin can "assign to a responsible person." There is nowhere to set or display who is handling a ticket.
- **Attachment on ticket** — the `BranchRequest` model has no `attachmentUrl` field. The spec says "optional attachment." The branch request form has no file upload.

---

## Section 8 — Data Entry Structure

### ✅ Built
- Income Group — dynamic income categories per branch entry
- Expense Group — ExpenseEntry with admin-defined categories
- Bank sub-group — LedgerAccount with BANK type
- Deposits & Transfers sub-group — Transfer model
- Category management — admin can add, edit, deactivate (`Category`, `ExpenseCategory` models)
- Categories shared across branches, filterable by branch in reports

### ❌ Missing
- **Unified expense sub-grouping** — the spec describes Bank Transactions and Deposits & Transfers as sub-groups under the Expense Group. Currently the system has separate top-level models for `Transfer` and `ExpenseEntry`. There is no visual sub-group hierarchy in the entry UI — they appear as separate sections with no parent "Expense Group" label.

---

## Section 9 — Notifications & Closing Reports

### ✅ Built
- EOD checklist (`eodChecklist` JSON field on `DailyEntry`, `EODChecklistModal` component)
- Closing time recorded (`closingTime` field)
- PDF download of daily report

### ⚠️ Partial
- **PNG download** — works on the daily report page via `html-to-image`. But it uses old CSS class names (`.btn btn-secondary`) that will break after the UI redesign in the current prompt plan. Will need to be updated.

### ❌ Missing
- **WhatsApp share** — see Section 5. No `navigator.share()` or WhatsApp link implemented. The spec says the daily report should be shareable directly to the branch's official WhatsApp group via the device share sheet.
- **Consolidated closing summary for Admin/Super Admin** — the spec says Super Admin and Admin receive a consolidated closing summary across all branches after office closing. The cron job at `/api/cron/daily-summary` generates a summary but: (a) it always returns 0 for all totals due to the old column name bug (fixed in audit but not yet verified), and (b) the email send is a `// TODO` comment — it logs but never sends.

---

## Prioritised Build List

### Priority 1 — Critical operational gaps (blocks daily use)

| # | Feature | Effort | Why critical |
|---|---|---|---|
| 1 | **Daily attendance entry module** | High | Core spec feature; payroll accuracy depends on it |
| 2 | **Auto-carry opening balance** | Medium | Manual entry every day is error-prone |
| 3 | **WhatsApp share on daily report** | Low | Explicitly required for branch closing workflow |
| 4 | **Cron closing summary email** | Low | Admin oversight depends on it; cron exists but doesn't send |

### Priority 2 — Schema gaps (missing data, affects reporting)

| # | Feature | Effort | Notes |
|---|---|---|---|
| 5 | **`branchType` field** (RETAIL/WHOLESALE/FACTORY) | Low | Schema + branch setup UI |
| 6 | **Branch address, contact person, phone** | Low | Schema + branch setup UI |
| 7 | **`SUPER_ADMIN` role** | Medium | Schema, auth callbacks, role gates on routes |
| 8 | **`MARRIAGE` leave type** | Low | Add to enum, leave form dropdown |
| 9 | **Party email field** | Low | Schema + party form |
| 10 | **Support ticket assignee + attachment** | Low | Schema + UI |

### Priority 3 — New modules (significant scope)

| # | Feature | Effort | Notes |
|---|---|---|---|
| 11 | **Employee attendance dashboard** | High | Depends on #1 |
| 12 | **Attendance → payroll sync** | Medium | Depends on #1 and #11 |
| 13 | **Employee branch transfer** | Medium | Transfer event + history migration |
| 14 | **Factory module / Dot Fashion** | High | New entity type, separate views |
| 15 | **Party Excel import** | Medium | Route + UI + Excel parsing |
| 16 | **Petty cash persistent panel** | Medium | New model + dashboard widget |
| 17 | **Payable amount dashboard widget** | Low | Aggregate from party.balance |

### Priority 4 — Polish (nice to have)

| # | Feature | Effort | Notes |
|---|---|---|---|
| 18 | **`ACCOUNTS` role** | Low | New role variant between BRANCH and ADMIN |
| 19 | **User phone number field** | Low | Schema + user form (field referenced but missing from schema) |
| 20 | **Expense sub-group visual hierarchy** | Low | UI grouping only, no schema change |
