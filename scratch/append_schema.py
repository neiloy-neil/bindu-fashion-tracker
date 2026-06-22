import os

schema_path = "d:/AI/bindu-fashion-tracker/prisma/schema.prisma"

new_models = """
model SalaryRecord {
  id                 Int       @id @default(autoincrement())
  employeeId         Int
  employee           Employee  @relation(fields: [employeeId], references: [id])
  month              Int
  year               Int
  advanceDeducted    Float     @default(0)
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

with open(schema_path, "a") as f:
    f.write(new_models)
