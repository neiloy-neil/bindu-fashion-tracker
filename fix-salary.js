const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to DB. Running SQL...');
    
    // As per user request:
    await client.query('ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS leave_adjustment numeric NOT NULL DEFAULT 0;');
    console.log('Successfully ran query on salary_records');
    
  } catch (err) {
    console.error('Error running query on salary_records:', err);
    try {
      console.log('Attempting on "SalaryRecord" (Prisma default table name)...');
      await client.query('ALTER TABLE "SalaryRecord" ADD COLUMN IF NOT EXISTS leave_adjustment numeric NOT NULL DEFAULT 0;');
      console.log('Successfully ran query on "SalaryRecord"');
    } catch (err2) {
      console.error('Error running query on "SalaryRecord":', err2);
    }
  } finally {
    await client.end();
  }
}

main();
