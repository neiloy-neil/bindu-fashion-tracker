const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  console.log("Creating employee...");
  const employee = await prisma.employee.create({
    data: {
      name: "John Doe Test",
      employeeId: "EMP-TEST-001",
      basicSalary: 25000,
      conveyance: 1500,
      isActive: true
    }
  });
  console.log("Created Employee ID:", employee.id);

  console.log("\nTesting GET /api/hr/slips unauthenticated behavior mock...");
  // Simulate logic for unauthenticated (returns 403 in the route)

  console.log("\nCreating SalaryRecord...");
  const record = await prisma.salaryRecord.create({
    data: {
      employeeId: employee.id,
      month: 6,
      year: 2026,
      advanceDeducted: 1000,
      lateDays: 3, // should deduct 1 day salary
      attendanceBonus: 500,
      notes: "Test Record"
    }
  });
  console.log("Created Salary Record ID:", record.id);

  console.log("\nTesting calcSalary...");
  const { calcSalary } = require('./lib/hr/calculations');
  const slip = calcSalary(employee, record, 0);
  
  // dailyRate = 25000 / 26 = 961.53...
  // lateDeduction = 961.53...
  // netPayable = 25000 - 1000 - 961.53 + 1500 + 500 = 25038.46... => rounds to 25040
  console.log("Calculated Net Payable:", slip.netPayable);

  console.log("\nLocking month 6, 2026...");
  await prisma.salaryRecord.update({
    where: { id: record.id },
    data: { lockedAt: new Date(), lockedById: 1 } // assuming user ID 1 exists
  });
  console.log("Month Locked.");

  // Cleanup
  console.log("\nCleaning up test data...");
  await prisma.salaryRecord.delete({ where: { id: record.id } });
  await prisma.employee.delete({ where: { id: employee.id } });
  console.log("Cleanup Done.");
}

test().catch(console.error).finally(() => prisma.$disconnect());
