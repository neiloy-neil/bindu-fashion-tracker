BINDU PROJECT — DAILY WORK LOG
June 30 – July 6, 2026

🔵 = bindu-fashion-tracker
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 June 30, 2026 (Monday)
🔵 Implemented branch manager HR workflow — employees and leave management accessible to branch users
🔵 Made category attachment requirement dynamic across entry forms
🔵 Identified and catalogued system gaps: attendance logic, auto-transfer handling, and accumulated tech debt
🔵 Fixed z-index bugs across modal and dropdown layers
🔵 Allowed default categories to be deleted; added account branch assignment
🔵 Fixed notification bell alignment and positioning in layout

📅 July 1, 2026 (Wednesday)
🔵 Automatically create internal transfers for digital sales (bKash, Rocket, Nagad, POS)
🔵 Fixed automated transfer accounting logic and resolved double-counting of acknowledged transfers in ledger
🔵 Resolved remaining system gaps from prior day — attendance logic and tech debt cleanup
🔵 Moved notification bell to upper right with fixed positioning to break out of sidebar overflow hidden
🔵 Exposed attendance and employees sidebar links to branch users
🔵 Showed empty state for morning widget when no employees exist; hid admin stats from branch dashboard
🔵 Fixed MorningCheckInWidget expecting object instead of array from employees API
🔵 Removed redundant Parties tab from Admin Settings

📅 July 2, 2026 (Thursday)
🔵 Added delete option to party list
🔵 Added demo sheet download for party Excel import
🔵 Excluded own branch from transfer options; deducted digital sales from net balance
🔵 Fixed branch pass-through so managers can see other branches in the transfer section

📅 July 3, 2026 (Friday)
🔵 Planned and designed Head Office and Factory branch type support
🔵 Architected branch detail page as single source of truth for branch data
🔵 Analysed and documented all 5 employee and attendance tracking gaps for resolution
🔵 Designed expense approval workflow and edit request extension
🔵 Planned branch-type scoping for categories (applicableTo) and searchable select upgrade

📅 July 4, 2026 (Saturday)
🔵 Added Head Office and Factory branch types with full system support
🔵 Hid income and opening balance fields for Factory and Head Office branches
🔵 Added branch-type scoping to categories (applicableTo field)
🔵 Replaced all category and branch dropdowns with searchable select components
🔵 Upgraded branches to single source of truth with dedicated detail pages
🔵 Added cash reconciliation to daily report and branch approval visibility
🔵 Implemented expense approval workflow and extended edit request system
🔵 Added admin party payment approval widget to dashboard
🔵 Added import preview step to employee Excel import
🔵 Added micro-interactions across the UI (hover, transitions, loading states)
🔵 Fixed all 5 employee and attendance tracking gaps
🔵 Showed cheque status to branch managers in pending items widget
🔵 Fixed transparent background in PNG export on close register
🔵 Fixed double-counting of received transfers in daily and monthly reports
🔵 Fixed monthly report PDF to use gross income (sales + received transfers)
🔵 Fixed grossIncome type on MonthlyBranchRow to resolve build error
🔵 Global component and style cleanup

📅 July 5, 2026 (Sunday)  ·  🏢 Office  ·  11:05 AM – 07:25 PM
🔵 Seeded all employee and HR/payroll data from bindu-salary into fashion tracker database
🔵 Fixed /_next/image 400 error, React key prop warnings, and HR_ADMIN security gap
🔵 Fixed branch-scoped salary slip visibility for BRANCH role users
🔵 Implemented salary slip approval/publish workflow — branch managers only see slips after HR admin explicitly approves
🔵 Full role-based permission audit — identified and fixed SUPER_ADMIN silently blocked on leaves, cheques, and payment approvals across 6 routes
🔵 Implemented 7 system improvements: notification Clear All, AREA_MANAGER entry alerts, mobile overflow fixes on HR and admin tables, branch request SUPER_ADMIN gap, edit request SUPER_ADMIN gap, payment pending notification gap

