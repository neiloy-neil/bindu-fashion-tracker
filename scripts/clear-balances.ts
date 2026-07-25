import { prisma } from '../lib/prisma';

async function main() {
  console.log('Resetting balances...');

  try {
    // Reset Party balances
    await prisma.party.updateMany({
      data: {
        balance: 0,
      },
    });

    // Reset WholesaleBuyer balances
    await prisma.wholesaleBuyer.updateMany({
      data: {
        balance: 0,
      },
    });

    console.log('Successfully reset party and buyer balances to 0.');
    
  } catch (error) {
    console.error('Error resetting balances:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
