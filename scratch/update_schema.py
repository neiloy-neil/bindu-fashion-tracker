import re

with open('prisma/schema_old.prisma', 'r', encoding='utf-8') as f:
    schema = f.read()

# Remove tables
schema = re.sub(r'model AuditLog \{.*?\n\}\n', '', schema, flags=re.DOTALL)
schema = re.sub(r'model EidRecord \{.*?\n\}\n', '', schema, flags=re.DOTALL)
schema = re.sub(r'model PartyBankInfo \{.*?\n\}\n', '', schema, flags=re.DOTALL)
schema = re.sub(r'model Purchase \{.*?\n\}\n', '', schema, flags=re.DOTALL)
schema = re.sub(r'model SalaryRecord \{.*?\n\}\n', '', schema, flags=re.DOTALL)
schema = re.sub(r'model SalaryUploadLog \{.*?\n\}\n', '', schema, flags=re.DOTALL)
schema = re.sub(r'model SystemSettings \{.*?\n\}\n', '', schema, flags=re.DOTALL)

# Employee table
schema = re.sub(r'model Employee \{.*?\n\}\n', '''model Employee {
  id                   Int      @id @default(autoincrement())
  name                 String
  isActive             Boolean  @default(true)
  createdAt            DateTime @default(now())

  advanceSalaries AdvanceSalary[]
  user            User?
}
''', schema, flags=re.DOTALL)

# User table
schema = re.sub(r'  email                 String\?         @unique\n', '', schema)
schema = re.sub(r'  employeeId            Int\?            @unique\n  employee              Employee\?       @relation\(fields: \[employeeId\], references: \[id\], onDelete: SetNull\)\n', '', schema)
schema = re.sub(r'  salaryRecords         SalaryRecord\[\]\n', '', schema)
schema = re.sub(r'  auditLogs             AuditLog\[\]\n', '', schema)

# AdvanceSalary
schema = re.sub(r'  trackerSynced      Boolean  @default\(true\)\n', '', schema)

# DailyEntry
schema = re.sub(r'  expectedNetBalance Float\?   @default\(0\)\n', '', schema)

# ExpenseEntry
schema = re.sub(r'  attachmentUrl String\?\n', '', schema)

# LedgerAccount
schema = re.sub(r'  branchId  Int\?\n  branch    Branch\?    @relation\(fields: \[branchId\], references: \[id\]\)\n', '', schema)

# Party
schema = re.sub(r'  contactPerson   String\?\n  contactNumber   String\?\n  secondaryNumber String\?\n  address         String\?  @db\.Text\n', '', schema)
schema = re.sub(r'  bankInfo  PartyBankInfo\[\]\n  purchases Purchase\[\]\n', '', schema)

# Payment
schema = re.sub(r'  dailyEntryId  Int\?\n', '  dailyEntryId  Int\n', schema)
schema = re.sub(r'  dailyEntry DailyEntry\? @relation\(fields: \[dailyEntryId\], references: \[id\]\)\n', '  dailyEntry DailyEntry @relation(fields: [dailyEntryId], references: [id])\n', schema)
schema = re.sub(r'  attachmentUrl String\?\n', '', schema)

# Transfer
schema = re.sub(r'  status           String    @default\("PENDING"\)\n  acknowledgedById Int\?\n  acknowledgedBy   User\?     @relation\("TransferAcknowledger", fields: \[acknowledgedById\], references: \[id\]\)\n  acknowledgedAt   DateTime\?\n  rejectionReason  String\?\n\n  receivingEntryId Int\?\n  receivingEntry   DailyEntry\? @relation\("ReceivedTransfers", fields: \[receivingEntryId\], references: \[id\]\)\n', '', schema)

# Branch
schema = re.sub(r'  employees      Employee\[\]\n', '', schema)

with open('prisma/schema_old.prisma', 'w', encoding='utf-8') as f:
    f.write(schema)
