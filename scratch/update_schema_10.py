import re

with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add branchId to LedgerAccount
ledger_account_match = re.search(r'model LedgerAccount \{.*?\n\}', content, re.DOTALL)
if ledger_account_match:
    ledger_str = ledger_account_match.group(0)
    if 'branchId' not in ledger_str:
        new_ledger_str = ledger_str.replace(
            '  transfers Transfer[]\n}',
            '  transfers Transfer[]\n  branchId  Int?\n  branch    Branch? @relation(fields: [branchId], references: [id])\n}'
        )
        content = content.replace(ledger_str, new_ledger_str)

# 2. Add relation to Branch model
branch_match = re.search(r'model Branch \{.*?\n\}', content, re.DOTALL)
if branch_match:
    branch_str = branch_match.group(0)
    if 'ledgerAccounts' not in branch_str:
        new_branch_str = branch_str.replace(
            '  requests  BranchRequest[]\n}',
            '  requests  BranchRequest[]\n  ledgerAccounts LedgerAccount[]\n}'
        )
        content = content.replace(branch_str, new_branch_str)

# 3. Add status, acknowledgedById, etc. to Transfer
transfer_match = re.search(r'model Transfer \{.*?\n\}', content, re.DOTALL)
if transfer_match:
    transfer_str = transfer_match.group(0)
    if 'status' not in transfer_str:
        new_transfer_str = transfer_str.replace(
            '  account    LedgerAccount @relation(fields: [accountId], references: [id])\n}',
            '  account    LedgerAccount @relation(fields: [accountId], references: [id])\n\n  status            String    @default("PENDING")\n  acknowledgedById  Int?\n  acknowledgedBy    User?     @relation("TransferAcknowledger", fields: [acknowledgedById], references: [id])\n  acknowledgedAt    DateTime?\n  rejectionReason   String?\n\n  receivingEntryId  Int?\n  receivingEntry    DailyEntry? @relation("ReceivedTransfers", fields: [receivingEntryId], references: [id])\n}'
        )
        content = content.replace(transfer_str, new_transfer_str)

# 4. Add relations to User and DailyEntry
user_match = re.search(r'model User \{.*?\n\}', content, re.DOTALL)
if user_match:
    user_str = user_match.group(0)
    if 'acknowledgedTransfers' not in user_str:
        new_user_str = user_str.replace(
            '  auditLogs       AuditLog[]\n  createdAt       DateTime        @default(now())\n}',
            '  auditLogs       AuditLog[]\n  createdAt       DateTime        @default(now())\n  acknowledgedTransfers Transfer[] @relation("TransferAcknowledger")\n}'
        )
        content = content.replace(user_str, new_user_str)

daily_entry_match = re.search(r'model DailyEntry \{.*?\n\}', content, re.DOTALL)
if daily_entry_match:
    daily_entry_str = daily_entry_match.group(0)
    if 'receivedTransfers' not in daily_entry_str:
        new_daily_entry_str = daily_entry_str.replace(
            '  advanceSalaries AdvanceSalary[]\n',
            '  advanceSalaries AdvanceSalary[]\n  receivedTransfers Transfer[] @relation("ReceivedTransfers")\n'
        )
        content = content.replace(daily_entry_str, new_daily_entry_str)

with open('prisma/schema.prisma', 'w', encoding='utf-8') as f:
    f.write(content)
