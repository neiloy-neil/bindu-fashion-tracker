const fs = require('fs');
const { Pool } = require('pg');

const envLocal = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = envLocal.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
if (!dbUrlMatch) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}
const dbUrl = dbUrlMatch[1].trim();

const pool = new Pool({ connectionString: dbUrl });

async function run() {
  const { rows: ledgerAccounts } = await pool.query("SELECT id, name FROM \"LedgerAccount\" WHERE type = 'BRANCH'");
  const { rows: branches } = await pool.query("SELECT id, name FROM \"Branch\"");

  let updated = 0;
  for (const account of ledgerAccounts) {
    let matchedBranch = branches.find(b => b.name.toLowerCase() === account.name.toLowerCase());
    if (!matchedBranch) {
      matchedBranch = branches.find(b => account.name.toLowerCase().includes(b.name.toLowerCase()) || b.name.toLowerCase().includes(account.name.toLowerCase()));
    }

    if (matchedBranch) {
      await pool.query("UPDATE \"LedgerAccount\" SET \"branchId\" = $1 WHERE id = $2", [matchedBranch.id, account.id]);
      console.log('✅ Matched', account.name, 'to', matchedBranch.name);
      updated++;
    } else {
      console.log('❌ Could not match', account.name);
    }
  }
  console.log('Updated', updated);
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