📅 July 6, 2026 (Sunday)  ·  🏠 Work from Home
🔵 Continued SUPER_ADMIN permission sweep — fixed 9 additional routes: branches, admin analytics, HR settings, advance sync, salary records, payroll dashboard, transfer acknowledge, transfer pending count
🔵 Fixed AREA_MANAGER notification scope — now notified on expense approvals/rejections and cheque approvals/rejections for managed branches
🔵 Fixed branch requests PATCH to allow SUPER_ADMIN; fixed POST to notify SUPER_ADMIN alongside ADMIN
🔵 Fixed edit requests GET and PATCH to allow SUPER_ADMIN; fixed POST notification to include SUPER_ADMIN
🔵 Fixed PAYMENT_PENDING notifications in entries route — now goes to SUPER_ADMIN as well as ADMIN
🔵 Completed full SUPER_ADMIN audit — all API routes verified, class of bug now closed
🔵 Researched and designed wholesale module — requirements gathered, data model architecture finalised
🔵 Planned WholesaleBuyer, WholesaleChallan, WholesaleChallanItem, WholesalePayment, WholesaleReturn schema

📅 July 7, 2026 (Monday)  ·  🏠 Work from Home

Morning / Afternoon:
🔵 Built full wholesale module — WholesaleBuyer, WholesaleChallan, WholesalePayment, WholesaleReturn schema + Prisma migration + all API routes
🔵 Wholesale UI pages: Challans list, Challan detail with print view, Buyers list, Buyer detail, Collections (payments overview)
🔵 Wholesale modals: NewChallanModal, NewBuyerModal, EditBuyerModal, RecordPaymentModal, ReturnModal
🔵 Fixed all wholesale modals — inputs had no visible borders due to missing `input` CSS utility class
🔵 Added wholesale section to admin dashboard — 6 stat cards (Challans, Invoiced, Collected, Outstanding, Buyers, Unpaid) with payment method breakdown chips, date-filter aware
🔵 Added /api/dashboard/wholesale endpoint for dashboard wholesale summary
🔵 Added password reset quick-action button in admin users table — ADMIN/SUPER_ADMIN only
🔵 Added vercel.json with daily-summary cron
🔵 Blocked HR_ADMIN from /wholesale routes in proxy.ts
🔵 Added wholesale data to Excel export (new "Wholesale" sheet with stats + payment method breakdown)
🔵 Added wholesale section to PDF summary report (stat cards + metrics table)
🔵 Full system audit — all 23 pages across 8 nav sections verified functional (Main, Cash Flow, HR, Payroll, Wholesale, Parties & Payments, Manage, System)
🔵 Fixed NextAuth CLIENT_FETCH_ERROR — Next.js 16 requires explicit `export async function GET/POST` wrappers; re-exports via `export { handler as GET }` silently 404
🔵 Fixed wholesale return API — 3 bugs: block returns on PAID challans, clamp buyer balance to 0 (was going negative), use direct assignment instead of { decrement } on remainingDue
🔵 Fixed challan detail page — Return button and Returns section now hidden for PAID challans; replaced missing .card CSS class with inline Tailwind
🔵 Fixed challan list NET column — now shows effective net after returns with original amount sub-label
🔵 Fixed wholesale dashboard INVOICED — deducts return amounts from netAmount so it reflects effective invoiced value
🔵 Fixed wholesale dashboard COLLECTED BST timezone bug — daily-view date filter used UTC boundaries (Z) instead of BST (+06:00), causing payments made just after BST midnight to fall outside the day's range
🔵 Fixed corrupted DB data — pre-fix returns had pushed remainingDue and buyer balance negative; corrected via targeted SQL UPDATE clamping to 0
🔵 Fixed vercel.json cron schedule — daily-summary was set to 21:00 UTC (= 03:00 BST next day); corrected to 17:59 UTC (= 23:59 BST)

