# Bindu Fashion Tracker — Feature Reference

> This document covers every major feature in the system: what it does, who can use it, and how it works.
> Intended for manager handover and onboarding new team members.

---

## Table of Contents

1. [User Roles & Access](#1-user-roles--access)
2. [Authentication](#2-authentication)
3. [Branch Management](#3-branch-management)
4. [Daily Entry (Cash Flow)](#4-daily-entry-cash-flow)
5. [Expense Approvals](#5-expense-approvals)
6. [Transfers](#6-transfers)
7. [Wholesale Module](#7-wholesale-module)
8. [HR & Payroll](#8-hr--payroll)
9. [Parties & Payments](#9-parties--payments)
10. [Cheques](#10-cheques)
11. [Reports & Exports](#11-reports--exports)
12. [Notifications](#12-notifications)
13. [Admin Tools](#13-admin-tools)
14. [Branch Type Operation](#14-branch-type-operation)

---

## 1. User Roles & Access

The system has 7 roles. Each role has a different level of access.

| Role | Description |
|------|-------------|
| `BRANCH` | Branch manager — submits daily entries, manages HR for their branch |
| `ADMIN` | Full access to all branches, approvals, and settings |
| `SUPER_ADMIN` | Same as ADMIN with no restrictions; bypasses all middleware blocks |
| `HR_ADMIN` | Manages employees, attendance, leaves, and payroll across branches |
| `AUDITOR` | Read-only access to entries, reports, parties, cheques |
| `AREA_MANAGER` | Oversees a set of assigned branches; read access + receives notifications |
| `ACCOUNTS` | Wholesale financial overview, cheque management, incoming transfers |

**How access is enforced:**
- The middleware file (`proxy.ts`) checks the user's role and blocks or redirects requests before they reach any page or API.
- Every API route also checks the role header independently — so even if someone bypasses the UI, the API rejects the request.
- `SUPER_ADMIN` is always included alongside `ADMIN` in every API allowlist.

---

## 2. Authentication

- Login at `/login` with username and password.
- Sessions use **NextAuth** with a JWT strategy — no database sessions.
- The JWT stores: `id`, `username`, `role`, `branchId`, `branchType`, `managedBranchIds`, `employeeId`.
- On login, `BRANCH` users with `branchType = WHOLESALE` are automatically redirected to `/wholesale/challans` instead of the dashboard.
- All other users land on the main dashboard `/`.
- Password resets can be done by ADMIN/SUPER_ADMIN from the Users table in Admin Settings.

---

## 3. Branch Management

**Where:** `/branches`

- Lists all branches with their type badge (RETAIL / WHOLESALE / FACTORY).
- Clicking a branch opens its detail page showing: branch info, type, assigned users, and monthly summary.
- ADMIN and SUPER_ADMIN can create and edit branches.
- Branch types determine how the branch operates (see [Section 14](#14-branch-type-operation)).

**Branch types:**
- `RETAIL` — standard retail shop; uses daily income/expense entries
- `WHOLESALE` — sells in bulk via challans; uses the wholesale module
- `FACTORY` — production unit; uses daily entries for production costs

---

## 4. Daily Entry (Cash Flow)

**Where:** `/entries/new`, `/entries`

Used by **RETAIL** and **FACTORY** branches.

**How it works:**
1. A branch manager opens a new entry for a specific date.
2. They fill in income items (Cash Sale, bKash, POS, etc.) and expense items (Packaging, Petty Cash, etc.).
3. Digital sales (bKash, Rocket, Nagad, POS) automatically create internal transfer records.
4. The entry is saved and visible to ADMIN in the entry history.

**Key fields:**
- `openingBalance` — cash at start of day
- `pettyCashOpening / Used / Replenished / Closing` — petty cash float tracking
- `actualPhysicalCash` — physical cash counted at close
- `bankDeposit` — amount deposited to bank

**Month locking:**
- ADMIN can lock a branch + month from `/admin/locked-months`.
- Once locked, no new entries can be submitted for that branch/month.
- Entries can be unlocked at any time.

**Categories:**
- Each income/expense line item is tagged with a category.
- Categories can be restricted to specific branch types using the `applicableTo` field.
- RETAIL branches only see RETAIL-tagged and universal categories.

---

## 5. Expense Approvals

**Where:** Dashboard widget (ADMIN) + `/entries` (BRANCH)

Branch managers submit expense entries as part of daily entries. These go through an approval flow:

1. Branch submits entry with expense items — status is `PENDING`.
2. ADMIN/SUPER_ADMIN sees a "Pending Expenses" widget on their dashboard.
3. They can approve or reject individual expenses, or use **Approve All** to bulk-approve.
4. On approval, the expense is counted in branch reports.
5. On rejection, the branch user sees the updated status with a rejection badge.

**Wholesale expenses:**
- WHOLESALE branches cannot access `/entries`.
- They submit expenses from `/wholesale/expenses` instead.
- These go through the same approval workflow.

---

## 6. Transfers

**Where:** `/transfers/incoming`, `/transfers/history`

Used to move cash between branches.

**How it works:**
1. An ADMIN initiates a transfer from one branch to another.
2. Digital sales (bKash, etc.) automatically generate transfer records.
3. The receiving branch sees the transfer in `/transfers/incoming` as `PENDING`.
4. The branch manager can **Acknowledge** (confirm receipt) or **Reject** it.
5. There is an **Acknowledge All** bulk button for quickly processing multiple transfers.
6. Acknowledged and rejected transfers are visible in `/transfers/history`.

**Who can see what:**
- `BRANCH` — sees only their own branch's incoming transfers
- `ADMIN / SUPER_ADMIN` — sees all transfers across all branches

---

## 7. Wholesale Module

**Where:** `/wholesale/challans`, `/wholesale/buyers`, `/wholesale/collections`, `/wholesale/expenses`

Used exclusively by **WHOLESALE** branches and ADMIN.

### 7.1 Buyers
- Buyers are companies or individuals who purchase goods in bulk.
- Each buyer has a name, contact number, address, credit limit, and running balance.
- Buyer detail page shows all their challans, payments, returns, and full ledger.

### 7.2 Challans
- A challan is a sales invoice for a wholesale order.
- It contains: buyer, date, delivery person, items (description + amount), and paid-at-delivery amount.
- Challan statuses: `PENDING` → `PARTIALLY_PAID` → `PAID` (or `CANCELLED`).
- Each challan has a unique auto-generated challan number.
- Challans can be **printed** from the detail page as a formatted PDF/print view.

### 7.3 Payments (Collections)
- Payments against a challan are recorded from the challan detail page.
- Payment methods: CASH, BANK_TRANSFER, CHEQUE, BKASH, NAGAD, ROCKET.
- Recording a payment reduces the challan's remaining due and the buyer's balance.
- Payments can be **deleted** by ADMIN — this reverses the balance and restores the challan status.
- The `/wholesale/collections` page shows all payments across all challans with filters.

### 7.4 Returns
- A return reduces the effective amount of a challan.
- Returns are only allowed on `PENDING` or `PARTIALLY_PAID` challans (not on fully `PAID` ones).
- Returns adjust the buyer's balance and the challan's net amount.

### 7.5 Wholesale Dashboard
- ADMIN dashboard shows a wholesale summary widget: Challans issued, Total Invoiced, Collected, Outstanding, Active Buyers, Unpaid Challans.
- WHOLESALE branch users see a dedicated dashboard with their branch's stats.
- Date filter (today / this month / custom range) is supported.

### 7.6 Overdue Challans Cron
- A cron endpoint (`/api/cron/overdue-challans`) sends notifications to ADMIN/SUPER_ADMIN for challans unpaid beyond 7 days.
- Must be scheduled externally (e.g. Vercel Cron).

---

## 8. HR & Payroll

**Where:** `/hr/employees`, `/hr/attendance`, `/hr/leaves`, `/hr/salary`, `/hr/advances`

### 8.1 Employees
- Employee records store: name, designation, department, join date, branch, salary, and status.
- HR_ADMIN manages all employees; BRANCH role manages employees within their own branch.

### 8.2 Attendance
- Daily attendance is marked per employee (Present / Absent / Leave / Holiday).
- Branch managers mark attendance for their own branch employees.
- HR_ADMIN can view and edit attendance across all branches.

### 8.3 Leaves
- Employees submit leave requests which go through an approval flow.
- `BRANCH` submissions are `PENDING`; ADMIN/SUPER_ADMIN/HR_ADMIN submissions auto-approve.
- Approved leaves deduct from the employee's leave balance.

### 8.4 Salary
- Monthly salary slips are generated and managed by HR_ADMIN.
- Salary slips go through a publish/approve workflow — branch managers only see a slip after HR_ADMIN explicitly approves it.
- Salary data was migrated from the bindu-salary system.

### 8.5 Advance Salary
- **Where:** `/hr/advances`
- Shows per-employee advance totals with clickable drill-through to individual advance records.
- Filters by month/year and employee search.
- Accessible to ADMIN, SUPER_ADMIN, HR_ADMIN, AUDITOR, AREA_MANAGER.

---

## 9. Parties & Payments

**Where:** `/parties`, `/parties/[id]`

- Parties are suppliers or vendors the business owes money to.
- Each party has a balance (running amount owed).
- Payments to a party reduce the balance.
- Non-cheque payments by BRANCH are submitted as `PENDING` and approved by ADMIN/SUPER_ADMIN — approval atomically decrements the party balance.
- Cheque payments go through the Cheque approval flow (see Section 10).

**Party detail page:**
- Shows contact info, bank info, current balance.
- Date-filterable ledger of all transactions (payments + cheques).
- Pre-filter balance is computed so running totals in filtered view are always accurate.
- Ledger can be exported as PDF.

---

## 10. Cheques

**Where:** `/cheques`

- Cheque payments to parties are tracked separately with maturity dates.
- Cheque statuses: `PENDING` → `APPROVED` / `REJECTED`.
- Approving a cheque decrements the party balance.
- Rejecting does not affect the balance.
- ACCOUNTS and AUDITOR roles can view the cheques page.
- There is a **Cheque Maturity Calendar** view for tracking upcoming maturity dates.

---

## 11. Reports & Exports

### 11.1 Monthly Report
**Where:** `/reports/monthly`

- Shows per-branch breakdown: Gross Income, Total Income, Received Transfers, Expenses, Transfers Out, Payments, Advances, Net Cash Flow.
- Includes wholesale challan table for the selected month.
- Exportable as **PDF** and **Excel** (multi-sheet with a TOTAL row).

### 11.2 Petty Cash Report
**Where:** `/reports/petty-cash`

- Monthly petty cash flow per branch: Opening, Used, Replenished, Closing.
- Exportable as **Excel**.

### 11.3 Party Ledger PDF
- Exportable from each party's detail page.
- Date-filtered view with pre-filter running balance.

### 11.4 Daily Entry Print
- Each daily entry can be printed as a formatted close-register report.
- Includes cash reconciliation.

### 11.5 Challan Print
- Each wholesale challan has a print view at `/wholesale/challans/[id]/print`.
- Formatted as a delivery challan with buyer info, items, total, and payment summary.

### 11.6 Excel Export (Admin)
- The admin export includes all branch data plus a dedicated **Wholesale** sheet.
- Available from the main dashboard.

---

## 12. Notifications

- A **notification bell** in the top-right corner shows unread count and recent notifications.
- The bell polls the server every 60 seconds.
- Notifications can be dismissed individually or cleared all at once.

**When notifications are sent:**

| Event | Who gets notified |
|-------|-------------------|
| New transfer incoming | Target branch users |
| Leave request submitted | ADMIN, SUPER_ADMIN, HR_ADMIN |
| Leave approved/rejected | The requesting user |
| Expense approved/rejected | BRANCH user of that branch; AREA_MANAGER for managed branches |
| Cheque approved/rejected | BRANCH user + AREA_MANAGER |
| Party payment pending | ADMIN, SUPER_ADMIN |
| Party payment approved/rejected | Submitting BRANCH user |
| Branch request submitted | ADMIN, SUPER_ADMIN |
| Branch request updated | Requesting user |
| Edit request submitted | ADMIN, SUPER_ADMIN |
| Edit request updated | Requesting user |
| Daily summary (cron) | ADMIN, SUPER_ADMIN |
| Overdue challans (cron) | ADMIN, SUPER_ADMIN |

---

## 13. Admin Tools

### 13.1 Users (`/admin/users`)
- Create, edit, deactivate users.
- Assign role, branch, and managed branches.
- Reset password with one click (sets a new password directly).

### 13.2 Settings (`/admin/settings`)
- Manage categories: name, type (INCOME/EXPENSE), branch type restriction (`applicableTo`), active/inactive.
- Manage branches: name, type, status.

### 13.3 Locked Months (`/admin/locked-months`)
- Lock a branch + month combination to prevent new daily entries.
- Useful at month end after reconciliation is complete.
- Can be unlocked at any time.

### 13.4 Requests
- Branch requests (BRANCH → ADMIN asking for a transfer or resource).
- Edit requests (BRANCH requesting modification of a locked or approved entry).
- Both are tracked with status and assigned to an admin user.

### 13.5 Audit Log
- Every write to financial or HR data is logged: who did it, what changed, old vs new values.
- Logs are stored in the `AuditLog` table and viewable by SUPER_ADMIN.

---

## 14. Branch Type Operation

The branch type (`RETAIL`, `WHOLESALE`, `FACTORY`) set by the admin determines how an entire branch operates — what the users see, what they can do, and where they land after login.

### RETAIL Branch
- Standard operation: daily income/expense entries.
- Dashboard: daily/monthly totals, income vs expense chart, expense breakdown donut.
- Sidebar: Cash Flow (entries), HR, Payroll, Parties, Transfers.
- Categories: sees RETAIL-tagged + universal categories.

### WHOLESALE Branch
- **No access to /entries** — redirected to /wholesale/challans.
- Login redirects straight to `/wholesale/challans`.
- Dashboard: challan count, invoiced, collected, pending dues, outstanding balance.
- Sidebar: Wholesale section (Challans, Buyers, Collections, Expenses).
- Expenses submitted via `/wholesale/expenses` — goes through standard approval flow.
- Categories filtered to EXPENSE type only when submitting wholesale expenses.

### FACTORY Branch
- Operates like RETAIL but income fields are hidden (factories don't sell directly).
- Dashboard: production cost breakdown, other income, net.
- Sidebar: Cash Flow (entries), HR, Payroll.

**How branch type is injected:**
1. On login, NextAuth fetches the user's branch type from the database.
2. The type is stored in the JWT as `branchType`.
3. `proxy.ts` reads the JWT and sets the `x-user-branch-type` request header.
4. Every API route reads this header to scope responses (e.g. category filtering).
5. The session is available client-side via `useSession()` — components read `session.user.branchType`.

> **Note:** If an admin changes a branch's type, the user must log out and back in for the change to take effect (the type is frozen in the JWT until re-login).

---

*Last updated: July 8, 2026*
