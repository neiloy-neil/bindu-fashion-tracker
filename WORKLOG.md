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
🔵 Built full wholesale module — WholesaleBuyer, WholesaleChallan, WholesalePayment, WholesaleReturn schema + API routes + UI pages
🔵 Wholesale pages: Challans list, Challan detail with print view, Buyers list, Buyer detail, Collections
🔵 Wholesale modals: NewChallanModal, NewBuyerModal, EditBuyerModal, RecordPaymentModal
🔵 Fixed all three wholesale modals — inputs had no visible borders due to missing `input` CSS utility class
🔵 Added wholesale section to admin dashboard — 6 stat cards (Challans, Invoiced, Collected, Outstanding, Buyers, Unpaid) with payment method breakdown chips, date-filter aware
🔵 Added /api/dashboard/wholesale endpoint for dashboard wholesale summary
🔵 Added password reset quick-action button in admin users table — ADMIN/SUPER_ADMIN only
🔵 Added vercel.json with daily-summary cron at 9 PM
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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ bindu-fashion-tracker active throughout. bindu-salary had no new commits this period.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚧 CURRENTLY WORKING ON

All known issues resolved. System fully audited and stable.
