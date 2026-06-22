import re

schema_path = "prisma/schema.prisma"
with open(schema_path, "r", encoding='utf-8') as f:
    content = f.read()

# Replace Employee model
employee_model = """model Employee {
  id                   Int             @id @default(autoincrement())
  employeeId           String?         @unique
  name                 String
  designation          String?
  basicSalary          Float           @default(0)
  conveyance           Float           @default(1500)
  yearlyLeaveAllowance Int             @default(12)
  mobileNumber         String?
  dateOfBirth          String?
  joiningDate          String?
  address              String?         @db.Text
  emergencyContact     String?
  bloodGroup           String?
  nidNumber            String?
  oldIdCard            String?
  photoUrl             String?
  isActive             Boolean         @default(true)
  createdAt            DateTime        @default(now())

  branchId             Int?
  branch               Branch?         @relation(fields: [branchId], references: [id])

  advanceSalaries      AdvanceSalary[]
  salaryRecords        SalaryRecord[]
  eidRecords           EidRecord[]
}"""

content = re.sub(r'model Employee \{.*?\}', employee_model, content, flags=re.DOTALL)

extra_models = """

model SalaryRecord {
  id                 Int       @id @default(autoincrement())
  employeeId         Int
  employee           Employee  @relation(fields: [employeeId], references: [id])
  month              Int
  year               Int
  trackerAdvanceTotal Float    @default(0)
  hrAdvanceDeducted  Float     @default(0)
  leaveDaysTaken     Float     @default(0)
  leaveAdjustment    Float     @default(0)
  lateDays           Int       @default(0)
  otDays             Float     @default(0)
  attendanceBonus    Float     @default(0)
  conveyanceOverride Float?
  notes              String    @default("") @db.Text
  lockedAt           DateTime?
  lockedById         Int?
  lockedBy           User?     @relation(fields: [lockedById], references: [id])
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@unique([employeeId, month, year])
}

model EidRecord {
  id               Int      @id @default(autoincrement())
  employeeId       Int
  employee         Employee @relation(fields: [employeeId], references: [id])
  title            String   @default("Eid Bonus")
  year             Int
  salaryPaymentPct Float    @default(50)
  advanceDeducted  Float    @default(0)
  eidBonusPct      Float    @default(50)
  createdAt        DateTime @default(now())

  @@unique([employeeId, year, title])
}

model SalaryUploadLog {
  id              Int      @id @default(autoincrement())
  month           Int
  year            Int
  fileName        String   @default("")
  recordsImported Int      @default(0)
  recordsUpdated  Int      @default(0)
  source          String   @default("excel")
  uploadedAt      DateTime @default(now())

  @@unique([month, year])
}

model SystemSettings {
  id          Int      @id @default(autoincrement())
  companyName String   @default("Bindu Premium")
  logoUrl     String?
  generatedBy String   @default("")
  paymentBy   String   @default("")
  updatedAt   DateTime @updatedAt
}
"""

if "model SalaryRecord" not in content:
    content += extra_models

# Update AdvanceSalary
content = re.sub(
    r'(model AdvanceSalary \{.*?)(\n\s*createdAt\s+DateTime\s+@default\(now\(\)\))',
    r'\1\n  trackerSynced      Boolean  @default(true)\2',
    content,
    flags=re.DOTALL
)

# If AdvanceSalary was missing completely (unlikely, but just in case)
if "trackerSynced" not in content and "model AdvanceSalary" not in content:
    content += """
model AdvanceSalary {
  id                 Int      @id @default(autoincrement())
  dailyEntryId       Int
  employeeId         Int
  type               String
  amount             Float?
  productDescription String?
  note               String?
  trackerSynced      Boolean  @default(true)
  createdAt          DateTime @default(now())

  dailyEntry DailyEntry @relation(fields: [dailyEntryId], references: [id])
  employee   Employee   @relation(fields: [employeeId], references: [id])
}
"""

with open(schema_path, "w", encoding='utf-8') as f:
    f.write(content)
