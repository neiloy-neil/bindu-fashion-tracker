import { prisma } from '../lib/prisma';

async function main() {
  console.log('Starting data cleanup...');

  try {
    // Delete in order to respect foreign key constraints
    
    // 1. Delete deeply nested transaction data
    await prisma.comment.deleteMany();
    await prisma.editRequest.deleteMany();
    await prisma.expenseEntry.deleteMany();
    await prisma.transfer.deleteMany();
    await prisma.advanceSalary.deleteMany();
    
    await prisma.cheque.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.purchase.deleteMany();
    await prisma.entryItem.deleteMany();
    
    // 2. Delete Daily Entries
    await prisma.dailyEntry.deleteMany();
    
    // 3. Wholesale transactions
    await prisma.wholesaleChallanItem.deleteMany();
    await prisma.wholesaleReturn.deleteMany();
    await prisma.wholesalePayment.deleteMany();
    await prisma.wholesaleChallan.deleteMany();

    // 4. Employee related transactional data
    await prisma.attendance.deleteMany();
    await prisma.salaryRecord.deleteMany();
    await prisma.eidRecord.deleteMany();
    await prisma.leaveRecord.deleteMany();
    await prisma.employeeTransfer.deleteMany();
    
    // 5. Other transactional/log data
    await prisma.auditLog.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.branchRequest.deleteMany();
    await prisma.lockedMonth.deleteMany();

    console.log('Successfully cleared all transactional data (income, expenses, entries, etc).');
    console.log('Retained: Users, Branches, Employees, Categories, Parties, Buyers, Settings.');
    
  } catch (error) {
    console.error('Error clearing data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