Evening (after 6:00 PM):

Code review & wholesale hardening:
🔵 Full code review audit on all new wholesale routes and UI — identified 15 bugs (7 critical, 7 plausible, 1 security)
🔵 Fixed 7 critical wholesale bugs: branch ownership check on returns (BRANCH user could modify any branch's challan), same check on payments, buyer balance clamp on duplicate payment submit, BST +06:00 offset on dashboard month/year date range (was UTC), print page TypeError on 404 challan fetch, challan count moved inside $transaction to prevent race-condition duplicate numbers, returns POST catch now returns 500 vs 400 correctly
🔵 Fixed 7 plausible wholesale bugs: ALLOWED_ROLES guard on challans/[id] GET and buyers/[id] GET (bare !role check let any role read), creditLimit NaN guard on buyer PUT, item.amount || 0 on challan creation, re-fetch challan inside DELETE transaction for consistent remainingDue, cap buyer balance deduction at remainingDue on return, clarified totalOutstanding is intentionally all-time
🔵 Fixed ACCOUNTS role security gap in wholesale write routes — branchId was read from request body (user-supplied); now read from trusted x-user-branch-id header (same treatment as BRANCH)
🔵 Added wholesale payment delete — /api/wholesale/payments/[id] DELETE: restores buyer balance, restores challan remainingDue, reverts challan status back to PARTIALLY_PAID/PENDING; ADMIN/SUPER_ADMIN only

Dashboard improvements:
🔵 Added ACCOUNTS role dashboard — wholesale stats (Invoiced, Collected, Outstanding, Active Buyers) + pending incoming transfer count with quick links
🔵 Added AREA_MANAGER dashboard — built /api/dashboard/area-manager endpoint (BST-aware, date/month/year/custom range), per-branch summary stats, grouped Income vs Expenses BarChart
🔵 Added Income Breakdown donut chart to main dashboard — mirrors expense breakdown; updated /api/summary to compute and return incomeBreakdown from entry items + received transfers
🔵 Fixed mobile dashboard Export button overflow — flex-wrap on controls row, responsive padding so button doesn't clip at 375px

Party profile:
🔵 Rebuilt party detail page — full redesign with contact card, bank info card, balance display, and date-filterable party ledger
🔵 Added /api/parties/[id]/ledger date range filter — startDate/endDate params with BST boundaries; computes preFilterBalance (running balance before the window) so running totals in the filtered view start correctly
🔵 Added party ledger PDF export — exportPartyLedgerPdf() in lib/report-pdf.tsx

Monthly report:
🔵 Added Excel export to monthly report page — full breakdown per branch (Gross Income, Total Income, Received Transfers, Expenses, Transfers Out, Payments, Advances, Net Cash Flow) with TOTAL row
🔵 Added wholesale challan table to monthly report — inline challan list with buyer, status, amount, payments, returns per challan for the selected month/branch

Transfers:
🔵 Added "Acknowledge All" bulk action to incoming transfers — loops through all pending transfers sequentially, shows succeeded/failed toast counts
🔵 Built Transfer History page (/transfers/history) — shows ACKNOWLEDGED and REJECTED transfers; BRANCH role scoped to own branch; added sidebar nav link

Reports:
🔵 Built Petty Cash Report page (/reports/petty-cash) with /api/reports/petty-cash endpoint — monthly petty cash flow per branch; Excel export

Expense approvals:
🔵 Added "Approve All" bulk action to AdminExpenseApprovals dashboard widget — approves all pending expenses in sequence, shows progress toast

Mobile & layout fixes:
🔵 Fixed mobile entries spreadsheet — sheet-table-wrapper/col-sticky-*/income-header/expense-header CSS was referenced but never defined; added full definitions to globals.css
🔵 Fixed .main-content overflow-x: hidden → clip so child overflow-x: auto containers (entries table) can scroll independently
🔵 Added mobile sidebar tap-to-close backdrop — dark overlay at z-40 closes sidebar on tap outside, implemented in LayoutWrapper

New features:
🔵 Built Advance Salary tracking page (/hr/advances) — summary view (per-employee totals, clickable drill-through to list) and list view (date, branch, type badge, amount, note); month/year filter + employee search
🔵 Built /api/hr/advances GET endpoint — ADMIN/SUPER_ADMIN/HR_ADMIN/AUDITOR/AREA_MANAGER; AREA_MANAGER scoped to managed branches
🔵 Added Cheque Maturity Calendar sidebar nav link and /cheques page access for ACCOUNTS/AUDITOR roles
🔵 Built overdue challan cron — /api/cron/overdue-challans notifies ADMIN/SUPER_ADMIN of challans unpaid beyond threshold (default 7 days); protected by CRON_SECRET

📅 July 8, 2026 (Wednesday)  ·  🏠 Work from Home

Branch type-based operation:
🔵 Added branchType to NextAuth JWT — fetched from DB during authorize(), injected as x-user-branch-type header by proxy.ts
🔵 WHOLESALE branch users now redirect to /wholesale/challans on login; blocked from all /entries and /api/entries routes
🔵 RETAIL/FACTORY branch users blocked from /wholesale routes; proxy redirects to /entries
🔵 Sidebar dynamically filters nav sections by branchType — Cash Flow hidden for WHOLESALE, Wholesale section visible only for WHOLESALE
🔵 Categories API filters by applicableTo using Prisma isEmpty/has — RETAIL branches only see RETAIL-tagged or universal categories
🔵 Tagged 13 categories as RETAIL-only (Cash Sale, Due Received, digital payment methods, etc.); remaining 51 left as universal

Dashboards by branch type:
🔵 Wholesale branch dashboard — shows challan count, total invoiced, total collected, pending due count, outstanding balance with quick links
🔵 Factory branch dashboard — shows production cost breakdown, other income, net, and links to entry/attendance
🔵 WHOLESALE branch users can now access /api/dashboard/wholesale (scoped to their own branch)

Wholesale expense flow:
🔵 Built /api/wholesale/expenses GET/POST — WHOLESALE branch can submit expenses without /entries access; auto-creates DailyEntry placeholder to satisfy FK
🔵 Built /wholesale/expenses page — category selector (expense categories only), amount, date, note; lists recent expenses with PENDING/APPROVED/REJECTED badges

Branch list improvements:
🔵 Branch cards now show colored type badge (RETAIL=blue, WHOLESALE=green, FACTORY=amber)
🔵 Fixed SUPER_ADMIN blocked from branch list — isAdmin check now includes SUPER_ADMIN
🔵 Removed HEAD_OFFICE from branch type dropdowns (not in schema)

Entry month locking:
🔵 Built /api/locked-months GET/POST/DELETE — admin can lock a branch+month to prevent new entries; uses lib/locked-month.ts helper
🔵 Built /admin/locked-months page — lock/unlock UI per branch per month with confirmation
🔵 Lock check integrated into /api/entries POST — returns 423 if month is locked

Bug fixes:
🔵 Fixed DashboardCharts Recharts formatter type error — cast v to Number() instead of typed as number
🔵 Fixed logAudit action for lock/unlock — used valid enum values CREATE/DELETE instead of custom strings
🔵 Fixed Sidebar setIsOpen optional call — changed to setIsOpen?.() to handle undefined prop
🔵 Wrapped /wholesale/challans in Suspense boundary — required by Next.js 16 for useSearchParams()
🔵 Fixed SummaryStats field references in page.tsx — totalExpenses (not totalExpense), totalSales (not totalIncome)
🔵 Production build passed clean; deployed to Vercel

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ bindu-fashion-tracker active throughout. bindu-salary had no new commits this period.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚧 CURRENTLY WORKING ON

All known issues resolved. System fully audited and stable.
