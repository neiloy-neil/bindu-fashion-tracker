const fs = require('fs');
let content = fs.readFileSync('prisma/schema.prisma', 'utf8');

// 1. Update User relations
content = content.replace(
  '  managedBranches Branch[]   @relation("UserManagedBranches")\n  createdAt    DateTime      @default(now())',
  '  managedBranches Branch[]   @relation("UserManagedBranches")\n  approvedCheques Cheque[]   @relation("ChequeApprover")\n  createdAt    DateTime      @default(now())'
);

// 2. Update DailyEntry relations
content = content.replace(
  '  eodChecklist       Json?\n\n  editRequests EditRequest[]\n  comments     Comment[]',
  '  eodChecklist       Json?\n  openingTime        String?\n  closingTime        String?\n\n  editRequests EditRequest[]\n  comments     Comment[]\n  transfers    Transfer[]\n  payments     Payment[]\n  expenseEntries ExpenseEntry[]\n  advanceSalaries AdvanceSalary[]'
);

// 3. Append new models
const newModels = `
model LedgerAccount {
  id        Int        @id @default(autoincrement())
  name      String     @unique
  type      String
  isActive  Boolean    @default(true)
  createdAt DateTime   @default(now())
  transfers Transfer[]
}

model Transfer {
  id           Int           @id @default(autoincrement())
  dailyEntryId Int
  accountId    Int
  amount       Float
  note         String?
  createdAt    DateTime      @default(now())
  
  dailyEntry   DailyEntry    @relation(fields: [dailyEntryId], references: [id])
  account      LedgerAccount @relation(fields: [accountId], references: [id])
}

model Party {
  id        Int       @id @default(autoincrement())
  name      String    @unique
  isActive  Boolean   @default(true)
  balance   Float     @default(0)
  createdAt DateTime  @default(now())
  payments  Payment[]
}

model Payment {
  id           Int        @id @default(autoincrement())
  dailyEntryId Int
  partyId      Int
  method       String
  amount       Float
  note         String?
  createdAt    DateTime   @default(now())
  
  dailyEntry   DailyEntry @relation(fields: [dailyEntryId], references: [id])
  party        Party      @relation(fields: [partyId], references: [id])
  cheque       Cheque?
}

model Cheque {
  id           Int      @id @default(autoincrement())
  paymentId    Int      @unique
  issueDate    DateTime
  withdrawDate DateTime
  status       String   @default("PENDING")
  approvedById Int?
  approvedAt   DateTime?
  createdAt    DateTime @default(now())
  
  payment      Payment  @relation(fields: [paymentId], references: [id])
  approvedBy   User?    @relation("ChequeApprover", fields: [approvedById], references: [id])
}

model ExpenseCategory {
  id        Int            @id @default(autoincrement())
  name      String         @unique
  frequency String
  isActive  Boolean        @default(true)
  createdAt DateTime       @default(now())
  entries   ExpenseEntry[]
}

model ExpenseEntry {
  id           Int             @id @default(autoincrement())
  dailyEntryId Int
  categoryId   Int
  amount       Float
  note         String?
  createdAt    DateTime        @default(now())
  
  dailyEntry   DailyEntry      @relation(fields: [dailyEntryId], references: [id])
  category     ExpenseCategory @relation(fields: [categoryId], references: [id])
}

model Employee {
  id              Int             @id @default(autoincrement())
  name            String
  isActive        Boolean         @default(true)
  createdAt       DateTime        @default(now())
  advanceSalaries AdvanceSalary[]
}

model AdvanceSalary {
  id                 Int        @id @default(autoincrement())
  dailyEntryId       Int
  employeeId         Int
  type               String
  amount             Float?
  productDescription String?
  note               String?
  createdAt          DateTime   @default(now())
  
  dailyEntry         DailyEntry @relation(fields: [dailyEntryId], references: [id])
  employee           Employee   @relation(fields: [employeeId], references: [id])
}
`;

fs.writeFileSync('prisma/schema.prisma', content + '\n' + newModels);
console.log('Done!');
